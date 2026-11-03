import type { Bindings } from './types';
import { PublicError } from './types';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext { env: Bindings; client: string; deadline: number; signal: AbortSignal; resources: Set<string> }
const context = new AsyncLocalStorage<RequestContext>();
export const currentContext = () => context.getStore();
export const coordinatorStub = (env: Bindings) => env.SCAN_COORDINATOR?.get(env.SCAN_COORDINATOR.idFromName('phishx-control-v1'));
/** Separate named objects hold short-lived job data; admission state never stores URLs. */
export async function jobControl(env: Bindings, id: string, path: '/job-read' | '/job-write', body: Record<string, unknown>): Promise<Response> {
  if (!env.SCAN_COORDINATOR || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Job coordination unavailable');
  const stub = env.SCAN_COORDINATOR.get(env.SCAN_COORDINATOR.idFromName(`phishx-job:${id}`));
  return stub.fetch(`https://job.internal${path}`, { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(2000) });
}

export async function control(env: Bindings, path: string, body: Record<string, unknown>): Promise<Response | null> {
  const stub = coordinatorStub(env);
  if (!stub) return null;
  return stub.fetch(`https://coordinator.internal${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(2000) });
}
export async function clientIdentity(request: Request, env: Bindings): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP');
  const secret = env.CLIENT_ID_SECRET?.trim();
  const local = env.DEV_MODE === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
  if ((!secret || secret.length < 32 || !ip) && !local) throw new PublicError('CLIENT_ID_UNAVAILABLE', 'Client privacy protection is not configured.', 503);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret || 'local-development-only-not-for-production'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // Day-bucket rotation prevents persistent identifiers; never trust X-Forwarded-For.
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip || 'local-development'}`));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function acquire(env: Bindings, route: 'scan' | 'poll' | 'active', client: string): Promise<string | null> {
  if (!env.SCAN_COORDINATOR) {
    if (env.REQUIRE_COORDINATOR === 'true') throw new PublicError('COORDINATOR_UNAVAILABLE', 'Request protection is unavailable.', 503);
    return null;
  }
  let response: Response | null;
  try { response = await control(env, '/acquire', { route, client }); } catch { throw new PublicError('COORDINATOR_UNAVAILABLE', 'Request protection is temporarily unavailable.', 503); }
  const result = await response?.json() as { success?: boolean; lease?: string; retry_after?: number };
  if (!response?.ok || !result?.success || typeof result.lease !== 'string') throw new PublicError('CAPACITY_LIMIT', 'Request capacity is temporarily exhausted. Please try again shortly.', 429);
  if (route === 'active') currentContext()?.resources.add(result.lease);
  return result.lease;
}
export function retainLease(lease?: string | null): void { if (lease) currentContext()?.resources.delete(lease); }
export async function release(env: Bindings, lease?: string | null): Promise<void> {
  if (!lease) return;
  currentContext()?.resources.delete(lease);
  try { await control(env, '/release', { lease }); } catch { /* Leases expire even after a disconnected client or failed release. */ }
}
export async function withScanBudget<T>(env: Bindings, client: string, callback: () => Promise<T>, timeout = 12_000): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  const resources = new Set<string>();
  let hardTimer: ReturnType<typeof setTimeout>;
  const hardDeadline = new Promise<never>((_, reject) => { hardTimer = setTimeout(() => reject(new PublicError('SCAN_DEADLINE_EXCEEDED', 'The overall scan deadline was reached. Please retry later.', 503)), timeout + 250); });
  try { return await Promise.race([context.run({ env, client, deadline: Date.now() + timeout, signal: controller.signal, resources }, callback), hardDeadline]); }
  finally { controller.abort(); clearTimeout(timer); clearTimeout(hardTimer!); await Promise.all([...resources].map(lease => release(env, lease))); }
}
