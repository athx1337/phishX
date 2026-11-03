---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Structure
Analysis date: 2026-11-03

## Main locations
- README.md: current setup, behavior and limitations.
- package.json: root verification entrypoints.
- shared/scan.ts: public API contract and privacy helpers.
- backend-worker/src/: modular Worker implementation.
- backend-worker/test/scanner.spec.ts: provider, route, cache and job regressions.
- backend-worker/wrangler.jsonc: Worker bindings/configuration.
- backend-worker/worker-configuration.d.ts: generated binding/runtime types.
- backend-worker/.dev.vars.example: credential key names only.
- frontend/src/App.jsx: browser orchestration and polling.
- frontend/src/lib/api.js: bounded HTTP calls and contract validation.
- frontend/src/lib/history.js: opt-in redacted history persistence.
- frontend/src/components/ResultsDashboard.jsx: official evidence presentation.
- frontend/src/CloudflareDeepAnalysis.jsx: actual browser observations.
- frontend/src/components/Dialog.jsx: accessible portal dialog/drawer.
- frontend/src/hooks/use-report-expiry.js: expiry/tab-return updates.
- frontend/src/components/ui/: optional visual primitives.
- frontend/test/: component, API, history and workflow tests.
- frontend/e2e/: desktop/mobile controlled browser tests.
- tests/contract.test.mjs: shared schema/privacy/freshness tests.
- docs/: API, deployment, privacy, threat model, dependencies and research.
- .github/: CI and dependency maintenance.
- .planning/: decisions, requirements, plan, reviews, verification and handoff.
- .agents/: pre-existing installed skills/GSD runtime, not application runtime code.
- repo/: separate archived research gitlink; absent .gitmodules is documented.
- backend/: legacy local environment remnant, not loaded by the current Worker.

## v0.3 locations
- `ml/`: acquisition, shared feature extraction, training/export, provenance, tests and offline verifier.
- `model/`: active native/edge model, evaluation, parity fixtures and card; superseded v1 retained for forensic reproducibility.
- `backend-worker/src/{control,coordinator,registration,destinations,explanation,safebrowsing-wire,ml}.ts`: expanded control/detection/integration layers.
- `backend-worker/test/{control,ml}.spec.ts`: new integration and model regressions.
- `frontend/src/components/AnalysisExtensions.jsx`: model, registration, destination and grounded-explanation views.
- `ops/`, `scripts/`: tested alert/dashboard/scrape config, checksummed secret/ops tools and controlled whole-route benchmark.
- `docs/AUDIT-TRACEABILITY.md`: complete TXT section/roadmap/acceptance mapping.
