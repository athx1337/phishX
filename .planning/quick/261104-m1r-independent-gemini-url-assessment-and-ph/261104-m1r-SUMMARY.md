---
id: 261104-m1r
status: complete
date: 2026-11-05
source_commit: f074d74
---

# Independent Gemini URL review and supplied-sample evaluation

The scanner now offers an explicit independent Gemini URL review. Google receives the hostname, registrable domain and limited derived path traits. Sensitive URLs skip it. The bounded response can supply validated warning codes that raise a suspicious result. Abstention and failures cannot establish safety or increase remote coverage. The review is retained through polling, excluded from the shared report cache, and visible in Overview, Sources and Model & AI. This mode uses a deterministic recorded explanation alongside one independent Gemini call.

New-policy negative conclusions require every remote source to complete with fresh conclusive evidence, at least two completed reputation sources, and zero detected remote statuses. Incomplete coverage produces unknown unless warning or confirmed-threat evidence supports stronger caution. The negative label reads “No threat matches returned.” Historical earlier-policy compatibility is preserved.

The Allegro and Allegro Lokalnie brand-domain rules now recognize their official domains and warn on deceptive hosts elsewhere. This rule was developed after seeing the sample, so it is a targeted regression improvement. The XGBoost artifact and its threshold were frozen throughout evaluation.

## Actual results

- All40 supplied entries were evaluated against the production XGBoost artifact. Of39 supplied valid/online labels,23 exceeded the warning threshold and16 missed. The incomplete-label row was excluded from recall. The strict whole-corpus-domain-disjoint cohort warned20/36. Per-ID scores and overlap are recorded in PHISHTANK-HOLDOUT.json/md.
- All40 supplied entries and6 curated benign controls passed through the independent Gemini evaluator. Of39 supplied positives,7 raised risk signals,19 abstained,9 failed and4 sensitive links were skipped. Five benign controls abstained and one request failed. These controls cannot establish a general false-positive rate.
- The full Gemini evaluation used the production shaping, prompt, model and3s request timeout from Node directly to Google. Hosted latency was tested separately. Supplied labels and prior model/provider outputs were excluded from Gemini inputs.
- The hosted example9554574 remained unconfirmed. XGBoost missed it. Gemini abstained in earlier hosted probes and timed out in the final browser check. The final report had2/4 complete remote checks and correctly showed Unable to determine. A future4/4 negative result with no warning would still return the no-match label.
- PhishTank's detail/API access returned HTTP403 and the official dump redirect returned HTTP404. The labels therefore remain user-supplied, and a live PhishTank source was not added.
- No XGBoost retraining or Gemini fine-tuning occurred. The retained benchmark supplies measurable regression cases; it does not prove general detection accuracy or teach Gemini persistently.

## Verification and release

TypeScript, lint,45 contract/monitor tests,229 Worker tests,70 frontend tests and the production build passed. All32 desktop/mobile browser cases passed. The secret scan passed for the working tree and available history. Final actual public UI evidence verifies the opt-in, true Gemini status,8 source cards, source inspector, no horizontal overflow at390px and zero axe violations in the checked Sources view.

Cloudflare Worker f865fa1c-1a21-4aa8-a6d3-e438a693beaf and Vercel dpl_HBchqDpcojb64J9ru3oFNoCf2Niy served source f074d74. See HOSTED-UI.json and the independent VERIFICATION.md for exact evidence.
