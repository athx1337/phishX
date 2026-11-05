import type { EngineResult, EngineStatus, Evidence, ScanReport, TargetResult, ThreatType } from '../../shared/scan';
import { isRemoteEngine } from '../../shared/scan';

export const nowIso = () => new Date().toISOString();
export function evidence(source: string, id: string, title: string, description: string,
  severity: Evidence['severity'] = 'warning', threatType: ThreatType = 'suspicious_structure', url?: string): Evidence {
  return { id, source, title, description, severity, threat_type: threatType, observed_at: nowIso(), ...(url ? { target_url: url } : {}) };
}
export function target(url: string, status: EngineStatus, fields: Partial<TargetResult> = {}): TargetResult {
  return { url, status, observed_at: nowIso(), evidence: [], ...fields };
}
export function aggregate(id: string, name: string, kind: EngineResult['kind'], targets: TargetResult[]): EngineResult {
  const status: EngineStatus = targets.some(t => t.status === 'detected') ? 'detected' :
    targets.every(t => t.status === 'no_detection') ? 'no_detection' :
    targets.some(t => t.status === 'pending') ? 'pending' : targets.some(t => t.status === 'error') ? 'error' :
    targets.some(t => t.status === 'unknown') ? 'unknown' : 'unavailable';
  const failure = targets.find(t => t.error_code);
  return { id, name, kind, status, observed_at: nowIso(), evidence: targets.flatMap(t => t.evidence), targets,
    ...(failure ? { error_code: failure.error_code, message: failure.message } : {}) };
}
export function unavailable(id: string, name: string, kind: EngineResult['kind'], urls: string[], code = 'MISSING_CREDENTIALS', message = 'Provider credentials are not configured.'): EngineResult {
  return aggregate(id, name, kind, urls.map(url => target(url, 'unavailable', { error_code: code, message })));
}

/** Never use a stale negative as current evidence, and never erase a previous positive. */
export function expireEvidence(engines: EngineResult[], now = Date.now()): EngineResult[] {
  return engines.map(engine => aggregate(engine.id, engine.name, engine.kind, engine.targets.map(t => {
    if (engine.kind === 'heuristic' || !t.expires_at || Date.parse(t.expires_at) > now || !['detected', 'no_detection'].includes(t.status)) return t;
    return { ...t, status: 'unknown', error_code: 'STALE_RESULT', message: 'This observation is no longer fresh.',
      evidence: t.evidence.map(e => ({ ...e, severity: e.severity === 'info' ? 'info' : 'warning' } as Evidence)) };
  })));
}

export function assess(engines: EngineResult[], urls: string[]): Pick<ScanReport, 'verdict' | 'summary' | 'reasons' | 'coverage'> {
  const remotes = engines.filter(isRemoteEngine);
  const conclusive = (engine: EngineResult) => urls.every(url => engine.targets.some(t => t.url === url &&
    ['detected', 'no_detection'].includes(t.status) && !!t.expires_at && Date.parse(t.expires_at) > Date.now()));
  const sufficient = remotes.filter(e => e.kind === 'reputation' && conclusive(e)).length >= 2;
  const counts = { detected: 0, no_detection: 0, unavailable: 0, error: 0, pending: 0, unknown: 0 };
  for (const engine of remotes) counts[engine.status]++;
  const reasons = engines.flatMap(e => e.evidence).filter((e, i, all) => all.findIndex(item => item.id === e.id && item.target_url === e.target_url) === i).slice(0, 100);
  const strong = reasons.some(e => e.severity === 'high' && e.threat_type !== 'suspicious_structure');
  const warnings = reasons.some(e => e.severity === 'warning' || e.severity === 'high');
  const completeCoverage = remotes.length > 0 && counts.detected === 0 && remotes.every(conclusive);
  const verdict = strong ? 'malicious' : warnings ? 'suspicious' : sufficient && completeCoverage ? 'no_known_threats' : 'unknown';
  const summary = verdict === 'malicious' ? 'Threat intelligence identified malicious activity. Avoid this URL. See the source observations below.' :
    verdict === 'suspicious' ? 'This URL has warning signals or conflicting intelligence. Avoid sharing credentials until you independently verify the destination.' :
    verdict === 'no_known_threats' ? 'All remote sources returned fresh checks for every requested protocol without a known threat match. This does not guarantee the website is safe.' :
    'There is not enough completed, fresh reputation evidence to determine the risk. Missing or pending checks are not proof of safety.';
  return { verdict, summary, reasons, coverage: { total: remotes.length, completed: remotes.filter(conclusive).length, ...counts, sufficient } };
}
