import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/index';
import { isScanReport } from '../../shared/scan';
import { parseInput, isPublicIp } from '../src/url';
import { analyzeHeuristics } from '../src/heuristics';
import { assess, aggregate, evidence, expireEvidence, target, unavailable } from '../src/evidence';
import { cacheKey } from '../src/storage';
import { googleSafeBrowsing, matchesGoogleExpression, urlIdentifier, virusTotal, urlhaus } from '../src/providers';
import { pollCloudflare, validateActiveDestination } from '../src/cloudflare';
import { requestJson } from '../src/http';
import type { Bindings, CacheStore } from '../src/types';
import type { EngineResult, ScanReport } from '../../shared/scan';

const NOW = Date.parse('2026-11-03T10:00:00.000Z');
const CF_UUID = '12345678-1234-4234-8234-123456789abc';
const CF_ACCOUNT = '0123456789abcdef0123456789abcdef';
class MemoryCache implements CacheStore {
  values = new Map<string, string>();
  get = vi.fn(async (key: string) => this.values.get(key) || null);
  put = vi.fn(async (key: string, value: string) => { this.values.set(key, value); });
}
function env(extra: Partial<Bindings> = {}): Bindings {
  return { HTTP_RETRIES: 'false', SCAN_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) }, POLL_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) }, ...extra };
}
function remoteKeys(extra: Partial<Bindings> = {}) { return env({ GOOGLE_SAFE_BROWSING_API_KEY: 'gsb-test-key', URLHAUS_API_KEY: 'haus-test-key', VIRUSTOTAL_API_KEY: 'vt-test-key', ...extra }); }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }
function providerFixtures(options: { malicious?: number; gsbThreat?: boolean; stale?: boolean; cfPending?: boolean; cfFailed?: boolean; cfMalicious?: boolean; cfAgeMs?: number; gsbSeconds?: number; cfStatus?: string; } = {}) {
  const submitted = new Map<string, string>();
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('safebrowsing')) return json({ cacheDuration: `${options.gsbSeconds ?? 300}s`, ...(options.gsbThreat ? { threats: [{ url: 'https://example.com/', threatTypes: ['SOCIAL_ENGINEERING'] }] } : { threats: [] }) });
    if (url.includes('urlhaus')) return json({ query_status: 'no_results' });
    if (url.includes('/api/v3/domains/')) return json({ data: { attributes: { registrar: 'Example registrar', creation_date: 1_500_000_000, whois_date: NOW / 1000 } } });
    if (url.includes('virustotal')) return json({ data: { attributes: { last_analysis_date: (NOW - (options.stale ? 48 * 3_600_000 : 60_000)) / 1000,
      last_analysis_stats: { malicious: options.malicious || 0, suspicious: 0, harmless: 30, undetected: 20 } } } });
    if (url.includes('dns-query')) return json({ Status: 0, Answer: new URL(url).searchParams.get('type') === 'A' ? [{ type: 1, data: '8.8.8.8' }] : [] });
    if (url.includes('/urlscanner/v2/scan') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)); const id = submitted.size ? '87654321-4321-4321-8321-cba987654321' : CF_UUID;
      submitted.set(id, body.url); return json({ uuid: id, visibility: 'unlisted' });
    }
    if (url.includes('/urlscanner/v2/result/')) {
      if (options.cfPending) return json({}, 404);
      const id = url.split('/').at(-1)!;
      return json({ task: { uuid: id, url: submitted.get(id) || 'https://example.com/', success: !options.cfFailed, status: options.cfStatus || 'Finished', time: new Date(NOW - (options.cfAgeMs || 0)).toISOString() },
        verdicts: { overall: { malicious: !!options.cfMalicious } }, page: { ip: '8.8.8.8', asn: 'AS15169', country: 'US', url: 'https://example.com/' },
        lists: { certificates: [{ subjectName: 'example.com', issuer: 'Observed CA', validFrom: 1_700_000_000, validTo: 1_900_000_000 }], urls: ['https://example.com/observed'] },
        data: { requests: [{ request: { request: { url: 'https://example.com/', method: 'GET' } }, response: { response: { status: 200, remoteIPAddress: '8.8.8.8' } } }] } });
    }
    throw new Error(`Unexpected fixture endpoint ${url}`);
  });
}
async function verify(body: unknown = { url: 'https://example.com/' }, bindings = env(), headers: Record<string, string> = {}) {
  return app.request('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }, bindings);
}
async function validReport(response: Response): Promise<ScanReport> {
  const report = await response.json();
  expect(response.status, JSON.stringify(report)).toBe(200);
  expect(isScanReport(report), JSON.stringify(report)).toBe(true);
  return report as ScanReport;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Unmocked outbound call'); })); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('request and URL validation boundary', () => {
  it.each([null, [], {}, { url: 123 }, { url: '' }, { url: 'https://example.com', refresh: 'true' }])('rejects invalid object %j', async body => {
    expect((await verify(body)).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON and unsupported content types without a 500', async () => {
    expect((await app.request('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, env())).status).toBe(400);
    expect((await app.request('/api/verify', { method: 'POST', body: '{}' }, env())).status).toBe(415);
  });
  it('bounds body and URL sizes', async () => {
    expect((await verify({ url: 'https://example.com/' + 'a'.repeat(5000) })).status).toBe(400);
    expect((await verify({ url: 'https://example.com/', unused: 'a'.repeat(9000) })).status).toBe(413);
  });
  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'http://127.0.0.1', 'http://2130706433', 'http://0x7f000001', 'http://0177.0.0.1', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'http://169.254.169.254', 'http://100.64.0.1', 'http://10.1.2.3', 'http://localhost', 'http://foo.internal', 'https://999.999.999.999', 'https://example.com\\@127.0.0.1', 'https://example.com/\npath'])('rejects prohibited URL %s', url => {
    expect(() => parseInput({ url })).toThrow();
  });
  it.each(['https://example.com:8443/path', 'https://example.com?x=1', 'HTTPS://EXAMPLE.COM/path', 'https://例え.jp/道', 'http://[2606:4700:4700::1111]/'])('supports valid parsing %s', url => {
    const parsed = parseInput({ url }); expect(parsed.targets).toHaveLength(1); expect(parsed.primary.startsWith('http')).toBe(true);
  });
  it('preserves both protocols and PSL boundaries', () => {
    const parsed = parseInput({ url: 'paypal.com.verify-account.example.co.uk/login' });
    expect(parsed.domain.registrable_domain).toBe('example.co.uk'); expect(parsed.targets).toEqual(['https://paypal.com.verify-account.example.co.uk/login', 'http://paypal.com.verify-account.example.co.uk/login']);
  });
  it('preserves explicitly supplied default HTTPS ports across protocol variants', () => {
    expect(parseInput({ url: 'example.com:443/path' }).targets).toEqual(['https://example.com/path', 'http://example.com:443/path']);
  });
  it('requires sensitive URL consent and keeps query evidence after consent', async () => {
    expect((await verify({ url: 'https://example.com/?token=private' })).status).toBe(400);
    const parsed = parseInput({ url: 'https://example.com/?token=private#secret', sensitive_url_consent: true });
    expect(parsed.primary).toBe('https://example.com/?token=private'); expect(parsed.sensitive).toBe(true);
  });
  it('recognizes public and reserved IP ranges', () => { expect(isPublicIp('8.8.8.8')).toBe(true); expect(isPublicIp('192.0.2.1')).toBe(false); expect(isPublicIp('::ffff:10.0.0.1')).toBe(false); });
});

describe('trust policy regression matrix', () => {
  it('returns unknown without provider credentials and invents no telemetry', async () => {
    const result = await validReport(await verify({ url: 'https://example.com/login' }));
    expect(result.verdict).toBe('unknown'); expect(result.coverage.completed).toBe(0); expect(result.coverage.total).toBe(4);
    expect(result.cloudflare_reports).toEqual([]); expect(result.whois.registrar).toBeNull();
    expect(result.privacy.third_party_submission).toBe(true); // Credential-free registry lookup was attempted.
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url) === 'https://data.iana.org/rdap/dns.json')).toBe(true);
  });
  it.each(['https://paypal.com.verify-account.example.com/login', 'https://paypa1.example.com/', 'https://раypal.example.com/'])('warns about explainable impersonation %s', async url => {
    const result = await validReport(await verify({ url })); expect(result.verdict).toBe('suspicious'); expect(result.reasons.some(r => r.id.startsWith('brand-'))).toBe(true);
  });
  it.each(['https://accounts.google.com/login', 'https://www.google.com.au/', 'https://www.amazon.com.au/', 'https://paypal.me/person', 'https://paypal.com/signin', 'https://microsoft.com/update', 'https://example.com/gist.githubusercontent.com/raw'])('does not invent threats for %s', async url => {
    const result = await validReport(await verify({ url })); expect(result.verdict).toBe('unknown'); expect(result.reasons.some(r => r.severity !== 'info')).toBe(false);
  });
  it('does not hardcode raw Gist as malware and attributes any learned model warning', async () => {
    const url = 'https://gist.githubusercontent.com/person/id/raw/hello.txt';
    expect(analyzeHeuristics(parseInput({ url })).evidence).toEqual([]);
    const result = await validReport(await verify({ url }));
    expect(result.verdict).not.toBe('malicious');
    expect(result.reasons.every(reason => reason.source === 'XGBoost URL model')).toBe(true);
    expect(result.reasons.every(reason => reason.severity === 'warning' && reason.threat_type === 'suspicious_structure')).toBe(true);
    expect(result.coverage.completed).toBe(0);
  });
  it('only identifies a shortener by its actual hostname', () => {
    expect(analyzeHeuristics(parseInput({ url: 'https://microsoft.com/path/bit.ly' })).evidence.some(e => e.id === 'shortener')).toBe(false);
    expect(analyzeHeuristics(parseInput({ url: 'https://bit.ly/example' })).evidence.find(e => e.id === 'shortener')?.severity).toBe('info');
  });
  it.each([[1, false, 'suspicious'], [20, false, 'malicious'], [20, true, 'suspicious'], [0, true, 'unknown']] as const)('interprets VT count=%s stale=%s as %s', async (malicious, stale, verdict) => {
    vi.stubGlobal('fetch', providerFixtures({ malicious, stale }));
    const result = await validReport(await verify(undefined, env({ VIRUSTOTAL_API_KEY: 'test' })));
    expect(result.verdict).toBe(verdict); expect(result.engines.find(e => e.id === 'virustotal')?.targets[0].data?.malicious_count).toBe(malicious);
  });
  it('does not outvote authoritative GSB detection', async () => {
    vi.stubGlobal('fetch', providerFixtures({ gsbThreat: true }));
    expect((await validReport(await verify(undefined, remoteKeys()))).verdict).toBe('malicious');
  });
  it('allows cautious non-detection only with two fresh full reputation sources', async () => {
    vi.stubGlobal('fetch', providerFixtures());
    const result = await validReport(await verify({ url: 'example.com' }, env({ GOOGLE_SAFE_BROWSING_API_KEY: 'test', URLHAUS_API_KEY: 'test' })));
    expect(result.verdict).toBe('no_known_threats'); expect(result.coverage.completed).toBe(2); expect(result.summary).toContain('does not guarantee');
  });
  it('never counts one clean protocol as full provider coverage', () => {
    const urls = ['https://example.com/', 'http://example.com/'];
    const clean = target(urls[0], 'no_detection', { expires_at: new Date(NOW + 300000).toISOString() });
    const partial = ['gsb', 'urlhaus'].map(id => aggregate(id, id, 'reputation', [clean, target(urls[1], 'error')]));
    expect(assess(partial, urls).verdict).toBe('unknown'); expect(assess(partial, urls).coverage.completed).toBe(0);
  });
  it('expires reputation evidence while retaining historical warning', () => {
    const url = 'https://example.com/';
    const engines = [aggregate('virustotal', 'VirusTotal', 'reputation', [target(url, 'detected', { expires_at: new Date(NOW - 1).toISOString(), evidence: [evidence('VirusTotal', 'd', 'Known flags', 'Historical finding', 'high', 'unknown', url)] })])];
    const aged = expireEvidence(engines); expect(aged[0].status).toBe('unknown'); expect(assess(aged, [url]).verdict).toBe('suspicious');
  });
});

describe('provider response contracts and deadlines', () => {
  it('preserves a GSB positive with immediate cache expiry as a warning', async () => {
    vi.stubGlobal('fetch', providerFixtures({ gsbThreat: true, gsbSeconds: 0 }));
    const result = await validReport(await verify(undefined, remoteKeys()));
    expect(result.verdict).toBe('suspicious');
    expect(result.engines.find(e => e.id === 'gsb')?.targets[0]).toMatchObject({ status: 'unknown', error_code: 'STALE_RESULT' });
    expect(result.reasons.some(e => e.source === 'Google Safe Browsing' && e.severity === 'warning')).toBe(true);
  });
  it('treats a zero-vendor VT report as unknown rather than a clean check', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: { attributes: { last_analysis_date: NOW / 1000,
      last_analysis_stats: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0 } } } })));
    expect((await virusTotal(['https://example.com/'], env({ VIRUSTOTAL_API_KEY: 'test' }))).status).toBe('unknown');
  });
  it.each(['https://unrelated.example/path/', 'https://com/', 'https://example.com/other/', 'javascript:alert(1)'])('rejects unrelated Google threat scope %s', async scope => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ cacheDuration: '300s', threats: [{ url: scope, threatTypes: ['MALWARE'] }] })));
    expect((await googleSafeBrowsing(['https://example.com/path/'], env({ GOOGLE_SAFE_BROWSING_API_KEY: 'test' }), false)).status).toBe('error');
  });
  it('accepts bounded Google host/path expressions without accepting string-prefix impostors', () => {
    expect(matchesGoogleExpression('https://example.com/path/', 'https://sub.example.com/path/page?x=1')).toBe(true);
    expect(matchesGoogleExpression('https://example.com/path', 'https://example.com/pathology')).toBe(false);
    expect(matchesGoogleExpression('https://example.com/', 'https://notexample.com/')).toBe(false);
  });
  it('rejects unknown Google threat types', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ cacheDuration: '300s', threats: [{ url: 'https://example.com/', threatTypes: ['INVENTED'] }] })));
    expect((await googleSafeBrowsing(['https://example.com/'], env({ GOOGLE_SAFE_BROWSING_API_KEY: 'test' }), false)).status).toBe('error');
  });
  it('uses GSB v5 with independent credential header and provider duration', async () => {
    const fetcher = providerFixtures({ gsbSeconds: 45 }); vi.stubGlobal('fetch', fetcher);
    const result = await googleSafeBrowsing(['https://example.com/'], env({ GOOGLE_SAFE_BROWSING_API_KEY: 'gsb-only' }), false);
    expect(fetcher.mock.calls[0][0]).toContain('/v5/urls:search?'); expect(fetcher.mock.calls[0][1]?.headers).toEqual({ 'x-goog-api-key': 'gsb-only' });
    expect(Date.parse(result.targets[0].expires_at!)).toBe(NOW + 45_000);
  });
  it('rejects empty/malformed success payloads rather than interpreting them clean', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({})));
    const bindings = remoteKeys();
    expect((await googleSafeBrowsing(['https://example.com/'], bindings, false)).status).toBe('error');
    expect((await virusTotal(['https://example.com/'], bindings)).status).toBe('error');
    expect((await urlhaus(['https://example.com/'], bindings)).status).toBe('error');
  });
  it('marks missing VT reports as unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 404)));
    expect((await virusTotal(['https://example.com/'], env({ VIRUSTOTAL_API_KEY: 'test' }))).status).toBe('unknown');
  });
  it('rejects URLhaus and VirusTotal reports that explicitly identify a different URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ query_status: 'ok', url: 'https://other.example/', url_status: 'online', threat: 'malware_download' })));
    expect((await urlhaus(['https://example.com/'], env({ URLHAUS_API_KEY: 'test' }))).targets[0].error_code).toBe('MISMATCHED_REPORT');
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: { attributes: { url: 'http://example.com/', last_analysis_date: NOW / 1000,
      last_analysis_stats: { malicious: 20, suspicious: 0, harmless: 0, undetected: 0 } } } })));
    expect((await virusTotal(['https://example.com/'], env({ VIRUSTOTAL_API_KEY: 'test' }))).targets[0].error_code).toBe('MISMATCHED_REPORT');
  });
  it('keeps URLhaus detections classified as malware', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ query_status: 'ok', url_status: 'offline', threat: 'malware_download' })));
    const result = await urlhaus(['https://example.com/'], env({ URLHAUS_API_KEY: 'test' }));
    expect(result.evidence[0].threat_type).toBe('malware'); expect(result.evidence[0].description).toContain('historical');
  });
  it('encodes non-Latin URL paths with UTF-8', () => {
    const value = 'https://example.com/道'; expect(Buffer.from(urlIdentifier(value), 'base64url').toString('utf8')).toBe(value);
  });
  it('bounds hanging upstream requests with an abort', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))));
    const operation = requestJson('https://provider.example/'); const assertion = expect(operation).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(4501); await assertion;
  });
  it('sanitizes upstream authentication errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('secret-authentication-details', { status: 401 })));
    const result = await googleSafeBrowsing(['https://example.com/'], env({ GOOGLE_SAFE_BROWSING_API_KEY: 'sensitive-key' }), false);
    expect(result.targets[0].error_code).toBe('AUTHENTICATION_FAILED'); expect(JSON.stringify(result)).not.toContain('sensitive-key'); expect(JSON.stringify(result)).not.toContain('secret-authentication-details');
  });
});

describe('cache isolation, CORS and quota protection', () => {
  it('isolates policy/protocol/configuration in hashed keys', async () => {
    const explicit = await cacheKey(['https://example.com/'], env());
    expect(explicit).toMatch(/^report:[a-f0-9]{64}$/); expect(explicit).not.toContain('example');
    expect(explicit).not.toBe(await cacheKey(['https://example.com/', 'http://example.com/'], env()));
    expect(explicit).not.toBe(await cacheKey(['https://example.com/'], env({ CACHE_CONFIG_VERSION: '2' })));
    expect(explicit).not.toBe(await cacheKey(['https://example.com/'], remoteKeys()));
  });
  it('caches GSB per protocol with expiry and explicit refresh bypass', async () => {
    const cache = new MemoryCache(), bindings = env({ SCAN_CACHE: cache, GOOGLE_SAFE_BROWSING_API_KEY: 'test' });
    const fetcher = providerFixtures({ gsbSeconds: 30 }); vi.stubGlobal('fetch', fetcher);
    await googleSafeBrowsing(['https://example.com/'], bindings, false); await googleSafeBrowsing(['https://example.com/'], bindings, false); expect(fetcher).toHaveBeenCalledTimes(1);
    await googleSafeBrowsing(['https://example.com/'], bindings, true); expect(fetcher).toHaveBeenCalledTimes(2);
    vi.setSystemTime(NOW + 31_000); await googleSafeBrowsing(['https://example.com/'], bindings, false); expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('ignores malformed GSB cached detections and requeries instead of emitting invalid public reports', async () => {
    const cache = new MemoryCache(), bindings = env({ SCAN_CACHE: cache, GOOGLE_SAFE_BROWSING_API_KEY: 'test' });
    const fetcher = providerFixtures(); vi.stubGlobal('fetch', fetcher);
    await googleSafeBrowsing(['https://example.com/'], bindings, false);
    const storedKey = [...cache.values.keys()][0];
    const raw = JSON.parse(cache.values.get(storedKey)!); raw.status = 'detected'; raw.evidence = [{ source: 'Google Safe Browsing', severity: 'high', title: 'bad' }];
    cache.values.set(storedKey, JSON.stringify(raw));
    const result = await googleSafeBrowsing(['https://example.com/'], bindings, false);
    expect(result.status).toBe('no_detection'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('ignores legacy cached binary responses', async () => {
    const cache = new MemoryCache(), bindings = env({ SCAN_CACHE: cache });
    cache.values.set(await cacheKey(['https://example.com/'], bindings), JSON.stringify({ is_phishing: false }));
    expect((await validReport(await verify(undefined, bindings))).verdict).toBe('unknown');
  });
  it('does not cache incomplete unknown reports', async () => {
    const cache = new MemoryCache(); await validReport(await verify(undefined, env({ SCAN_CACHE: cache })));
    expect([...cache.values.keys()].some(k => k.startsWith('report:'))).toBe(false);
  });
  it('restricts browser origins and never enables credentials', async () => {
    const forbidden = await verify(undefined, env(), { Origin: 'https://attacker.example' }); expect(forbidden.status).toBe(403); expect(forbidden.headers.get('Access-Control-Allow-Origin')).toBeNull();
    const allowed = await verify(undefined, env(), { Origin: 'http://localhost:5173' }); expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173'); expect(allowed.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(allowed.headers.get('Cache-Control')).toBe('no-store');
  });
  it('fails closed when limiter is missing or exhausted', async () => {
    expect((await verify(undefined, {})).status).toBe(503);
    const limited = await verify(undefined, env({ SCAN_RATE_LIMITER: { limit: async () => ({ success: false }) } }));
    expect(limited.status).toBe(429); expect(limited.headers.get('Retry-After')).toBe('60'); expect(fetch).not.toHaveBeenCalled();
  });
});

describe('unlisted asynchronous Cloudflare inspection', () => {
  it('does not spend another Gemini request when a due active poll stays pending', async () => {
    const cache = new MemoryCache(), provider = providerFixtures({ gsbThreat: true, cfPending: true });
    vi.stubGlobal('fetch', vi.fn(async (url, init) => String(url).includes('generativelanguage.googleapis.com') ?
      json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ verdict: 'malicious', evidence_ids: ['gsb-0'] }) }] } }] }) : provider(url, init)));
    const bindings = { ...cloudEnv(cache), GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'test' };
    const initial = await validReport(await verify(undefined, bindings));
    vi.setSystemTime(NOW + 10_001);
    const unchanged = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    expect(unchanged.explanation).toEqual(initial.explanation);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis.com'))).toHaveLength(1);
  });
  it('downgrades expired AI context before polling while retaining the historical warning', async () => {
    const cache = new MemoryCache(), provider = providerFixtures({ gsbThreat: true, cfPending: true, gsbSeconds: 5 });
    vi.stubGlobal('fetch', vi.fn(async (url, init) => String(url).includes('generativelanguage.googleapis.com') ?
      json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ verdict: 'malicious', evidence_ids: ['gsb-0'] }) }] } }] }) : provider(url, init)));
    const bindings = { ...cloudEnv(cache), GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'test' };
    const initial = await validReport(await verify(undefined, bindings));
    expect(initial.explanation?.ai_status).toBe('complete');
    vi.setSystemTime(NOW + 6000);
    const expired = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    expect(expired.explanation).toMatchObject({ source: 'deterministic', ai_status: 'unavailable', model: 'gemini-2.5-flash', evidence_ids: ['gsb-0'] });
    expect(expired.verdict).toBe('suspicious');
    expect(expired.reasons.some(item => item.id === 'gsb-0')).toBe(true);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis.com'))).toHaveLength(1);
  });
  it('preserves a validated evidence selection when a fresh job update keeps its verdict', async () => {
    const cache = new MemoryCache(), provider = providerFixtures({ gsbThreat: true });
    vi.stubGlobal('fetch', vi.fn(async (url, init) => String(url).includes('generativelanguage.googleapis.com') ?
      json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ verdict: 'malicious', evidence_ids: ['gsb-0'] }) }] } }] }) : provider(url, init)));
    const bindings = { ...cloudEnv(cache), GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'test' };
    const initial = await validReport(await verify(undefined, bindings)); expect(initial.explanation?.source).toBe('gemini');
    const unchanged = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    expect(unchanged.explanation).toEqual(initial.explanation);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis.com'))).toHaveLength(1);
    vi.setSystemTime(NOW + 10_001);
    const finished = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    expect(finished.verdict).toBe('malicious'); expect(finished.explanation?.source).toBe('gemini');
    expect(finished.explanation?.evidence_ids).toEqual(['gsb-0']);
    expect(finished.explanation?.ai_status).toBe('complete');
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis.com'))).toHaveLength(2);
  });
  it.each(['finished', 'Finished'])('accepts the live/documented successful status %s', async cfStatus => {
    vi.stubGlobal('fetch', providerFixtures({ cfStatus }));
    const result = await pollCloudflare({ url: 'https://example.com/', provider_id: CF_UUID }, cloudEnv());
    expect(result.target.status).toBe('no_detection'); expect(result.report?.source).toBe('Cloudflare URL Scanner');
  });
  it.each(['queued', 'InProgress', 'inpostprocessing'])('keeps %s incomplete', async cfStatus => {
    vi.stubGlobal('fetch', providerFixtures({ cfStatus }));
    expect((await pollCloudflare({ url: 'https://example.com/', provider_id: CF_UUID }, cloudEnv())).target.status).toBe('pending');
  });
  function cloudEnv(cache: MemoryCache = new MemoryCache()) { return remoteKeys({ SCAN_CACHE: cache, CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT, CLOUDFLARE_API_TOKEN: 'cf-test-token' }); }
  it('does not submit active scans without storage', async () => {
    const fetcher = providerFixtures(); vi.stubGlobal('fetch', fetcher);
    const result = await validReport(await verify(undefined, env({ CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT, CLOUDFLARE_API_TOKEN: 'cf-test-token' })));
    expect(result.engines.find(e => e.id === 'cloudflare')?.status).toBe('unavailable');
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('/urlscanner/'))).toBe(false); expect(result.deep_scan).toBeUndefined();
  });
  it('checks all DNS addresses and refuses private resolution before submission', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ Status: 0, Answer: [{ type: 1, data: '127.0.0.1' }] })));
    await expect(validateActiveDestination(parseInput({ url: 'example.com' }))).rejects.toMatchObject({ code: 'PROHIBITED_DESTINATION' });
  });
  it('persists reservation before submission and evaluates both protocol targets', async () => {
    const cache = new MemoryCache(), fetcher = providerFixtures(); vi.stubGlobal('fetch', fetcher);
    const result = await validReport(await verify({ url: 'example.com' }, cloudEnv(cache)));
    expect([...cache.values.keys()].some(k => k.startsWith('reservation:'))).toBe(true);
    expect(result.verdict).toBe('unknown'); expect(result.deep_scan?.poll_path).toBe(`/api/scans/${result.scan_id}`);
    const submissions = fetcher.mock.calls.filter(([url]) => String(url).endsWith('/urlscanner/v2/scan'));
    expect(submissions).toHaveLength(2); expect(submissions.map(call => JSON.parse(String(call[1]?.body)))).toEqual(expect.arrayContaining([{ url: 'https://example.com/', visibility: 'Unlisted' }, { url: 'http://example.com/', visibility: 'Unlisted' }]));
    expect(JSON.stringify(result)).not.toContain(CF_UUID); expect(result.cloudflare_reports).toEqual([]);
    const initialCalls = fetcher.mock.calls.length;
    const early = await validReport(await app.request(result.deep_scan!.poll_path, {}, cloudEnv(cache)));
    expect(fetcher.mock.calls.length).toBe(initialCalls); expect(early.verdict).toBe('unknown');
    vi.setSystemTime(NOW + 10_001);
    const finished = await validReport(await app.request(result.deep_scan!.poll_path, {}, cloudEnv(cache)));
    expect(finished.deep_scan).toBeUndefined(); expect(finished.verdict).toBe('no_known_threats'); expect(finished.coverage.completed).toBe(4);
    expect(finished.cloudflare_reports).toHaveLength(2); expect(finished.cloudflare_reports[0].ip).toBe('8.8.8.8'); expect(finished.cloudflare_reports[0].requests[0].method).toBe('GET');
    const callsBeforeHit = fetcher.mock.calls.length;
    const cached = await validReport(await verify({ url: 'example.com' }, cloudEnv(cache)));
    expect(cached.cached).toBe(true); expect(fetcher.mock.calls.length).toBe(callsBeforeHit);
    const differentScope = await validReport(await verify({ url: 'https://example.com/' }, cloudEnv(cache)));
    expect(differentScope.cached).toBe(false); expect(differentScope.checked_urls).toHaveLength(1);
  });
  it('keeps pending reports incomplete and expires the job', async () => {
    const cache = new MemoryCache(); vi.stubGlobal('fetch', providerFixtures({ cfPending: true })); const bindings = cloudEnv(cache);
    const initial = await validReport(await verify(undefined, bindings)); vi.setSystemTime(NOW + 10_001);
    const pending = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings)); expect(pending.verdict).toBe('unknown'); expect(pending.deep_scan).toBeDefined();
    vi.setSystemTime(NOW + 180_001);
    const expired = await app.request(initial.deep_scan!.poll_path, {}, bindings);
    expect(expired.status).toBe(410); expect(await expired.json()).toMatchObject({ code: 'SCAN_EXPIRED' });
  });
  it('ages initial reputation evidence before deciding the final verdict', async () => {
    const cache = new MemoryCache(); vi.stubGlobal('fetch', providerFixtures({ gsbSeconds: 5 })); const bindings = cloudEnv(cache);
    const initial = await validReport(await verify(undefined, bindings)); vi.setSystemTime(NOW + 10_001);
    const result = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    // URLhaus and VT are still fresh, so two independent reputation sources remain sufficient.
    expect(result.engines.find(e => e.id === 'gsb')?.status).toBe('unknown'); expect(result.coverage.completed).toBe(3);
    expect(result.verdict).toBe('no_known_threats');
  });
  it('never reports a failed browser task as a clean observation', async () => {
    vi.stubGlobal('fetch', providerFixtures({ cfFailed: true }));
    const result = await pollCloudflare({ url: 'https://example.com/', provider_id: CF_UUID }, cloudEnv());
    expect(result.target.status).toBe('error'); expect(result.report).toBeUndefined();
  });
  it.each([false, true])('does not refresh an old Cloudflare observation by polling (positive=%s)', async malicious => {
    vi.stubGlobal('fetch', providerFixtures({ cfAgeMs: 3_600_000, cfMalicious: malicious }));
    const result = await pollCloudflare({ url: 'https://example.com/', provider_id: CF_UUID }, cloudEnv());
    expect(result.target.status).toBe('unknown'); expect(result.target.error_code).toBe('STALE_RESULT');
    expect(Date.parse(result.target.expires_at!)).toBe(NOW - 3_300_000);
    expect(result.target.evidence.some(e => e.severity === 'warning')).toBe(malicious);
    expect(result.report?.observed_at).toBe(new Date(NOW - 3_600_000).toISOString());
  });
  it('rejects a report whose task URL is unrelated to the submitted target', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ task: { uuid: CF_UUID, url: 'https://unrelated.example/', success: true, time: new Date(NOW).toISOString() }, verdicts: { overall: { malicious: false } }, page: {}, lists: {}, data: {} })));
    const result = await pollCloudflare({ url: 'https://example.com/', provider_id: CF_UUID }, cloudEnv());
    expect(result.target.status).toBe('error'); expect(result.target.error_code).toBe('MISMATCHED_REPORT'); expect(result.report).toBeUndefined();
  });
  it('expires completed job capabilities independently of KV retention', async () => {
    const cache = new MemoryCache(); vi.stubGlobal('fetch', providerFixtures()); const bindings = cloudEnv(cache);
    const initial = await validReport(await verify(undefined, bindings)); vi.setSystemTime(NOW + 10_001);
    await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings));
    vi.setSystemTime(NOW + 180_001);
    const expired = await app.request(initial.deep_scan!.poll_path, {}, bindings);
    expect(expired.status).toBe(410); expect(await expired.json()).toMatchObject({ code: 'SCAN_EXPIRED' });
  });
  it('retains malicious evidence when other checks and active jobs fail', async () => {
    const cache = new MemoryCache(); vi.stubGlobal('fetch', providerFixtures({ malicious: 20, cfFailed: true })); const bindings = cloudEnv(cache);
    const initial = await validReport(await verify(undefined, bindings)); expect(initial.verdict).toBe('malicious'); vi.setSystemTime(NOW + 10_001);
    const result = await validReport(await app.request(initial.deep_scan!.poll_path, {}, bindings)); expect(result.verdict).toBe('malicious');
  });
  it('does not submit paid scans if the pre-submission reservation fails', async () => {
    const cache = new MemoryCache(); cache.put.mockRejectedValue(new Error('storage failed')); const fetcher = providerFixtures(); vi.stubGlobal('fetch', fetcher);
    const result = await validReport(await verify(undefined, cloudEnv(cache)));
    expect(result.deep_scan).toBeUndefined(); expect(fetcher.mock.calls.some(([url]) => String(url).includes('urlscanner'))).toBe(false);
  });
});
