---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Testing
Analysis date: 2026-11-03

## Entry points
- npm run check: typecheck, lint, tests and frontend production build.
- npm run test:contract: native Node shared-contract tests.
- npm run test:api: backend Vitest fixtures against real Hono routes.
- npm run test:web: frontend Vitest/Testing Library/jsdom tests.
- npm --prefix frontend run test:e2e: controlled Playwright browser tests.
- npm --prefix backend-worker run build:check: Wrangler dry-run bundle.
- npm --prefix backend-worker run cf-typegen: regenerate environment types.

## Important assertions
- No configured providers returns unknown without fabricated telemetry.
- Legitimate login, raw Gist and shortener substrings do not imply maliciousness.
- Brand-subdomain deception and bounded lookalikes produce explainable warnings.
- Strong positives survive other provider failures.
- Stale/zero/malformed observations do not count as fresh clean checks.
- Provider matches and browser reports must belong to requested scope.
- Sensitive consent is enforced by server and client.
- Cache protocols, expiry and configuration generation stay isolated.
- Polling capability expiry, budget, cadence, cancellation and storage errors are tested.
- Legacy responses fail client validation rather than appear safe.
- Expired negative snapshots become neutral; positive historical warnings remain.
- Optional history redacts query values and is bounded/clearable.
- Desktop/mobile browsers verify unknown, impersonation, consent, history and cancellation.

## Limits
- Fixture tests do not establish detection accuracy.
- Phase01 local smoke covered no-key paths; phase02 added actual local/hosted DO/KV, provider and production browser checks.
- Historical model evaluation and actual live credentials/infrastructure are now verified within the recorded scope. Representative future accuracy, cross-region load and ongoing alert delivery remain unverified.

## v0.3 verification
- `npm run test:model`: artifact/code hashes, native-edge predictions, exact shared features, malformed artifact rejection and measured local inference latency.
- `python -m pytest ml/tests -q`: partition/leakage and pipeline invariants.
- `npm run benchmark:controlled`: actual route/model/policy/control with synthetic provider delays, coverage/unknown rates and whole-route p50/p95; not live detection accuracy.
- `npm run scan:secrets` and `npm run check:ops`: executed real Gitleaks and promtool checks.
- Live protobuf/status/manual-redirect behavior, hosted credentials and matching public releases have been exercised; exact results and remaining operational gaps are in phase02 verification.
- Final application/contract/monitor counts: 43 Node tests, 144 backend tests, 45 frontend tests; 16 browser cases and five Python pipeline tests. The production availability script adds ten failure/privacy regressions and also passed all four real endpoint checks. It submits no scan URLs.
