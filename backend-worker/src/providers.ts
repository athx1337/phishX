import type { EngineResult, ScanReport, TargetResult, ThreatType } from '../../shared/scan';
import { parse } from 'tldts';
import { aggregate, evidence, nowIso, target, unavailable } from './evidence';
import { errorCode, isoDate, object, ProviderError, requestJson, text, webUrl } from './http';
import { digest, readGsbCache } from './storage';
import type { Bindings } from './types';

export const VT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const expiry = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
const failed = (url: string, error: unknown) => target(url, 'error', { error_code: errorCode(error), message: 'The provider did not return a usable result. This does not indicate safety.' });
const key = (value?: string) => value?.trim() || '';
const GOOGLE_THREAT_TYPES = new Set(['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION']);
/** Accept only a requested URL or its bounded host-suffix/path-prefix expression. */
export function matchesGoogleExpression(expression: string, requested: string): boolean {
  try {
    const source = new URL(requested);
    const match = new URL(/^https?:\/\//i.test(expression) ? expression : `${source.protocol}//${expression}`);
    if (match.username || match.password || match.hash || !parse(match.hostname).domain || match.protocol !== source.protocol || match.port !== source.port) return false;
    const hostMatch = source.hostname === match.hostname || source.hostname.endsWith(`.${match.hostname}`);
    const pathMatch = source.pathname === match.pathname || match.pathname.endsWith('/') && source.pathname.startsWith(match.pathname);
    return hostMatch && pathMatch && (!match.search || match.search === source.search);
  } catch { return false; }
}

export async function googleSafeBrowsing(urls: string[], env: Bindings, refresh: boolean): Promise<EngineResult> {
  const apiKey = key(env.GOOGLE_SAFE_BROWSING_API_KEY);
  if (!apiKey) return unavailable('gsb', 'Google Safe Browsing', 'reputation', urls);
  const targets = await Promise.all(urls.map(async url => {
    const cacheKey = `gsb:${await digest(JSON.stringify([url, env.CACHE_CONFIG_VERSION || '1']))}`;
    if (!refresh) { const cached = await readGsbCache(env, cacheKey, url); if (cached) return cached; }
    try {
      const query = new URLSearchParams(); query.append('urls', url);
      const payload = await requestJson(`https://safebrowsing.googleapis.com/v5/urls:search?${query}`, { headers: { 'x-goog-api-key': apiKey } }, undefined, value => {
        if (!object(value) || typeof value.cacheDuration !== 'string' || !/^\d+(?:\.\d+)?s$/.test(value.cacheDuration) ||
          Number(value.cacheDuration.slice(0, -1)) > 86400 || value.threats !== undefined && !Array.isArray(value.threats)) throw new ProviderError('MALFORMED_RESPONSE');
        const threats = (value.threats || []) as unknown[];
        if (threats.length > 50 || !threats.every(item => object(item) && typeof item.url === 'string' && item.url.length <= 4096 && matchesGoogleExpression(item.url, url) &&
          Array.isArray(item.threatTypes) && item.threatTypes.length > 0 && item.threatTypes.length <= 10 && item.threatTypes.every(t => typeof t === 'string' && GOOGLE_THREAT_TYPES.has(t)))) throw new ProviderError('MALFORMED_RESPONSE');
      });
      if (!object(payload) || typeof payload.cacheDuration !== 'string' || !/^\d+(?:\.\d+)?s$/.test(payload.cacheDuration) ||
          payload.threats !== undefined && !Array.isArray(payload.threats)) throw new ProviderError('MALFORMED_RESPONSE');
      const seconds = Number(payload.cacheDuration.slice(0, -1));
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400) throw new ProviderError('MALFORMED_RESPONSE');
      const threats = (payload.threats || []) as unknown[];
      if (threats.length > 50 || !threats.every(item => object(item) && typeof item.url === 'string' && item.url.length <= 4096 &&
        matchesGoogleExpression(item.url, url) && Array.isArray(item.threatTypes) && item.threatTypes.length > 0 &&
        item.threatTypes.length <= 10 && item.threatTypes.every(t => typeof t === 'string' && GOOGLE_THREAT_TYPES.has(t)))) throw new ProviderError('MALFORMED_RESPONSE');
      const findings = threats.map((item, index) => {
        const threat = item as { threatTypes: string[] };
        const malware = threat.threatTypes.some(t => /MALWARE|UNWANTED|HARMFUL/.test(t));
        return evidence('Google Safe Browsing', `gsb-${index}`, 'Known threat match', `Google Safe Browsing returned ${threat.threatTypes.join(', ')} for this URL or a checked URL expression.`, 'high', malware ? 'malware' : 'phishing', url);
      });
      const result = target(url, findings.length ? 'detected' : 'no_detection', { evidence: findings, expires_at: expiry(seconds) });
      if (env.SCAN_CACHE) {
        try { await env.SCAN_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: Math.max(60, Math.ceil(seconds)) }); }
        catch { /* Optional provider cache does not affect observation integrity. */ }
      }
      return result;
    } catch (error) { return failed(url, error); }
  }));
  return aggregate('gsb', 'Google Safe Browsing', 'reputation', targets);
}

export async function urlhaus(urls: string[], env: Bindings): Promise<EngineResult> {
  const apiKey = key(env.URLHAUS_API_KEY);
  if (!apiKey) return unavailable('urlhaus', 'URLhaus', 'reputation', urls);
  return aggregate('urlhaus', 'URLhaus', 'reputation', await Promise.all(urls.map(async url => {
    try {
      const payload = await requestJson('https://urlhaus-api.abuse.ch/v1/url/', { method: 'POST', headers: { 'Auth-Key': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ url }).toString() });
      if (!object(payload)) throw new ProviderError('MALFORMED_RESPONSE');
      if (payload.url !== undefined && webUrl(payload.url) !== url) throw new ProviderError('MISMATCHED_REPORT');
      if (payload.query_status === 'no_results') return target(url, 'no_detection', { expires_at: expiry(120) });
      if (payload.query_status !== 'ok' || !['online', 'offline'].includes(String(payload.url_status)) || !text(payload.threat)) throw new ProviderError('MALFORMED_RESPONSE');
      return target(url, 'detected', { expires_at: expiry(300), data: { threat: payload.threat, url_status: payload.url_status },
        evidence: [evidence('URLhaus', 'urlhaus-malware', 'Malware distribution record', `URLhaus lists this URL for malware distribution (${payload.url_status}). A historical record does not establish that a payload is currently reachable.`, 'high', 'malware', url)] });
    } catch (error) { return failed(url, error); }
  })));
}

export function urlIdentifier(url: string): string {
  const bytes = new TextEncoder().encode(url);
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function virusTotal(urls: string[], env: Bindings): Promise<EngineResult> {
  const apiKey = key(env.VIRUSTOTAL_API_KEY);
  if (!apiKey) return unavailable('virustotal', 'VirusTotal', 'reputation', urls);
  return aggregate('virustotal', 'VirusTotal', 'reputation', await Promise.all(urls.map(async url => {
    try {
      const payload = await requestJson(`https://www.virustotal.com/api/v3/urls/${urlIdentifier(url)}`, { headers: { 'x-apikey': apiKey } });
      const attrs = object(payload) && object(payload.data) && object(payload.data.attributes) ? payload.data.attributes : null;
      if (!attrs || !object(attrs.last_analysis_stats) || typeof attrs.last_analysis_date !== 'number') throw new ProviderError('MALFORMED_RESPONSE');
      if (attrs.url !== undefined && webUrl(attrs.url) !== url) throw new ProviderError('MISMATCHED_REPORT');
      const stats = attrs.last_analysis_stats;
      if (!['malicious', 'suspicious', 'harmless', 'undetected'].every(k => Number.isInteger(stats[k]) && Number(stats[k]) >= 0 && Number(stats[k]) <= 10000)) throw new ProviderError('MALFORMED_RESPONSE');
      const observed = isoDate(attrs.last_analysis_date);
      if (!observed || Date.parse(observed) > Date.now() + 5 * 60_000) throw new ProviderError('MALFORMED_RESPONSE');
      const stale = Date.now() - Date.parse(observed) > VT_MAX_AGE_MS;
      const malicious = Number(stats.malicious), suspicious = Number(stats.suspicious);
      const positive = malicious > 0 || suspicious > 0;
      const analyzed = malicious + suspicious + Number(stats.harmless) + Number(stats.undetected);
      if (analyzed === 0) return target(url, 'unknown', { error_code: 'NO_COMPLETED_ANALYSIS', message: 'VirusTotal has not completed any vendor analysis for this URL.' });
      const threatType: ThreatType = 'unknown';
      const findings = positive ? [evidence('VirusTotal', 'vt-vendor-flags', stale ? 'Historical vendor warnings' : 'Vendor detections',
        `${malicious} vendors reported malicious and ${suspicious} suspicious in the report observed ${observed}.${stale ? ' This report is older than 24 hours and cannot establish a current clean result.' : ' Vendor results are aggregated intelligence, not independent live scans.'}`,
        !stale && malicious >= 3 ? 'high' : 'warning', threatType, url)] : [];
      const vendorResults = object(attrs.last_analysis_results) ? Object.entries(attrs.last_analysis_results).slice(0, 150).flatMap(([name, result]) => object(result) && typeof result.category === 'string' ? [{ name: name.slice(0, 100), category: result.category.slice(0, 50) }] : []) : [];
      return target(url, stale ? 'unknown' : positive ? 'detected' : 'no_detection', {
        observed_at: observed, evidence: findings,
        expires_at: stale ? nowIso() : new Date(Math.min(Date.parse(observed) + VT_MAX_AGE_MS, Date.now() + 300_000)).toISOString(),
        data: { malicious_count: malicious, suspicious_count: suspicious, harmless_count: stats.harmless, undetected_count: stats.undetected, last_analysis_at: observed, vendor_results: vendorResults },
        ...(stale ? { error_code: 'STALE_RESULT', message: 'VirusTotal analysis is older than 24 hours.' } : {}),
      });
    } catch (error) {
      if (errorCode(error) === 'NOT_FOUND') return target(url, 'unknown', { error_code: 'NOT_FOUND', message: 'VirusTotal has no report for this URL.' });
      return failed(url, error);
    }
  })));
}

export async function domainMetadata(domain: string | null, env: Bindings): Promise<ScanReport['whois']> {
  const empty = { registrar: null, creation_date: null, source: null, observed_at: null };
  if (!domain || !key(env.VIRUSTOTAL_API_KEY)) return empty;
  try {
    const payload = await requestJson(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(domain)}`, { headers: { 'x-apikey': key(env.VIRUSTOTAL_API_KEY) } });
    const attrs = object(payload) && object(payload.data) && object(payload.data.attributes) ? payload.data.attributes : null;
    if (!attrs) return empty;
    const registrar = text(attrs.registrar, 200);
    const creation = isoDate(attrs.creation_date);
    const observed = isoDate(attrs.whois_date);
    return registrar || creation ? { registrar, creation_date: creation, source: 'VirusTotal domain record', observed_at: observed } : empty;
  } catch { return empty; }
}
