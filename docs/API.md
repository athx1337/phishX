# Scan API v2

Reports and errors use `Cache-Control: no-store`. Exact-origin CORS does not enable browser credentials and is not authentication. Creation and polling have separate managed budgets. The authoritative response types and runtime validator are in `shared/scan.ts`.

## POST /api/verify

```json
{"url":"example.com/login","refresh":false,"sensitive_url_consent":false}
```

`url` is required. `refresh` bypasses cache lookup but remains rate-limited. `sensitive_url_consent` acknowledges third-party sharing for sensitive query keys/fragments; the backend enforces this boundary.

Only HTTP(S) public destinations are supported. The input limit is 4,096 URL characters and 8,192 request-body bytes. Normalization uses the standard URL parser and Public Suffix List-aware domain analysis. Credentials, control characters, malformed bodies, prohibited addresses and unsupported schemes are rejected. A bare domain requests HTTPS and HTTP; an explicit scheme requests one protocol. Fragments are stripped after consent; query/path evidence is retained. Scope is preserved throughout providers and cache keys.

| Response field | Meaning |
| --- | --- |
| `schema_version`, `policy_version` | Public contract version (2) and deterministic policy generation |
| `scan_id` | Random report ID; also a short-lived polling capability for active jobs |
| `url`, `checked_urls`, `dual_protocol` | Normalized primary URL and requested protocol scope |
| `domain` | ASCII/Unicode hostnames, actual registrable domain and literal-IP flag |
| `verdict`, `summary`, `reasons` | Four-state outcome, deterministic explanation and attributed evidence |
| `engines` | Kind, explicit status, evidence, observation time and per-target findings |
| `coverage` | Remote-provider completion/status totals and policy sufficiency |
| `cloudflare_reports` | Successful observed telemetry only; empty when unavailable |
| `whois` | Nullable registrar/creation information with real source/time |
| `registration` | Optional RDAP source/status/registrar/creation/domain-age observation |
| `destinations` | Optional independently assessed observed destinations with their own coverage/engines/timing |
| `explanation` | Optional deterministic or validated Gemini evidence-ID explanation; never a separate verdict |
| `observed_at`, `expires_at`, `cached` | Original timing and cache provenance |
| `privacy` | Sensitive-input and external-submission flags |
| `deep_scan` | Optional polling path, next allowed time and deadline |

### Provider status and coverage

`detected` and `no_detection` are conclusive observations. `unavailable` means absent capability/configuration, `error` an attempted failure, `pending` unfinished work, and `unknown` missing/stale intelligence. Unknown URLs and failed providers are not clean results.

Coverage counts four remote providers: Google Safe Browsing, URLhaus, VirusTotal and Cloudflare. Neither heuristics nor local `kind: "model"` inference inflate coverage. A provider completes only when every requested protocol has fresh conclusive target data. Partial failures do not erase positive evidence.

### Verdict policy

- Strong blocklist/active-scan evidence or sufficient VirusTotal vendor evidence produces `malicious`.
- Explainable deception, weaker vendor findings or stale positive intelligence produce `suspicious`.
- `no_known_threats` requires at least two independent fresh reputation sources for every requested target, no warning/detection and no pending active scan.
- Other cases are `unknown`.

An unresolved shortening URL remains `unknown` even when its original reputation is clean. Observed destinations have independent assessments; uninvestigated excess redirects and incomplete destination checks veto a clean conclusion. Registration failures remain explicit engine failures rather than completed age checks.

These are explicit policy rules, not calibrated confidence. VirusTotal observations are fresh for 24 hours; at least three malicious vendor findings produce malicious evidence, while one/two malicious findings or suspicious vendor findings produce a warning. Stale positives remain suspicious and stale negatives become unknown. Failures cannot outvote a positive finding.

Provider HTTP deadlines are bounded by per-request and whole-scan limits, selective idempotent retry/backoff and shared circuits. Active submissions are not blindly retried. DNS preflight is bounded at 2.5 seconds. URLhaus negative observations are valid for 120 seconds and positive observations for 300 seconds. Google Safe Browsing target caching honors its returned `cacheDuration`, with application-enforced expiry even when KV's minimum TTL is longer. Full-report caching requires all four remote providers to complete and is capped at 120 seconds or the earliest applicable expiry.

## GET /api/scans/:scan_id

When `deep_scan` is present, request its same-origin `poll_path` after `next_poll_at`. Replace the prior report with the complete returned report; do not compute a local verdict. Treat the unpredictable ID as a sensitive temporary read capability.

Cloudflare jobs require working KV and credentials. Each protocol is submitted independently with `visibility: "Unlisted"`; task success and real observations are checked. Jobs expire after 180 seconds (storage TTL 240 seconds), independently of KV expiry. Polling is enforced at least ten seconds apart. Expired/missing jobs return explicit errors. Storage/provider failures do not erase known positive evidence or create fake telemetry.

Production job state lives in a separate named Durable Object for each scan, with revisions and conservative conflict resolution. Concurrent stale polls cannot overwrite recorded warnings with older negative/error state. Native alarms delete job data at the fixed deadline plus sixty seconds; updates cannot extend retention. KV remains optional report/provider caching and pre-submission reservation storage. The KV-only job fallback is for uncoordinated local tests; production requires coordination. A temporarily unavailable job must not trigger a new paid submission. Cancellation stops local requests/polling, but cannot guarantee remote cancellation or deletion.

## GET /api/ping

Returns `{"status":"ok"}` for API reachability. It does not verify provider credentials or availability. A 404 is not a healthy ping.

## Errors and caching

Safe human-readable errors distinguish validation/consent failures, unsupported media, oversized input, HTTP 429 budgets, missing/expired jobs and missing required infrastructure. Provider credentials/raw authentication bodies are not exposed. Missing rate-limit bindings return HTTP 503. Default managed budgets are ten anonymous scan creations and sixty polls per minute per Cloudflare location, shared across anonymous users in that location; they are not globally atomic spending caps.

Report cache keys hash exact protocol scope, schema/policy and operator configuration generation. Freshness/expiry and refresh behavior are explicit. No stale/unknown/incomplete response is promoted into clean coverage by cache reuse. See backend code/tests for exact limits and status codes.

## Distributed control and metrics

A required production Durable Object coordinator serializes global/client admission budgets, expiring concurrency leases, circuit state and aggregate metrics. Missing required bindings/secrets fail closed. Client keys are daily HMACs of trusted Cloudflare edge identity; raw IPs are not persisted. Defaults and operational limits are in [operations](OPERATIONS.md). Managed per-location limits remain an additional layer.

`GET /api/metrics` requires independent bearer `METRICS_TOKEN` and returns aggregate OpenMetrics. Provider outcome/latency/circuit, verdict and admission/lease metrics contain no URL/client labels. This route is for a private monitor, not the frontend. `/api/ping` remains reachability only.

Model target data contains `model_version`, `features_version`, `raw_score`, `calibrated_score`, `warning_threshold`, `model_warning`, `promoted`, `feature_count` and `tree_count`. Numeric model output is not a probability that visiting is safe. Model warning evidence cannot establish a clean remote reputation result.
