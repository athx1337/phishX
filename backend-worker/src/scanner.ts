import { isFreshScanReport, POLICY_VERSION, SCHEMA_VERSION } from '../../shared/scan';
import type { EngineResult, ScanReport } from '../../shared/scan';
import { aggregate, assess, expireEvidence, nowIso, target } from './evidence';
import { JOB_LIFETIME_MS, POLL_INTERVAL_MS, pollCloudflare, submitCloudflare } from './cloudflare';
import { analyzeHeuristics } from './heuristics';
import { domainMetadata, googleSafeBrowsing, urlhaus, virusTotal } from './providers';
import { cacheKey, readJob, readReport, writeJob, writeReport } from './storage';
import type { Bindings, CloudflarePoll, ScanJob } from './types';
import { PublicError } from './types';
import type { ParsedInput } from './url';
import { analyzeModel } from './ml';
import { domainRegistration, registrationSignals } from './registration';
import { deterministicExplanation, explain, explanationContext, refreshExplanation } from './explanation';
import { applyDestinations, checkDestinations, refreshDestinations } from './destinations';
import { control, release, retainLease } from './control';

function expiresAt(engines: EngineResult[], now = Date.now()): string {
  const expirations = engines.flatMap(e => e.targets.flatMap(t => t.expires_at && ['detected', 'no_detection'].includes(t.status) ? [Date.parse(t.expires_at)] : []));
  return new Date(Math.max(now, Math.min(now + 120_000, ...expirations))).toISOString();
}
function update(report: ScanReport): ScanReport {
  const engines = expireEvidence(report.engines);
  const updated = applyDestinations({ ...report, engines, destinations: refreshDestinations(report.destinations), ...assess(engines, report.checked_urls), observed_at: nowIso(), expires_at: expiresAt(engines), cached: false });
  return refreshExplanation(report, updated);
}
export async function scan(input: ParsedInput, env: Bindings): Promise<ScanReport> {
  const key = await cacheKey(input.targets, env);
  if (!input.refresh) { const cached = await readReport(env, key, input.targets); if (cached) return cached; }
  const scanId = crypto.randomUUID(), started = Date.now();
  let canSubmit = !!env.SCAN_CACHE;
  if (canSubmit && env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN) {
    // Reservation is a different key: Workers KV limits writes to one per second per key.
    try { await env.SCAN_CACHE!.put(`reservation:${scanId}`, JSON.stringify({ expires_at: started + JOB_LIFETIME_MS }), { expirationTtl: 240 }); }
    catch { canSubmit = false; }
  }
  const cfEnv = canSubmit ? env : { ...env, SCAN_CACHE: undefined };
  const [gsb, haus, vt, cf, whois, registration] = await Promise.all([
    googleSafeBrowsing(input.targets, env, input.refresh), urlhaus(input.targets, env), virusTotal(input.targets, env),
    submitCloudflare(input, cfEnv), domainMetadata(input.domain.registrable_domain, env), domainRegistration(input),
  ]);
  const engines = expireEvidence([gsb, haus, vt, cf.engine, analyzeHeuristics(input), analyzeModel(input), registrationSignals(input, registration)]);
  const report: ScanReport = { schema_version: SCHEMA_VERSION, policy_version: POLICY_VERSION, scan_id: scanId,
    url: input.primary, checked_urls: input.targets, dual_protocol: input.targets.length === 2, domain: input.domain,
    ...assess(engines, input.targets), engines, cloudflare_reports: [], whois, registration, observed_at: nowIso(), expires_at: expiresAt(engines), cached: false,
    privacy: { sensitive_parameters: input.sensitive, third_party_submission: Boolean(input.domain.registrable_domain && registration.status !== 'unavailable') || [gsb, haus, vt, cf.engine].some(e => e.targets.some(t => t.error_code !== 'MISSING_CREDENTIALS' && t.error_code !== 'JOB_STORAGE_UNAVAILABLE')) },
  };
  Object.assign(report, applyDestinations(report));
  report.explanation = await explain(report, env);
  if (cf.pending.length && env.SCAN_CACHE) {
    const next = Date.now() + POLL_INTERVAL_MS, deadline = started + JOB_LIFETIME_MS;
    report.deep_scan = { poll_path: `/api/scans/${scanId}`, next_poll_at: new Date(next).toISOString(), expires_at: new Date(deadline).toISOString() };
      try { await writeJob(env, { version: 2, report, pending: cf.pending, next_poll_at: next, deadline, ...(cf.lease ? { coordinator_lease: cf.lease } : {}) }); retainLease(cf.lease); }
    catch {
      await release(env, cf.lease);
      delete report.deep_scan;
      report.engines = report.engines.map(e => e.id !== 'cloudflare' ? e : aggregate(e.id, e.name, e.kind, e.targets.map(t => t.status !== 'pending' ? t : target(t.url, 'error', { error_code: 'JOB_STORAGE_UNAVAILABLE', message: 'The active inspection result cannot be tracked because storage failed.' }))));
      Object.assign(report, assess(report.engines, report.checked_urls));
      report.explanation = deterministicExplanation(report, report.explanation.ai_status === 'complete' ? 'unavailable' : report.explanation.ai_status || 'unavailable', report.explanation.model);
    }
  }
  if (!isFreshScanReport(report)) throw new PublicError('INVALID_SCAN_RESULT', 'The scan could not produce a valid report. Please try again.', 503);
  await writeReport(env, key, report);
  try { await control(env, '/scan-result', { verdict: report.verdict }); } catch { /* Reporting never changes verdicts. */ }
  return report;
}

// Coalesce within an isolate. Production job objects additionally serialize canonical
// state and resolve stale revisions conservatively across isolates/regions.
const runningPolls = new Map<string, Promise<ScanReport>>();
export async function pollScan(id: string, env: Bindings): Promise<ScanReport> {
  const running = runningPolls.get(id); if (running) return running;
  const operation = pollOnce(id, env).finally(() => runningPolls.delete(id));
  runningPolls.set(id, operation); return operation;
}
async function pollOnce(id: string, env: Bindings): Promise<ScanReport> {
  let job: ScanJob | null;
  try { job = await readJob(env, id); }
  catch { throw new PublicError('JOB_STORAGE_UNAVAILABLE', 'Scan status is temporarily unavailable. Retry after the suggested interval.', 503); }
  if (!job) throw new PublicError('SCAN_NOT_FOUND', 'This scan is not available yet or has expired.', 404);
  if (Date.now() >= job.deadline) { await release(env, job.coordinator_lease); throw new PublicError('SCAN_EXPIRED', 'This scan status link has expired. Start a new scan for current evidence.', 410); }
  if (!job.report.deep_scan || !job.pending.length) return update(job.report);
  if (Date.now() < job.next_poll_at) return update(job.report);
  const previousContext = explanationContext(job.report);
  const results: CloudflarePoll[] = await Promise.all(job.pending.map(item => pollCloudflare(item, env)));
  const cf = job.report.engines.find(e => e.id === 'cloudflare')!;
  const targets = cf.targets.map(previous => results.find(result => result.target.url === previous.url)?.target || previous);
  job.report.engines = job.report.engines.map(e => e.id === 'cloudflare' ? aggregate(e.id, e.name, e.kind, targets) : e);
  for (const result of results) {
    if (result.report) job.report.cloudflare_reports = [...job.report.cloudflare_reports.filter(r => r.url !== result.report!.url), result.report];
  }
  job.pending = job.pending.filter(item => targets.find(t => t.url === item.url)?.status === 'pending');
  job.next_poll_at = Date.now() + POLL_INTERVAL_MS;
  if (!job.pending.length) { delete job.report.deep_scan; await release(env, job.coordinator_lease); delete job.coordinator_lease; }
  else job.report.deep_scan = { poll_path: `/api/scans/${id}`, next_poll_at: new Date(Math.min(job.next_poll_at, job.deadline)).toISOString(), expires_at: new Date(job.deadline).toISOString() };
  job.report = update(job.report);
  if (results.some(item => item.report)) { job.report.destinations = await checkDestinations(job.report, env); job.report = applyDestinations(job.report); }
  if (!job.report.explanation || previousContext !== explanationContext(job.report)) job.report.explanation = await explain(job.report, env);
  if (!isFreshScanReport(job.report)) throw new PublicError('INVALID_SCAN_RESULT', 'Active inspection returned an unusable report.', 503);
  try { job = await writeJob(env, job); job.report = update(job.report); }
  catch {
    await release(env, job.coordinator_lease);
    // Preserve positive observations; do not turn failure into no-threat reassurance.
    job.report.engines = job.report.engines.map(e => e.id === 'cloudflare' ? aggregate(e.id, e.name, e.kind, e.targets.map(t => t.status === 'pending' ? target(t.url, 'error', { error_code: 'JOB_STORAGE_UNAVAILABLE', message: 'Active inspection status could not be saved.' }) : t)) : e);
    delete job.report.deep_scan;
    job.report = update(job.report);
  }
  if (!isFreshScanReport(job.report)) throw new PublicError('INVALID_SCAN_RESULT', 'Active inspection returned an unusable report.', 503);
  if (!job.report.deep_scan) await writeReport(env, await cacheKey(job.report.checked_urls, env), job.report);
  return job.report;
}
