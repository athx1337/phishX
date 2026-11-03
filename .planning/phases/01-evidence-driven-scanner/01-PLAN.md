---
phase: 01-evidence-driven-scanner
plan: 01
type: execute
wave: 1
autonomous: true
requirements: [TRUST-01, TRUST-02, DETECT-01, API-01, API-02, PROVIDER-01, PROVIDER-02, CACHE-01, UI-01, UI-02, PRIVACY-01, DEV-01, TEST-01]
---
# Evidence-driven scanner remediation

## Baseline and contract
Read PROJECT.md, REQUIREMENTS.md, shared/scan.ts and backend-worker/AGENTS.md. The preceding code audit is the brownfield map. Supplied audit claims about missing timeouts/cache refer to older public source; preserve and improve those features. Runtime uses no trained XGBoost. Keep current local changes and research data intact.

## Task 1 — backend vertical slice
Owner: backend executor. Files: backend-worker/** (including tests, packages, Wrangler).
Split validation, heuristics, providers, consensus, cache/jobs from routing. Adopt shared contract. tldts/ipaddr.js or equivalent maintained parsing. Four verdicts: authoritative reputation positives malicious; isolated/weak VT/heuristic evidence suspicious; no_known_threats only with sufficient fresh coverage across every requested protocol; otherwise unknown. VT many malicious vendors must not be outvoted. Heuristic keywords alone are not malicious. Validate types/lengths/public targets and DNS before active scan, credentials/schemes/control characters. Strict CORS, managed rate limiting, deadlines and safe errors.
GSB v5 using independent key and provider cache durations; VT fresh per-target stats and domain endpoint metadata; URLhaus malware evidence. Cloudflare v2 unlisted per-target async jobs stored in KV; GET /api/scans/:id checks pending jobs at >=10 seconds with expiry, updates authoritative verdict. Never treat a failed task as clean. No KV means Cloudflare unavailable. Hash cache key by schema/policy/protocol/config; refresh bypass; do not cache incomplete/unknown/failed responses as clean. Remove all fabricated telemetry/Gist rules/Gemini prose. Add meaningful Vitest tests covering audit matrix, provider failures, contracts, job lifecycle, cache isolation, rate limit and validation.

## Task 2 — frontend vertical slice
Owner: frontend executor. Files: frontend/src/**, frontend/index.html only. Read shared/scan.ts.
Keep existing visual direction, replace misleading results with verdict/recommendation/reasons/domain/coverage/provider states/provenance. Async poll deep_scan.poll_path at next_poll_at; stop on expiry/cancel, update result authoritatively. Central API with runtime schema validation, AbortController, timeout and useful errors. Remove wake gate, fake percentages and scores, ML/verified TLS claims. Disclose third parties and require sensitive parameter consent. Opt-in, seven-day, redacted, bounded history with clear action; accessible reusable dialog and meaningful nonanimated fallback. Reduce heavy motion; fix WebGL cleanup and missing model reference; lazy load visual modules. Frontend component/workflow tests supplied in Task 3.

## Task 3 — engineering and documentation
Owner: engineering executor. Files: root docs/config/.github, frontend package/config/test files (not src), research README additions only. Do not mutate research datasets/model/submodule metadata.
Repair lib ignore issue; reproducible Node/dependency scripts; frontend lint JSX tracking; install test tooling and add frontend tests against new contract, no false green claims, history and request flows; CI runs lockfile installs, backend tests/typecheck, frontend lint/tests/build. Rewrite README/API/privacy/deployment docs to match behavior, optional bindings, live configuration limitations. Document research issues and nested repo checkout workaround. Record comparison as source of requirements, not measured superiority. Run dependency audit and fix relevant compatible updates after checking reports.

## Task 4 — integration and independent verification
Owner: root then independent reviewer. Run both typechecks, all suites/lint/build and Wrangler dry-run/typegen. Browser smoke against controlled mocked providers including no-key unknown, impersonation, pending/failed scans, history/consent/mobile/reduced-motion. Review important changed source for false reassurance, malformed provider evidence, URL bypasses and privacy regressions. Fix findings, rerun relevant checks. Write VERIFICATION.md and SUMMARY.md with exact commands/results and clearly unverified live-provider/deployment/benchmark items. Do not deploy or commit pre-existing user work.

## Acceptance
- Plan review decisions: coverage total is four remote providers; an engine is completed only when every requested protocol is fresh/conclusive. Heuristics never increase remote coverage. no_known_threats requires >=2 independent fresh reputation sources per target, no warning evidence and no pending active scan; unavailable/error providers remain visible. Stale VT positives remain suspicious; stale negatives are unknown.
- Polling jobs are crypto-random UUID capabilities, expire after a short bounded window, return Cache-Control: no-store, have per-client/route budgets and >=10-second enforced provider polling cadence. Persist job storage before submitting active scans; storage failures must not erase reputation evidence or claim a complete active scan.
- All engines unavailable => unknown, never green reassurance or fake network fields.
- paypal.com.verify-account.example.com/login => suspicious, actual registrable domain example.com.
- Legitimate login/shortener substring/Gist not independently malicious.
- Strong actual detections => warning even when others fail.
- Protocol coverage/cache scope preserved; unknowns, stale and partial provider data never counted as completed clean checks.
- Frontend cannot render old binary contract as safe.
- No manufactured scores, measurements or prose; tests prove the important failure paths.
