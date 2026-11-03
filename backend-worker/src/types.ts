import type { ScanReport, TargetResult } from '../../shared/scan';

export interface RateLimiter { limit(options: { key: string }): Promise<{ success: boolean }> }
export interface CacheStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}
export interface Bindings {
  SCAN_CACHE?: CacheStore;
  SCAN_RATE_LIMITER?: RateLimiter;
  POLL_RATE_LIMITER?: RateLimiter;
  GOOGLE_SAFE_BROWSING_API_KEY?: string;
  URLHAUS_API_KEY?: string;
  VIRUSTOTAL_API_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  CACHE_CONFIG_VERSION?: string;
  SCAN_COORDINATOR?: { idFromName(name: string): unknown; get(id: unknown): { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> } };
  CLIENT_ID_SECRET?: string;
  METRICS_TOKEN?: string;
  REQUIRE_COORDINATOR?: string;
  DEV_MODE?: string;
  GLOBAL_SCAN_LIMIT?: string;
  GLOBAL_POLL_LIMIT?: string;
  CLIENT_SCAN_LIMIT?: string;
  CLIENT_POLL_LIMIT?: string;
  SCAN_CONCURRENCY?: string;
  POLL_CONCURRENCY?: string;
  ACTIVE_CONCURRENCY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_ENABLED?: string;
  GEMINI_MODEL?: string;
  HTTP_RETRIES?: string;
  GSB_REQUEST_LIMIT?: string;
  VT_REQUEST_LIMIT?: string;
  URLHAUS_REQUEST_LIMIT?: string;
  CLOUDFLARE_REQUEST_LIMIT?: string;
  GEMINI_REQUEST_LIMIT?: string;
}
export interface PendingTarget { url: string; provider_id: string }
export interface ScanJob {
  version: 2;
  revision?: number;
  report: ScanReport;
  pending: PendingTarget[];
  next_poll_at: number;
  deadline: number;
  coordinator_lease?: string;
}
export interface CloudflarePoll { target: TargetResult; report?: ScanReport['cloudflare_reports'][number] }
export class PublicError extends Error {
  constructor(public code: string, message: string, public status: 400 | 401 | 403 | 404 | 410 | 413 | 415 | 429 | 503 = 400) { super(message); }
}
