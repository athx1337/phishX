# Requirements

- [x] **TRUST-01** Four-state verdict and deterministic evidence explanation; failures never count as clean.
- [x] **TRUST-02** Remove fake telemetry, special Gist rule, simulated XGBoost branding and arbitrary scores; real versioned model inference is added separately in v0.3.
- [x] **DETECT-01** PSL domains, bounded explainable brand/IDN/lookalike signals; legitimate login paths and shortener substrings do not falsely trigger.
- [x] **API-01** Validate JSON, URL length/body size, schemes/credentials, public destinations; normalize IDNs, IPv4/IPv6, scheme case and ports.
- [x] **API-02** Strict configured CORS, managed rate limiting, redacted errors/logs and provider deadlines.
- [x] **PROVIDER-01** Independent credentials, GSB v5, typed fresh VT URL evidence and domain enrichment, URLhaus malware categorization.
- [x] **PROVIDER-02** Unlisted Cloudflare v2 jobs, both protocol targets, real observations only; pending/errors and elapsed scan limits visible.
- [x] **CACHE-01** Hashed policy/scope/config-aware keys, observation/expiry, refresh bypass, no caching incomplete/unknown results as clean.
- [x] **UI-01** Evidence, actual domain, coverage and recommendation lead; provider failures and telemetry provenance visible.
- [x] **UI-02** Abortable requests, useful errors, no wake gate/fake progress; responsive accessible dialogs and reduced motion.
- [x] **PRIVACY-01** Submission disclosure, sensitive URL consent, opt-in redacted history with expiry/clear.
- [x] **DEV-01** Reproducible dependencies/scripts, binding types, examples, CI and accurate docs.
- [x] **TEST-01** Audit regression matrix, provider contract/outage/expiry/malformed response tests, frontend verdict/workflow tests and controlled browser smoke verification.

## v0.3 complete audit closure (user authorized 2026-11-03)
The earlier no-training scope is superseded by the user's explicit request for every TXT concern and actual XGBoost. The phase01 checkboxes record that earlier delivery, not closure of this expanded milestone.

- [x] **ML-01** Genuine versioned XGBoost artifact executes in the Worker with shared training/serving feature code and native prediction parity.
- [x] **ML-02** Reproducible licensed public data, provenance/hashes, duplicate/conflict removal, domain-disjoint temporal evaluation, separate calibration and validation-only thresholds. Undated prior and repeat fixed-test evaluation are disclosed.
- [x] **ML-03** Executed held-out precision, recall, FPR/FNR, AUC, calibration, latency and limitations; model negatives never count as remote coverage or safety.
- [x] **RES-01** Whole-scan deadline, bounded selective retries/backoff, circuit breakers and failure-preserving asynchronous results.
- [x] **ABUSE-01** Shared per-client/global quotas and concurrency leases, privacy-preserving trusted caller identity and fail-closed production configuration.
- [x] **DETECT-02** IANA-bootstrap RDAP registration enrichment and maintained Unicode confusables with bounded explainable warnings.
- [x] **DETECT-03** Observed redirect destinations reassessed separately with bounded followups and incomplete-destination veto of clean verdicts.
- [x] **AI-01** Optional Gemini output constrained to existing evidence IDs/templates, deterministic rendering and fixed verdict authority. Disabled by default in production.
- [x] **OBS-01** Protected aggregate metrics, provider latency/failure measurements, tested alert rules/dashboard and operational runbooks. Actual production Prometheus scrape verified; ongoing host/delivery pending.
- [x] **SEC-01** Executed redacted secret scanning, full dependency audits and credential/environment procedures.
- [x] **A11Y-01** Result announcements/focus, domain copying, offscreen animation lifecycle and executed keyboard/mobile/axe checks.
- [x] **AUDIT-ALL** Each TXT concern, roadmap recommendation and acceptance criterion has implementation/test evidence or a precisely identified external verification requirement.

## Verification limits
No superiority claim against SENTINEL-X without a comparable head-to-head benchmark. No arbitrary direct crawling. Public historical data and labels are not current live threat validity. Historical research/pickle repair is separate from the new reproducible model. Production release, real providers and metrics are now verified; exact scope is in phase02 verification. Ongoing alert delivery, billing/retention/rotation settings and independent future validation remain explicit followups. Checked requirements reflect implemented capabilities and scoped evidence, not universal operational completion.
