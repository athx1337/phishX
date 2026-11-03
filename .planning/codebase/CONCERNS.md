---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Concerns and follow-up
Analysis date: 2026-11-03

## Verified remediation
- Binary safe verdict, fabricated telemetry and Gist override removed.
- Rule-based analysis honestly labeled; arbitrary safety scores removed.
- Four-state assessment and explicit source coverage adopted end-to-end.
- Provider schemas, deadlines, cache scope and observation age checked.
- Cloudflare v2 asynchronous unlisted per-target scans replace blocking legacy flow.
- Sensitive-URL consent and opt-in redacted history implemented.
- Reproducible commands, tests, CI and documentation added.

## Remaining operational concerns
- Actual provider calls and production secrets/bindings are verified; ongoing quota/billing alerts, rotation and retention enforcement still require operator configuration.
- KV remains eventually consistent for optional caches/reservations; canonical production job state is strongly consistent in per-scan Durable Objects.
- Production jobs now use isolated per-scan Durable Objects and revision conflict resolution; stale concurrent writes cannot erase a stronger warning. KV-only fallback is local-test mode.
- Managed anonymous budgets are approximate per location, not billing guarantees.
- Unlisted remote reports can be accessible to anyone with provider report IDs.
- Full URL paths may carry secrets that parameter heuristics cannot detect.
- Full frontend/backend dependency audits now report zero advisories; future dependency drift still needs continuous review.
- Decorative 3D chunk remains large; restored waves/X load automatically on capable default-motion browsers. Pause/reduced motion, low-power and static fallbacks bound the animation lifecycle.

## Research concerns
- Executed historical time/domain-isolated model benchmark exists; repeated fixed-test evaluation, source bias, substantial FNR and real-traffic calibration remain explicit limits.
- Brand catalog and confusable rules are intentionally bounded, not exhaustive.
- Archived extractor/training defects and duplicate/domain leakage are preserved/documented.
- Nested research gitlink lacks .gitmodules; runtime builds do not depend on it.
- Genuine v2 model inference is active; FNR51.343%, FPR0.4293% on the historical fixed test, with a documented benign Gist false positive. A fresh independently collected benchmark and campaign-level analysis remain necessary before broad accuracy claims.

## Current release boundary
Matching public Vercel/Worker releases are live and verified; see phase02 production evidence. A real temporary Prometheus scraper worked and was stopped. The free GitHub availability workflow is prepared/live-tested locally; a repository metrics secret and personal failure-notification preferences remain pending. Persistent provider-rate monitoring, delivery, platform retention and billing settings remain operational requirements. The initial source release was committed and pushed as `dc1b315`; later UI/Gemini changes are tracked as quick task `261103-ltf`.
