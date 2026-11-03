/** Whole-route consistency/latency benchmark with controlled providers, never live accuracy. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import app, { ScanCoordinator } from '../backend-worker/.wrangler/benchmark/index.js';

const cases = [
  ['clean', 'https://example.com/', 'no_known_threats'],
  ['legitimate-login', 'https://accounts.google.com/login', 'no_known_threats'],
  ['ordinary-keyword', 'https://example.com/login', 'no_known_threats'],
  ['brand-subdomain', 'https://paypal.com.verify-account.example.com/login', 'suspicious'],
  ['lookalike', 'https://paypa1.example.com/', 'suspicious'],
  ['unicode-impersonation', 'https://раypal.example.com/', 'suspicious'],
  ['known-test-positive', 'https://testsafebrowsing.appspot.com/s/phishing.html', 'malicious'],
  ['unresolved-shortener', 'https://bit.ly/example', ['unknown', 'suspicious']],
  ['outage', 'https://example.com/', 'unknown'],
  ['unknown-intelligence', 'https://example.com/', 'unknown'],
  ['benign-gist-control', 'https://gist.githubusercontent.com/person/id/raw/hello.txt', ['unknown', 'suspicious']],
  ['vendor-conflict', 'https://example.com/', 'suspicious'],
];
let scenario = '';
const originalFetch = globalThis.fetch;
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const store = new Map(); let queue = Promise.resolve();
const state = { storage: { get: async key => store.get(key), put: async (key, value) => store.set(key, structuredClone(value)) },
  blockConcurrencyWhile(callback) { const task = queue.then(callback); queue = task.catch(() => {}); return task; } };
const env = { REQUIRE_COORDINATOR: 'true', CLIENT_ID_SECRET: 'controlled-benchmark-identity-secret-only',
  CLIENT_SCAN_LIMIT: '100', GLOBAL_SCAN_LIMIT: '1000', GSB_REQUEST_LIMIT: '1000', URLHAUS_REQUEST_LIMIT: '1000', VT_REQUEST_LIMIT: '1000',
  HTTP_RETRIES: 'false', SCAN_RATE_LIMITER: { limit: async () => ({ success: true }) } };
const coordinator = new ScanCoordinator(state, env);
env.SCAN_COORDINATOR = { idFromName: () => 0, get: () => ({ fetch: (url, init) => coordinator.fetch(new Request(url, init)) }) };
const samples = [];
try {
  globalThis.fetch = async (input, init) => {
    assert.equal(init.redirect, 'manual');
    await new Promise(resolve => setTimeout(resolve, 5));
    const url = new URL(String(input));
    if (url.hostname === 'safebrowsing.googleapis.com') return json({ cacheDuration: '300s', threats: scenario === 'known-test-positive' ?
      [{ url: url.searchParams.get('urls'), threatTypes: ['SOCIAL_ENGINEERING'] }] : [] });
    if (url.hostname === 'urlhaus-api.abuse.ch') return json({ query_status: 'no_results' });
    if (url.hostname === 'www.virustotal.com') return json({ data: { attributes: { last_analysis_date: Date.now() / 1000,
      last_analysis_stats: { malicious: 1, suspicious: 0, harmless: 30, undetected: 20 } } } });
    if (url.hostname === 'data.iana.org') return json({ services: [] });
    throw Error('Unexpected benchmark endpoint');
  };
  for (let repetition = 0; repetition < 5; repetition++) for (const [name, url, expected] of cases) {
    scenario = name;
    const bindings = { ...env,
      ...(name !== 'outage' ? { GOOGLE_SAFE_BROWSING_API_KEY: 'controlled-fixture' } : {}),
      ...(!['outage', 'unknown-intelligence'].includes(name) ? { URLHAUS_API_KEY: 'controlled-fixture' } : {}),
      ...(name === 'vendor-conflict' ? { VIRUSTOTAL_API_KEY: 'controlled-fixture' } : {}) };
    const start = performance.now();
    const response = await app.request('https://scanner.example.com/api/verify', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '8.8.8.8' }, body: JSON.stringify({ url, refresh: true }) }, bindings);
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.ok((Array.isArray(expected) ? expected : [expected]).includes(result.verdict), `${name}: ${result.verdict}`);
    samples.push({ scenario: name, milliseconds: performance.now() - start, verdict: result.verdict, sufficient_coverage: result.coverage.sufficient });
  }
} finally { globalThis.fetch = originalFetch; }
const sorted = samples.map(row => row.milliseconds).sort((a, b) => a - b);
const result = { scope: 'Controlled whole HTTP route with actual parser/model/policy/coordinator logic, memory storage and 5ms synthetic upstream delays. Not live accuracy, deployment coverage or production latency.',
  environment: `Node ${process.version} ${process.platform}/${process.arch}`, cases: cases.length, samples: samples.length,
  p50_ms: sorted[Math.floor(sorted.length * .5)], p95_ms: sorted[Math.floor(sorted.length * .95)],
  sufficient_coverage_rate: samples.filter(row => row.sufficient_coverage).length / samples.length,
  unknown_verdict_rate: samples.filter(row => row.verdict === 'unknown').length / samples.length,
  scenarios: cases.map(([name]) => ({ name, verdicts: [...new Set(samples.filter(row => row.scenario === name).map(row => row.verdict))] })) };
if (process.argv.includes('--record')) await fs.writeFile(new URL('../model/controlled-route-benchmark.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
