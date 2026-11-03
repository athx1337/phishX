import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { parseInput } from './url';
import { pollScan, scan } from './scanner';
import type { Bindings } from './types';
import { PublicError } from './types';
import { acquire, clientIdentity, control, release, withScanBudget } from './control';
export { ScanCoordinator } from './coordinator';

const app = new Hono<{ Bindings: Bindings }>();
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'https://phish-x.vercel.app'];
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer'); c.header('Vary', 'Origin');
  const origin = c.req.header('Origin');
  const origins = c.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || DEFAULT_ORIGINS;
  if (origin && !origins.includes(origin)) return c.json({ error: 'This origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED' }, 403);
  if (origin) c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Expose-Headers', 'Retry-After');
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); c.header('Access-Control-Allow-Headers', 'Content-Type');
    c.header('Access-Control-Max-Age', '600'); return c.body(null, 204);
  }
  await next();
});
app.use('/api/*', bodyLimit({ maxSize: 8192, onError: c => c.json({ error: 'Request body must be at most 8192 bytes.', code: 'BODY_TOO_LARGE' }, 413) }));
app.get('/api/ping', c => c.json({ status: 'ok', schema_version: 2 }));
app.get('/', c => c.json({ name: 'phishX API', schema_version: 2 }));
app.get('/api/metrics', async c => {
  const supplied = c.req.header('Authorization')?.replace(/^Bearer /, '') || '';
  if (!c.env.METRICS_TOKEN || c.env.METRICS_TOKEN.length < 32) throw new PublicError('METRICS_UNAVAILABLE', 'Metrics are not configured.', 503);
  const hash = async (v: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
  const [a, b] = await Promise.all([hash(supplied.slice(0, 4096)), hash(c.env.METRICS_TOKEN)]);
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference) throw new PublicError('UNAUTHORIZED', 'A valid metrics token is required.', 401);
  const response = await control(c.env, '/metrics', {});
  if (!response?.ok) throw new PublicError('METRICS_UNAVAILABLE', 'Metrics are temporarily unavailable.', 503);
  return new Response(await response.text(), { headers: { 'Content-Type': 'application/openmetrics-text; version=1.0.0; charset=utf-8', 'Cache-Control': 'no-store' } });
});
async function guarded<T>(request: Request, env: Bindings, polling: boolean, operation: () => Promise<T>): Promise<T> {
  const identity = env.SCAN_COORDINATOR || env.REQUIRE_COORDINATOR === 'true' ? await clientIdentity(request, env) : 'local-legacy';
  const lease = await acquire(env, polling ? 'poll' : 'scan', identity);
  try { return await withScanBudget(env, identity, operation); }
  finally { await release(env, lease); }
}
async function enforceBudget(env: Bindings, polling: boolean): Promise<void> {
  const limiter = polling ? env.POLL_RATE_LIMITER : env.SCAN_RATE_LIMITER;
  if (!limiter) throw new PublicError('RATE_LIMITER_UNAVAILABLE', 'Request protection is not configured. Contact the service operator.', 503);
  try {
    // Public anonymous API: a global route budget cannot be bypassed with forged client headers.
    const result = await limiter.limit({ key: polling ? 'public-poll' : 'public-scan' });
    if (!result.success) throw new PublicError('RATE_LIMITED', 'Request budget exceeded. Please wait a minute and try again.', 429);
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError('RATE_LIMITER_UNAVAILABLE', 'Request protection is temporarily unavailable.', 503);
  }
}
app.post('/api/verify', async c => {
  await enforceBudget(c.env, false);
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('Content-Type') || '')) throw new PublicError('JSON_REQUIRED', 'Use the application/json content type.', 415);
  let body: unknown;
  try { body = await c.req.json(); } catch { throw new PublicError('INVALID_JSON', 'The request body must contain valid JSON.'); }
  const input = parseInput(body);
  return c.json(await guarded(c.req.raw, c.env, false, () => scan(input, c.env)));
});
app.get('/api/scans/:id', async c => {
  await enforceBudget(c.env, true); c.header('Retry-After', '10');
  const id = c.req.param('id');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new PublicError('SCAN_NOT_FOUND', 'Scan not found.', 404);
  return c.json(await guarded(c.req.raw, c.env, true, () => pollScan(id, c.env)));
});
app.notFound(c => c.json({ error: 'Endpoint not found.', code: 'NOT_FOUND' }, 404));
app.onError((error, c) => {
  if (error instanceof PublicError) {
    if (error.status === 429) c.header('Retry-After', '60');
    return c.json({ error: error.message, code: error.code }, error.status);
  }
  // Never log submitted URLs, credentials, upstream bodies or raw exceptions.
  console.error(JSON.stringify({ event: 'request_failed', code: 'INTERNAL_ERROR' }));
  return c.json({ error: 'The request could not be completed. Please try again.', code: 'INTERNAL_ERROR' }, 503);
});
export default app;
