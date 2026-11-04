import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScanReport } from '../../shared/scan';
import { isScanReport } from '../../shared/scan';
import { withScanBudget } from '../src/control';
import { aggregate, assess, evidence } from '../src/evidence';
import { explain, refreshExplanation } from '../src/explanation';
import { scan } from '../src/scanner';
import { cacheKey } from '../src/storage';
import { parseInput } from '../src/url';
import type { Bindings } from '../src/types';

const enabled = { GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'fixture' };
const selection = (verdict = 'suspicious', evidence_ids = ['known']) => ({ verdict, evidence_ids });
const response = (chosen: unknown = selection(), finishReason: string | undefined = 'STOP', parts?: unknown[]) =>
  Response.json({ candidates: [{ finishReason, content: { role: 'model', parts: parts || [{ text: JSON.stringify(chosen) }] } }] });
async function report(positive = true): Promise<ScanReport> {
  const value = await scan(parseInput({ url: 'https://example.com/private?ordinary=private' }), {});
  if (positive) {
    value.verdict = 'suspicious';
    value.reasons = [evidence('Test', 'known', 'Known observation', 'A recorded warning that must survive fallback.', 'warning')];
  }
  vi.mocked(fetch).mockClear();
  return value;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Offline fixture'); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('bounded grounded Gemini assistance', () => {
  it('uses a bounded minimal-thinking JSON selection and sends no URL, descriptions or provider messages', async () => {
    const value = await report();
    value.engines[0].message = 'private provider text';
    vi.mocked(fetch).mockResolvedValue(response());
    const result = await explain(value, enabled);
    expect(result).toMatchObject({ source: 'gemini', ai_status: 'complete', model: 'gemini-3.5-flash-lite', evidence_ids: ['known'] });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url).endsWith('/gemini-3.5-flash-lite:generateContent')).toBe(true);
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: 'minimal' } });
    expect(body.generationConfig).not.toHaveProperty('temperature');
    expect(body.generationConfig).not.toHaveProperty('topP');
    expect(body.generationConfig).not.toHaveProperty('topK');
    const input = JSON.parse(body.contents[0].parts[0].text);
    expect(input).toEqual({ verdict: value.verdict, evidence: [{ id: 'known', title: 'Known observation', severity: 'warning' }],
      coverage: value.coverage, providers: value.engines.map(({ id, kind, status }) => ({ id, kind, status })) });
    expect(JSON.stringify(body)).not.toMatch(/example\.com|private|ordinary|recorded warning|private provider text/);
    expect(result.text).toContain('recorded warning');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['gemini-2.5-flash', 'gemini-2.5-flash-lite'])('preserves an explicit legacy override for %s without silently routing fallback', async model => {
    const value = await report(); vi.mocked(fetch).mockResolvedValue(response());
    expect(await explain(value, { ...enabled, GEMINI_MODEL: model })).toMatchObject({ source: 'gemini', model });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain(`/models/${model}:generateContent`);
    expect(JSON.parse(String(init?.body)).generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('lets an unrecognized explicit model use its own thinking defaults', async () => {
    const value = await report(); vi.mocked(fetch).mockResolvedValue(response());
    expect(await explain(value, { ...enabled, GEMINI_MODEL: 'gemini-3.8-flash' })).toMatchObject({ model: 'gemini-3.8-flash' });
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).generationConfig).not.toHaveProperty('thinkingConfig');
  });
  it('reports actual validated model identity and ignores thought summaries and signatures', async () => {
    const value = await report();
    vi.mocked(fetch).mockResolvedValue(Response.json({ modelVersion: 'gemini-3.5-flash-lite-001', candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [
      { text: JSON.stringify(selection('malicious', ['invented'])), thought: true, thoughtSignature: 'opaque' },
      { thoughtSignature: 'opaque' }, { text: '{"verdict":"suspicious",', thought: false },
      { text: '"evidence_ids":["known"]}', thoughtSignature: 'opaque' },
    ] } }] }));
    const result = await explain(value, enabled);
    expect(result).toMatchObject({ source: 'gemini', ai_status: 'complete', model: 'gemini-3.5-flash-lite-001', evidence_ids: ['known'] });
    expect(JSON.stringify(result)).not.toMatch(/opaque|invented/); expect(value.verdict).toBe('suspicious');
  });
  it.each(['../bad', 'not-a-gemini-model', 123, 'gemini-' + 'x'.repeat(80)])('rejects invalid returned model identity %s', async modelVersion => {
    const value = await report();
    vi.mocked(fetch).mockResolvedValue(Response.json({ modelVersion, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(selection()) }] } }] }));
    expect(await explain(value, enabled)).toMatchObject({ source: 'deterministic', ai_status: 'invalid_response', model: 'gemini-3.5-flash-lite' });
  });
  it.each(['unknown', 'no_known_threats'] as const)('validates a real selection for %s with zero evidence', async verdict => {
    const value = await report(false); value.verdict = verdict; value.reasons = [];
    vi.mocked(fetch).mockResolvedValue(response(selection(verdict, [])));
    const result = await explain(value, enabled);
    expect(result).toMatchObject({ source: 'gemini', ai_status: 'complete', evidence_ids: [] });
    expect(result.text).toContain(`${value.coverage.completed} of ${value.coverage.total} remote checks`);
    expect(fetch).toHaveBeenCalledTimes(1);
    const config = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)).generationConfig;
    expect(config.responseSchema.properties.evidence_ids).toMatchObject({ minItems: 0, maxItems: 0, items: { type: 'STRING' } });
  });
  it.each([
    [{}, 'disabled'], [{ GEMINI_ENABLED: 'false', GEMINI_API_KEY: 'fixture' }, 'disabled'],
    [{ GEMINI_ENABLED: 'true' }, 'not_configured'], [{ ...enabled, GEMINI_MODEL: '../bad' }, 'not_configured'],
  ] as const)('reports configuration status without an outbound call (%j)', async (env, ai_status) => {
    const value = await report();
    expect(await explain(value, env)).toMatchObject({ source: 'deterministic', ai_status, evidence_ids: ['known'] });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([[429, 'rate_limited'], [503, 'unavailable'], [401, 'unavailable']] as const)('bounds HTTP %s failures to %s', async (status, ai_status) => {
    const value = await report(); vi.mocked(fetch).mockResolvedValue(new Response('upstream secret error', { status }));
    const result = await explain(value, enabled);
    expect(result).toMatchObject({ source: 'deterministic', ai_status, evidence_ids: ['known'] });
    expect(result.text).toContain('recorded warning'); expect(JSON.stringify(result)).not.toContain('secret');
    expect(value.verdict).toBe('suspicious'); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not retry a capacity-limited Gemini POST even when scan HTTP retries are enabled', async () => {
    const value = await report();
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: { code: 503, status: 'UNAVAILABLE', message: 'High demand' } }, { status: 503 }));
    const result = await withScanBudget(enabled, 'fixture-client', () => explain(value, enabled));
    expect(result).toMatchObject({ source: 'deterministic', ai_status: 'unavailable', model: 'gemini-3.5-flash-lite', evidence_ids: ['known'] });
    expect(fetch).toHaveBeenCalledTimes(1); expect(value.verdict).toBe('suspicious');
  });
  it('aborts once at the selection deadline and preserves the recorded warning', async () => {
    const value = await report();
    vi.mocked(fetch).mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = explain(value, enabled); await vi.advanceTimersByTimeAsync(3001);
    expect(await pending).toMatchObject({ source: 'deterministic', ai_status: 'timeout', evidence_ids: ['known'] });
    expect(fetch).toHaveBeenCalledTimes(1); expect(value.verdict).toBe('suspicious');
  });
  it('uses the remaining whole-scan budget when it is shorter than the AI deadline', async () => {
    const value = await report();
    vi.mocked(fetch).mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = withScanBudget(enabled, 'fixture-client', async () => {
      await new Promise(resolve => setTimeout(resolve, 11_000));
      return explain(value, enabled);
    });
    await vi.advanceTimersByTimeAsync(12_001);
    expect(await pending).toMatchObject({ source: 'deterministic', ai_status: 'timeout', evidence_ids: ['known'] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('retains the existing coordinator budget gate for AI submissions', async () => {
    const value = await report();
    const env: Bindings = { ...enabled, SCAN_COORDINATOR: { idFromName: () => 'control', get: () => ({ fetch: async url =>
      Response.json(String(url).endsWith('/circuit') ? { allowed: true } : { allowed: false }) }) } };
    const result = await withScanBudget(env, 'fixture-client', () => explain(value, env));
    expect(result.ai_status).toBe('rate_limited'); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    response(selection(), 'MAX_TOKENS'), response(selection(), ''), response(selection(), 'SAFETY'),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()) }, { text: 'extra' }]),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()), functionCall: {} }]),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()), thought: true }]),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()), thought: 'true' }]),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()), thoughtSignature: 123 }]),
    response(selection(), 'STOP', [{ thoughtSignature: 'opaque' }]),
    response(selection(), 'STOP', [{ text: JSON.stringify(selection()) }, { text: 'private thought', thought: true, functionCall: {} }]),
    response(selection(), 'STOP', [{ text: '{malformed' }]), response(selection(), 'STOP', [{ text: 'x'.repeat(2001) }]),
    response({ ...selection(), prose: 'Invented safety guarantee' }), response(selection('malicious')),
    response(selection('suspicious', ['invented'])), response(selection('suspicious', ['known', 'known'])),
    response(selection('suspicious', [])), Response.json({ candidates: [] }),
    Response.json({ promptFeedback: { blockReason: 'SAFETY' } }), new Response('{bad json'),
  ])('rejects unfinished, hostile or malformed output %#', async fixture => {
    const value = await report(); vi.mocked(fetch).mockResolvedValue(fixture.clone());
    expect(await explain(value, enabled)).toMatchObject({ source: 'deterministic', ai_status: 'invalid_response', evidence_ids: ['known'] });
    expect(value.verdict).toBe('suspicious');
  });
  it('preserves completed metadata only for unchanged evidence context and downgrades expiry changes', async () => {
    const value = await report(false); value.reasons = []; vi.mocked(fetch).mockResolvedValue(response(selection(value.verdict, [])));
    value.explanation = await explain(value, enabled);
    expect(value.explanation.ai_status).toBe('complete');
    expect(isScanReport(value)).toBe(true);
    const same = refreshExplanation(value, structuredClone(value));
    expect(same.explanation).toEqual(value.explanation);
    const changed = structuredClone(value), engine = changed.engines[0];
    changed.engines[0] = aggregate(engine.id, engine.name, engine.kind, engine.targets.map(item => ({ ...item, status: 'pending' })));
    Object.assign(changed, assess(changed.engines, changed.checked_urls));
    const updated = refreshExplanation(value, changed);
    expect(updated.explanation).toMatchObject({ source: 'deterministic', ai_status: 'unavailable', model: 'gemini-3.5-flash-lite' });
    expect(isScanReport(updated)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('invalidates cache identity when assistant activation or model configuration changes', async () => {
    const urls = ['https://example.com/'];
    const disabled = await cacheKey(urls, {});
    expect(await cacheKey(urls, enabled)).not.toBe(disabled);
    expect(await cacheKey(urls, { ...enabled, GEMINI_MODEL: 'another-model' })).not.toBe(await cacheKey(urls, enabled));
  });
});
