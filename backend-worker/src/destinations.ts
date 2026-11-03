import type { DestinationAssessment, ScanReport } from '../../shared/scan';
import { aggregate, assess, evidence, expireEvidence, nowIso, target } from './evidence';
import { analyzeHeuristics } from './heuristics';
import { analyzeModel } from './ml';
import { googleSafeBrowsing, urlhaus, virusTotal } from './providers';
import type { Bindings } from './types';
import { parseInput } from './url';
import { toUnicode } from 'punycode/';
import { parse } from 'tldts';

/** Reassess only actual browser destinations; never recursively crawl or submit them. */
export async function checkDestinations(report: ScanReport, env: Bindings): Promise<DestinationAssessment[]> {
  const observed = [...new Set(report.cloudflare_reports.flatMap(item => [...(item.final_url ? [item.final_url] : []), ...(item.redirect_chain || [])]))]
    .filter(url => !report.checked_urls.includes(url));
  const urls = observed.slice(0, 4);
  if (observed.length > urls.length) {
    const engine = aggregate('destination-scope', 'Destination coverage', 'heuristic', report.checked_urls.map(url => target(url, 'unknown', {
      evidence: [evidence('Destination coverage', 'destination-limit', 'Redirect investigation is incomplete', `${observed.length} distinct browser destinations were observed; at most four can be investigated within the scan budget. Unchecked destinations prevent a no-known-threat result.`, 'warning', 'suspicious_structure', url)],
    })));
    report.engines = [...report.engines.filter(item => item.id !== engine.id), engine];
    Object.assign(report, assess(report.engines, report.checked_urls));
  }
  return Promise.all(urls.map(async url => {
    let input;
    try { input = parseInput({ url, refresh: true }); }
    catch {
      const hostname = new URL(url).hostname;
      const engine = aggregate('destination-policy', 'Destination policy', 'heuristic', [target(url, 'unknown', {
        error_code: 'DESTINATION_NOT_VERIFIED', evidence: [evidence('Destination policy', 'destination-not-verified', 'Observed destination was not submitted', 'The browser reached a destination with private parameters or a prohibited address. Its reputation was not verified; independently inspect the destination before proceeding.', 'warning', 'suspicious_structure', url)],
      })]);
      return { url, domain: { hostname, registrable_domain: parse(hostname, { allowPrivateDomains: true }).domain, unicode_hostname: toUnicode(hostname), is_ip: /^\[|^\d+(?:\.\d+){3}$/.test(hostname) },
        ...assess([engine], [url]), engines: [engine], observed_at: nowIso(), expires_at: new Date(Date.now() + 120_000).toISOString() };
    }
    const engines = expireEvidence([...await Promise.all([googleSafeBrowsing([url], env, true), urlhaus([url], env), virusTotal([url], env)]), analyzeHeuristics(input), analyzeModel(input)]);
    const expirations = engines.flatMap(e => e.targets.flatMap(t => t.expires_at ? [Date.parse(t.expires_at)] : []));
    return { url, domain: input.domain, ...assess(engines, [url]), engines, observed_at: nowIso(), expires_at: new Date(Math.min(Date.now() + 120_000, ...expirations)).toISOString() };
  }));
}
export function applyDestinations(report: ScanReport): ScanReport {
  const shortenerTargets = report.engines.find(engine => engine.id === 'heuristics')?.targets
    .filter(item => item.evidence.some(reason => reason.id === 'shortener')).map(item => item.url) || [];
  if (report.verdict === 'no_known_threats' && shortenerTargets.some(url =>
    !report.cloudflare_reports.some(item => item.url === url && item.final_url !== null))) {
    report = { ...report, verdict: 'unknown', summary: 'Reputation checks completed for the shortening URL, but its final browser destination could not be established. The destination remains unverified.' };
  }
  if (!report.destinations?.length) return report;
  const rank = { no_known_threats: 0, unknown: 1, suspicious: 2, malicious: 3 };
  const worst = report.destinations.reduce((previous, item) => rank[item.verdict] > rank[previous.verdict] ? item : previous, report.destinations[0]);
  if (rank[worst.verdict] > rank[report.verdict]) {
    report = { ...report, verdict: worst.verdict, summary: `An observed browser destination requires attention. ${worst.summary}`,
      reasons: [...worst.reasons.map(item => ({ ...item, id: `destination-${item.id}` })), ...report.reasons].slice(0, 100) };
  }
  return report;
}
export function refreshDestinations(destinations: DestinationAssessment[] | undefined): DestinationAssessment[] | undefined {
  return destinations?.map(item => {
    const engines = expireEvidence(item.engines);
    return { ...item, engines, ...assess(engines, [item.url]), observed_at: nowIso(), expires_at: new Date(Date.now() + 120_000).toISOString() };
  });
}
