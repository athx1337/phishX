import { isScanReport, isFreshScanReport } from '../../../shared/scan';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

async function request(path, { signal, timeout = 25000, ...options } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal, cache: 'no-store', credentials: 'omit' });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.error === 'string' ? data.error.slice(0, 300) :
        typeof data?.error?.message === 'string' ? data.error.message.slice(0, 300) : `Scan service returned HTTP ${response.status}.`;
      throw new ApiError(response.status === 429 ? `${message} Please wait before trying again.` : message, response.status);
    }
    return data;
  } catch (err) {
    if (timedOut) throw new ApiError('The scan service took too long to respond. Please try again.');
    if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (err instanceof ApiError) throw err;
    throw new ApiError('Cannot reach the scan service. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function validateReport(data) {
  if (!isScanReport(data)) throw new ApiError('The server returned an unsupported or incomplete scan report. Please update both the frontend and API.');
  if (!isFreshScanReport(data)) throw new ApiError('The scan service returned expired or not-yet-valid evidence. Refresh to request a current report.');
  return data;
}

export async function requestScan(body, options = {}) {
  return validateReport(await request('/api/verify', { ...options, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
}
export async function pollScan(path, options = {}) {
  if (!/^\/api\/scans\/[a-f0-9-]{36}$/i.test(path)) throw new ApiError('The scan service returned an invalid polling address.');
  return validateReport(await request(path, { ...options, timeout: 15000 }));
}
export async function pingApi(options = {}) {
  const data = await request('/api/ping', { ...options, timeout: 5000 });
  if (data?.status !== 'ok') throw new ApiError('The scan service is unavailable.');
  return data;
}
