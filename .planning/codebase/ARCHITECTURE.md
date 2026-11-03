---
last_mapped_commit: 6b0b48330bd22f86345b3e61ece953daf2e521fb
last_mapped_at: 2026-11-03
---
# Architecture
Analysis date: 2026-11-03

## Boundary
- Browser React client calls Hono Worker JSON API.
- shared/scan.ts defines schema version, types, structural and temporal validators.
- No account database, ORM or authentication system.
- Anonymous scan and poll routes use managed approximate per-location budgets.
- Origin allowlist is a browser boundary, not caller authentication.

## Backend modules
- url.ts validates and canonicalizes targets.
- heuristics.ts emits explainable structural evidence.
- providers.ts adapts reputation services and registration metadata.
- http.ts bounds provider responses and sanitizes failures.
- evidence.ts aggregates statuses and computes official assessment.
- cloudflare.ts handles public DNS preflight, unlisted submission and real observations.
- scanner.ts coordinates initial request and asynchronous job updates.
- storage.ts hashes cache keys and validates stored reports/jobs.
- index.ts owns HTTP routing, headers, request limits and public errors.

## Lifecycle
- Initial scan returns reputation/heuristic results and optionally a pending job.
- GET /api/scans/:id polls server-side at a bounded cadence.
- Positive evidence survives partial failures; stale negatives never count as clean.
- Complete reports may be cached under policy/scope/config keys.
- UI shows expired reports as historical snapshots and offers refresh.
- Browser history is optional, redacted and separate from backend KV.

## v0.3 additions
- `ml.ts` runs versioned XGBoost trees from `model/` using the exact `ml/features.mjs` used in training. Local model results never increase reputation coverage.
- `control.ts` carries per-request deadlines/resources via AsyncLocalStorage; `coordinator.ts` serializes client/global/provider budgets, concurrency leases, circuits and aggregate counters in a named SQLite Durable Object.
- `registration.ts` uses IANA-bootstrap HTTPS RDAP with explicit unavailable/error outcomes; age alone is informational.
- Official Unicode18 confusables are vendored with provenance/update tooling; bounded brand comparisons remain explainable.
- `destinations.ts` separately reassesses up to four browser-observed destinations without crawling. Excess/unavailable checks prevent reassurance; unresolved shorteners remain unknown.
- `explanation.ts` optionally asks Gemini to select recorded evidence IDs; displayed prose and verdict stay deterministic.
- Provider transport uses Workers-supported manual redirect mode and rejects3xx. v5 Safe Browsing protobuf and lowercase Cloudflare statuses were verified against live responses.
- Protected aggregate `/api/metrics` is independent of public scanner access; token comparisons use hashes.

Production jobs now use separate named instances of `ScanCoordinator`, with atomic revisions, conservative conflict resolution and fixed deadline+60second native deletion alarms. The singleton admission/metrics object remains URL-free. `job-state.ts` validates internal job records.
