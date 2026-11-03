---
phase: 01-evidence-driven-scanner
status: passed
verified: 2026-11-03
scope: local implementation and controlled verification
---
# Verification

## Executed checks
| Check | Result |
|---|---|
| Root npm run check | Passed on final implementation |
| Backend application and test TypeScript | Passed |
| Frontend ESLint | Passed, no errors/warnings |
| Native shared contract/privacy/freshness tests | 28 passed |
| Backend provider/route/cache/job regression tests | 90 passed |
| Frontend component/API/history/polling/expiry tests | 39 passed |
| Playwright desktop and mobile Chromium | 12 passed |
| Wrangler generated binding types | Regenerated successfully |
| Wrangler deploy --dry-run | Passed; 312.86 KiB / 85.27 KiB gzip |
| Backend full npm audit | Zero vulnerabilities |
| Frontend production npm audit | Zero vulnerabilities |
| git diff --check | Passed |
| Archived nested research worktree | Unchanged |

Total automated assertions are represented by 157 unit/component/contract test cases and 12 browser cases. Browser fixtures make no live reputation submissions.

## Real runtime smoke
Started local workerd with native KV and managed limiter bindings, no provider credentials, and Vite targeting the Worker from an allowed origin. Verified in headless Chrome:
- https://example.com/login returned Unable to determine, with actual domain example.com, no synthetic telemetry and no browser page errors.
- https://paypal.com.verify-account.example.com/login returned Suspicious URL, actual domain example.com, attributed heuristic evidence and zero claimed remote completions.
- Worker smoke rejected private destinations. All relevant responses used no-store.
- Inspected the complete suspicious result screenshot for layout, evidence prominence, coverage and source failures.
- Task-owned servers were stopped after verification; nothing deployed.

## Requirement evidence
| Requirement | Verification |
|---|---|
| TRUST-01 | Outages, weak/strong/stale positives, conflicting evidence and protocol coverage tests |
| TRUST-02 | No runtime Gist override, fake telemetry, XGBoost claim or safety-score code; UI fixtures reject legacy binary reports |
| DETECT-01 | PSL domain, brand/subdomain/IDN/lookalike fixtures and legitimate login/Gist/regional-domain controls |
| API-01 | JSON/body/URL limits, type validation, schemes, credentials and reserved IP encodings |
| API-02 | Exact CORS, required managed budgets, bounded responses/deadlines, sanitized errors and no-store |
| PROVIDER-01 | GSB v5 scope/cache duration including zero-duration positive, URLhaus category, VT weak/strong/zero/stale statistics and domain metadata |
| PROVIDER-02 | Unlisted per-protocol jobs, task URL/UUID correlation, positive/negative age, failure, storage outage, cadence and capability expiry |
| CACHE-01 | Scope/config/policy keys, malformed/legacy cache rejection, refresh and temporal re-evaluation |
| UI-01 | All four rendered states, actual domain, evidence, partial coverage and absent-fallback telemetry |
| UI-02 | Cancel/timeout/poll-scope/retry/expiry, desktop/mobile and dialog keyboard behavior |
| PRIVACY-01 | Server/client sensitive consent, opt-in redacted history, expiry/cap/clear and legacy history removal |
| DEV-01 | Lockfile installs/scripts, regenerated bindings, examples, CI, source ignore repair and current documentation |
| TEST-01 | Unit/component/contract/browser suites plus real local Worker smoke; live accuracy expressly excluded |

## Independent review closure
Plan checker required explicit coverage, nested validation and protected job capabilities before execution. Independent verifier then identified job capability expiry, per-target freshness, Cloudflare report correlation and legitimate regional-domain false positives. All were fixed with regressions. Parent additionally closed zero-vendor VT, unrelated GSB match scope, malformed provider cache, stale Cloudflare freshness and zero-duration positive handling.

## Remaining limits and risks
- No production deployment, provider keys/permissions, live multi-provider scans or remote billing/load verification.
- No held-out detection benchmark, measured recall/precision or superiority claim against SENTINEL-X.
- Archived Python/model defects are documented, not represented as repaired/validated production ML.
- Seven moderate frontend development-only ESLint/minimatch advisories remain; no compatible upstream fix was available. See docs/DEPENDENCIES.md.
- Optional 3D chunk is 651.75 KB and triggers Vite's chunk-size warning; initial JS is 238.60 KB (74.37 KB gzip) and optional 3D loads only on request.
- KV is eventually consistent; polling coalescence is per isolate. Managed route budgets are approximate per location, not a globally atomic cost cap.
- Unlisted scans are not private; provider-side DNS/redirect safety and external retention remain outside local control.

Verification status means the local remediation acceptance criteria passed. It is not certification of live security or comparative detection accuracy.
