# Operations and incident response

Production exposes protected aggregate metrics. A real temporary Prometheus process scraped them successfully with all six tested rules loaded; that process has been stopped. The repository includes the scrape/rule configuration and a Grafana dashboard. A free GitHub Actions availability monitor is prepared and live-tested; [FREE-MONITORING.md](FREE-MONITORING.md) records activation steps and its limits. Ongoing scheduled execution and notification delivery are not yet verified.

## Provision and verify

1. Deploy the Worker with its `SCAN_COORDINATOR` Durable Object binding/migration, `REQUIRE_COORDINATOR=true`, exact allowed origins and managed rate limiters. Never enable `DEV_MODE` in a public environment. Missing required production coordination fails closed.
2. Store independent random `CLIENT_ID_SECRET` and `METRICS_TOKEN` as Worker secrets. Keep the metrics token out of frontend builds, URLs, dashboards and repository files. The client budget key is a daily HMAC of the trusted Cloudflare address; no raw client IP is retained by the coordinator.
3. Review the production Worker target in `ops/prometheus.yml`, mount a restricted token file at `/run/secrets/phishx_metrics_token`, and load `ops/alerts.yml`. Import `ops/dashboard.json` into Grafana and select your Prometheus datasource. The newly provisioned metrics/privacy secrets have an ignored local backup in `backend-worker/.dev.vars.production`; never publish that file.
4. Run `npm run check:ops`. This downloads the pinned official Prometheus release, verifies its published SHA-256, then runs real `promtool` syntax and alert behavior tests. The config uses the verified production target and contains no token value or invented alert recipient.
5. Verify a scrape returns OpenMetrics only with the bearer token and fails without it. Check `up{job="phishx"}`, actual provider label values, and the dashboard against controlled staging traffic. Attach your existing Alertmanager route, then use its test facility to verify delivery. This task does not send messages to people or configure account billing.

## Budgets and provider quotas

The coordinator defaults to 60 global scan admissions and 600 polls/minute, 5 scans and 30 polls/client/minute, with 4 scan, 8 poll and 3 active-submission leases. Review `control.ts`, coordinator configuration and current provider terms before changing these limits. Managed per-location limits provide another layer, not a global spending guarantee.

Set account quota/billing alerts at the provider and Cloudflare account, with escalation before exhaustion. Repository alerts detect returned rate limits, failures and admission pressure; they cannot measure provider account balance or prevent charges already incurred. Do not retry active submissions blindly or increase limits to conceal an attack. Use WAF protection, lower admission budgets and temporarily disable the failing provider while preserving unknown/error coverage.

The same coordinator also bounds actual provider HTTP attempts, including retries: defaults per minute are VirusTotal 4, Safe Browsing 600, URLhaus 60, Cloudflare 10 and Gemini 5. These are configurable through `VT_REQUEST_LIMIT`, `GSB_REQUEST_LIMIT`, `URLHAUS_REQUEST_LIMIT`, `CLOUDFLARE_REQUEST_LIMIT` and `GEMINI_REQUEST_LIMIT`. Lookup budgets are separate from route admissions; a refused lookup is not a clean observation. Confirm daily and monthly account quotas separately. Normal pending/absent 404 lookups do not trip failure circuits.

## Incident triage

Start with `PhishXMetricsUnavailable` and coordinator health. Next inspect per-provider failure/timeout/rate-limited counts, p95 latency, open circuits and lease/admission pressure. Metrics use provider/status/route labels, never submitted URLs, query strings, tokens or client IPs. Deployment changes can reset aggregate counters; calculate rates with reset-aware PromQL and inspect reachability separately.

If a provider fails, maintain the explicit unavailable/error state and authoritative evidence policy. A restored dashboard is not proof of detection quality. Re-run model/artifact verification and the controlled regression suite after policy/model changes. Record any stale observation, partial redirect assessment and observed external permissions accurately.

## Credentials and environment separation

Use distinct development, staging and production Worker names, coordinator namespaces, KV namespaces, provider projects and tokens. Use minimum Scanner read/write permissions and provider-specific API keys. Grant metrics readers only the separate metrics token. Never reuse Gemini credentials as Safe Browsing credentials.

Rotate routinely and immediately after suspected exposure: create a replacement with the same minimum scope, update the correct Worker secret, validate a controlled request without logging headers/bodies, revoke the old credential, then increment `CACHE_CONFIG_VERSION` to invalidate observations tied to old capabilities. Rotate `CLIENT_ID_SECRET` deliberately; its replacement resets client identity budgets. Rotate the metrics token and mounted scrape secret together. Keep the old credential active only for the shortest necessary validated transition.

Run `npm run scan:secrets` before review. The script checks current tracked/unignored source and all available Git history with real Gitleaks, verifies the official binary archive checksum, redacts values and prints only rule/file/line metadata. `.agents/` vendored skills and the archived `repo` gitlink are excluded from the working-tree source scan; the Git-history scan is not path-excluded. A repository scan cannot inspect Cloudflare/GitHub/Vercel secret stores. Revoke any actual exposed key before history cleanup; deleting a line is not rotation.

Production active jobs use separate per-scan Durable Objects with strongly consistent revisions, conservative conflict resolution and deletion alarms. Their URL/report payloads are distinct from the URL-free admission/metrics object. Validate alarm deletion and concurrent-poll regression tests after control changes; do not treat a KV copy as authoritative production job state.

## Rollback and evidence

Keep the frontend/API contract compatible during rollout. Revert to the prior reviewed application and model artifacts together if regression checks fail, regenerate cache policy/configuration generation, and leave degraded providers explicit. Preserve redacted failure metadata and exact artifact versions rather than full URL payloads. Configure platform logs with restricted access and short retention; providers retain external copies independently of KV/browser expiry.

Local evidence and hosted verification must be recorded separately in the phase verification and [audit traceability](AUDIT-TRACEABILITY.md). No local test proves production DNS, deployed bindings, account permissions, notification routing or availability across regions.
