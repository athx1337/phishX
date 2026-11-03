---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Conventions
Analysis date: 2026-11-03

## Evidence
- Explicit detected/no_detection/unavailable/error/pending/unknown statuses.
- Never coerce provider failure into a negative detection.
- Every evidence item includes source, observation time, threat category and severity.
- Heuristics are warnings or information; no model probability is implied.
- No-known-threats is a bounded observation, never a safe-to-visit promise.
- Four remote providers define coverage; local heuristics do not inflate it.
- Protocol variants remain separate per-target observations.

## Validation
- Public input is parsed as unknown before structured validation.
- Normalize with URL parser; reject embedded credentials and prohibited targets.
- Provider adapters validate schema and sanitize errors.
- isScanReport validates structural/historical data.
- isFreshScanReport additionally validates temporal acceptance.
- Cached reports bind the requested target scope and policy generation.

## UI
- Semantic headings, labels, details and explicit source status.
- Dialogs use inert background, keyboard trapping and focus restoration.
- No simulated scan percentage or decorative source statistics.
- Motion is optional; history works without animation.
- Submitted full URL and redacted history are deliberately distinct.

## Repository
- Preserve pre-existing user changes and archived research.
- No production credentials in tracked examples.
- No automatic commits/deployments in this remediation.
