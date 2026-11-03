import type { Bindings } from './types';
import { isScanJob } from './job-state';
import type { ScanJob } from './types';

type Route = 'scan' | 'poll' | 'active';
type Circuit = { failures: number; open_until: number; probe_until: number };
type Metrics = Record<string, number>;
interface Snapshot {
  windows: Record<string, number[]>;
  leases: Record<string, { route: Route; expires: number }>;
  circuits: Record<string, Circuit>;
  metrics: Metrics;
}
const empty = (): Snapshot => ({ windows: {}, leases: {}, circuits: {}, metrics: {} });
const PROVIDERS = new Set(['gsb', 'urlhaus', 'virustotal', 'cloudflare', 'rdap', 'gemini', 'dns', 'other']);
const BUCKETS = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15];
const number = (input: string | undefined, fallback: number, max: number) => input && /^\d+$/.test(input) ? Math.min(max, Math.max(1, Number(input))) : fallback;

/** One named object serializes admission, leases, circuit probes and redacted counters globally. */
export class ScanCoordinator {
  private snapshot: Snapshot = empty();
  private ready: Promise<unknown>;
  constructor(private state: DurableObjectState, private env: Bindings) {
    this.ready = state.blockConcurrencyWhile(async () => { this.snapshot = await state.storage.get<Snapshot>('snapshot') || empty(); });
  }
  async alarm(): Promise<void> { await this.state.storage.deleteAll(); this.snapshot = empty(); }
  async fetch(request: Request): Promise<Response> {
    await this.ready;
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let input: Record<string, unknown>;
    try { input = await request.json() as Record<string, unknown>; } catch { return new Response('Invalid JSON', { status: 400 }); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return new Response('Invalid input', { status: 400 });
    return this.state.blockConcurrencyWhile(async () => {
      const now = Date.now(), data = this.snapshot;
      for (const [key, timestamps] of Object.entries(data.windows)) {
        data.windows[key] = timestamps.filter(stamp => stamp > now - 60_000);
        if (!data.windows[key].length) delete data.windows[key];
      }
      for (const [key, lease] of Object.entries(data.leases)) if (lease.expires <= now) delete data.leases[key];
      const path = new URL(request.url).pathname;
      if (path === '/job-read' || path === '/job-write') {
        const previous = await this.state.storage.get<ScanJob>('job');
        if (previous && previous.deadline + 60_000 <= now) { await this.state.storage.deleteAll(); return Response.json(null); }
        if (path === '/job-read') return Response.json(previous || null);
        if (!isScanJob(input.job) || input.job.deadline <= now || input.job.deadline > now + 240_000 ||
            previous && (previous.report.scan_id !== input.job.report.scan_id || previous.deadline !== input.job.deadline)) return Response.json({ error: 'Invalid job state' }, { status: 400 });
        let selected = input.job;
        if (previous && (input.job.revision || 0) !== (previous.revision || 0)) {
          // A concurrent stale poll can only replace a result with a stronger warning.
          // It can never erase a positive or regress completed state to old pending state.
          const rank = { no_known_threats: 0, unknown: 1, suspicious: 2, malicious: 3 };
          if (rank[previous.report.verdict] >= rank[selected.report.verdict]) selected = previous;
        }
        const stored = { ...selected, revision: (previous?.revision || 0) + 1 };
        await this.state.storage.put('job', stored);
        await this.state.storage.setAlarm(stored.deadline + 60_000);
        return Response.json(stored);
      }
      let response: unknown;
      if (path === '/acquire') {
        const route = input.route as Route;
        if (!['scan', 'poll', 'active'].includes(route) || typeof input.client !== 'string' || !/^[a-f0-9]{64}$/.test(input.client)) return Response.json({ error: 'Invalid admission' }, { status: 400 });
        const globalLimit = route === 'scan' ? number(this.env.GLOBAL_SCAN_LIMIT, 60, 1000) : route === 'poll' ? number(this.env.GLOBAL_POLL_LIMIT, 600, 5000) : 20;
        const clientLimit = route === 'scan' ? number(this.env.CLIENT_SCAN_LIMIT, 5, 100) : route === 'poll' ? number(this.env.CLIENT_POLL_LIMIT, 30, 300) : 3;
        const concurrency = route === 'scan' ? number(this.env.SCAN_CONCURRENCY, 4, 50) : route === 'poll' ? number(this.env.POLL_CONCURRENCY, 8, 100) : number(this.env.ACTIVE_CONCURRENCY, 3, 20);
        const globalKey = `global:${route}`, clientKey = `${route}:${input.client}`;
        const count = Object.values(data.leases).filter(lease => lease.route === route).length;
        const limited = (data.windows[globalKey]?.length || 0) >= globalLimit || (data.windows[clientKey]?.length || 0) >= clientLimit;
        if (limited || count >= concurrency) {
          data.metrics[`phishx_admission_rejected_total{route="${route}",reason="${limited ? 'budget' : 'concurrency'}"}`] = (data.metrics[`phishx_admission_rejected_total{route="${route}",reason="${limited ? 'budget' : 'concurrency'}"}`] || 0) + 1;
          response = { success: false, reason: limited ? 'budget' : 'concurrency', retry_after: limited ? 60 : 5 };
        } else {
          (data.windows[globalKey] ||= []).push(now); (data.windows[clientKey] ||= []).push(now);
          const id = crypto.randomUUID();
          data.leases[id] = { route, expires: now + (route === 'active' ? 180_000 : 20_000) };
          response = { success: true, lease: id };
        }
      } else if (path === '/provider-budget') {
        const provider = String(input.provider);
        if (!PROVIDERS.has(provider)) return Response.json({ error: 'Invalid provider' }, { status: 400 });
        const limit = provider === 'virustotal' ? number(this.env.VT_REQUEST_LIMIT, 4, 1000) : provider === 'gsb' ? number(this.env.GSB_REQUEST_LIMIT, 600, 10000) :
          provider === 'urlhaus' ? number(this.env.URLHAUS_REQUEST_LIMIT, 60, 1000) : provider === 'cloudflare' ? number(this.env.CLOUDFLARE_REQUEST_LIMIT, 10, 1000) :
          provider === 'gemini' ? number(this.env.GEMINI_REQUEST_LIMIT, 5, 1000) : 120;
        const key = `provider:${provider}`, timestamps = data.windows[key] ||= [];
        if (timestamps.length >= limit) {
          const metric = `phishx_provider_budget_rejected_total{provider="${provider}"}`;
          data.metrics[metric] = (data.metrics[metric] || 0) + 1;
          response = { allowed: false };
        } else { timestamps.push(now); response = { allowed: true }; }
      } else if (path === '/release') {
        if (typeof input.lease === 'string') delete data.leases[input.lease];
        response = { success: true };
      } else if (path === '/circuit') {
        const provider = String(input.provider);
        if (!PROVIDERS.has(provider)) return Response.json({ error: 'Invalid provider' }, { status: 400 });
        const circuit = data.circuits[provider];
        if (circuit && circuit.open_until > now) response = { allowed: false, retry_after: Math.ceil((circuit.open_until - now) / 1000) };
        else if (circuit && circuit.failures >= 3) {
          if (circuit.probe_until > now) response = { allowed: false, retry_after: 5 };
          else { circuit.probe_until = now + 15_000; response = { allowed: true }; }
        } else response = { allowed: true };
      } else if (path === '/observe') {
        const provider = String(input.provider), outcome = String(input.outcome);
        if (!PROVIDERS.has(provider) || !['success', 'not_found', 'failure', 'rate_limited', 'timeout', 'malformed'].includes(outcome)) return Response.json({ error: 'Invalid observation' }, { status: 400 });
        const duration = typeof input.duration_ms === 'number' && Number.isFinite(input.duration_ms) ? Math.max(0, Math.min(input.duration_ms, 60_000)) / 1000 : 0;
        const metric = `phishx_provider_requests_total{provider="${provider}",outcome="${outcome}"}`;
        data.metrics[metric] = (data.metrics[metric] || 0) + 1;
        const sum = `phishx_provider_duration_seconds_sum{provider="${provider}"}`, count = `phishx_provider_duration_seconds_count{provider="${provider}"}`;
        data.metrics[sum] = (data.metrics[sum] || 0) + duration; data.metrics[count] = (data.metrics[count] || 0) + 1;
        for (const bound of [...BUCKETS, Infinity]) {
          if (duration <= bound) { const bucket = `phishx_provider_duration_seconds_bucket{provider="${provider}",le="${bound === Infinity ? '+Inf' : bound}"}`; data.metrics[bucket] = (data.metrics[bucket] || 0) + 1; }
        }
        if (outcome === 'success' || outcome === 'not_found') delete data.circuits[provider];
        else {
          const current = data.circuits[provider] ||= { failures: 0, open_until: 0, probe_until: 0 };
          current.failures++; current.probe_until = 0;
          if (current.failures >= 3) current.open_until = now + (outcome === 'rate_limited' ? 60_000 : 30_000);
        }
        response = { success: true };
      } else if (path === '/scan-result') {
        if (!['malicious', 'suspicious', 'no_known_threats', 'unknown'].includes(String(input.verdict))) return Response.json({ error: 'Invalid outcome' }, { status: 400 });
        const metric = `phishx_scan_results_total{verdict="${input.verdict}"}`;
        data.metrics[metric] = (data.metrics[metric] || 0) + 1;
        response = { success: true };
      } else if (path === '/metrics') {
        const lines = ['# TYPE phishx_provider_requests_total counter', '# TYPE phishx_provider_duration_seconds histogram', '# TYPE phishx_scan_results_total counter', '# TYPE phishx_admission_rejected_total counter', '# TYPE phishx_provider_budget_rejected_total counter', '# TYPE phishx_active_leases gauge', '# TYPE phishx_provider_circuit_open gauge'];
        for (const [name, value] of Object.entries(data.metrics)) lines.push(`${name} ${value}`);
        for (const route of ['scan', 'poll', 'active']) lines.push(`phishx_active_leases{route="${route}"} ${Object.values(data.leases).filter(lease => lease.route === route).length}`);
        for (const provider of PROVIDERS) lines.push(`phishx_provider_circuit_open{provider="${provider}"} ${data.circuits[provider]?.open_until > now ? 1 : 0}`);
        return new Response(`${lines.join('\n')}\n# EOF\n`, { headers: { 'Content-Type': 'application/openmetrics-text; version=1.0.0; charset=utf-8', 'Cache-Control': 'no-store' } });
      } else return new Response('Not found', { status: 404 });
      await this.state.storage.put('snapshot', data);
      return Response.json(response);
    });
  }
}
