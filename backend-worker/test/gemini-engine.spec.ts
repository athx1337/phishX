import { afterEach, expect, it, vi } from 'vitest';
import { parseInput } from '../src/url';
import { geminiEngine } from '../src/gemini-engine';
import { aggregate, assess, evidence, target } from '../src/evidence';
import { writeReport } from '../src/storage';
import type { ScanReport } from '../../shared/scan';
import { isScanReport } from '../../shared/scan';
import { scan } from '../src/scanner';

afterEach(() => vi.unstubAllGlobals());
const enabled = { GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'fixture' };
function fixture(status = 'risk_signal', reason_codes = ['deceptive_host']) {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ candidates: [{ finishReason: 'STOP',
    content: { role: 'model', parts: [{ text: JSON.stringify({ status, reason_codes }) }] } }] })));
}

it('only calls Gemini when independently requested and rejects invalid opt-in types', async () => {
  fixture();
  expect(await geminiEngine(parseInput({ url: 'https://example.com/' }), enabled)).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  expect(() => parseInput({ url: 'https://example.com/', gemini_assessment: 'true' })).toThrow();
});

it('raises caution for a URL signal without adding remote coverage or confirming a threat', async () => {
  fixture();
  const input = parseInput({ url: 'https://example.com/', gemini_assessment: true });
  const engine = (await geminiEngine(input, enabled))!;
  expect(engine.kind).toBe('model');
  expect(assess([engine], input.targets)).toMatchObject({ verdict: 'suspicious', coverage: { total: 0, completed: 0 } });
  const confirmed = aggregate('gsb', 'Google Safe Browsing', 'reputation', [
    target(input.primary, 'detected', { evidence: [evidence('Google Safe Browsing', 'confirmed', 'Reported phishing', 'Provider match', 'high', 'phishing', input.primary)] }),
  ]);
  expect(assess([engine, confirmed], input.targets).verdict).toBe('malicious');
});

it('abstention cannot establish safety and sensitive links make no independent request', async () => {
  fixture('abstained', []);
  const input = parseInput({ url: 'https://example.com/', gemini_assessment: true });
  const engine = (await geminiEngine(input, enabled))!;
  expect(engine.status).toBe('unknown');
  expect(assess([engine], input.targets).verdict).toBe('unknown');
  vi.mocked(fetch).mockClear();
  const sensitive = parseInput({ url: 'https://example.com/?token=private', sensitive_url_consent: true, gemini_assessment: true });
  expect(await geminiEngine(sensitive, enabled)).toMatchObject({ status: 'unavailable', error_code: 'SENSITIVE_URL_SKIPPED' });
  expect(fetch).not.toHaveBeenCalled();
});

it('keeps independently reviewed reports out of the shared complete-report cache', async () => {
  const put = vi.fn();
  const report = { engines: [{ id: 'gemini-url' }] } as ScanReport;
  await writeReport({ SCAN_CACHE: { get: vi.fn(), put } }, 'fixture', report);
  expect(put).not.toHaveBeenCalled();
});

it('wires one independent provider call into a valid report and records Google sharing', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).startsWith('https://generativelanguage.googleapis.com/') ?
    Response.json({ candidates: [{ finishReason: 'STOP', content: { role: 'model',
      parts: [{ text: JSON.stringify({ status: 'risk_signal', reason_codes: ['deceptive_host'] }) }] } }] }) : new Response('', { status: 404 })));
  const report = await scan(parseInput({ url: 'https://example.com/', gemini_assessment: true }), enabled);
  expect(isScanReport(report)).toBe(true);
  expect(report.verdict).toBe('suspicious');
  expect(report.privacy.third_party_submission).toBe(true);
  expect(report.explanation?.source).toBe('deterministic');
  const geminiCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('generativelanguage.googleapis.com'));
  expect(geminiCalls).toHaveLength(1);
});

it('recognizes Allegro deception while preserving the official marketplace domains', async () => {
  const { analyzeHeuristics } = await import('../src/heuristics');
  for (const url of ['https://allegro.example.com/', 'https://allegrolokalnie.example.com/']) {
    expect(analyzeHeuristics(parseInput({ url })).status).toBe('detected');
  }
  for (const url of ['https://allegro.pl/', 'https://allegrolokalnie.pl/', 'https://allegro.cz/']) {
    expect(analyzeHeuristics(parseInput({ url })).status).toBe('no_detection');
  }
});

it('does not issue a negative conclusion for a detected remote status with missing finding details', () => {
  const url = 'https://example.com/';
  const expires_at = new Date(Date.now() + 60000).toISOString();
  const engines = ['a', 'b', 'c'].map(id => aggregate(id, id, 'reputation', [target(url, 'no_detection', { expires_at })]));
  engines.push(aggregate('active', 'Active', 'active', [target(url, 'detected', { expires_at })]));
  expect(assess(engines, [url]).verdict).toBe('unknown');
});
