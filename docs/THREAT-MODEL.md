# Threat model

Protect provider credentials/quota, availability, sensitive URLs and report integrity. Browser input, persisted browser state, provider JSON and cached reports are untrusted. Runtime validation is required before rendering a report.

The public Worker calls fixed provider endpoints and optional KV, never directly crawls submitted hosts. Active browsing occurs at Cloudflare.

| Threat | Control and limit |
| --- | --- |
| False reassurance | Explicit provider states, per-target freshness, four-state policy |
| Fabricated observations | No synthetic production fallback; attributed evidence and deterministic summaries |
| Quota abuse | Managed location budgets plus Durable Object global/client budgets and expiring concurrency leases; required coordination fails closed |
| Internal targets | HTTP(S)-only parsing, prohibited host/IP rejection, public-DNS preflight for active scans |
| Parsing ambiguity | Normalized IDNs/IPs, credentials/control rejection, PSL boundaries |
| Cache cross-scope reuse | Hashed scope/policy/configuration keys, schema validation and expiry |
| Poll abuse | Random capabilities, expiry, no-store and enforced cadence |
| Confidential URL disclosure | Sensitive-input acknowledgement, unlisted active scans, redacted opt-in history |
| Provider schema drift | Missing/malformed data cannot count as a negative; contract regressions |
| Model defects or distribution shift | Versioned artifact/features, native parity checks, heldout error rates; model negatives never establish safety |
| Generative explanation injection | Optional Gemini selects bounded existing evidence IDs only; deterministic rendering and verdict |
| Monitoring data disclosure | Separate bearer token, bounded aggregate labels, no URL/IP/token labels |

## Residual risks

DNS preflight does not pin Cloudflare's later resolved address or control its redirects. Do not claim provider-side rebinding/redirect SSRF protection. Adding a direct crawler needs a separate address-pinning/redirect-validation design.

Managed Cloudflare limits are approximate per location. A single coordinator serializes global/client budgets and concurrency leases across regions; production requires it. These request limits are not a provider account billing guarantee. Set WAF/provider quotas and spending alerts. Shared IPs may share budgets; caller-selected forwarding headers are not trusted identity.

New, targeted or cloaked threats can evade reputation feeds. TLS does not establish legitimacy. Bounded brand rules and URL heuristics have false positives/negatives; IDNs, shorteners and login keywords alone do not prove phishing. Historical vendor results are not independent fresh scans or calibrated accuracy.

Provider retention exceeds application retention. Unlisted reports are not confidential storage. Dependency audits/mocked tests do not prove security or live integration success.

## Measurement

Regression fixtures cover outages, malformed responses, mixed protocols, stale findings, cache/jobs, consent and UI uncertainty. Live credentials/resources need separate controlled checks.

The current model's executed time/domain-separated evaluation, false-positive/negative measurements, parity and latency checks are in `model/`; see [research](RESEARCH.md). These measure the model/dataset, not live whole-product detection accuracy or provider uptime. No superiority over SENTINEL-X is claimed. [Operations](OPERATIONS.md) separates executable monitor configuration from hosted alert delivery.
