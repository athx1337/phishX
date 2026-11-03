import test from 'node:test';
import assert from 'node:assert/strict';
import { isScanReport, isFreshScanReport, hasSensitiveParameters, redactUrl, POLICY_VERSION } from '../shared/scan.ts';

const time = '2026-11-03T10:00:00.000Z';
function fixture() {
  const url = 'https://example.com/';
  const engines = ['gsb', 'urlhaus', 'virustotal', 'cloudflare'].map(id => ({
    id, name: id, kind: id === 'cloudflare' ? 'active' : 'reputation', status: 'unavailable',
    observed_at: time, evidence: [], targets: [{ url, status: 'unavailable', observed_at: time, evidence: [] }],
  }));
  return {
    schema_version: 2, policy_version: POLICY_VERSION, scan_id: '9d9f25cf-daf3-4f44-ab50-e81509f7e990',
    url, checked_urls: [url], dual_protocol: false,
    domain: { hostname: 'example.com', registrable_domain: 'example.com', unicode_hostname: 'example.com', is_ip: false },
    verdict: 'unknown', summary: 'Insufficient fresh reputation coverage.', reasons: [],
    coverage: { total: 4, completed: 0, detected: 0, no_detection: 0, unavailable: 4, error: 0, pending: 0, unknown: 0, sufficient: false },
    engines, cloudflare_reports: [], whois: { registrar: null, creation_date: null, source: null, observed_at: null },
    observed_at: time, expires_at: '2026-11-03T10:05:00.000Z', cached: false,
    privacy: { sensitive_parameters: false, third_party_submission: false },
  };
}
test('accepts a complete v2 unknown report without manufactured observations', () => assert.ok(isScanReport(fixture())));
test('refuses legacy binary API reports', () => assert.equal(isScanReport({ is_phishing: false }), false));
for (const [name, mutate] of [
  ['unknown schema', r => { r.schema_version = 3; }],
  ['invalid verdict', r => { r.verdict = 'safe'; }],
  ['invalid scan id', r => { r.scan_id = '../../secret'; }],
  ['missing privacy', r => { delete r.privacy; }],
  ['bad timestamp', r => { r.observed_at = 'yesterday'; }],
  ['expiry before observation', r => { r.expires_at = '2026-01-01T00:00:00.000Z'; }],
  ['incorrect coverage total', r => { r.coverage.total = 5; }],
  ['incorrect coverage status count', r => { r.coverage.unavailable = 0; }],
  ['fabricated completed count', r => { r.coverage.completed = 4; }],
  ['negative coverage', r => { r.coverage.error = -1; }],
  ['duplicate engine ids', r => { r.engines[1].id = r.engines[0].id; }],
  ['missing target', r => { r.engines[0].targets = []; }],
  ['wrong target', r => { r.engines[0].targets[0].url = 'https://other.example/'; }],
  ['invalid evidence', r => { r.reasons = [{ title: 'Trust me' }]; }],
  ['old clean verdict', r => { r.verdict = 'no_known_threats'; }],
  ['external polling URL', r => { r.deep_scan = { poll_path: 'https://attacker.example/', next_poll_at: time, expires_at: r.expires_at }; }],
  ['different polling job', r => { r.deep_scan = { poll_path: '/api/scans/other', next_poll_at: time, expires_at: r.expires_at }; }],
  ['poll after expiry', r => { r.deep_scan = { poll_path: `/api/scans/${r.scan_id}`, next_poll_at: '2026-11-04T00:00:00.000Z', expires_at: r.expires_at }; }],
  ['malformed telemetry', r => { r.cloudflare_reports = [{ url: r.url, certificates: 'fake' }]; }],
]) {
  test(`rejects ${name}`, () => { const report = fixture(); mutate(report); assert.equal(isScanReport(report), false); });
}
test('accepts a bounded same-job poll reference', () => {
  const r = fixture(); r.deep_scan = { poll_path: `/api/scans/${r.scan_id}`, next_poll_at: time, expires_at: r.expires_at };
  assert.ok(isScanReport(r));
});
test('a fabricated sufficient flag cannot convert unavailable checks into a clean report', () => {
  const r = fixture(); r.verdict = 'no_known_threats'; r.coverage.sufficient = true;
  assert.equal(isScanReport(r), false);
});
test('accepts no-known-threats only with two completed reputation providers', () => {
  const r = fixture(); r.verdict = 'no_known_threats';
  for (const engine of r.engines.slice(0, 2)) { engine.status = 'no_detection'; engine.targets[0].status = 'no_detection'; }
  Object.assign(r.coverage, { sufficient: true, completed: 2, no_detection: 2, unavailable: 2 });
  assert.ok(isScanReport(r));
  r.engines[0].evidence = [{ id: 'warning', source: 'test', title: 'Possible impersonation', description: 'Conflicting evidence',
    severity: 'warning', threat_type: 'phishing', observed_at: time }];
  assert.equal(isScanReport(r), false);
});
test('sensitive URL parameters and fragments require acknowledgement', () => {
  assert.ok(hasSensitiveParameters('example.com/?access_token=secret'));
  assert.ok(hasSensitiveParameters('https://example.com/#private-token'));
  assert.equal(hasSensitiveParameters('https://example.com/search?q=weather'), false);
});
test('history redacts all query values, credentials and fragments without changing input', () => {
  const input = 'https://person:password@example.com/path?token=secret&q=private#private';
  const result = redactUrl(input);
  assert.equal(new URL(result).searchParams.get('token'), '[redacted]');
  assert.equal(new URL(result).searchParams.get('q'), '[redacted]');
  assert.equal(new URL(result).username, ''); assert.equal(new URL(result).hash, '');
  assert.equal(input.includes('token=secret'), true);
  assert.equal(result.includes('password'), false);
});

test('freshness rejects expired reports while permitting an explicitly historical display', () => {
  const r = fixture();
  assert.ok(isScanReport(r));
  assert.ok(isFreshScanReport(r, Date.parse(time)));
  assert.equal(isFreshScanReport(r, Date.parse(r.expires_at)), false);
  assert.equal(isFreshScanReport(r, Date.parse(time) - 600_000), false);
});
test('fresh clean coverage requires unexpired per-target evidence, not just a future report expiry', () => {
  const r = fixture(); r.verdict = 'no_known_threats';
  for (const engine of r.engines.slice(0, 2)) { engine.status = 'no_detection'; engine.targets[0].status = 'no_detection'; }
  Object.assign(r.coverage, { sufficient: true, completed: 2, no_detection: 2, unavailable: 2 });
  assert.ok(isScanReport(r));
  assert.equal(isFreshScanReport(r, Date.parse(time)), false);
  for (const engine of r.engines.slice(0, 2)) engine.targets[0].expires_at = r.expires_at;
  assert.ok(isFreshScanReport(r, Date.parse(time)));
  r.engines[0].targets[0].expires_at = time;
  assert.equal(isFreshScanReport(r, Date.parse(time)), false);
});

test('genuine local model engines are explicit and never inflate remote coverage', () => {
  const r = fixture();
  r.engines.push({ id: 'xgboost', name: 'XGBoost URL model', kind: 'model', status: 'no_detection',
    observed_at: time, evidence: [], targets: [{ url: r.url, status: 'no_detection', observed_at: time, evidence: [],
      data: { model_version: 'test-artifact', raw_score: 0.2, threshold: 0.9 } }] });
  assert.ok(isScanReport(r));
  r.coverage.total = 5;
  assert.equal(isScanReport(r), false);
});
test('RDAP metadata is bounded and unavailable data cannot become manufactured dates', () => {
  const r = fixture();
  r.registration = { status: 'available', source: 'RDAP registry', registrar: null,
    created_at: '2026-01-01T00:00:00.000Z', age_days: 306, observed_at: time };
  assert.ok(isScanReport(r));
  r.registration.age_days = -1;
  assert.equal(isScanReport(r), false);
  r.registration.age_days = 306; r.registration.created_at = 'not-reported';
  assert.equal(isScanReport(r), false);
});
test('optional AI output may refer only to recorded evidence identifiers', () => {
  const r = fixture();
  r.explanation = { source: 'gemini', evidence_ids: ['invented-blocklist-match'], text: 'Unsupported claim' };
  assert.equal(isScanReport(r), false);
  r.explanation = { source: 'deterministic', evidence_ids: [], text: r.summary };
  assert.ok(isScanReport(r));
});
test('Gemini metadata is additive while successful and fallback states cannot contradict provenance', () => {
  const r = fixture();
  r.explanation = { source: 'gemini', evidence_ids: [], text: r.summary };
  assert.ok(isScanReport(r)); // Existing v2 reports do not need the new optional metadata.
  r.explanation.ai_status = 'complete'; r.explanation.model = 'gemini-2.5-flash';
  assert.ok(isScanReport(r));
  r.explanation.ai_status = 'timeout'; assert.equal(isScanReport(r), false);
  r.explanation.source = 'deterministic'; assert.ok(isScanReport(r));
  r.explanation.ai_status = 'complete'; assert.equal(isScanReport(r), false);
  r.explanation.ai_status = 'not_configured'; r.explanation.model = 'https://untrusted.invalid/';
  assert.equal(isScanReport(r), false);
  delete r.explanation.model; assert.ok(isScanReport(r));
  r.explanation.ai_status = 'unrecognized'; assert.equal(isScanReport(r), false);
});
test('destination assessments must be explicit, bounded and scoped to their own URL', () => {
  const r = fixture();
  r.destinations = [{ url: r.url }];
  assert.equal(isScanReport(r), false);
  const destination = { url: r.url, domain: r.domain, verdict: r.verdict, summary: r.summary, reasons: [],
    coverage: r.coverage, engines: r.engines, observed_at: time, expires_at: r.expires_at };
  r.destinations = [destination]; assert.ok(isScanReport(r));
  r.destinations = Array(5).fill(destination); assert.equal(isScanReport(r), false);
});
test('incomplete destination investigation vetoes a parent clean conclusion', () => {
  const r = fixture();
  r.destinations = [{ url: r.url, domain: r.domain, verdict: r.verdict, summary: r.summary, reasons: [],
    coverage: { ...r.coverage }, engines: structuredClone(r.engines), observed_at: time, expires_at: r.expires_at }];
  for (const engine of r.engines.slice(0, 2)) { engine.status = 'no_detection'; engine.targets[0].status = 'no_detection'; }
  Object.assign(r.coverage, { sufficient: true, completed: 2, no_detection: 2, unavailable: 2 });
  r.verdict = 'no_known_threats';
  assert.equal(isScanReport(r), false);
});
