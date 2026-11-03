# Full audit traceability

Scope: the complete 3 November 2026 user-supplied **phishX — Full Security, Backend & Frontend Audit**, including all sections, twenty roadmap items and five acceptance criteria. The user additionally requires genuine XGBoost rather than merely renaming heuristics. The product is a free educational scanner. This document maps code and checks; the phase verification is the authoritative record of commands actually executed and live account observations.

**Status vocabulary:** implemented means code/configuration exists; locally verified means the named checks executed; live verification means a controlled deployed/provider check actually ran. None implies detection perfection, production deployment, account permissions, external alert delivery or superiority over SENTINEL-X. The new phase extends the prior safety fixes rather than narrowing the supplied audit.

## Sections 1–5: trust and backend

All paths below are relative to repository root. Backend regressions are in `backend-worker/test/scanner.spec.ts`; contract/privacy invariants are in `tests/`. Final phase verification records their integration results.

| Audit concern | Implemented response and important paths | Verification / operational boundary |
| --- | --- | --- |
| 1–2 unsafe binary consensus, missing evidence becoming safe | `shared/scan.ts`, `backend-worker/src/evidence.ts`: four verdicts; separate source/target status; freshness and per-protocol minimum reputation policy; strong positive cannot be outvoted | Policy/provider fixtures cover outage/conflicts/stale/partial protocols. No numerical website-safety guarantee |
| 3 simulated XGBoost, keyword false positives | `ml/`, `model/`, `backend-worker/src/ml.ts`: actual trained trees, versioned features, hashes/native parity, threshold warning evidence; heuristics stay independent | `npm run test:model`, model tests and executed heldout evaluation. Negative model output never counts as remote completion; general detection limits remain |
| 4 fabricated IP/ASN/TLS/request/link/risk fallback | `cloudflare.ts`, `CloudflareDeepAnalysis.jsx`: no synthetic production telemetry; explicit unavailable; nullable actual observations | Provider failure/malformed fixture tests and browser outage regression. Synthetic data is isolated to tests |
| 5.1 old Cloudflare endpoints/schema and 2-second polling | `cloudflare.ts`, `scanner.ts`, `storage.ts`: v2 create/result, actual task/report checks, asynchronous short-lived jobs, 10-second cadence | Contract mocks and job lifecycle tests; real permission/hosted availability separately recorded |
| 5.2 error indistinguishable from negative; VT404 | Provider adapters and shared contract separate detected/no_detection/unavailable/error/pending/unknown | No-key, timeout, quota, missing/stale/malformed and positive-preservation fixtures |
| 5.3 validation/body limits/PSL/IDN/private targets | `url.ts`: backend standard URL/PSL parsing, protocol/address/userinfo/control checks and size bounds; DNS preflight before optional active submission | Private/IPv6/alternate-IP/Unicode/normalization/body tests. Cloudflare's internal DNS/redirect resolver is outside application control; no rebinding guarantee claimed |
| 5.4 hardcoded raw-Gist malware | Removed special classification and invented description; ordinary raw Gist is evaluated by real sources | Harmless Gist regression; hosting alone is never malicious evidence |
| 5.5 VT nuance/freshness/UTF8 ID | `providers.ts`: UTF8 base64url identifier, historical vendor counts/categories/time, stale negative unknown and weaker findings suspicious | Unicode/404/stale/vendor conflict fixtures. VT aggregates vendors; it is not dozens of new independent scans |
| 5.6 GSB v5, independent key, cache and licensing | `providers.ts`, `safebrowsing-wire.ts`: v5 contract, independent key and returned cache duration; product explicitly noncommercial | v5 malformed/cache/timeout fixtures; actual account/API entitlement separately verified. Commercial use requires new licensing review |
| 5.7 URLhaus malware versus phishing | Threat-specific attributed evidence and URLhaus scope in UI/docs | URLhaus response fixtures; absent malware match never proves absence of phishing |
| 5.8 deadlines/retry/backoff/429/circuit/partial results | `http.ts`, `control.ts`, coordinator: bounded selective retry, global deadline, shared circuit state, explicit failure; no blind create retry | Transport/deadline/circuit tests. Provider outage remains uncertainty |
| 5.9 abuse/CORS/client/global budgets/concurrency | `index.ts`, `control.ts`, `coordinator.ts`, Wrangler: exact CORS without credentials, managed limits, daily-HMAC client budgets, serialized global budgets and expiring leases | Fail-closed, spoofed identity, budget/concurrency/release fixtures. Provider/WAF quota/billing configuration remains operator work |
| 5.10 secrets/error redaction/logging/rotation | Server-only independent credentials; safe error codes; real `scripts/secret-scan.mjs`; `docs/OPERATIONS.md`; aggregate metrics omit URL/IP labels | Actual source/history Gitleaks executed with redaction. Cannot inspect private host secret stores or configure billing alerts from repository |
| 5.11 real KV and correct TTL/provenance/refresh | `storage.ts`, Wrangler binding: scope/policy/config hashed keys; real reads/writes; bounded TTL, earliest observation expiry, explicit refresh and job deadline | Cache/job failure, cross-protocol isolation and expiry tests. KV deployment must be provisioned; no blanket one-hour negative cache |

## Section 6: every detection capability

| Capability | Implementation / limitation |
| --- | --- |
| Actual domain | PSL-aware registrable domain in `url.ts` and prominent/copyable report field; Unicode hostname retained |
| Brand impersonation and deceptive subdomain | Bounded dedicated rules in `heuristics.ts`, official domain exclusions; authoritative warning evidence |
| Lookalike/IDN/confusable characters | Maintained confusables data/normalization plus bounded brand context; Unicode/IDN alone is not a verdict |
| Typo impersonation | Strong bounded brand similarity with false-positive exclusions; regression controls |
| Suspicious keywords | Contextual supporting structure; ordinary login/update paths do not independently imply maliciousness |
| URL shorteners | Exact hostname recognition; warns unresolved destination rather than substring classification |
| Real redirects | Browser-observed chain displayed as untrusted text; bounded discovered destinations independently reassessed in `scanner.ts` and surfaced by `AnalysisExtensions.jsx` |
| Domain age / recent registration | `registration.ts`: IANA-bootstrap RDAP, registrar/created/source/status/time; recent age supporting context, never proof |
| IP URLs | Proper public/private IPv4/IPv6 parsing; blocked prohibited addresses, no lexical substring shortcut |
| Threat intelligence | Per-target freshness, status, source, expiry and threat category; no failed provider counted clean |
| Real ML | Actual trained XGBoost artifacts/inference/native parity/evaluation. UI displays model/feature version and actual raw/calibrated output/threshold |
| Unseen phishing | Model + structural warnings + fresh reputation + optional observed browser evidence. Misses remain measurable and substantial; no universal detection claim |

Destination checks do not recursively crawl. They retain original requested protocol scope, show their own domain/coverage and cannot silently promote incomplete follow-up checks to reassurance. Applications cannot safely infer an unobserved shortener destination.

## Sections 7–8: product and privacy

| Concern | Implemented response | Executed checks / limits |
| --- | --- | --- |
| 7.1 definitive SAFE and buried domain | Four-category verdict first, visible reasons/actual domain/coverage; no “safe to visit” result | RTL + desktop/mobile provider outage and impersonation browser cases |
| 7.2 arbitrary score | Removed frontend arithmetic safety rating. Model output explicitly belongs to the trained classifier and is not a visitor safety probability | RTL provenance/negative-model cases; no synthetic progress score |
| 7.3 false HTTPS/TLS/redirect/model/ASN/empty-risk/engine-complete indicators | Observed certificate/ASN/redirect data only, scheme not proof, real per-engine model status, missing report distinct from completed empty risk list, actual remote coverage/status totals | Provider contract/report tests + browser no-synthetic-telemetry assertion |
| 7.4 Gemini/verdict disagreement and injection | `explanation.ts`: optional IDs-only selection of existing observations; no submitted URL/page prompt, deterministic text, invalid output fallback; official policy unchanged | Grounding/unknown-ID/failure fixtures. Disabled by default; no free-form model findings accepted |
| 7.5 fake wake/progress/404-health/hangs | Real `/api/ping` success only; actual request states and asynchronous job polling; cancellation and bounded waits; no fabricated percent completion | Hook/component tests and browser stop-updates test; cancellation cannot undo accepted remote work |
| 7.6 readable mobile/keyboard/announcement/domain copy/motion | Verdict first, text/icons and expandable details, visible focus/dialog trapping/restoration, live result announcement/focused heading, actual-domain clipboard, opt-in 3D/reduced motion/offscreen+hidden pause | 45 frontend tests and 16 desktop/mobile browser cases passed, including axe WCAG2/2.1/2.2 tags and actual clipboard keyboard operation; actual production mobile axe found no violations. Automation does not replace human assistive-technology review |
| 8 sensitive URL sharing/retention | Backend-enforced acknowledgement, independent provider disclosure, no indiscriminate parameter stripping, unlisted CF scans, opt-in redacted expiring history, no-store and bounded KV/jobs | Consent/history/privacy tests; external copies/retention cannot be deleted by clearing local history. See `docs/PRIVACY.md` |

## Section 9: every engineering/benchmark requirement

The twelve audit matrix behaviors have regression coverage in shared/backend/frontend/browser suites: GSB test positive fixture, brand-in-subdomain, legitimate login, ordinary keyword URL, strong lookalike, unknown URL, total outage, Unicode normalization, shortener/final destination, prohibited private address, harmless raw Gist, and conflicting VT findings. A fixture is not a live GSB check. Controlled live calls and permissions must be read from phase verification.

| Area | Evidence / boundary |
| --- | --- |
| 9.1 unit/provider/component/end-to-end | Real modular tests replace starter Hello World. Runtime contract validation and controlled browser cases do not call arbitrary external sites |
| 9.2 data/version/leakage | Acquisition manifests, exact source/checksums/license, feature/model versions, conflict/dedup handling and domain/time partitioning in `ml/` and `model/`; model card states timestamp/campaign assumptions |
| Recall/FNR/FPR/precision/calibration | Executed heldout `model/evaluation.json`; calibration/threshold selected outside test; model revision history discloses any previously viewed evaluation rather than calling it untouched |
| Coverage/unknown rate | Model feature eligibility and `model/controlled-route-benchmark.json` controlled benchmark report are separate from live-provider reputation coverage/unknown rate; no mocked number is labeled production coverage |
| p50/p95 latency | Executed offline edge-inference benchmark in model artifacts plus `model/controlled-route-benchmark.json` controlled whole-route benchmark. Neither is a production multi-region SLO |
| 9.3 organization/type safety | `url`, `providers`, `http`, `heuristics`, `ml`, `registration`, `evidence`, `scanner`, `storage`, `control`, `coordinator`, `explanation`; shared TS contract/runtime validator; modular React views/hooks |
| Lint/typecheck/build/tests/CI | Root commands and `.github/workflows/ci.yml`; lockfile installs, browser checks, artifact parity and real alert tests |
| Dependencies | Full frontend development+production audit zero after supported ESLint10/hooks/refresh upgrade and tested minimatch11 override; backend separate audit in verification; Dependabot configuration retained |
| Secrets | Real checksummed Gitleaks checks current unignored/tracked application source and available complete Git history; CI fetches history and redacts findings; no substitute regex scan |
| Monitoring | Protected OpenMetrics + `ops/prometheus.yml`, six real alert rules, healthy/failing/normal-miss tests, dashboard and runbook. Actual Prometheus production scrape and prepared free availability script verified; continuous execution/delivery pending |
| Documentation | README, API, architecture paths, research, deployment, privacy, dependencies, threat model and operations; no security certification or measured competitor-superiority claim |

## Section 10: every advertised-feature mismatch

| Feature | Corrected claim |
| --- | --- |
| XGBoost | Genuine versioned tree inference, separate from rules and remote reputation |
| KV | Implemented optional scope-aware bounded cache/jobs, requires provisioned binding |
| Timeouts | Implemented per-request/whole-scan bounds with controlled retry/circuits |
| Cloudflare | Implemented v2 asynchronous report lifecycle, real data only |
| Engine count | Four remote providers counted by actual completion; local model/rules excluded |
| HTTPS | Scheme is not TLS validation or trust; actual observed certificate fields only |
| Redirects | Real observed chain/destination assessments; unavailable remains unavailable |
| Safety score | Removed arbitrary visitor-safety rating; model output explained separately |
| Domain telemetry | RDAP/source/status and actual browser observations; no invented values |
| Transient/privacy | Application retention documented separately from independent external retention |
| Decorative “800+”/“18 databases” | Removed unverified statistics; no measured source-count substitutes |

## Sections 11–13: architecture, all twenty roadmap items and preserved strengths

The authoritative evidence policy receives parsed/validated input, separate rules/model/registration/reputation observations, and optional bounded active follow-up. The client renders the server contract and never recomputes safety. Credentials remain server-side. React/Cloudflare, established providers, detailed expandable reporting and optional understandable grounded Gemini explanations are preserved. No additional decorative animation was needed.

| # | Roadmap item | Implementation evidence |
| --- | --- | --- |
| 1 | Four-state outcome | shared contract + evidence policy |
| 2 | Remove fabricated observations | Cloudflare adapter + observation-only UI |
| 3 | Distinct failure/clean statuses | provider/target statuses + coverage |
| 4 | Brand/registered-domain protection | URL PSL + heuristics/confusables |
| 5 | Remove Gist special-case | ordinary source assessment + regression |
| 6 | Actual HTTPS/redirect UI | observed certificate/chain + independent destinations |
| 7 | Remove arbitrary score | category/coverage UI; no safety arithmetic |
| 8 | Backend validation | standard parser + limits + prohibited destinations |
| 9 | Cloudflare v2 | async adapter + revisioned DO jobs/cadence |
| 10 | Timeouts/retries/errors | transport + deadline + shared circuits |
| 11 | Rate limits/quota protection | managed limits + global/client coordinator/leases; provider account alerts external |
| 12 | GSB/VT modernization | v5 wire/cache and timestamped UTF8 vendor interpretation |
| 13 | Real trained model | actual model artifacts, inference, native parity and evaluation |
| 14 | Provenance/cache | per-source/target times + TTL/config/scope-aware KV |
| 15 | Mobile/accessibility | hierarchy/focus/announcement/copy + axe/mobile/keyboard tests |
| 16 | Separate modules | provider/policy/transport/model/control/UI separation |
| 17 | Tests/CI/dependencies/monitoring | application/browser tests + audits/Gitleaks/model parity/promtool/dashboard; real production scrape and tested free availability workflow; activation/delivery pending |
| 18 | Privacy/logging/retention | consent, unlisted, redaction, expiring history/jobs + operations |
| 19 | Measured heldout performance/errors | executed model evaluation and benchmark artifacts; whole-product/live-provider claims bounded |
| 20 | Honest docs | this map + README/API/privacy/research/threat-model/deployment/operations |

## Five acceptance criteria

1. **High-risk cannot become green by majority silence:** positive/warning evidence and destination follow-up rules precede clean eligibility; brand/conflict/outage/model regressions exercise this.
2. **Failure cannot invent data or count as clean:** explicit source statuses and observation-only telemetry; failure/malformed/cache/job/provider fixtures.
3. **Every UI fact has provenance or a heuristic label:** actual domain/source/time/coverage/model versions and optional-data states; no scheme-based TLS or fabricated redirects.
4. **Verdict/explanation/indicators agree:** server policy authoritative, client validates contract, optional AI selects existing evidence only, no independent frontend score.
5. **Repeatable detection/error measurements:** data/artifact manifests, time/domain-separated evaluation, recorded precision/recall/FPR/FNR/calibration and latency; substantial model limitations disclosed. This does not assert superior real-world accuracy.

## Remaining external verification and limitations

Matching public Worker/frontend releases, real provider calls, DO/KV bindings, CORS, secret-backed metrics and host security headers have now been verified. Concrete remaining gaps are ongoing monitor activation and delivery, a persistent provider-rate monitoring host, provider billing/quota-alert settings, enforced rotation/log-retention policy, multi-region load/availability, human assistive-technology review and an independent future/competitor whole-product benchmark. Actual successful calls do not prove unlimited provider quota or continuous availability.

No scanner catches every phishing URL. Newly created, targeted, compromised and cloaked content can evade reputation and lexical features. The source audit itself did not execute tests or inspect private deployment configuration; this remediation records such evidence separately instead of inheriting its assumptions.

## Executed hosted checks

Phase02 `HOSTED-FULL-VALIDATION.json` records actual Workers execution with all four provider secrets, an isolated coordinator/KV, a completed real Cloudflare browser observation, Google/VT positives on the official harmless test URL, and protected aggregate metrics. `HOSTED-FINAL-VALIDATION.json` records the revisioned-job/two-protocol followup. `PRODUCTION-API.json`, `PRODUCTION-BROWSER.json`, `PRODUCTION-MOBILE.json` and `PRODUCTION-MONITOR.json` record the public rollout and actual Prometheus scrape. The matching release is live; ongoing alert delivery is not activated. The free option and reviewable configuration are documented in [FREE-MONITORING.md](FREE-MONITORING.md).
