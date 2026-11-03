import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProduction } from '../scripts/monitor-production.mjs';

const token = 'a'.repeat(64);
function healthy(url, options) {
  if (url === 'https://phish-x.vercel.app') return new Response('<div id="root"></div><script src="/assets/main.js"></script>', {
    headers: { 'Content-Type': 'text/html', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "frame-ancestors 'none'" },
  });
  if (url.endsWith('/api/ping')) return Response.json({ status: 'ok', schema_version: 2 });
  if (!options.headers.Authorization) return new Response(null, { status: 401 });
  return new Response(['scan', 'poll', 'active'].map(route => `phishx_active_leases{route="${route}"} 0`).join('\n') + '\n# EOF\n', {
    headers: { 'Content-Type': 'application/openmetrics-text; version=1.0.0' },
  });
}

test('availability monitor checks only reviewed production origins without scans', async () => {
  const calls = [];
  const result = await checkProduction(token, async (url, options) => { calls.push([url, options]); return healthy(url, options); });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 4);
  for (const [url, options] of calls) {
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.method, undefined);
    if (options.headers.Authorization) assert.equal(url, 'https://backend-worker.phish-x.workers.dev/api/metrics');
  }
});
test('missing secret fails before any requests', async () => {
  let called = false;
  await assert.rejects(checkProduction('', async () => { called = true; }));
  assert.equal(called, false);
});
for (const [name, mutate, failedCheck] of [
  ['frontend outage', (url, opts) => url.endsWith('.app') ? new Response(null, { status: 503 }) : healthy(url, opts), 'frontend'],
  ['missing security headers', (url, opts) => url.endsWith('.app') ? new Response('<div id="root">/assets/</div>', { headers: { 'Content-Type': 'text/html' } }) : healthy(url, opts), 'frontend'],
  ['contract drift', (url, opts) => url.endsWith('/api/ping') ? Response.json({ status: 'ok', schema_version: 1 }) : healthy(url, opts), 'API contract'],
  ['accidentally public metrics', (url, opts) => url.endsWith('/api/metrics') && !opts.headers.Authorization ? new Response('private metric') : healthy(url, opts), 'metrics protection'],
  ['redirected authenticated metrics', (url, opts) => opts.headers.Authorization ? new Response(null, { status: 302, headers: { Location: 'https://attacker.invalid' } }) : healthy(url, opts), 'authenticated metrics'],
  ['incomplete metrics', (url, opts) => opts.headers.Authorization ? new Response('# EOF', { headers: { 'Content-Type': 'application/openmetrics-text' } }) : healthy(url, opts), 'authenticated metrics'],
  ['oversized upstream', (url, opts) => url.endsWith('/api/ping') ? new Response('x'.repeat(4097)) : healthy(url, opts), 'API contract'],
]) {
  test(`availability monitor detects ${name}`, async () => {
    const result = await checkProduction(token, async (url, opts) => mutate(url, opts));
    assert.equal(result.ok, false);
    assert.equal(result.checks.find(item => item.name === failedCheck).ok, false);
  });
}
test('transport failures are reduced to labels without leaking upstream error details', async () => {
  const result = await checkProduction(token, async () => { throw new Error(`sensitive=${token}`); });
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes(token), false);
});
