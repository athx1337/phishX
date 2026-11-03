import { isScanReport } from '../../shared/scan';
import type { ScanJob } from './types';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
export function isScanJob(value: unknown): value is ScanJob {
  if (!record(value) || value.version !== 2 || !isScanReport(value.report) ||
      typeof value.deadline !== 'number' || !Number.isFinite(value.deadline) || typeof value.next_poll_at !== 'number' || !Number.isFinite(value.next_poll_at) ||
      !Array.isArray(value.pending) || value.pending.length > 2 ||
      value.revision !== undefined && (!Number.isInteger(value.revision) || Number(value.revision) < 0 || Number(value.revision) > 1000) ||
      value.coordinator_lease !== undefined && (typeof value.coordinator_lease !== 'string' || !/^[a-f0-9-]{36}$/i.test(value.coordinator_lease))) return false;
  const report = value.report;
  return value.pending.every(item => record(item) && typeof item.url === 'string' && report.checked_urls.includes(item.url) &&
    typeof item.provider_id === 'string' && /^[a-f0-9-]{36}$/i.test(item.provider_id));
}
