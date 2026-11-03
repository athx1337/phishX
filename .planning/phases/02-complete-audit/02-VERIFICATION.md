---
phase: 02-complete-audit
status: passed_with_operational_followups
verified: 2026-11-03
scope: implementation, historical evaluation, actual hosted providers and coordinated public deployment
---
# Phase 02 verification

## Release actually deployed

| Component | Verified release |
| --- | --- |
| Public frontend | https://phish-x.vercel.app |
| Vercel deployment | `dpl_GRoyafL8SgXfCX5prbwSDkQspUKK`, https://phish-j1f9bezai-athx1337s-projects.vercel.app |
| Public API | https://backend-worker.phish-x.workers.dev |
| Worker version | `ff7d48c9-1257-43a1-84f8-b5195cc8b6f6` |
| Model | `xgb-url-2026-11-03-v2`, 69 shared features, 160 native-trained trees |

Authenticated Wrangler and Vercel CLIs deployed the matching API/frontend. Production KV, SQLite Durable Object migration and bindings, managed rate-limit namespaces and exact frontend CORS origin are configured. Independent metrics/client-identity secrets were generated and provisioned without printing their values. Existing provider secrets were verified by names and actual controlled calls, not exported. The frontend build contains the production API origin and no known local secret value.

The latest frontend release includes accurate successful-shadow-inference wording. The last real mobile/desktop production scan checks preceded that final wording-only release; all 16 controlled browser regressions passed afterwards, and current production HTML/security/authenticated-metrics checks passed afterwards. Source remains uncommitted/unpushed; deployed binaries do not imply GitHub source publication.

## Executed local checks

| Check | Result and scope |
| --- | --- |
| Root `npm run check` | Backend/test typechecks, frontend ESLint, contract/backend/frontend tests and production build passed |
| Native Node shared/monitor tests | 43 passed: 33 shared/privacy/policy tests plus 10 availability-monitor regressions |
| Backend Vitest | 144 passed |
| Frontend Vitest | 45 passed |
| Playwright desktop/mobile Chromium | 16 passed, including consent, cancellation, keyboard/dialog/clipboard, expiry, history, reduced motion and axe cases |
| Python ML pipeline | 5 passed (`python -m pytest ml/tests -q`) |
| Native/edge model verifier | 100 native prediction fixtures; max raw-probability delta 7.96e-8, margin delta 2.38e-7; 23 URL feature fixtures; corrupt artifact rejection passed |
| Wrangler type generation and dry-run | Passed; final Worker bundle 630.62 KiB, gzip 162.30 KiB; real deployment reported 16 ms startup |
| Frontend build | Approximately 247.79 KB initial JS +32.90 KB CSS; optional651.97 KB 3D chunk remains opt-in/lazy |
| Full frontend/backend `npm audit` | Zero vulnerabilities, including development dependencies |
| `npm run scan:secrets` | Real checksummed Gitleaks 8.30.1 source and all available Git history scans passed, output redacted |
| `npm run check:ops` | Checksummed Prometheus 3.15.1 `promtool` validates six rules, executable healthy/failing/normal-not-found fixtures, scrape config and dashboard JSON |
| Availability monitor | Ten regression cases passed; actual production frontend/API/anonymous-metrics rejection/authenticated-metrics checks all passed |

Total: 232 application/contract/monitor cases, plus 16 browser cases and five Python pipeline cases. Model parity fixtures and promtool behavior fixtures are reported separately rather than inflated into that application count. Relevant checks were rerun after their final changes; the monitor/alert-only final edits do not change deployed application code.

## Actual providers, runtime and browser evidence

`HOSTED-FULL-VALIDATION.json` and `HOSTED-FINAL-VALIDATION.json` record isolated native Workers execution with real Google Safe Browsing, URLhaus, VirusTotal and Cloudflare credentials. The final hosted flow assessed both protocols, polled actual browser jobs to completion, returned two real browser reports and all four remote sources completed. The official harmless Google test URL produced actual Google/VT positive evidence. Strong warnings survived failures and partial coverage.

Live integration exposed three errors that Node mocks did not: Google v5 responses were protobuf; Workers rejected `redirect: 'error'`; real Cloudflare task status used lowercase `finished`. Bounded protobuf decoding, manual redirect rejection and normalized task status were implemented and retested in native/hosted environments. Normal provider 404 responses no longer trip failure circuits. A late alert-rule review also excluded normal `not_found` responses from the provider-failure numerator, with a real promtool regression.

Production evidence files:

- `PRODUCTION-API.json`: metrics bearer authentication200, forbidden origin403, private target400, official harmless Google phishing test classified malicious with actual v2 model inference. VirusTotal's application budget was exhausted in that particular probe and remained an explicit error, not clean evidence.
- `PRODUCTION-BROWSER.json`: real desktop public UI, bare `example.com` creates two protocol targets, pending results remain unknown, later shows no known threats with a real browser report and three completed remote sources. One browser target failed transparently; no fabricated completion. No page errors.
- `PRODUCTION-MOBILE.json`: real public mobile positive, genuine model visible, zero axe violations, no overflow/page errors; opt-in 3D chunk loaded without errors.
- `PRODUCTION-MONITOR.json`: real temporary private Prometheus process scraped the public protected endpoint successfully, no scrape error,0.5962549 seconds; all six rules loaded. Process stopped after verification.
- `PRODUCTION-AVAILABILITY.json`: the prepared free monitor passed all four public endpoint/configuration checks without scan submissions.

Public host headers include the reviewed CSP, nosniff, no-referrer, frame protection and restricted permissions. No broad cross-region load, penetration test or human screen-reader certification is implied.

## Model evaluation and research qualification

Actual acquisition projected 902,110 metadata rows from UCI PhiUSIIL and PhreshPhish, with pinned sources/checksums/licenses. Eligibility 894,698; remove conflicting labels and duplicates, purge earlier observations belonging to later-owned domains, cap samples/domain. Train 393,599; validation 29,628; separate calibration 45,896; fixed test 103,379. All six pairwise registrable-domain overlaps are zero. Dated training precedes validation/calibration/test; undated UCI is a disclosed publication-prior assumption, not invented collection dates.

Threshold 0.8220732808113098 was selected on validation under empirical FPR <= 0.5%; Platt calibration uses a separate partition. Test precision 99.148%, recall 48.657%, FNR 51.343%, FPR 0.4293%, AUROC 0.95607. Model negatives never establish clean remote coverage. A hypothetical 0.1% phishing prevalence implies only 10.19% precision at these error rates.

v1 learned a scheme shortcut and warned on benign HTTP controls. v2 structurally removes scheme from all 69 features; paired HTTP/HTTPS controls match. **v1's test was already viewed, so v2 is a repeated fixed-test evaluation, not a new untouched benchmark.** A synthetic benign raw-Gist control still triggers a genuine model warning; that false positive is disclosed, with no hardcoded Gist rule. Cross-domain campaign/template isolation, current live label validity and future-traffic calibration are not proven. See `model/MODEL-CARD.md`, `model/evaluation.json`, `ml/sources.json` and `model/LICENSE-DATA.md`.

Offline Node 24 warmed feature+tree inference: 10,000 samples, p50 ~0.0066ms,p95 ~0.0395ms, excluding network/Workers deployment. Controlled route benchmark: 12 scenarios / 60 samples with synthetic 5 ms upstreams, p50 ~15.68ms,p95 ~17.17ms,sufficient coverage 83.33%,unknown 25%. Neither is production latency, representative detection accuracy or a SENTINEL-X comparison.

## Exact remaining work

1. **Ongoing alerts:** free GitHub availability workflow is locally prepared/tested only. Publish reviewed source to the default branch, add `PHISHX_METRICS_TOKEN`, enable the owner's failure notifications and verify actual receipt. GitHub write auth was not established. Schedules can delay/drop or disable after 60 inactive days. No message was sent. See `docs/FREE-MONITORING.md`.
2. **Continuous provider-rate monitoring:** six Prometheus rules/dashboard/runbook exist and real scrape worked; no always-on Prometheus/Grafana/Alertmanager host or delivery route is running from this task.
3. **Operator settings:** current provider billing/quota-alert settings, automatic key rotation enforcement and platform log-retention settings are not verified. Per-minute request budgets do not guarantee daily/monthly billing caps.
4. **Further validation:** representative independent future benchmark, campaign/template analysis, multi-region load and human assistive-technology testing remain followups. No competitor-superiority or universal threat-detection claim.
5. **Workspace/account hygiene:** source is uncommitted and includes pre-existing user changes; preserve them. Isolated Cloudflare audit Worker/KV resources remain for review. Reload Codex to load newly registered authenticated Cloudflare/Vercel MCP/plugin tools; CLI authentication and deployments are verified, MCP read tools were not newly loaded in this chat.

All supplied audit sections, 20 roadmap items and five acceptance criteria are mapped in `docs/AUDIT-TRACEABILITY.md`. Marked implementation requirements mean code and scoped evidence exist; they do not erase these operational/research qualifications.
