# Independent backend/shared verification — 2026-11-03

Scope: requirements, plan review, backend routing/parser/heuristics/providers/evidence/storage/jobs/HTTP modules, shared contract and backend test source. Read-only source review plus in-memory heuristic probes. No backend/shared edits or commits by reviewer.

## Findings sent to root

1. **P1 — Enforce capability expiry independently of KV.** At review time `readJob` checked deadline type but not elapsed expiry, and `pollOnce` returned completed jobs before the deadline branch. Terminal jobs remained readable until KV expiry, including after a deadline poll reset their storage TTL. Require HTTP 410 at/after the capability deadline before any terminal/early return. Root accepted and requested backend fix.
2. **P1 — Validate freshness at report/cache boundaries.** At review time shared no-known-threat validation relied on status strings and top-level expiry, without requiring per-target expiry/freshness or plausible observation timestamps. The whole-report cache read trusted that contract. Require fresh conclusive target evidence and re-evaluate cached evidence against current time and requested URL scope before returning it. Root accepted; shared validator/cache fixes underway.
3. **P2 — Bound Cloudflare report correlation.** The adapter checked `task.uuid` only when present and did not compare `task.url` with the submitted target. Require documented task identity and requested URL binding (allow final page URL redirects separately), successful terminal task state and matching UUID. Do not count malformed/mismatched reports as clean observations.
4. **P2 — Legitimate brand-domain false positives.** In-memory probes reproduced warning evidence for `https://google.com.au/`, `https://amazon.com.au/` and `https://paypal.me/` because official domains are absent from hardcoded brand sets. Expand only verified official domains and document remaining finite-list limitations; do not trust every matching country suffix automatically.

## Already known fixes being completed by backend executor

- VirusTotal zero-vendor observations must be unknown, not a clean check.
- Google Safe Browsing matches must be correlated to requested URL expressions; unrelated match responses are malformed.
- GSB provider-cache evidence requires strict bounded schema/status/freshness validation.

## Positive properties reviewed

- All-provider outage stays unknown; strong provider evidence survives unavailable providers.
- Local heuristics are outside remote coverage and do not claim trained inference.
- Fresh/full per-protocol reputation coverage is required for a cautious non-detection verdict.
- No fabricated browser observations or hardcoded Gist verdict remains.
- CORS is exact-origin and credentials are omitted; managed anonymous route budgets fail closed when unavailable.
- Sensitive-parameter consent is checked server-side; URL credentials/private literals are rejected and active DNS checks inspect returned A/AAAA records.
- Active scans request unlisted visibility; provider UUIDs stay outside public report fields.
- Provider HTTP requests have deadlines, bounded response bodies, redirect refusal and sanitized public errors.
- Research artifacts and quantitative accuracy claims remain outside the running scanner.

## Verification limits

This review did not use live provider credentials, test deployed Cloudflare infrastructure, validate actual detection accuracy, or certify provider-side DNS rebinding/redirect defenses. Final acceptance requires the root's regression reruns after the findings above are fixed.
# Closure — 2026-11-03

All actionable findings below were addressed before delivery: logical capability expiry, per-target temporal validation/cache re-evaluation, task URL/UUID correlation and verified regional-domain exclusions. Backend regression suite reached 90 passing tests; frontend expiry behavior has dedicated tests. See 01-VERIFICATION.md for final evidence and remaining live-provider/benchmark limits.
