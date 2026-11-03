import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanCoordinator } from '../src/coordinator';
import { readJob, writeJob } from '../src/storage';
import { scan } from '../src/scanner';
import { parseInput } from '../src/url';
import { aggregate, assess, evidence, target } from '../src/evidence';
import { isScanJob } from '../src/job-state';
import type { Bindings, ScanJob } from '../src/types';

const NOW = Date.parse('2026-11-03T10:00:00.000Z');
function namespace() {
  const instances = new Map<string, { object: ScanCoordinator; stored: Map<string, unknown>; alarm: ReturnType<typeof vi.fn> }>();
  const bindings: Bindings = { SCAN_COORDINATOR: { idFromName: name => name, get: id => {
    const name = String(id);
    if (!instances.has(name)) {
      const stored = new Map<string, unknown>(), alarm = vi.fn(async () => {}); let queue = Promise.resolve();
      const state = { storage: { get: async (key: string) => structuredClone(stored.get(key)), put: async (key: string, value: unknown) => { stored.set(key, structuredClone(value)); },
        setAlarm: alarm, deleteAll: async () => { stored.clear(); } },
        blockConcurrencyWhile: <T>(callback: () => Promise<T>) => { const result = queue.then(callback); queue = result.then(() => undefined, () => undefined); return result; } };
      instances.set(name, { object: new ScanCoordinator(state as unknown as DurableObjectState, {}), stored, alarm });
    }
    return { fetch: async (url, init) => instances.get(name)!.object.fetch(new Request(url, init)) };
  } } };
  return { bindings, instances };
}
async function job(): Promise<ScanJob> {
  const report = await scan(parseInput({ url: 'https://example.com/' }), {});
  return { version: 2, report, pending: [], next_poll_at: NOW + 10_000, deadline: NOW + 180_000 };
}
function positive(value: ScanJob): ScanJob {
  const next = structuredClone(value), url = next.report.url;
  next.report.engines = next.report.engines.map(engine => engine.id === 'gsb' ? aggregate('gsb', 'Google Safe Browsing', 'reputation', [target(url, 'detected', {
    evidence: [evidence('Google Safe Browsing', 'known-positive', 'Known threat', 'Recorded threat intelligence.', 'high', 'phishing', url)], expires_at: new Date(NOW + 300_000).toISOString(),
  })]) : engine);
  Object.assign(next.report, assess(next.report.engines, next.report.checked_urls));
  delete next.report.explanation;
  return next;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); vi.stubGlobal('fetch', vi.fn(async () => { throw Error('Offline fixture'); })); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('strongly consistent short-lived scan jobs', () => {
  it.each([true, false])('preserves a positive across concurrent stale writes, positive first=%s', async first => {
    const { bindings } = namespace(), original = await writeJob(bindings, await job());
    const warning = positive(original), stale = structuredClone(original);
    await Promise.all((first ? [warning, stale] : [stale, warning]).map(value => writeJob(bindings, value)));
    const current = await readJob(bindings, original.report.scan_id);
    expect(current?.report.verdict).toBe('malicious'); expect(current?.revision).toBe(3);
    expect(current?.report.reasons.some(reason => reason.id === 'known-positive')).toBe(true);
  });
  it('uses isolated job objects and never reads an eventually consistent KV copy', async () => {
    const { bindings, instances } = namespace();
    bindings.SCAN_CACHE = { get: vi.fn(async () => '{"stale":"copy"}'), put: vi.fn(async () => {}) };
    const one = await writeJob(bindings, positive(await job())), two = await writeJob(bindings, await job());
    expect(one.report.scan_id).not.toBe(two.report.scan_id);
    expect((await readJob(bindings, one.report.scan_id))?.report.verdict).toBe('malicious');
    expect((await readJob(bindings, two.report.scan_id))?.report.verdict).toBe('unknown');
    expect(bindings.SCAN_CACHE.get).not.toHaveBeenCalled(); expect(bindings.SCAN_CACHE.put).not.toHaveBeenCalled();
    expect(instances.size).toBe(2);
  });
  it('schedules deletion, expires reads and deletes job data through the native alarm contract', async () => {
    const { bindings, instances } = namespace(), value = await writeJob(bindings, await job());
    const instance = instances.get(`phishx-job:${value.report.scan_id}`)!;
    expect(instance.alarm).toHaveBeenCalledWith(NOW + 240_000);
    await instance.object.alarm(); expect(instance.stored.size).toBe(0);
    expect(await readJob(bindings, value.report.scan_id)).toBeNull();
    await writeJob(bindings, value); vi.setSystemTime(NOW + 240_001);
    expect(await readJob(bindings, value.report.scan_id)).toBeNull(); expect(instance.stored.size).toBe(0);
  });
  it('refuses malformed state, retention extension and fallback to stale KV on coordination failure', async () => {
    const { bindings } = namespace(), value = await writeJob(bindings, await job());
    expect(isScanJob({ ...value, deadline: NaN })).toBe(false);
    expect(isScanJob({ ...value, revision: -1 })).toBe(false);
    await expect(writeJob(bindings, { ...value, deadline: value.deadline + 1 })).rejects.toThrow();
    bindings.SCAN_CACHE = { get: vi.fn(async () => JSON.stringify(value)), put: vi.fn(async () => {}) };
    bindings.SCAN_COORDINATOR = { idFromName: name => name, get: () => ({ fetch: async () => { throw Error('Unavailable'); } }) };
    await expect(readJob(bindings, value.report.scan_id)).rejects.toThrow();
    expect(bindings.SCAN_CACHE.get).not.toHaveBeenCalled();
  });
});
