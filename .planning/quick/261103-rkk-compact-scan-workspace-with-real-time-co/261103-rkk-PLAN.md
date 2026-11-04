---
id: 261103-rkk
type: quick-full
status: approved-for-execution
baseline: 577b1b9
date: 2026-11-03
---
# Compact scan workspace with real-time completion

## Outcome and fixed scope
Preserve the restored original purple home, waves, X visual and truthful HUDs. Remove the visible decorative pause/resume control and its App state as explicitly requested. Replace the long accordion report with a full-width, compact workspace. Show a dedicated progress screen until the actual scan lifecycle completes; a partial report is an explicit exception with a reason.

The binding visual/interaction contract is [261103-rkk-UI-SPEC.md](261103-rkk-UI-SPEC.md). No new formal phase, provider additions, evidence-policy changes, schema changes, fabricated scores or animation rewrite.

## Inspection and constraints
- `App.jsx` currently publishes the first report immediately, polls every provider-defined interval, and constrains results to the home left column. Retain its identity/scope checks, aborts, deadlines, bounded 404/503 retries, freshness, consent and opt-in redacted history.
- `shared/scan.ts` is the unchanged trust boundary. Terminal statuses are detected/no_detection/error/unavailable/unknown; only detected/no_detection count as completed remote coverage. Engine and target status must both be considered for pending work.
- Production has seven engines: three reputation sources, Cloudflare active, URL heuristics, XGBoost and registration context. Derive cards from `result.engines`; do not invent missing engines or duplicate registration as an eighth source. Old valid reports/tests can have fewer engines.
- Initial POST is not streamed: before its first validated response the UI can truthfully show only submission/waiting and elapsed time. Later statuses come from validated poll reports, with next-poll/deadline times; do not imply per-provider live events or fake percentages.
- The existing `Dialog` already supplies portal, inert background, focus trap, Escape, backdrop close and focus restoration. Reuse it unchanged unless a demonstrated defect requires root coordination.
- Gemini is an evidence selector, not a second scanner. Preserve minimal input, immutable verdict, ID validation, deterministic wording/fallback, true model and AI status. Root verifies current account/model support before backend migration.

## Task 1 — Tracer: truthful completion lifecycle and report routing
**Owner:** root. **Files:** `frontend/src/App.jsx`, new `components/ScanProgress.jsx`, new progress CSS, `frontend/test/app.test.jsx`, progress tests; minimal global layout CSS and e2e owned by root. **Reversibility:** reversible.
1. Separate submitted/progress snapshot from published report. Suggested phases: idle → submitting → waiting → report; error before any snapshot returns to operable scanner. Retain the latest accepted snapshot for partial exit; do not render verdict/HUD verdict/result details during submitting/waiting.
2. Publish normally only when no deep_scan exists and no engine/target remains pending. Terminal errors/unavailable/unknown permit exit but remain incomplete coverage. A returned deep_scan keeps the report withheld until the server clears it, even if the current card statuses look terminal.
3. Honor server next_poll_at with at least the existing 10s provider cadence, elapsed time, explicit next-check/deadline and bounded retries. Cancel aborts initial submission; “Stop waiting and view partial report” aborts timers/poll and publishes the latest accepted snapshot with an explicit stopped label. Without a snapshot, cancellation returns to scanner.
4. Job expiry, terminal poll failure/retry exhaustion, invalid/mismatched poll scope and pending-without-a-trackable-job release a clearly labeled partial snapshot; never spin indefinitely or silently label it complete. Keep a fixed job deadline that later responses cannot extend, and reject stale/aborted/after-deadline responses. Initial request keeps its existing finite API timeout.
5. Reset/rescan/new request/unmount abort every old request and timer. Preserve sensitive consent, refresh cache bypass, freshness behavior, redacted history preference and expiry clock. Save only an accepted published snapshot to history, not every pending polling update.
6. Render full-width ResultsDashboard outside the home two-column grid. Keep home identity intact in idle; progress is its own focused layout. Remove visible animation button/state; retain OS reduced motion, low-power/save-data and component visibility suspension.
**Verify:** App tests prove withheld result before final response, first-response waiting, pending→terminal, all terminal failures exit, stop partial, pre-response cancel, fixed deadline/in-flight late result, retry exhaustion, wrong scan/url/checked_urls rejection, rescan/reset stale isolation and unchanged consent/history/expiry behavior.

## Task 2 — Compact report, source inspector and retained evidence
**Owner:** report executor. **Files:** `ResultsDashboard.jsx`, `GeminiExplanation.jsx`, `AnalysisExtensions.jsx`, `CloudflareDeepAnalysis.jsx`, new `SourceGridInspector.jsx`, new `report.css`; only results/extensions/Gemini/new report component tests. Do not edit App, shared fixtures/contracts, Dialog, global CSS or e2e. **Reversibility:** reversible.
1. Implement UI-SPEC's persistent compact summary, two-column Overview and four tabs: Overview, Sources, Browser, Model & AI. Default Overview gives useful verdict, domain, coverage, explanation and recorded reasons without scrolling through hidden accordions.
2. Sources uses derived engine cards with name/kind/status/message and accessible buttons opening the existing Dialog. Inspector preserves engine and every requested target's status, message/error, timestamps/expiry and evidence; model inspector retains feature/model versions, raw/calibrated outputs, thresholds and promotion/shadow status.
3. Retain requested protocol scope, actual registrable domain/hostname/Unicode warning/copy, registration provenance/age, per-destination verdict/coverage/reasons/expiry, browser redirects/certificates/transactions/risks/links, official reason anchors, observed/expiry/policy/cache metadata and true Gemini fallback/model status. No untrusted URL becomes an accidental navigation link.
4. Browser data uses a selector or compact subviews for long collections; avoid replacing one endless accordion stack with an endless card stack. Local context must remain visually distinct from remote completed coverage. Keep no-known-threats caveat and expiry neutralization; preserve malicious/suspicious historical warnings.
5. Keep existing Dashboard props compatible for root integration. `pollError`, `pollingStopped`, `pollNotice` must produce clear partial context when provided; normal full reports do not expose a second polling flow. A new optional completion/partial reason prop is allowed only if coordinated with root.
**Verify:** Component tests navigate all tabs, inspect every source kind/status, prove no data fields lost with rich fixtures, preserve expiry/copy/unknown verdict/model/AI fallbacks, use keyboard/Escape and restore inspector trigger focus. Gemini evidence links must target mounted visible evidence (switch tab first if needed).

## Task 3 — Supported Gemini configuration and integrated release evidence
**Owners:** backend executor for backend only; root for integration/e2e/docs/release. **Backend files:** explanation config/tests, example config and current backend model configuration only. **Reversibility:** reversible.
1. Backend executor uses Google's current primary docs and root's authenticated non-secret support probe to choose a supported economical model; Gemini 2.5 Flash deprecation is documented. Preserve env override, bounded request time, minimal evidence-only payload, validation, truthful provenance and deterministic fallback. Adapt generation settings only to supported current-model options; do not guess compatibility. If changing the existing 3s timeout, document/test the new bound and preserve the overall scan deadline. Requested model/aliases must not falsely label a different returned model; use validated actual model identity where returned. Provider capacity errors do not block UI work or justify claiming AI completion.
2. Root integrates and runs `npm run check`, `npm run scan:secrets`, relevant `npm run check:ops`, backend/provider tests and desktop/mobile Playwright including axe. Adjust prior pause/resume test to assert absent control plus retained automatic/reduced-motion/low-power/visibility/WebGL fallback behavior.
3. E2E proves progress→all-terminal→full-width report; pending screenshot contains no result verdict/details; real next poll cadence; stop/deadline partial and failure exit; keyboard tabs/inspector; rich browser/model/destination data reachable; no horizontal overflow at 390px and 1440px. Capture home/progress/report/source-inspector images for concrete review.
4. Root updates quick summary/verification and current state/docs with exact counts, model identity, known limitations and release evidence. Root alone coordinates authorized GitHub publication/deployment and actual public scan checks; no synthetic fixture is claimed as live evidence.
**Done:** requested report/progress behavior and absent pause control verified locally and on matching deployed frontend/API; no evidence/privacy regressions; concise user-facing explanation answers model relevance with current verified facts.

## Plan self-check
APPROVED: three bounded tasks, non-overlapping file ownership, first task supplies end-to-end completion tracer, UI-SPEC supplies concrete layout/states/accessibility, all existing evidence classes have a destination, and verification covers cancellation/deadline/stale/error paths. No planning blocker. Model choice remains an explicit execution dependency on the root's current account probe; a failed probe keeps the existing truthful fallback and prevents unsupported success claims.

## Primary research (checked 2026-11-03)
- [Google Threat Intelligence URL reports](https://gtidocs.virustotal.com/docs/results-reports): summary and focused detection/details tabs support separation of overview from per-source evidence.
- [PortSwigger scan results](https://portswigger.net/burp/documentation/dast/user-guide/work-with-scan-results/viewing-scan-results): scan overview with focused findings supports concise summary plus detailed investigation.
- [Google Gemini deprecations](https://aistudio.google.com/docs/deprecations#gemini-2.5-flash-models): current model lifecycle must govern migration; root owns the authenticated availability/free-tier check.
