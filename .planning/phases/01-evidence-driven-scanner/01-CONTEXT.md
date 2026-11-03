# Phase 1 context — 2026-11-03

## User intent
Implement the supplied comparison audit and local technical audit. Retain React/Cloudflare architecture and improve trustworthy behavior, usability and engineering quality. SENTINEL-X is a comparison reference, not proof of relative accuracy or a source to copy blindly.

## Locked decisions
- Shared schema v2 with four outcomes; never infer safety from unavailable intelligence.
- At least two fresh reputation providers must complete every requested protocol for no-known-threats, with no conflicting warning or pending inspection.
- Heuristic structural warnings remain distinct from confirmed reputation detections; no calibrated scores or deployed-model claims.
- Cloudflare scans are unlisted asynchronous jobs; short-lived capabilities require KV and managed polling budgets.
- Preserve user changes and archived research. No remote publication, deployment or automatic commits.
- Keep full URLs intact for consented reputation lookup, strip fragments, protect sensitive parameters, and save only opt-in redacted local summaries.
- Historical snapshots may be displayed, but expired clean findings become neutral and require refresh.

## Deferred validation
Live provider credentials/permissions, deployed Cloudflare eventual-consistency/load behavior and detection accuracy on a representative held-out dataset. Never substitute fixture success for these measurements.
