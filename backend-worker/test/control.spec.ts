import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanCoordinator } from '../src/coordinator';
import { acquire, clientIdentity, release, withScanBudget } from '../src/control';
import { requestJson } from '../src/http';
import { decodeSafeBrowsing } from '../src/safebrowsing-wire';
import { googleSafeBrowsing } from '../src/providers';
import { domainRegistration, registrationSignals, resetRdapBootstrap } from '../src/registration';
import { explain } from '../src/explanation';
import { checkDestinations, applyDestinations, refreshDestinations } from '../src/destinations';
import { parseInput } from '../src/url';
import { assess, evidence } from '../src/evidence';
import { scan } from '../src/scanner';
import app from '../src/index';
import type { Bindings } from '../src/types';
import type { ScanReport } from '../../shared/scan';

const CLIENT = 'a'.repeat(64), NOW = Date.parse('2026-11-03T10:00:00.000Z');
const json = (value: unknown, status = 200) => Response.json(value, { status });
function coordinator(extra: Partial<Bindings> = {}) {
  const stored = new Map<string, unknown>(); let queue = Promise.resolve();
  const state = { storage: { get: async (key: string) => structuredClone(stored.get(key)), put: async (key: string, value: unknown) => { stored.set(key, structuredClone(value)); } },
    blockConcurrencyWhile: <T>(operation: () => Promise<T>) => { const task = queue.then(operation); queue = task.then(() => undefined, () => undefined); return task; } };
  const object = new ScanCoordinator(state as unknown as DurableObjectState, extra);
  const call = (path: string, body: unknown = {}) => object.fetch(new Request(`https://internal${path}`, { method: 'POST', body: JSON.stringify(body) }));
  const bindings: Bindings = { HTTP_RETRIES: 'false', CLIENT_ID_SECRET: 'unit-test-privacy-key-long-enough-123456', METRICS_TOKEN: 'unit-test-metrics-key-long-enough-123456',
    SCAN_RATE_LIMITER: { limit: async () => ({ success: true }) }, POLL_RATE_LIMITER: { limit: async () => ({ success: true }) },
    SCAN_COORDINATOR: { idFromName: () => 'singleton', get: () => ({ fetch: async (url, init) => object.fetch(new Request(url, init)) }) }, ...extra };
  return { call, bindings, stored };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); resetRdapBootstrap(); vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Offline fixture'); })); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('atomic global control plane', () => {
  it('serializes races, applies global concurrency and frees released capacity', async () => {
    const { call } = coordinator({ SCAN_CONCURRENCY: '2' });
    const attempts = await Promise.all(Array.from({ length: 10 }, (_, i) => call('/acquire', { route: 'scan', client: i.toString(16).padStart(64, '0') }).then(r => r.json() as Promise<{ success: boolean; lease: string }>)));
    expect(attempts.filter(a => a.success)).toHaveLength(2);
    await call('/release', { lease: attempts.find(a => a.success)!.lease });
    expect(await (await call('/acquire', { route: 'scan', client: CLIENT })).json()).toMatchObject({ success: true });
  });
  it('enforces independent per-client and global rolling budgets with lease expiry', async () => {
    const { call } = coordinator({ CLIENT_SCAN_LIMIT: '1', GLOBAL_SCAN_LIMIT: '2', SCAN_CONCURRENCY: '10' });
    const first = await (await call('/acquire', { route: 'scan', client: CLIENT })).json() as { lease: string };
    await call('/release', { lease: first.lease });
    expect(await (await call('/acquire', { route: 'scan', client: CLIENT })).json()).toMatchObject({ success: false, reason: 'budget' });
    expect(await (await call('/acquire', { route: 'scan', client: 'b'.repeat(64) })).json()).toMatchObject({ success: true });
    expect(await (await call('/acquire', { route: 'scan', client: 'c'.repeat(64) })).json()).toMatchObject({ success: false });
    vi.setSystemTime(NOW + 60_001);
    expect(await (await call('/acquire', { route: 'scan', client: CLIENT })).json()).toMatchObject({ success: true });
    const metrics = await (await call('/metrics')).text();
    expect(metrics).toContain('phishx_active_leases{route="scan"} 1');
  });
  it('globally caps provider retrievals including retries without spending other providers budgets', async () => {
    const { bindings, call } = coordinator({ VT_REQUEST_LIMIT: '1' });
    vi.mocked(fetch).mockImplementation(async () => json({ ok: true }));
    expect(await withScanBudget(bindings, CLIENT, () => requestJson('https://www.virustotal.com/one'))).toEqual({ ok: true });
    await expect(withScanBudget(bindings, CLIENT, () => requestJson('https://www.virustotal.com/two'))).rejects.toMatchObject({ code: 'PROVIDER_BUDGET_EXCEEDED' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await withScanBudget(bindings, CLIENT, () => requestJson('https://safebrowsing.googleapis.com/one'))).toEqual({ ok: true });
    expect(await (await call('/metrics')).text()).toContain('phishx_provider_budget_rejected_total{provider="virustotal"} 1');
  });
  it('expires abandoned active jobs and allows only one half-open probe', async () => {
    const { call } = coordinator({ ACTIVE_CONCURRENCY: '1' });
    await call('/acquire', { route: 'active', client: CLIENT });
    vi.setSystemTime(NOW + 180_001);
    expect(await (await call('/acquire', { route: 'active', client: CLIENT })).json()).toMatchObject({ success: true });
    for (let i = 0; i < 3; i++) await call('/observe', { provider: 'gsb', outcome: 'timeout', duration_ms: 1000 });
    expect(await (await call('/circuit', { provider: 'gsb' })).json()).toMatchObject({ allowed: false });
    vi.setSystemTime(NOW + 211_000);
    const probes = await Promise.all([call('/circuit', { provider: 'gsb' }), call('/circuit', { provider: 'gsb' })]);
    expect(await probes[0].json()).toMatchObject({ allowed: true }); expect(await probes[1].json()).toMatchObject({ allowed: false });
    await call('/observe', { provider: 'gsb', outcome: 'success', duration_ms: 100 });
    expect(await (await call('/circuit', { provider: 'gsb' })).json()).toMatchObject({ allowed: true });
  });
  it('hashes only trusted edge identity, rotates daily, rejects missing config and nonlocal dev', async () => {
    const { bindings } = coordinator();
    const req = new Request('https://scanner.example.com/', { headers: { 'CF-Connecting-IP': '8.8.8.8', 'X-Forwarded-For': 'secret' } });
    const first = await clientIdentity(req, bindings); expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(await clientIdentity(new Request(req, { headers: { 'CF-Connecting-IP': '8.8.8.8', 'X-Forwarded-For': 'different' } }), bindings)).toBe(first);
    vi.setSystemTime(NOW + 86_400_000); expect(await clientIdentity(req, bindings)).not.toBe(first);
    await expect(clientIdentity(req, { CLIENT_ID_SECRET: 'short' })).rejects.toMatchObject({ code: 'CLIENT_ID_UNAVAILABLE' });
    await expect(clientIdentity(new Request('https://scanner.example.com'), { DEV_MODE: 'true' })).rejects.toMatchObject({ code: 'CLIENT_ID_UNAVAILABLE' });
    expect(await clientIdentity(new Request('http://localhost:8787'), { DEV_MODE: 'true' })).toHaveLength(64);
  });
  it('releases request leases after invalid job lookup, and active leases after hard deadline', async () => {
    const { bindings, call } = coordinator();
    expect((await app.request('/api/scans/12345678-1234-4234-8234-123456789abc', { headers: { 'CF-Connecting-IP': '8.8.8.8' } }, bindings)).status).toBe(404);
    expect(await (await call('/metrics')).text()).toContain('phishx_active_leases{route="poll"} 0');
    const operation = withScanBudget(bindings, CLIENT, async () => { await acquire(bindings, 'active', CLIENT); return new Promise<never>(() => {}); }, 50);
    const outcome = expect(operation).rejects.toMatchObject({ code: 'SCAN_DEADLINE_EXCEEDED' });
    await vi.advanceTimersByTimeAsync(301); await outcome;
    expect(await (await call('/metrics')).text()).toContain('phishx_active_leases{route="active"} 0');
  });
  it('protects aggregate metrics and never stores URLs, raw IPs or arbitrary labels', async () => {
    const { bindings, call, stored } = coordinator();
    expect((await app.request('/api/metrics', {}, bindings)).status).toBe(401);
    expect((await call('/observe', { provider: 'https://secret.example/?token=x', outcome: 'failure' })).status).toBe(400);
    await call('/observe', { provider: 'gsb', outcome: 'malformed', duration_ms: 500 });
    const response = await app.request('/api/metrics', { headers: { Authorization: `Bearer ${bindings.METRICS_TOKEN}` } }, bindings);
    expect(response.status).toBe(200); expect(response.headers.get('Content-Type')).toContain('openmetrics');
    const metrics = await response.text(); expect(metrics).toContain('outcome="malformed"} 1'); expect(metrics).toContain('le="0.5"} 1');
    expect(JSON.stringify([...stored])).not.toMatch(/secret\.example|8\.8\.8\.8|token=x/);
  });
});

describe('bounded transport', () => {
  it('uses Workers-supported manual mode and refuses redirects without forwarding credentials', async () => {
    const { bindings } = coordinator();
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      expect(init?.redirect).toBe('manual');
      return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } });
    });
    await expect(withScanBudget(bindings, CLIENT, () => requestJson('https://www.virustotal.com/test', { headers: { 'x-apikey': 'fixture' } })))
      .rejects.toMatchObject({ code: 'UPSTREAM_REDIRECT_REJECTED' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not trip the provider circuit for normal pending or absent intelligence', async () => {
    const { bindings, call } = coordinator();
    vi.mocked(fetch).mockResolvedValue(json({}, 404));
    for (const provider of ['cloudflare', 'virustotal']) {
      const url = provider === 'cloudflare' ? 'https://api.cloudflare.com/result' : 'https://www.virustotal.com/report';
      for (let i = 0; i < 3; i++) await expect(withScanBudget(bindings, CLIENT, () => requestJson(url))).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await (await call('/circuit', { provider })).json()).toMatchObject({ allowed: true });
      expect(await (await call('/metrics')).text()).toContain(`provider="${provider}",outcome="not_found"} 3`);
    }
  });
  it('retries an idempotent retrieval once with backoff and records aggregate latency', async () => {
    const { bindings, call } = coordinator({ HTTP_RETRIES: 'true' });
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ ok: true }));
    const operation = withScanBudget(bindings, CLIENT, () => requestJson('https://safebrowsing.googleapis.com/test'));
    await vi.advanceTimersByTimeAsync(200);
    expect(await operation).toEqual({ ok: true }); expect(fetch).toHaveBeenCalledTimes(2);
    expect(await (await call('/metrics')).text()).toContain('provider="gsb",outcome="success"} 1');
  });
  it('never retries a paid active submission or an authentication failure', async () => {
    const { bindings } = coordinator({ HTTP_RETRIES: 'true' });
    vi.mocked(fetch).mockResolvedValue(json({}, 503));
    await expect(withScanBudget(bindings, CLIENT, () => requestJson('https://api.cloudflare.com/scan', { method: 'POST' }))).rejects.toMatchObject({ code: 'UPSTREAM_HTTP_503' });
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.mocked(fetch).mockResolvedValue(json({}, 401));
    await expect(withScanBudget(bindings, CLIENT, () => requestJson('https://www.virustotal.com/test'))).rejects.toMatchObject({ code: 'AUTHENTICATION_FAILED' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('counts rejected provider schemas as malformed and opens their circuit', async () => {
    const { bindings, call } = coordinator({ GOOGLE_SAFE_BROWSING_API_KEY: 'fixture' });
    vi.mocked(fetch).mockImplementation(async () => json({ cacheDuration: '300s', threats: [{ url: 'wrong.example/', threatTypes: ['MALWARE'] }] }));
    for (let i = 0; i < 3; i++) await withScanBudget(bindings, CLIENT, () => googleSafeBrowsing(['https://example.com/'], bindings, true));
    expect(await (await call('/metrics')).text()).toContain('provider="gsb",outcome="malformed"} 3');
    expect(await (await call('/circuit', { provider: 'gsb' })).json()).toMatchObject({ allowed: false });
  });
  it('aborts all provider work at the global scan deadline', async () => {
    const { bindings } = coordinator();
    vi.mocked(fetch).mockImplementation(async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    const operation = withScanBudget(bindings, CLIENT, () => requestJson('https://www.virustotal.com/test', {}, 4500), 50);
    const outcome = expect(operation).rejects.toMatchObject({ code: 'SCAN_DEADLINE_EXCEEDED' });
    await vi.advanceTimersByTimeAsync(51); await outcome;
  });
});

const hex = (value: string) => Uint8Array.from(value.match(/../g)!.map(v => parseInt(v, 16)));
describe('real Google Safe Browsing v5 wire fixtures', () => {
  it('decodes the live clean Duration and harmless Google phishing-test response', async () => {
    expect(decodeSafeBrowsing(hex('120308ac02'))).toEqual({ cacheDuration: '300s', threats: [] });
    const fixture = hex('0a310a2c746573747361666562726f7773696e672e61707073706f742e636f6d2f732f7068697368696e672e68746d6c120102120308ac02');
    expect(decodeSafeBrowsing(fixture).threats[0].threatTypes).toEqual(['SOCIAL_ENGINEERING']);
    vi.mocked(fetch).mockResolvedValue(new Response(fixture, { headers: { 'Content-Type': 'application/x-protobuf' } }));
    expect((await googleSafeBrowsing(['https://testsafebrowsing.appspot.com/s/phishing.html'], { GOOGLE_SAFE_BROWSING_API_KEY: 'fixture' }, true)).status).toBe('detected');
  });
  it.each(['', '00', '1280', '120508ffffffff', '0a080a01611201631200', '0affffffffffff', '12001200', '1300', '1206088080808080'])('rejects malformed/unknown-enum response %s', value => {
    expect(() => decodeSafeBrowsing(value ? hex(value) : new Uint8Array())).toThrow('MALFORMED_RESPONSE');
  });
});

describe('registration context and bounded destination checks', () => {
  it('does not reassure about an unresolved shortener when its original reputation checks are clean', async () => {
    const value = await scan(parseInput({ url: 'https://bit.ly/example' }), {});
    value.verdict = 'no_known_threats';
    expect(applyDestinations(value).verdict).toBe('unknown');
    value.cloudflare_reports = [{ url: value.url, source: 'Cloudflare URL Scanner', observed_at: new Date().toISOString(), ip: null, asn: null, country: null,
      final_url: value.url, certificates: [], requests: [], links: [], risks: [] }];
    expect(applyDestinations(value).verdict).toBe('no_known_threats');
  });
  it('uses IANA HTTPS registry lookup, validates domain and computes supporting age only', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ services: [[['com'], ['http://bad.local/', 'https://rdap.registry.example/']]] }))
      .mockResolvedValueOnce(json({ objectClassName: 'domain', ldhName: 'EXAMPLE.COM', events: [{ eventAction: 'registration', eventDate: '2026-11-01T10:00:00Z' }], entities: [{ roles: ['registrar'], vcardArray: ['vcard', [['fn', {}, 'text', 'Registrar']]] }] }));
    const input = parseInput({ url: 'https://example.com/' }), registration = await domainRegistration(input);
    expect(registration).toMatchObject({ status: 'available', age_days: 2, registrar: 'Registrar' });
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toBe('https://rdap.registry.example/domain/example.com');
    const signals = registrationSignals(input, registration); expect(signals.evidence[0].severity).toBe('info'); expect(assess([signals], input.targets).verdict).toBe('unknown');
  });
  it('rejects malformed bootstrap, mismatched RDAP domains and impossible dates', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ services: 'invalid' }));
    expect(await domainRegistration(parseInput({ url: 'https://example.com/' }))).toMatchObject({ status: 'error' });
    resetRdapBootstrap();
    vi.mocked(fetch).mockResolvedValueOnce(json({ services: [[['com'], ['https://rdap.registry.example/']]] })).mockResolvedValueOnce(json({ objectClassName: 'domain', ldhName: 'other.com', events: [] }));
    expect(await domainRegistration(parseInput({ url: 'https://example.com/' }))).toMatchObject({ status: 'error', error_code: 'MALFORMED_RDAP_RESPONSE' });
  });
  it('does not label missing registration context as a completed registration check', () => {
    const input = parseInput({ url: 'https://example.com/' });
    const data = { status: 'error' as const, source: null, registrar: null, created_at: null, age_days: null, observed_at: new Date().toISOString(), error_code: 'TIMEOUT' };
    expect(registrationSignals(input, data)).toMatchObject({ status: 'error', error_code: 'TIMEOUT' });
    expect(registrationSignals(input, { ...data, status: 'unavailable' })).toMatchObject({ status: 'unavailable' });
  });
  it('rechecks an observed final URL without crawling and makes a malicious destination dominate', async () => {
    const report = await scan(parseInput({ url: 'https://example.com/' }), {});
    report.cloudflare_reports = [{ url: report.url, source: 'Cloudflare URL Scanner', observed_at: new Date().toISOString(), ip: null, asn: null, country: null, final_url: 'https://evil.example.com/', certificates: [], requests: [], links: [], risks: [] }];
    vi.mocked(fetch).mockResolvedValue(json({ cacheDuration: '300s', threats: [{ url: 'evil.example.com/', threatTypes: ['SOCIAL_ENGINEERING'] }] }));
    report.destinations = await checkDestinations(report, { GOOGLE_SAFE_BROWSING_API_KEY: 'fixture' });
    expect(report.destinations).toHaveLength(1); expect(applyDestinations(report).verdict).toBe('malicious');
    expect(report.checked_urls).toEqual(['https://example.com/']); expect(vi.mocked(fetch).mock.calls.every(([url]) => !String(url).startsWith('https://evil.example.com'))).toBe(true);
  });
  it('does not share private final parameters and prevents no-known-threat reassurance', async () => {
    const report = await scan(parseInput({ url: 'https://example.com/' }), {}); vi.mocked(fetch).mockClear();
    report.verdict = 'no_known_threats';
    report.cloudflare_reports = [{ url: report.url, source: 'Cloudflare URL Scanner', observed_at: new Date().toISOString(), ip: null, asn: null, country: null, final_url: 'https://example.net/?token=private', certificates: [], requests: [], links: [], risks: [] }];
    report.destinations = await checkDestinations(report, {});
    expect(applyDestinations(report).verdict).toBe('suspicious'); expect(fetch).not.toHaveBeenCalled();
  });
  it('surfaces omitted redirect checks and downgrades expired destination negatives', async () => {
    const value = await scan(parseInput({ url: 'https://example.com/' }), {});
    value.cloudflare_reports = [{ url: value.url, source: 'Cloudflare URL Scanner', observed_at: new Date().toISOString(), ip: null, asn: null, country: null,
      final_url: 'https://example.net/final', redirect_chain: Array.from({ length: 6 }, (_, i) => `https://example.net/${i}`), certificates: [], requests: [], links: [], risks: [] }];
    vi.mocked(fetch).mockImplementation(async input => String(input).includes('safebrowsing') ? json({ cacheDuration: '1s', threats: [] }) : json({ query_status: 'no_results' }));
    value.destinations = await checkDestinations(value, { GOOGLE_SAFE_BROWSING_API_KEY: 'fixture', URLHAUS_API_KEY: 'fixture' });
    expect(value.destinations).toHaveLength(4); expect(value.reasons.some(item => item.id === 'destination-limit')).toBe(true);
    expect(applyDestinations(value).verdict).not.toBe('no_known_threats');
    vi.setSystemTime(NOW + 1001);
    const refreshed = refreshDestinations(value.destinations)!;
    expect(refreshed.every(item => item.verdict !== 'no_known_threats')).toBe(true);
    expect(refreshed[0].engines.find(engine => engine.id === 'gsb')?.status).toBe('unknown');
  });
});

describe('Gemini selects existing evidence and cannot invent claims', () => {
  async function report(): Promise<ScanReport> {
    const value = await scan(parseInput({ url: 'https://example.com/' }), {});
    value.reasons = [evidence('Test', 'known', 'Known observation', 'This is the only observed fact.', 'warning')]; value.verdict = 'suspicious'; return value;
  }
  const enabled = { GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'fixture' };
  it('accepts only existing IDs and renders deterministic observed facts', async () => {
    const value = await report();
    vi.mocked(fetch).mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ verdict: 'suspicious', evidence_ids: ['known'] }) }] } }] }));
    const result = await explain(value, enabled); expect(result.source).toBe('gemini'); expect(result.text).toContain('only observed fact');
    const body = String(vi.mocked(fetch).mock.calls.at(-1)![1]?.body); expect(body).not.toContain('example.com'); expect(body).not.toContain(value.url);
  });
  it('deduplicates protocol evidence IDs and keeps deterministic text bounded', async () => {
    const value = await report(); value.reasons.push({ ...value.reasons[0], target_url: 'http://example.com/' });
    vi.mocked(fetch).mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ verdict: 'suspicious', evidence_ids: ['known'] }) }] } }] }));
    expect((await explain(value, enabled)).evidence_ids).toEqual(['known']);
    const payload = JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)![1]?.body));
    expect(JSON.parse(payload.contents[0].parts[0].text).evidence).toHaveLength(1);
  });
  it.each([{ verdict: 'malicious', evidence_ids: ['known'] }, { verdict: 'suspicious', evidence_ids: ['invented'] }, { verdict: 'suspicious', evidence_ids: ['known'], text: 'invented' }, { verdict: 'suspicious', evidence_ids: ['known', 'known'] }])('falls back on invalid selection %j', async chosen => {
    const value = await report(); vi.mocked(fetch).mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: JSON.stringify(chosen) }] } }] }));
    const result = await explain(value, enabled); expect(result.source).toBe('deterministic'); expect(result.text).not.toContain('invented'); expect(value.verdict).toBe('suspicious');
  });
});
