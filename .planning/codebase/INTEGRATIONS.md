---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Integrations
Analysis date: 2026-11-03

## Reputation
- Google Safe Browsing v5 URL search, independent API key.
- GSB provider-specific validity honored in optional KV cache.
- URLhaus authenticated URL lookup; malware-distribution evidence.
- VirusTotal existing URL reports, vendor statistics and analysis timestamps.
- VirusTotal domain records for registration enrichment.
- VT unknown/empty/stale evidence cannot establish current clean coverage.

## Active inspection
- Cloudflare URL Scanner v2 with account/token bindings.
- Explicit Unlisted submission; unlisted does not mean private.
- Public DNS preflight uses fixed Cloudflare DoH endpoint.
- Worker never directly downloads arbitrary target HTML.
- Per-protocol jobs correlate provider UUID and original task URL.
- Application polling capability expires after three minutes.
- Provider DNS/redirect safety is outside this Worker's direct control.

## Storage and protection
- SCAN_CACHE optional KV stores short-lived jobs/provider caches/reports.
- SCAN_RATE_LIMITER required managed scan budget.
- POLL_RATE_LIMITER required separate polling budget.
- ALLOWED_ORIGINS exact frontend origins.
- CACHE_CONFIG_VERSION invalidates configuration generations.
- Browser localStorage stores opt-in redacted summaries for seven days.
- Ungrounded Gemini prose removed; the optional constrained evidence-selection path is described below.
- Archived research models are not served; a separately trained/exported XGBoost model is active.

## v0.3 verified integration changes
- Genuine trained XGBoost runs locally in the Worker, without model API credentials. See `model/MODEL-CARD.md`.
- Optional Gemini is constrained to existing evidence IDs and deterministic rendering; no free-form model prose is accepted.
- IANA-bootstrap RDAP adds domain registration context.
- Required production `SCAN_COORDINATOR` and independent `CLIENT_ID_SECRET` add globally coordinated budgets/leases/circuits. `METRICS_TOKEN` protects aggregate monitoring.
- Live Google/URLhaus/VirusTotal credentials and actual XGBoost execution were verified in a protected Workers version; details in phase02 `HOSTED-VALIDATION.json`. Public production remains a separately managed release.
