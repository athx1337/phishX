# Roadmap: phishX trust and reliability

## Phases
- [x] **Phase 1: Evidence-driven scanner remediation** — trustworthy verdicts, providers, UI and reproducible verification.
- [x] **Phase 2: Complete audit closure and real XGBoost** — implement expanded audit responses, execute genuine model evaluation and verify the production rollout; operational/research limits recorded.

## Phase Details
### Phase 1: Evidence-driven scanner remediation
**Goal**: All required runtime code paths use trustworthy evidence and the shared v2 contract.
**Depends on**: Nothing (brownfield remediation).
**Requirements**: TRUST-01, TRUST-02, DETECT-01, API-01, API-02, PROVIDER-01, PROVIDER-02, CACHE-01, UI-01, UI-02, PRIVACY-01, DEV-01, TEST-01
**Success Criteria**:
1. Missing, stale, malformed and pending evidence never establishes safety.
2. User-facing claims have real source observations or explicit heuristic provenance.
3. Asynchronous reports preserve scope, expiry, privacy and request budgets.
4. Automated regression, build, typecheck, lint, controlled browser and local runtime checks pass.
**Plans**: 1 plan

Plans:
- [x] 01-01: Contract, backend, frontend, engineering and independent verification (01-PLAN.md).

## Progress
| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Evidence-driven scanner remediation | 1/1 | Complete | 2026-11-03 |
| 2. Complete audit closure and real XGBoost | 1/1 | Verified with operational followups | 2026-11-03 |

## Phase 2: Complete audit closure and real XGBoost
**Goal**: Close the full supplied audit with actual trained model inference, measured limitations, resilient services, operational controls and verified user workflows.
**Depends on**: Phase 1.
**Requirements**: ML-01, ML-02, ML-03, RES-01, ABUSE-01, DETECT-02, DETECT-03, AI-01, OBS-01, SEC-01, A11Y-01, AUDIT-ALL.
**Success criteria**: Native/edge model parity and actual Worker inference; domain/time isolation and held-out evaluation with revision history disclosed; no false reassurance under failures/redirects; executed suites/security/accessibility/ops checks; full TXT traceability with deployed validation distinguished. **Evaluation qualification:** v1's fixed test was viewed before protocol-shortcut correction; v2 is a repeat fixed-test evaluation, not a new untouched benchmark. This original aspiration is not claimed achieved.
**Plan**: [02-PLAN.md](phases/02-complete-audit/02-PLAN.md), reviewed in PLAN-REVIEW.md.

Matching frontend/Worker production activation is verified. No release superiority claim follows from a historical model benchmark. Continuous alert delivery and independent future benchmarking remain explicit followups, not completed claims.
