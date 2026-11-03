import { control, currentContext } from './control';
import type { Bindings } from './types';
import { decodeSafeBrowsing } from './safebrowsing-wire';

export const PROVIDER_TIMEOUT_MS = 4500;
export const MAX_PROVIDER_BYTES = 1_048_576;
export class ProviderError extends Error {
  constructor(public code: string, public retryAfterMs = 0) { super(code); }
}
export function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function text(value: unknown, max = 1024): string | null { return typeof value === 'string' && value.length <= max ? value : null; }
export function isoDate(value: unknown): string | null {
  const stamp = typeof value === 'number' ? value * 1000 : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(stamp) && stamp >= 0 && stamp < 8.64e15 ? new Date(stamp).toISOString() : null;
}
export function webUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.toString() : null; }
  catch { return null; }
}
const localCircuits = new WeakMap<Bindings, Map<string, { failures: number; until: number }>>();
export function providerName(url: string): string {
  const host = new URL(url).hostname;
  if (host === 'safebrowsing.googleapis.com') return 'gsb';
  if (host === 'urlhaus-api.abuse.ch') return 'urlhaus';
  if (host === 'www.virustotal.com') return 'virustotal';
  if (host === 'api.cloudflare.com') return 'cloudflare';
  if (host === 'cloudflare-dns.com') return 'dns';
  if (host === 'generativelanguage.googleapis.com') return 'gemini';
  if (host === 'data.iana.org' || host.startsWith('rdap.') || host.includes('.rdap.')) return 'rdap';
  return 'other';
}
async function circuitAllowed(provider: string): Promise<boolean> {
  const scope = currentContext(); if (!scope) return true;
  if (scope.signal.aborted || Date.now() >= scope.deadline) throw new ProviderError('SCAN_DEADLINE_EXCEEDED');
  if (scope.env.SCAN_COORDINATOR) {
    try { const reply = await control(scope.env, '/circuit', { provider }); return Boolean(reply?.ok && (await reply.json() as { allowed?: boolean }).allowed); }
    catch { throw new ProviderError('COORDINATOR_UNAVAILABLE'); }
  }
  return (localCircuits.get(scope.env)?.get(provider)?.until || 0) <= Date.now();
}
async function observe(provider: string, outcome: 'success' | 'not_found' | 'failure' | 'timeout' | 'rate_limited' | 'malformed', started: number): Promise<void> {
  const scope = currentContext(); if (!scope) return;
  if (scope.env.SCAN_COORDINATOR) {
    if (outcome !== 'success' && outcome !== 'not_found') console.warn(JSON.stringify({ event: 'provider_observation_failed', provider, outcome }));
    try { await control(scope.env, '/observe', { provider, outcome, duration_ms: Date.now() - started }); } catch { /* Admission remains fail-closed; metric failure cannot erase an observation. */ }
  } else {
    let circuits = localCircuits.get(scope.env); if (!circuits) { circuits = new Map(); localCircuits.set(scope.env, circuits); }
    if (outcome === 'success' || outcome === 'not_found') circuits.delete(provider);
    else { const previous = circuits.get(provider) || { failures: 0, until: 0 }; previous.failures++; if (previous.failures >= 3) previous.until = Date.now() + 30_000; circuits.set(provider, previous); }
  }
}
/** Bounded retry is only for idempotent retrieval/lookups; never scanner/LLM submission. */
export async function requestJson(url: string, init: RequestInit = {}, timeout = PROVIDER_TIMEOUT_MS, validate?: (value: unknown) => void): Promise<unknown> {
  const scope = currentContext(), provider = providerName(url), started = Date.now();
  if (!await circuitAllowed(provider)) throw new ProviderError('CIRCUIT_OPEN');
  const method = (init.method || 'GET').toUpperCase();
  const safe = method === 'GET' || url === 'https://urlhaus-api.abuse.ch/v1/url/';
  const attempts = scope && scope.env.HTTP_RETRIES !== 'false' && safe ? 2 : 1;
  let finalError: ProviderError | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (scope?.env.SCAN_COORDINATOR) {
        const response = await control(scope.env, '/provider-budget', { provider });
        if (!response?.ok) throw new ProviderError('COORDINATOR_UNAVAILABLE');
        if (!(await response.json() as { allowed?: boolean }).allowed) throw new ProviderError('PROVIDER_BUDGET_EXCEEDED');
      }
      const payload = await attemptJson(url, init, timeout); validate?.(payload); await observe(provider, 'success', started); return payload;
    }
    catch (error) {
      finalError = error instanceof ProviderError ? error : new ProviderError('PROVIDER_ERROR');
      const retryable = ['NETWORK_ERROR', 'TIMEOUT', 'UPSTREAM_HTTP_502', 'UPSTREAM_HTTP_503', 'UPSTREAM_HTTP_504', 'RATE_LIMITED'].includes(finalError.code);
      const delay = Math.max(150 * 2 ** attempt + Math.floor(Math.random() * 50), finalError.retryAfterMs);
      if (!retryable || attempt + 1 >= attempts || !scope || delay > 1000 || Date.now() + delay + 100 >= scope.deadline || scope.signal.aborted) break;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { scope.signal.removeEventListener('abort', abort); resolve(); }, delay);
        const abort = () => { clearTimeout(timer); reject(new ProviderError('SCAN_DEADLINE_EXCEEDED')); };
        scope.signal.addEventListener('abort', abort, { once: true });
      });
    }
  }
  const code = finalError?.code || 'PROVIDER_ERROR';
  if (code === 'PROVIDER_BUDGET_EXCEEDED') throw finalError;
  // Missing VT intelligence and not-yet-ready Cloudflare reports are normal lookup
  // outcomes. Opening a failure circuit for pending scans would terminate valid jobs.
  if (code === 'NOT_FOUND' && (provider === 'cloudflare' || provider === 'virustotal')) {
    await observe(provider, 'not_found', started);
    throw finalError;
  }
  await observe(provider, code === 'RATE_LIMITED' ? 'rate_limited' : code === 'TIMEOUT' || code === 'SCAN_DEADLINE_EXCEEDED' ? 'timeout' : code.startsWith('MALFORMED') || code === 'RESPONSE_TOO_LARGE' ? 'malformed' : 'failure', started);
  throw finalError || new ProviderError('PROVIDER_ERROR');
}
async function attemptJson(url: string, init: RequestInit, timeout: number): Promise<unknown> {
  const scope = currentContext();
  if (scope && (scope.signal.aborted || Date.now() >= scope.deadline)) throw new ProviderError('SCAN_DEADLINE_EXCEEDED');
  const controller = new AbortController();
  const abort = () => controller.abort();
  scope?.signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, Math.max(1, Math.min(timeout, scope ? scope.deadline - Date.now() : timeout)));
  try {
    // Workers supports manual/follow, not the Fetch standard's "error" mode.
    // Never follow a provider redirect carrying credential headers.
    const response = await fetch(url, { ...init, redirect: 'manual', signal: controller.signal });
    if (controller.signal.aborted) { await response.body?.cancel(); throw new ProviderError(scope?.signal.aborted ? 'SCAN_DEADLINE_EXCEEDED' : 'TIMEOUT'); }
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new ProviderError('UPSTREAM_REDIRECT_REJECTED');
    }
    if (!response.ok) {
      await response.body?.cancel();
      const retryAfter = response.headers.get('Retry-After');
      const retryMs = retryAfter && /^\d+$/.test(retryAfter) ? Math.min(60_000, Number(retryAfter) * 1000) : 0;
      throw new ProviderError(response.status === 429 ? 'RATE_LIMITED' : response.status === 404 ? 'NOT_FOUND' :
        response.status === 401 || response.status === 403 ? 'AUTHENTICATION_FAILED' : `UPSTREAM_HTTP_${response.status}`, retryMs);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ProviderError('MALFORMED_RESPONSE');
    let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_PROVIDER_BYTES) { await reader.cancel(); throw new ProviderError('RESPONSE_TOO_LARGE'); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    if (new URL(url).hostname === 'safebrowsing.googleapis.com' && /(?:protobuf|octet-stream)/i.test(response.headers.get('Content-Type') || '')) return decodeSafeBrowsing(buffer);
    try { return JSON.parse(new TextDecoder().decode(buffer)); }
    catch { throw new ProviderError('MALFORMED_RESPONSE'); }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(scope?.signal.aborted ? 'SCAN_DEADLINE_EXCEEDED' : controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
  } finally { clearTimeout(timer); scope?.signal.removeEventListener('abort', abort); }
}
export function errorCode(error: unknown): string { return error instanceof ProviderError ? error.code : 'PROVIDER_ERROR'; }
