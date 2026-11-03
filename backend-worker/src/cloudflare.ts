import type { CloudflareReport, EngineResult } from '../../shared/scan';
import { aggregate, evidence, target, unavailable } from './evidence';
import { errorCode, isoDate, object, ProviderError, requestJson, text, webUrl } from './http';
import type { Bindings, CloudflarePoll, PendingTarget } from './types';
import type { ParsedInput } from './url';
import { isPublicIp } from './url';
import { acquire, currentContext, release } from './control';

export const POLL_INTERVAL_MS = 10_000;
export const JOB_LIFETIME_MS = 180_000;
function headers(env: Bindings): Record<string, string> { return { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN?.trim()}`, 'Content-Type': 'application/json' }; }
function endpoint(env: Bindings): string {
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!account || !/^[a-f0-9]{32}$/i.test(account)) throw new ProviderError('INVALID_CONFIGURATION');
  return `https://api.cloudflare.com/client/v4/accounts/${account}/urlscanner/v2`;
}
function unwrap(payload: unknown): Record<string, unknown> {
  if (!object(payload) || payload.success === false) throw new ProviderError('MALFORMED_RESPONSE');
  return object(payload.result) ? payload.result : payload;
}
/** Fixed DoH endpoint only. The Worker never fetches arbitrary target HTTP resources. */
export async function validateActiveDestination(input: ParsedInput): Promise<void> {
  if (input.domain.is_ip) { if (!isPublicIp(input.domain.hostname)) throw new ProviderError('PROHIBITED_DESTINATION'); return; }
  const replies = await Promise.all(['A', 'AAAA'].map(async type => {
    const query = new URLSearchParams({ name: input.domain.hostname, type });
    return requestJson(`https://cloudflare-dns.com/dns-query?${query}`, { headers: { accept: 'application/dns-json' } }, 2500);
  }));
  const addresses: string[] = [];
  for (const reply of replies) {
    if (!object(reply) || ![0, 3].includes(Number(reply.Status)) || reply.Answer !== undefined && !Array.isArray(reply.Answer)) throw new ProviderError('DNS_UNAVAILABLE');
    for (const answer of (reply.Answer || []) as unknown[]) {
      if (!object(answer)) throw new ProviderError('MALFORMED_DNS');
      if (answer.type === 1 || answer.type === 28) {
        if (typeof answer.data !== 'string' || !isPublicIp(answer.data)) throw new ProviderError('PROHIBITED_DESTINATION');
        addresses.push(answer.data);
      }
    }
  }
  if (!addresses.length) throw new ProviderError('DNS_UNAVAILABLE');
}

export async function submitCloudflare(input: ParsedInput, env: Bindings): Promise<{ engine: EngineResult; pending: PendingTarget[]; lease?: string }> {
  if (!env.CLOUDFLARE_API_TOKEN?.trim() || !env.CLOUDFLARE_ACCOUNT_ID?.trim()) return {
    engine: unavailable('cloudflare', 'Cloudflare URL Scanner', 'active', input.targets), pending: [],
  };
  if (!env.SCAN_CACHE) return {
    engine: unavailable('cloudflare', 'Cloudflare URL Scanner', 'active', input.targets, 'JOB_STORAGE_UNAVAILABLE', 'Active inspection requires short-lived job storage.'), pending: [],
  };
  try { await validateActiveDestination(input); }
  catch (error) { return { engine: aggregate('cloudflare', 'Cloudflare URL Scanner', 'active', input.targets.map(url => target(url, 'error', { error_code: errorCode(error), message: 'The public destination could not be verified for active inspection.' }))), pending: [] }; }
  let lease: string | null = null;
  try { lease = await acquire(env, 'active', currentContext()?.client || '0'.repeat(64)); }
  catch { return { engine: unavailable('cloudflare', 'Cloudflare URL Scanner', 'active', input.targets, 'ACTIVE_CAPACITY', 'Active inspection capacity is exhausted. Reputation checks are still available.'), pending: [] }; }
  const pending: PendingTarget[] = [];
  const targets = await Promise.all(input.targets.map(async url => {
    try {
      const result = unwrap(await requestJson(`${endpoint(env)}/scan`, { method: 'POST', headers: headers(env), body: JSON.stringify({ url, visibility: 'Unlisted' }) }));
      if (typeof result.uuid !== 'string' || !/^[a-f0-9-]{36}$/i.test(result.uuid) || result.visibility !== undefined && result.visibility !== 'unlisted') throw new ProviderError('MALFORMED_RESPONSE');
      pending.push({ url, provider_id: result.uuid });
      return target(url, 'pending', { message: 'Unlisted active inspection is queued. No browser observations have returned yet.' });
    } catch (error) { return target(url, 'error', { error_code: errorCode(error), message: 'Active inspection could not be submitted.' }); }
  }));
  if (!pending.length) await release(env, lease);
  return { engine: aggregate('cloudflare', 'Cloudflare URL Scanner', 'active', targets), pending, ...(lease && pending.length ? { lease } : {}) };
}

export async function pollCloudflare(pending: PendingTarget, env: Bindings): Promise<CloudflarePoll> {
  const { url, provider_id: uuid } = pending;
  try {
    const result = unwrap(await requestJson(`${endpoint(env)}/result/${uuid}`, { headers: headers(env) }));
    if (!object(result.task)) throw new ProviderError('MALFORMED_RESPONSE');
    const task = result.task;
    if (task.uuid !== undefined && task.uuid !== uuid) throw new ProviderError('MISMATCHED_REPORT');
    if (webUrl(task.url) !== url) throw new ProviderError('MISMATCHED_REPORT');
    // The live v2 API returns lowercase status; documentation also shows TitleCase.
    const status = typeof task.status === 'string' ? task.status.toLowerCase() : undefined;
    if (['queued', 'inprogress', 'inpostprocessing'].includes(status || '')) return { target: target(url, 'pending', { message: 'Active inspection is still in progress.' }) };
    if (task.success !== true || status !== undefined && status !== 'finished') throw new ProviderError('SCAN_FAILED');
    if (!object(result.verdicts) || !object(result.verdicts.overall) || typeof result.verdicts.overall.malicious !== 'boolean' ||
        !object(result.page) || !object(result.lists) || !object(result.data)) throw new ProviderError('MALFORMED_RESPONSE');
    const observed = isoDate(task.time);
    if (!observed || Date.parse(observed) > Date.now() + 300_000) throw new ProviderError('MALFORMED_RESPONSE');
    const freshUntil = Date.parse(observed) + 300_000;
    const stale = freshUntil <= Date.now();
    const malicious = result.verdicts.overall.malicious;
    const findings = malicious ? [evidence('Cloudflare URL Scanner', 'cf-malicious', stale ? 'Historical malicious content observation' : 'Malicious content observed',
      `Cloudflare URL Scanner reported a malicious verdict for the submitted URL.${stale ? ' This observation is older than five minutes and is retained as a warning, not a fresh detection.' : ''}`,
      stale ? 'warning' : 'high', 'unknown', url)] : [];
    const page = result.page, lists = result.lists, data = result.data;
    if (lists.certificates !== undefined && !Array.isArray(lists.certificates) || data.requests !== undefined && !Array.isArray(data.requests) || lists.urls !== undefined && !Array.isArray(lists.urls)) throw new ProviderError('MALFORMED_RESPONSE');
    const certificates = ((lists.certificates || []) as unknown[]).slice(0, 100).flatMap(cert => object(cert) ? [{ subject: text(cert.subjectName), issuer: text(cert.issuer), valid_from: isoDate(cert.validFrom), valid_to: isoDate(cert.validTo) }] : []);
    const requests = ((data.requests || []) as unknown[]).slice(0, 100).flatMap(item => {
      if (!object(item)) return [];
      const outerRequest = object(item.request) ? item.request : {};
      const req = object(outerRequest.request) ? outerRequest.request : outerRequest;
      const outerResponse = object(item.response) ? item.response : {};
      const res = object(outerResponse.response) ? outerResponse.response : outerResponse;
      const resource = webUrl(req.url) || webUrl(res.url);
      if (!resource) return [];
      return [{ url: resource, method: text(req.method, 20), status: Number.isInteger(res.status) && Number(res.status) >= 100 && Number(res.status) <= 599 ? Number(res.status) : null,
        ip: text(res.remoteIPAddress, 100) || text(res.primary_ip, 100) }];
    });
    const links = ((lists.urls || []) as unknown[]).slice(0, 100).flatMap(link => { const value = webUrl(link); return value ? [value] : []; });
    const history = Array.isArray(page.history) ? page.history.slice(0, 20).flatMap(item => { const value = webUrl(item) || (object(item) ? webUrl(item.url) : null); return value ? [value] : []; }) : [];
    const report: CloudflareReport = { url, observed_at: observed, source: 'Cloudflare URL Scanner',
      ...(history.length ? { redirect_chain: history } : {}),
      ip: text(page.ip, 100), asn: text(page.asn, 100) || (typeof page.asn === 'number' ? `AS${page.asn}` : null),
      country: text(page.country, 100), final_url: webUrl(page.url), certificates, requests, links, risks: findings };
    return { target: target(url, stale ? 'unknown' : malicious ? 'detected' : 'no_detection', {
      evidence: findings, observed_at: observed, expires_at: new Date(freshUntil).toISOString(),
      ...(stale ? { error_code: 'STALE_RESULT', message: 'The browser observation is older than five minutes.' } : {}),
    }), report };
  } catch (error) {
    if (errorCode(error) === 'NOT_FOUND') return { target: target(url, 'pending', { message: 'The scan report is not ready yet.' }) };
    return { target: target(url, 'error', { error_code: errorCode(error), message: 'Active inspection did not return a successful report.' }) };
  }
}
