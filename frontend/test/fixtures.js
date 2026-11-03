/** Synthetic reports exist only in tests. They contain no live provider data. */
export function scanReport(overrides = {}) {
  const observed = new Date().toISOString();
  const expires = new Date(Date.now() + 60_000).toISOString();
  const url = overrides.url || 'https://example.com/login';
  const engines = [
    ['gsb', 'Google Safe Browsing', 'reputation'],
    ['urlhaus', 'URLhaus', 'reputation'],
    ['virustotal', 'VirusTotal', 'reputation'],
    ['cloudflare', 'Cloudflare URL Scanner', 'active'],
    ['heuristics', 'URL Heuristic Analysis', 'heuristic'],
  ].map(([id, name, kind]) => ({
    id, name, kind, status: kind === 'heuristic' ? 'no_detection' : 'unavailable',
    observed_at: observed, evidence: [],
    targets: [{ url, status: kind === 'heuristic' ? 'no_detection' : 'unavailable', observed_at: observed, evidence: [], message: kind === 'heuristic' ? undefined : 'Provider is not configured.' }],
    message: kind === 'heuristic' ? undefined : 'Provider is not configured.',
  }));
  return {
    schema_version: 2, policy_version: '2026-11-evidence-v1', scan_id: '3abde334-4085-4998-9668-899268322888',
    url, checked_urls: [url], dual_protocol: false,
    domain: { hostname: new URL(url).hostname, registrable_domain: 'example.com', unicode_hostname: new URL(url).hostname, is_ip: false },
    verdict: 'unknown', summary: 'There is not enough fresh evidence to determine whether this URL is dangerous.', reasons: [],
    coverage: { total: 4, completed: 0, detected: 0, no_detection: 0, unavailable: 4, error: 0, pending: 0, unknown: 0, sufficient: false },
    engines, cloudflare_reports: [],
    whois: { registrar: null, creation_date: null, source: null, observed_at: null },
    observed_at: observed, expires_at: expires, cached: false,
    privacy: { sensitive_parameters: false, third_party_submission: false },
    ...overrides,
  };
}

export function evidence(overrides = {}) {
  return {
    id: 'brand-impersonation', source: 'URL Heuristic Analysis', title: 'Brand outside its official domain',
    description: 'The PayPal name appears outside paypal.com.', severity: 'warning', threat_type: 'suspicious_structure',
    observed_at: new Date().toISOString(), ...overrides,
  };
}
