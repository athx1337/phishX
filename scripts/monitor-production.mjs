import { pathToFileURL } from 'node:url';

const API = 'https://backend-worker.phish-x.workers.dev';
const WEB = 'https://phish-x.vercel.app';

async function readBounded(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) throw new Error('Response size limit exceeded');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

// Fixed destinations and manual redirects keep the bearer token on its reviewed origin.
export async function checkProduction(token, fetcher = fetch) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('PHISHX_METRICS_TOKEN is missing or invalid');
  async function request(url, headers = {}) {
    const response = await fetcher(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(12_000) });
    return response;
  }
  const checks = [
    ['frontend', async () => {
      const response = await request(WEB);
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) throw new Error();
      const html = await readBounded(response, 512_000);
      if (!html.includes('id="root"') || !html.includes('/assets/')) throw new Error();
      if (response.headers.get('x-content-type-options') !== 'nosniff' ||
          response.headers.get('referrer-policy') !== 'no-referrer' ||
          !response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")) throw new Error();
    }],
    ['API contract', async () => {
      const response = await request(`${API}/api/ping`);
      if (response.status !== 200) throw new Error();
      const body = JSON.parse(await readBounded(response, 4096));
      if (body.status !== 'ok' || body.schema_version !== 2) throw new Error();
    }],
    ['metrics protection', async () => {
      const response = await request(`${API}/api/metrics`);
      await response.body?.cancel();
      if (response.status !== 401) throw new Error();
    }],
    ['authenticated metrics', async () => {
      const response = await request(`${API}/api/metrics`, { Authorization: `Bearer ${token}` });
      if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('application/openmetrics-text')) throw new Error();
      const body = await readBounded(response, 128_000);
      if (!body.trimEnd().endsWith('# EOF')) throw new Error();
      for (const route of ['scan', 'poll', 'active']) {
        if (!new RegExp(`^phishx_active_leases\\{route="${route}"\\} \\d+$`, 'm').test(body)) throw new Error();
      }
    }],
  ];
  const outcomes = await Promise.all(checks.map(async ([name, run]) => {
    try { await run(); return { name, ok: true }; }
    catch { return { name, ok: false }; } // Never log upstream bodies, URLs, headers or thrown values.
  }));
  return { ok: outcomes.every(item => item.ok), checks: outcomes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    let result = await checkProduction(process.env.PHISHX_METRICS_TOKEN);
    if (!result.ok) {
      console.log('An availability check failed; confirming once after five seconds.');
      await new Promise(resolve => setTimeout(resolve, 5000));
      result = await checkProduction(process.env.PHISHX_METRICS_TOKEN);
    }
    for (const item of result.checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
    if (!result.ok) process.exitCode = 1;
  } catch { console.error('Production monitor could not run. Check its metrics secret and runner configuration.'); process.exitCode = 1; }
}
