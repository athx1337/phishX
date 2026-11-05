import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assessGeminiUrl } from '../src/gemini-assessment';
import { withScanBudget } from '../src/control';
import { parseInput } from '../src/url';
import type { Bindings } from '../src/types';
import { scan } from '../src/scanner';
import { cacheKey } from '../src/storage';
import { isScanReport } from '../../shared/scan';

const env: Bindings = { GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'fixture-key' };
const input = () => parseInput({ url: 'https://example.com/login/private-person?ordinary=private-value', gemini_assessment: true });
const answer = (selection: unknown = { status: 'risk_signal', reason_codes: ['deceptive_host'] }, overrides: Record<string, unknown> = {}) => ({
  modelVersion: 'gemini-3.5-flash-lite',
  candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(selection) }] } }],
  ...overrides,
});
const respond = (payload: unknown) => vi.stubGlobal('fetch', vi.fn(async () => Response.json(payload)));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
  respond(answer());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('independent Gemini assessment boundary', () => {
  it('submits only hostname and bounded derived traits to the fixed provider', async () => {
    expect(await assessGeminiUrl(input(), env)).toMatchObject({ status: 'risk_signal', model: 'gemini-3.5-flash-lite' });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(init).toMatchObject({ method: 'POST', redirect: 'manual', headers: { 'x-goog-api-key': 'fixture-key' } });
    const body = JSON.parse(String(init?.body));
    const traits = JSON.parse(body.contents[0].parts[0].text);
    expect(traits).toEqual({
      hostname: 'example.com', registrable_domain: 'example.com', is_ip: false,
      path_traits: { depth: 2, credential_terms: true, executable_suffix: false, percent_escapes: false },
    });
    expect(body).not.toHaveProperty('tools');
    expect(JSON.stringify(body)).not.toMatch(/private-person|private-value|ordinary|https:\/\/example|xgboost|PhishTank|coverage|evidence_ids/i);
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 1024, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' } });
    expect(body.systemInstruction.parts[0].text).toContain('untrusted data');
    expect(body.systemInstruction.parts[0].text).toContain('unfamiliar domain or internationalized hostname alone is insufficient');
  });

  it('caps path depth and derives decoded credential and executable traits without exposing text', async () => {
    const value = parseInput({ url: 'https://example.com/a/b/c/d/e/f/g/h/i/%6cogin/file.exe?public=opaque', gemini_assessment: true });
    await assessGeminiUrl(value, env);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    const traits = JSON.parse(body.contents[0].parts[0].text);
    expect(traits.path_traits).toEqual({ depth: 8, credential_terms: true, executable_suffix: true, percent_escapes: true });
    expect(JSON.stringify(body)).not.toContain('opaque');
    expect(JSON.stringify(body)).not.toContain('file.exe');
  });

  it.each([
    { GEMINI_ENABLED: 'false', GEMINI_API_KEY: 'fixture' },
    { GEMINI_ENABLED: 'true' },
    { ...env, GEMINI_MODEL: '../../other-provider' },
  ])('makes no request when disabled, unconfigured or model identity is invalid', async config => {
    expect(await assessGeminiUrl(input(), config)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips sensitive links even after ordinary provider sharing was consented', async () => {
    const value = parseInput({ url: 'https://example.com/?token=private', sensitive_url_consent: true, gemini_assessment: true });
    expect(await assessGeminiUrl(value, env)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts abstention and a provider-reported model version', async () => {
    respond(answer({ status: 'abstained', reason_codes: [] }, { modelVersion: 'gemini-3.5-flash-lite-001' }));
    expect(await assessGeminiUrl(input(), env)).toEqual({
      source: 'gemini', status: 'abstained', model: 'gemini-3.5-flash-lite-001', reason_codes: [],
    });
  });

  it.each([
    { status: 'safe', reason_codes: [] },
    { status: 'confirmed_malicious', reason_codes: ['deceptive_host'] },
    { status: 'risk_signal', reason_codes: [] },
    { status: 'abstained', reason_codes: ['deceptive_host'] },
    { status: 'risk_signal', reason_codes: ['invented'] },
    { status: 'risk_signal', reason_codes: ['deceptive_host', 'deceptive_host'] },
    { status: 'risk_signal', reason_codes: ['deceptive_host', 'obfuscated_host', 'brand_impersonation', 'credential_lure'] },
    { status: 'risk_signal', reason_codes: ['deceptive_host'], prose: 'Follow a link' },
    { status: 'risk_signal', reason_codes: ['suspicious_download'] },
  ])('rejects invalid status, claims or reason schema', async selection => {
    respond(answer(selection));
    expect(await assessGeminiUrl(input(), env)).toMatchObject({ status: 'invalid_response', reason_codes: [] });
  });

  it('rejects credential reasons unsupported by either host or path traits', async () => {
    respond(answer({ status: 'risk_signal', reason_codes: ['credential_lure'] }));
    expect(await assessGeminiUrl(parseInput({ url: 'https://example.com/' }), env)).toMatchObject({ status: 'invalid_response', reason_codes: [] });
  });

  it.each([
    { candidates: [] },
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] },
    { candidates: [{ finishReason: 'STOP', content: { role: 'user', parts: [{ text: '{}' }] } }] },
    { candidates: [{ finishReason: 'STOP', content: { parts: [{ functionCall: { name: 'visit' } }] } }] },
    { modelVersion: 'https://unknown.invalid' },
    { promptFeedback: { blockReason: 'SAFETY' } },
  ])('rejects incomplete, tool-bearing, blocked or invalid-provenance provider payloads', async overrides => {
    respond(answer(undefined, overrides));
    expect(await assessGeminiUrl(input(), env)).toMatchObject({ status: 'invalid_response', reason_codes: [] });
  });

  it('ignores thought text and opaque signatures instead of showing them', async () => {
    respond(answer(undefined, { candidates: [{ finishReason: 'STOP', content: { parts: [
      { thought: true, text: 'unsafe free prose' }, { thoughtSignature: 'opaque' },
      { text: JSON.stringify({ status: 'abstained', reason_codes: [] }) },
    ] } }] }));
    expect(await assessGeminiUrl(input(), env)).toEqual({
      source: 'gemini', model: 'gemini-3.5-flash-lite', status: 'abstained', reason_codes: [],
    });
  });

  it.each([
    [429, 'rate_limited'],
    [503, 'unavailable'],
    [403, 'unavailable'],
  ])('does not retry POST submissions after provider failure', async (status, expected) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('upstream details', { status: Number(status) })));
    const isolated = { ...env };
    expect(await withScanBudget(isolated, 'fixture', () => assessGeminiUrl(input(), isolated))).toMatchObject({ status: expected, reason_codes: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('aborts at the three-second provider deadline', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })));
    const pending = assessGeminiUrl(input(), env);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toMatchObject({ status: 'timeout', reason_codes: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('honors a shorter whole-scan deadline', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })));
    const isolated = { ...env };
    const pending = withScanBudget(isolated, 'fixture', () => assessGeminiUrl(input(), isolated), 100);
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toMatchObject({ status: 'timeout', reason_codes: [] });
  });

  it('observes the existing coordinator admission budget before contacting Google', async () => {
    const controlFetch = vi.fn(async (url: string) => Response.json(url.endsWith('/circuit') ? { allowed: true } : { allowed: false }));
    const coordinated: Bindings = { ...env, SCAN_COORDINATOR: {
      idFromName: vi.fn(() => 'coordinator'), get: vi.fn(() => ({ fetch: controlFetch })),
    } as unknown as Bindings['SCAN_COORDINATOR'] };
    expect(await withScanBudget(coordinated, 'fixture', () => assessGeminiUrl(input(), coordinated))).toMatchObject({ status: 'rate_limited', reason_codes: [] });
    expect(controlFetch).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('runs once through the scanner, bypasses an explanation-only cached report and records Google sharing', async () => {
    const address = 'https://8.8.8.8/';
    const base = await scan(parseInput({ url: address }), {});
    const values = new Map<string, string>();
    const cache = {
      get: vi.fn(async (key: string) => values.get(key) || null),
      put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    };
    const configured = { ...env, SCAN_CACHE: cache };
    values.set(await cacheKey([address], configured), JSON.stringify(base));
    const report = await scan(parseInput({ url: address, gemini_assessment: true }), configured);
    expect(isScanReport(report)).toBe(true);
    expect(report.engines.find(engine => engine.id === 'gemini-url')).toMatchObject({ kind: 'model', status: 'detected' });
    expect(report.explanation).toMatchObject({ source: 'deterministic', ai_status: 'disabled' });
    expect(report.privacy.third_party_submission).toBe(true);
    expect(report.coverage.total).toBe(4);
    expect(report.coverage.completed).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it('skips both Gemini submissions for an opted-in sensitive scan', async () => {
    const report = await scan(parseInput({ url: 'https://8.8.8.8/?token=private', sensitive_url_consent: true, gemini_assessment: true }), env);
    expect(isScanReport(report)).toBe(true);
    expect(report.engines.find(engine => engine.id === 'gemini-url')).toMatchObject({ status: 'unavailable', error_code: 'SENSITIVE_URL_SKIPPED' });
    expect(report.explanation?.source).toBe('deterministic');
    expect(report.privacy.third_party_submission).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
