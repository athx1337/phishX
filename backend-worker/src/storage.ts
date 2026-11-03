import { isFreshScanReport, isScanReport, POLICY_VERSION, SCHEMA_VERSION } from '../../shared/scan';
import type { ScanReport, TargetResult } from '../../shared/scan';
import type { Bindings, ScanJob } from './types';
import { object } from './http';
import { assess, expireEvidence } from './evidence';
import { jobControl } from './control';
import { isScanJob } from './job-state';
import modelEvaluation from '../../model/evaluation.json';

export async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function cacheKey(urls: string[], env: Bindings): Promise<string> {
  // Explicit generation changes invalidate results after credential rotation or policy changes.
  const configured = [!!env.GOOGLE_SAFE_BROWSING_API_KEY, !!env.URLHAUS_API_KEY, !!env.VIRUSTOTAL_API_KEY,
    !!env.CLOUDFLARE_API_TOKEN && !!env.CLOUDFLARE_ACCOUNT_ID && !!env.SCAN_CACHE];
  return `report:${await digest(JSON.stringify([SCHEMA_VERSION, POLICY_VERSION, modelEvaluation.artifact_sha256,
    modelEvaluation.feature_sha256, env.CACHE_CONFIG_VERSION || '1', [...urls].sort(), configured]))}`;
}
export async function readReport(env: Bindings, key: string, expectedUrls: string[]): Promise<ScanReport | null> {
  if (!env.SCAN_CACHE) return null;
  try {
    const raw = await env.SCAN_CACHE.get(key); if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isScanReport(value) || value.policy_version !== POLICY_VERSION || Date.parse(value.expires_at) <= Date.now() || value.deep_scan ||
        value.url !== expectedUrls[0] || JSON.stringify(value.checked_urls) !== JSON.stringify(expectedUrls) || key !== await cacheKey(expectedUrls, env)) return null;
    const engines = expireEvidence(value.engines);
    const report = { ...value, engines, ...assess(engines, expectedUrls), cached: true };
    return isFreshScanReport(report) ? report : null;
  } catch { return null; }
}
export async function writeReport(env: Bindings, key: string, report: ScanReport): Promise<void> {
  // Persist only complete reports. Provider-specific caching independently saves GSB lookups.
  if (!env.SCAN_CACHE || report.deep_scan || report.destinations?.length || report.verdict === 'unknown' || report.coverage.completed !== 4) return;
  const seconds = Math.floor((Date.parse(report.expires_at) - Date.now()) / 1000);
  if (seconds <= 0) return;
  try { await env.SCAN_CACHE.put(key, JSON.stringify(report), { expirationTtl: Math.max(60, seconds) }); }
  catch { /* Cache is optional; do not expose full URLs or provider errors in logs. */ }
}
export async function writeJob(env: Bindings, job: ScanJob): Promise<ScanJob> {
  if (env.SCAN_COORDINATOR) {
    const response = await jobControl(env, job.report.scan_id, '/job-write', { job });
    const value: unknown = await response.json();
    if (!response.ok || !isScanJob(value)) throw new Error('Job state could not be saved');
    return value;
  }
  if (!env.SCAN_CACHE) throw new Error('Job storage unavailable');
  const remaining = Math.ceil((job.deadline + 60_000 - Date.now()) / 1000);
  await env.SCAN_CACHE.put(`job:${job.report.scan_id}`, JSON.stringify(job), { expirationTtl: Math.max(60, remaining) });
  return job;
}
export async function readJob(env: Bindings, id: string): Promise<ScanJob | null> {
  if (env.SCAN_COORDINATOR) {
    const response = await jobControl(env, id, '/job-read', {});
    if (!response.ok) throw new Error('Job state unavailable');
    const value: unknown = await response.json();
    return isScanJob(value) && value.report.scan_id === id ? value : null;
  }
  if (!env.SCAN_CACHE) return null;
  const raw = await env.SCAN_CACHE.get(`job:${id}`); if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  return isScanJob(value) && value.report.scan_id === id ? value : null;
}
export async function readGsbCache(env: Bindings, key: string, url: string): Promise<TargetResult | null> {
  if (!env.SCAN_CACHE) return null;
  try {
    const raw = await env.SCAN_CACHE.get(key); if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v));
    if (!object(value) || value.url !== url || !['detected', 'no_detection'].includes(String(value.status)) ||
        !date(value.observed_at) || Date.parse(value.observed_at) > Date.now() + 300_000 ||
        !date(value.expires_at) || Date.parse(value.expires_at) <= Date.now() ||
        Date.parse(value.expires_at) <= Date.parse(value.observed_at) || Date.parse(value.expires_at) - Date.parse(value.observed_at) > 86_400_000 ||
        !Array.isArray(value.evidence) || value.status === 'detected' && !value.evidence.length || value.status === 'no_detection' && value.evidence.length) return null;
    // Cache data is not a public report; accept only the bounded schema originally constructed here.
    if (value.evidence.length > 50 || !value.evidence.every(e => object(e) && typeof e.id === 'string' && e.id.length <= 100 &&
      typeof e.title === 'string' && e.title.length <= 1000 && typeof e.description === 'string' && e.description.length <= 8192 &&
      e.source === 'Google Safe Browsing' && e.severity === 'high' && ['malware', 'phishing'].includes(String(e.threat_type)) &&
      e.target_url === url && date(e.observed_at) && Date.parse(e.observed_at) <= Date.now() + 300_000)) return null;
    return { url, status: value.status as TargetResult['status'], observed_at: value.observed_at, expires_at: value.expires_at,
      evidence: value.evidence as TargetResult['evidence'] };
  } catch { return null; }
}
