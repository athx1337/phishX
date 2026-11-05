/** Versioned public contract. No provider secrets or synthetic observations belong here. */
export const SCHEMA_VERSION = 2 as const;
export const POLICY_VERSION = '2026-11-evidence-v3-gemini-url';
export const VERDICTS = ['malicious', 'suspicious', 'no_known_threats', 'unknown'] as const;
export type Verdict = typeof VERDICTS[number];
export const VERDICT_LABELS: Record<Verdict, string> = {
  malicious: 'Malicious URL', suspicious: 'Suspicious URL',
  no_known_threats: 'No threat matches returned', unknown: 'Unable to determine',
};
export type EngineStatus = 'detected' | 'no_detection' | 'unavailable' | 'error' | 'pending' | 'unknown';
export type ThreatType = 'phishing' | 'malware' | 'social_engineering' | 'suspicious_structure' | 'unknown';
export interface Evidence {
  id: string;
  source: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'high';
  threat_type: ThreatType;
  observed_at: string;
  target_url?: string;
}
export interface TargetResult {
  url: string;
  status: EngineStatus;
  observed_at: string;
  evidence: Evidence[];
  error_code?: string;
  message?: string;
  data?: Record<string, unknown>;
  expires_at?: string;
}
export interface EngineResult {
  id: string;
  name: string;
  kind: 'reputation' | 'active' | 'heuristic' | 'model';
  status: EngineStatus;
  observed_at: string;
  evidence: Evidence[];
  targets: TargetResult[];
  error_code?: string;
  message?: string;
}
export interface Certificate {
  subject: string | null;
  issuer: string | null;
  valid_from: string | null;
  valid_to: string | null;
}
export interface NetworkRequest { url: string; method: string | null; status: number | null; ip: string | null }
export interface CloudflareReport {
  url: string;
  observed_at: string;
  source: 'Cloudflare URL Scanner';
  ip: string | null;
  asn: string | null;
  country: string | null;
  final_url: string | null;
  certificates: Certificate[];
  requests: NetworkRequest[];
  links: string[];
  risks: Evidence[];
  redirect_chain?: string[];
}
export interface RegistrationInfo {
  source: string | null;
  registrar: string | null;
  created_at: string | null;
  age_days: number | null;
  observed_at: string;
  status: 'available' | 'unavailable' | 'error';
  error_code?: string;
}
export interface DestinationAssessment {
  url: string;
  domain: ScanReport['domain'];
  verdict: Verdict;
  summary: string;
  reasons: Evidence[];
  coverage: ScanReport['coverage'];
  engines: EngineResult[];
  observed_at: string;
  expires_at: string;
}
export interface ScanReport {
  schema_version: typeof SCHEMA_VERSION;
  policy_version: string;
  scan_id: string;
  url: string;
  checked_urls: string[];
  dual_protocol: boolean;
  domain: { hostname: string; registrable_domain: string | null; unicode_hostname: string; is_ip: boolean };
  verdict: Verdict;
  summary: string;
  reasons: Evidence[];
  coverage: {
    total: number; completed: number; detected: number; no_detection: number;
    unavailable: number; error: number; pending: number; unknown: number;
    sufficient: boolean;
  };
  engines: EngineResult[];
  cloudflare_reports: CloudflareReport[];
  whois: { registrar: string | null; creation_date: string | null; source: string | null; observed_at: string | null };
  observed_at: string;
  expires_at: string;
  cached: boolean;
  privacy: { sensitive_parameters: boolean; third_party_submission: boolean };
  deep_scan?: { poll_path: string; next_poll_at: string; expires_at: string };
  registration?: RegistrationInfo;
  destinations?: DestinationAssessment[];
  explanation?: {
    source: 'deterministic' | 'gemini'; evidence_ids: string[]; text: string;
    ai_status?: 'complete' | 'disabled' | 'not_configured' | 'unavailable' | 'rate_limited' | 'timeout' | 'invalid_response';
    model?: string;
  };
}
export interface VerifyRequest { url: string; refresh?: boolean; sensitive_url_consent?: boolean; gemini_assessment?: boolean }

const SENSITIVE_KEY = /(?:token|password|passwd|secret|session|auth|credential|api[-_]?key|signature|code|email)/i;
export function hasSensitiveParameters(input: string): boolean {
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return [...url.searchParams.keys()].some(key => SENSITIVE_KEY.test(key)) || Boolean(url.hash);
  } catch { return false; }
}
/** History intentionally omits query values and fragments, without altering provider lookups. */
export function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    url.username = ''; url.password = ''; url.hash = '';
    for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, '[redacted]');
    return url.toString();
  } catch { return 'Invalid URL'; }
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
const STATUSES = ['detected', 'no_detection', 'unavailable', 'error', 'pending', 'unknown'];
export function isRemoteEngine(engine: EngineResult): boolean { return engine.kind === 'reputation' || engine.kind === 'active'; }
export function isScanReport(value: unknown): value is ScanReport {
  const text = (v: unknown) => typeof v === 'string' && v.length <= 8192;
  const nullable = (v: unknown) => v === null || text(v);
  const date = (v: unknown) => text(v) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v as string) && Number.isFinite(Date.parse(v as string));
  const webUrl = (v: unknown) => {
    if (!text(v)) return false;
    try { const u = new URL(v as string); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; }
    catch { return false; }
  };
  const list = (v: unknown, predicate: (item: unknown) => boolean, max = 200): v is unknown[] => Array.isArray(v) && v.length <= max && v.every(predicate);
  const evidence = (item: unknown) => record(item) && text(item.id) && text(item.title) &&
    text(item.description) && text(item.source) && date(item.observed_at) &&
    ['info', 'warning', 'high'].includes(String(item.severity)) &&
    ['phishing', 'malware', 'social_engineering', 'suspicious_structure', 'unknown'].includes(String(item.threat_type)) &&
    (item.target_url === undefined || webUrl(item.target_url));
  const target = (item: unknown) => record(item) && webUrl(item.url) && STATUSES.includes(String(item.status)) &&
    date(item.observed_at) && list(item.evidence, evidence) &&
    (item.error_code === undefined || text(item.error_code)) && (item.message === undefined || text(item.message)) &&
    (item.expires_at === undefined || date(item.expires_at)) && (item.data === undefined || record(item.data));
  const engine = (item: unknown) => record(item) && text(item.id) && text(item.name) &&
    ['reputation', 'active', 'heuristic', 'model'].includes(String(item.kind)) && STATUSES.includes(String(item.status)) &&
    date(item.observed_at) && list(item.evidence, evidence) && list(item.targets, target, 2) &&
    (item.error_code === undefined || text(item.error_code)) && (item.message === undefined || text(item.message));
  const cert = (item: unknown) => record(item) && nullable(item.subject) && nullable(item.issuer) &&
    (item.valid_from === null || date(item.valid_from)) && (item.valid_to === null || date(item.valid_to));
  const request = (item: unknown) => record(item) && webUrl(item.url) && nullable(item.method) && nullable(item.ip) &&
    (item.status === null || (Number.isInteger(item.status) && Number(item.status) >= 100 && Number(item.status) <= 599));
  const report = (item: unknown) => record(item) && webUrl(item.url) && date(item.observed_at) &&
    item.source === 'Cloudflare URL Scanner' && nullable(item.ip) && nullable(item.asn) && nullable(item.country) &&
    (item.final_url === null || webUrl(item.final_url)) && list(item.certificates, cert) &&
    list(item.requests, request) && list(item.links, webUrl) && list(item.risks, evidence) &&
    (item.redirect_chain === undefined || list(item.redirect_chain, webUrl, 20));
  if (!record(value) || value.schema_version !== SCHEMA_VERSION || !text(value.policy_version) ||
      typeof value.scan_id !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.scan_id) || !webUrl(value.url) ||
      !VERDICTS.includes(value.verdict as Verdict) || !text(value.summary) ||
      !date(value.observed_at) || !date(value.expires_at) || Date.parse(String(value.expires_at)) < Date.parse(String(value.observed_at)) ||
      !list(value.checked_urls, webUrl, 2) || value.checked_urls.length < 1 ||
      typeof value.dual_protocol !== 'boolean' || value.dual_protocol !== (value.checked_urls.length === 2) ||
      !record(value.domain) || !text(value.domain.hostname) || !nullable(value.domain.registrable_domain) ||
      !text(value.domain.unicode_hostname) || typeof value.domain.is_ip !== 'boolean' ||
      !record(value.coverage) || typeof value.coverage.sufficient !== 'boolean' ||
      !list(value.engines, engine, 10) || !list(value.reasons, evidence) || !list(value.cloudflare_reports, report, 2) ||
      typeof value.cached !== 'boolean' || !record(value.whois) || !nullable(value.whois.registrar) ||
      !nullable(value.whois.creation_date) || !nullable(value.whois.source) ||
      !(value.whois.observed_at === null || date(value.whois.observed_at)) ||
      !record(value.privacy) || typeof value.privacy.sensitive_parameters !== 'boolean' ||
      typeof value.privacy.third_party_submission !== 'boolean') return false;
  const c = value.coverage;
  if (!['total', 'completed', 'detected', 'no_detection', 'unavailable', 'error', 'pending', 'unknown'].every(key =>
    Number.isInteger(c[key]) && Number(c[key]) >= 0 && Number(c[key]) <= 10) || Number(c.completed) > Number(c.total)) return false;
  const remotes = (value.engines as EngineResult[]).filter(isRemoteEngine);
  const urls = value.checked_urls as string[];
  if (urls[0] !== value.url || new Set(urls).size !== urls.length ||
      (value.engines as EngineResult[]).some(item => item.targets.length !== urls.length ||
        new Set(item.targets.map(target => target.url)).size !== urls.length || item.targets.some(target => !urls.includes(target.url)))) return false;
  if (c.total !== remotes.length || new Set((value.engines as EngineResult[]).map(item => item.id)).size !== value.engines.length ||
      STATUSES.some(status => c[status] !== remotes.filter(item => item.status === status).length)) return false;
  const completed = remotes.filter(item => item.targets.every(target =>
    ['detected', 'no_detection'].includes(target.status))).length;
  if (c.completed !== completed) return false;
  if (value.verdict === 'no_known_threats' && (!c.sufficient || c.pending !== 0 ||
      remotes.filter(item => item.kind === 'reputation' && item.targets.every(target => target.status === 'no_detection')).length < 2 ||
      (value.engines as EngineResult[]).some(item => item.targets.some(target => target.status === 'pending') ||
        item.evidence.some(e => e.severity !== 'info') || item.targets.some(target => target.evidence.some(e => e.severity !== 'info'))) ||
      (value.reasons as Evidence[]).some(item => item.severity !== 'info'))) return false;
  if (value.deep_scan !== undefined && (!record(value.deep_scan) ||
      value.deep_scan.poll_path !== `/api/scans/${value.scan_id}` || !date(value.deep_scan.next_poll_at) ||
      !date(value.deep_scan.expires_at) || Date.parse(String(value.deep_scan.next_poll_at)) > Date.parse(String(value.deep_scan.expires_at)))) return false;
  if (value.registration !== undefined) {
    const r = value.registration;
    if (!record(r) || !['available', 'unavailable', 'error'].includes(String(r.status)) || !nullable(r.source) ||
        !nullable(r.registrar) || !(r.created_at === null || date(r.created_at)) || !date(r.observed_at) ||
        !(r.age_days === null || Number.isInteger(r.age_days) && Number(r.age_days) >= 0 && Number(r.age_days) <= 100_000) ||
        (r.error_code !== undefined && !text(r.error_code))) return false;
  }
  if (value.explanation !== undefined) {
    const explanation = value.explanation;
    const knownIds = new Set((value.reasons as Evidence[]).map(item => item.id));
    if (!record(explanation) || !['deterministic', 'gemini'].includes(String(explanation.source)) || !text(explanation.text) ||
        !list(explanation.evidence_ids, id => typeof id === 'string' && knownIds.has(id), 100)) return false;
    if (explanation.ai_status !== undefined &&
        (!['complete', 'disabled', 'not_configured', 'unavailable', 'rate_limited', 'timeout', 'invalid_response'].includes(String(explanation.ai_status)) ||
         (explanation.source === 'gemini') !== (explanation.ai_status === 'complete'))) return false;
    if (explanation.model !== undefined && (typeof explanation.model !== 'string' || !/^[a-z0-9.-]{1,80}$/.test(explanation.model))) return false;
  }
  if (value.destinations !== undefined) {
    if (!Array.isArray(value.destinations) || value.destinations.length > 4) return false;
    for (const destination of value.destinations) {
      if (!record(destination) || !webUrl(destination.url) ||
          !['domain', 'verdict', 'summary', 'reasons', 'coverage', 'engines', 'observed_at', 'expires_at'].every(key =>
            Object.hasOwn(destination, key))) return false;
      // Reuse the same structural trust boundary, with no recursive destinations/jobs.
      const candidate = { ...value, ...destination, checked_urls: [destination.url], dual_protocol: false,
        cloudflare_reports: [], destinations: undefined, deep_scan: undefined, registration: undefined, explanation: undefined };
      if (!isScanReport(candidate)) return false;
    }
    if (value.verdict === 'no_known_threats' && value.destinations.some(d =>
      (d as DestinationAssessment).verdict !== 'no_known_threats')) return false;
  }
  return true;
}

/** Temporal acceptance for newly received/cached reports; historical display uses isScanReport. */
export function isFreshScanReport(value: unknown, now = Date.now()): value is ScanReport {
  if (!isScanReport(value) || !Number.isFinite(now) || Date.parse(value.expires_at) <= now ||
      Date.parse(value.observed_at) > now + 300_000) return false;
  const conclusiveFresh = (item: TargetResult) => ['detected', 'no_detection'].includes(item.status) &&
    Boolean(item.expires_at) && Date.parse(item.expires_at!) > now && Date.parse(item.observed_at) <= now + 300_000;
  const completed = value.engines.filter(engine => isRemoteEngine(engine) && engine.targets.every(conclusiveFresh)).length;
  if (value.coverage.completed !== completed) return false;
  if (value.policy_version === POLICY_VERSION && value.verdict === 'no_known_threats' &&
      (value.coverage.completed !== value.coverage.total || value.coverage.detected > 0)) return false;
  if (value.verdict === 'no_known_threats' && value.engines.filter(engine => engine.kind === 'reputation' &&
      engine.targets.every(item => item.status === 'no_detection' && conclusiveFresh(item))).length < 2) return false;
  if (value.destinations && value.verdict === 'no_known_threats' && value.destinations.some(destination =>
      Date.parse(destination.expires_at) <= now || destination.verdict !== 'no_known_threats' ||
      destination.engines.filter(engine => engine.kind === 'reputation' && engine.targets.every(item => item.status === 'no_detection' && conclusiveFresh(item))).length < 2)) return false;
  return true;
}
