# phishX trust and reliability remediation

Existing React/Vite client and Hono Cloudflare Worker. Historical Python research remains archived; milestone v0.3 now adds genuine reproducible XGBoost inference.

## Objective
Implement the supplied 2026-11-03 audit and local code audit as a cohesive, tested improvement. Preserve the current design and existing user changes. Correctness and evidence provenance take precedence over decorative scores or competitor feature counts.

## Decisions
- Version 2 shared contract: malicious, suspicious, no_known_threats, unknown. No binary safe verdict or numeric safety probability.
- Provider status is separate from detections; missing, failed, stale and pending results cannot establish clean coverage.
- Public Suffix List-aware URL heuristics, public destination validation, no direct target HTTP fetches from the Worker.
- Cloudflare v2 scans are unlisted, asynchronous, per protocol and bounded. Canonical production polling jobs use per-scan revisioned Durable Objects with expiry alarms; optional KV handles reservations/caches. No KV means active inspection unavailable, never invented.
- Explanations derive from recorded evidence. Optional constrained Gemini selects only existing evidence IDs; deterministic wording/verdict stay authoritative. Production defaults to Gemini disabled.
- History is opt-in, redacted, bounded and clearable. Sensitive parameters require explicit user acknowledgement before third-party submission.
- Preserve historical research artifacts; build a separate validated URL-only model with reproducible training, real evaluation and edge/native parity.
- Coordinated Cloudflare/Vercel deployment was authorized by continued website-fix requests and platform sign-ins and is now verified. Preserve the pre-existing dirty tree; no automatic source commits or GitHub publication.

## Workflow
GSD 1.19.0 smart-entry reported no-project. Use brownfield mapping knowledge from the preceding audit, bootstrap audit-derived requirements, plan/check, execute independent owned workstreams, verify and record results. Full audit-fix is inapplicable: its only source is GSD UAT and it excludes architectural fixes.

## Active milestone v0.3
User requested full TXT closure, including real XGBoost and research/evaluation. Product confirmed free educational. See milestones/v0.3-CONTEXT.md and phase02 PLAN/SUMMARY/VERIFICATION. Implementation/evaluation and public rollout are verified. Free ongoing-monitor investigation produced a tested GitHub Actions configuration; publication, its secret and notification delivery remain pending. Research and operational boundaries are retained in the audit, not presented as universally fixed.
