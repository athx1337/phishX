---
phase: quick
plan: 261103-ltf
type: execute
mode: quick-full
wave: 1
autonomous: true
baseline: dc1b315
visual_reference: 6b0b483
requirements: [UI-RESTORE, MOTION-RESTORE, AI-VISIBLE, AUDIT-PRESERVE, HOSTED-VERIFY, SOURCE-PUBLISH]
files_modified:
  - frontend/src/App.jsx
  - frontend/src/index.css
  - frontend/src/components/HeroHeading.jsx
  - frontend/src/components/HeroVisual.jsx
  - frontend/src/components/HUDCard.jsx
  - frontend/src/components/URLScanner.jsx
  - frontend/src/components/ResultsDashboard.jsx
  - frontend/src/components/AnalysisExtensions.jsx
  - frontend/src/components/ui/chroma-waves.jsx
  - backend-worker/src/explanation.ts
  - backend-worker/wrangler.jsonc
  - shared/scan.ts
  - tests/contract.test.mjs
must_haves:
  truths:
    - The original animated waves, typography, ASCII X and floating glass HUD composition appear automatically on capable default-motion browsers.
    - Current evidence, trained XGBoost, provider coverage, consent, expiry, cancellation, history and accessibility behavior survive the restoration.
    - Gemini has a prominent truthful success or fallback state; a genuine hosted Gemini response is demonstrated before claiming integration works.
    - Neither AI nor decoration introduces invented findings, safety percentages, fabricated progress or verdict overrides.
  artifacts:
    - .planning/quick/261103-ltf-restore-original-animated-ui-and-visible/261103-ltf-VERIFICATION.md
    - .planning/quick/261103-ltf-restore-original-animated-ui-and-visible/261103-ltf-SUMMARY.md
---

# Restore the original animated presentation and visible grounded Gemini assistance

Restore presentation from commit `6b0b483`, rather than designing another theme. Current clean source baseline is `dc1b315`; STATE.md contains stale pre-publication language, so verify git/deployment facts directly. Preserve the current audited scanner/report implementations and model artifact. No executor mutates git; root alone commits, publishes and deploys. Root has already served the original at `http://127.0.0.1:5176` from `.cache/original-ui` and inspected `.cache/original-ui-desktop.png`; reuse that baseline. Source publication is already authorized; root handles legitimate credentials, model selection, hosted validation and deployments. Respect `commit_docs: false` when selecting tracked publication artifacts unless root applies explicit user authorization otherwise.

## Task 1 — original visual restoration (frontend owner)

**Ownership:** `frontend/**`, including its tests and package files. Do not edit backend, shared contracts, root scripts, planning records or deploy. Coordinate the optional explanation metadata contract with root/backend before depending on new fields.

1. Inspect original files with `git show 6b0b483:<path>`. Serve an isolated extracted original frontend for an actual-browser baseline; extraction must not change tracked checkout files or git state. Capture original and current desktop/mobile screenshots at matching viewports and compare after heading animations settle. Read original App/HeroHeading/Navbar/URLScanner/HUDCard/HeroVisual/ChromaWaves, CSS/fonts and animation components together.
2. Restore the original fixed ChromaWaves background (`#ffffff`, background `#130826`, frequency .2, amplitude .8, distortion 1.2, chroma .5, noise .06, speed .15, low quality, wrapper opacity .45), vignette and glow, original 7/5 desktop layout/spacing, typewriter/scramble/glitch heading hierarchy, glass scanner, original navbar/footer styling, automatically visible ASCII X and four floating HUD positions. Recover original animation timing and interaction feel using maintained existing dependencies where possible. Preserve the current honest evidence wording; original “STAY AHEAD.” presentation is acceptable, original safety guarantees and fabricated telemetry are not. Keep new controls integrated into the original glass style.
3. Keep current request/poll identity checks, cancellation/retry/expiry, sensitive-URL acknowledgement, opt-in history, legal dialogs, real model version and raw/calibrated output disclosures, registration/destination reports and full provider observations. Restore original result presentation around these features; if restoring tabs, retain keyboard behavior and expose every current report section. HUD values must come from actual returned evidence; show awaiting/pending/unavailable truthfully.
4. Expose a clearly labeled **Gemini evidence assistant** in the floating HUD and report, with selected evidence titles/links, useful plain-language deterministic descriptions and source provenance. When active, say Gemini selected recorded evidence; do not imply Gemini authored independent research or detected threats. Render explicit fallback/disabled/unavailable states supplied by backend. Keep trained XGBoost separately labeled. Update privacy text to describe the actual minimal Gemini input.
   Use four floating HUDs for assessment, remote coverage, trained XGBoost and Gemini assistance; retain observation/cache/expiry provenance in the report and/or card details. This preserves the original four-card composition without dropping model visibility.
5. Respect reduced motion, offscreen/document visibility, WebGL failure and low-power performance with static equivalents; do not hide the main identity by default on ordinary capable browsers. Provide an accessible animation pause/resume control for continuous decorative motion. Ensure full heading text is available to assistive technology without character-by-character announcements, meaningful focus/announcements, contrast, keyboard dialogs and mobile overflow behavior.

**Verification:** frontend lint/unit/build; browser scan/result/deep-poll/error/history/consent regressions; desktop/mobile axe and keyboard flows. Add meaningful browser checks under `reducedMotion: 'no-preference'` because the existing Playwright global default is reduce: waves and X automatically mount, successive frames visibly differ, pause/reduced-motion stop continuous rendering, graceful WebGL fallback, no console errors. Compare original/restored screenshots and record accepted deviations only for preserved truthfulness, privacy and accessibility. Screenshots must be inspected, not merely generated.

## Task 2 — working, observable grounded Gemini integration (backend owner; shared coordinated by root)

**Ownership:** `backend-worker/**`, excluding unrelated model artifacts/training; backend tests/config/typegen. Root owns `shared/scan.ts`, `tests/**` and root scripts; agree precise optional fields before concurrent edits, or send root a patch/request. Frontend agent owns presentation.

1. Read backend AGENTS and current official Workers/Google documentation. Current `explain()` permits only validated recorded evidence IDs, fixed verdict and deterministic prose; preserve that boundary. Add bounded optional provenance/status metadata to distinguish completed Gemini selection from disabled/missing configuration/no observations/provider failure/invalid response. Use stable public labels/reason codes without raw provider errors, keys, URLs or response bodies. Refresh/expiry updates must invalidate stale explanation evidence and misleading success states. Older reports without metadata remain readable.
   Before either executor consumes new metadata, root freezes its exact field names/types and updates shared validation. Preserve existing `source`, `evidence_ids` and `text`; make additions optional, validate their enums/string bounds when present and reject contradictory success/source states. Cover old cached reports with absent metadata and mixed frontend/backend rollout explicitly; absence must mean legacy/unspecified, never invented provider success or disabled status.
2. Prepare intended production configuration for root to enable Gemini after root verifies a legitimate deployed API key binding (inspect binding names/status only, never print the value). Retain existing requestJson deadlines, provider budgets/circuit breakers and fallback; do not add an unmetered provider path. Root validates the configured model using a real bounded request and chooses another only if necessary based on documented/live availability. Keep raw URL/path/query/page text out of Gemini requests. Budget configuration changes require no fabricated uptime/capacity claims. Bump cache configuration generation so disabled-era reports do not obscure activation; run typegen if binding types change.
3. Keep the useful assistant grounded: surface chosen existing observations and explanatory descriptions already in the report. Do not reintroduce arbitrary model prose, invented safety scores or verdict replacement. Cover real success as well as disabled/missing key, rate limit/timeout, unknown or duplicate IDs, wrong verdict, extra fields/malformed output, and expiry/poll transitions. A provider response alone is insufficient unless it survives validation and reaches the report/UI.

**Verification:** backend typecheck and focused/full API tests plus shared contract tests. Assert outbound payload minimization, immutable verdict and positive evidence on fallback, accurate status and old-report compatibility. Existing hostile-output tests remain passing. Read only key names or redacted tooling output; no credentials in artifacts, screenshots, shell history or git.

## Task 3 — integrated verification, coordinated release and source publication (root owner)

**Ownership:** `shared/**`, `tests/**`, root scripts/package files if needed, docs/planning records and all git/deployment actions. Integrate frontend/backend without reverting audited behavior. No agent commits independently.

1. Independently review original-v-restored screenshots and actual animation in a browser; verify the user-visible Gemini panel in success and deterministic fallback modes. Run `npm run check`, frontend Playwright desktop/mobile suite, focused full-motion browser checks, `npm run test:model`, `npm run scan:secrets`, `npm run check:ops`, and Worker dry-run/build check. Reuse passing evidence when no intervening change invalidates it. Preserve benchmark limitations and monitoring status disclosures.
2. Deploy the backward-compatible Worker first, prove the actual hosted endpoint emits a fresh validated `source: 'gemini'` explanation with existing evidence IDs on a benign test URL and a real provider call, then deploy matching frontend to the existing production project. Use refresh/cache-generation to distinguish new results; record redacted status, model/config identity, deployment IDs and timestamps, not secrets. Inspect the public site in a real browser at desktop/mobile, submit a real scan, confirm Gemini provenance visible, model/coverage/poll behavior intact, waves/X animate automatically and no console/runtime errors. Provider-budget/cache effects must not be mistaken for a live Gemini demonstration. If credentials/model/quota prevent genuine success, finish all other work and report that exact unmet acceptance criterion; never claim successful integration from mocks.
3. Record original/current/restored browser artifacts, checks and hosted evidence in `261103-ltf-VERIFICATION.md`; write `261103-ltf-SUMMARY.md` and update STATE.md quick-task completion only to the extent verified. Review scoped diff and secret scan, commit/push the authorized source and verify remote head. Coordinate deployment with git-triggered frontend publishing so the final production build matches the published revision. Record final URLs/revision and material remaining limitations.

**Completion gates:** Original visual identity and motion recovered in the actual browser; audited features retained; genuine hosted Gemini success visibly demonstrated; full relevant checks pass; matching public frontend/API deployed; reviewed source published. A concrete external Gemini blocker must be recorded as an unmet criterion and incomplete Gemini integration, while other independently completed work is delivered. A screenshot, unit fixture or provider configuration switch alone cannot satisfy the hosted gate.

## References and concrete risks

- Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/ (reviewed 2026-11-03); Google structured outputs: https://aistudio.google.com/docs/structured-output (reviewed 2026-11-03). Structured schema support does not replace application validation.
- Original HeroHeading imports animejs while current package does not; recreate equivalent choreography with existing motion/native APIs or justify an audited dependency. Do not blindly restore historical dependency trees.
- Existing Playwright settings suppress motion globally; a separate no-preference browser check is mandatory.
- Current Wrangler explicitly sets `GEMINI_ENABLED=false`; existing source provenance text only appears deep in AnalysisExtensions. Merely changing labels cannot make the integration work.
- External credentials/quota/model availability cannot be assumed from repository configuration. Current 3-second Gemini budget may fail on a real response; tune within the existing whole-scan deadline based on live evidence.
- Exact visual restoration concerns presentation; historical “SAFE TO VISIT”, simulated percentages, false provider wake status and unsupported privacy promises must not return.
