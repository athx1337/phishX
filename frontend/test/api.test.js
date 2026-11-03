import { describe, expect, it, vi } from 'vitest';
import { ApiError, pingApi, pollScan, requestScan } from '../src/lib/api';
import { scanReport } from './fixtures';

describe('API trust boundary', () => {
  it('sends explicit JSON without cookies and accepts the v2 report', async () => {
    const report = scanReport();
    const fetcher = vi.fn().mockResolvedValue(Response.json(report));
    vi.stubGlobal('fetch', fetcher);
    await expect(requestScan({ url: report.url, refresh: true })).resolves.toEqual(report);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/verify'), expect.objectContaining({
      method: 'POST', credentials: 'omit', cache: 'no-store',
      body: JSON.stringify({ url: report.url, refresh: true }),
    }));
  });

  it.each([
    { is_phishing: false, url: 'https://example.com' },
    scanReport({ schema_version: 1 }),
    scanReport({ verdict: 'safe' }),
    scanReport({ coverage: { total: 4 } }),
    scanReport({ cloudflare_reports: [{ url: 'https://example.com', certificates: [{}] }] }),
  ])('refuses legacy or malformed data instead of inferring safety', async report => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(report)));
    await expect(requestScan({ url: 'example.com' })).rejects.toThrow(/unsupported or incomplete scan report/);
  });

  it('preserves useful validation failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Only public HTTP(S) targets are supported.' }, { status: 400 })));
    await expect(requestScan({ url: 'http://127.0.0.1' })).rejects.toMatchObject({ status: 400, message: 'Only public HTTP(S) targets are supported.' });
  });

  it('explains a rate limit without automatically retrying', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: 'Scan budget reached.' }, { status: 429 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(requestScan({ url: 'example.com' })).rejects.toMatchObject({ status: 429, message: expect.stringContaining('Please wait') });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('aborts a hung request at its deadline', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const request = requestScan({ url: 'example.com' }, { timeout: 20 });
    const assertion = expect(request).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(21);
    await assertion;
  });

  it('propagates user cancellation rather than a connection error', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const controller = new AbortController();
    const request = requestScan({ url: 'example.com' }, { signal: controller.signal });
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it.each(['https://attacker.example/api/scans/id', '//attacker.example', '/api/scans/../../secret', '/api/scans/not-a-uuid'])(
    'rejects an unsafe polling path before fetching: %s', async path => {
      const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
      await expect(pollScan(path)).rejects.toBeInstanceOf(ApiError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it('does not treat a ping 404 as healthy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Not found' }, { status: 404 })));
    await expect(pingApi()).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a structurally valid but expired report on arrival', async () => {
    const report = scanReport({
      observed_at: new Date(Date.now() - 30_000).toISOString(),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(report)));
    await expect(requestScan({ url: report.url })).rejects.toThrow(/expired or not-yet-valid evidence/);
  });
});
