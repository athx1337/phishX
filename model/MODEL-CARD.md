# phishX URL XGBoost v2

**Purpose:** supporting phishing warnings for a free educational scanner. **Not a safety classifier.** At its deliberately conservative operating point it misses **51.34% of phishing-labelled test URLs**. Use independent reputation providers and review evidence together.

## Implementation

Active version `xgb-url-2026-11-03-v2`, features `url-lexical-v2-protocol-invariant`: 69 URL-structure features, 160 genuine XGBoost depth-4 numeric trees, 90,424-byte edge model. The same JavaScript feature implementation runs during training and serving. No label, reputation, HTML, external request or scheme indicator enters inference. HTTP/HTTPS alone yields identical features and estimates. The raw logistic estimate is Platt-calibrated on a separate historical partition. Warning threshold **0.8220732808113098** is chosen on validation, maximizing recall subject to observed FPR ≤0.5% and threshold ≥0.5.

Hyperparameters: 160 estimators, depth 4, learning rate .08, min child weight 8, subsample .85, column sample .9, L2 3, L1 .2, histogram training, seed 20261103, 4 threads, early stopping patience 20 on validation log loss. All 160 trees were retained. The baseline is a constant training-prevalence predictor; its actual metrics are in `evaluation.json`.

## Provenance and split

Sources are [UCI PhiUSIIL](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+website+dataset) (235,795 rows; original label 1 is benign) and [PhreshPhish v1.0.1](https://huggingface.co/datasets/phreshphish/phreshphish) (666,315 published rows; `phish` is positive), both CC BY 4.0. Normalize positive labels to phishing=1. Only URL/label/collection-date metadata are projected. No corpus destination or HTML is fetched. The frozen source/parquet commits, projected-file hashes and licenses are recorded in `ml/sources.json`, `evaluation.json`, and `LICENSE-DATA.md`.

902,110 downloaded rows; 894,698 pass canonical/public URL eligibility (**99.1784% coverage**). Remove 8 conflicting-label URL identities, then deduplicate to 891,806 URLs. Purge 270,614 earlier observations belonging to later-owned registrable domains and remove 48,690 rows with a stable, label-blind 30-URL/domain cap. All six partition-pair domain overlaps are zero; URL/domain hashed split-manifest SHA256 is retained. Private PSL domains are treated as domain groups.

| Partition | URLs | Domains | Phishing / benign | Collection dates |
|---|---:|---:|---:|---|
| Training | 393,599 | 328,147 | 216,018 / 177,581 | Dated subset July 2024–April 2025; undated UCI training prior |
| Validation | 29,628 | 24,958 | 13,507 / 16,121 | June–July 2025 |
| Calibration | 45,896 | 37,428 | 14,352 / 31,544 | August–September 2025 |
| Fixed test | 103,379 | 65,486 | 52,364 / 51,015 | October–December 2025 |

This is a custom pooled and purged benchmark, **not** the official PhreshPhish split. First-two-row-group projection of every shard and the domain cap affect base rates. UCI timestamps are unavailable: its 2024 publication is only a prior-source assumption, not invented collection dates. Domain and temporal separation reduce leakage but cannot establish absence of all cross-source/template/labeling bias.

## Results and limits

| Metric | Validation | Fixed test |
|---|---:|---:|
| Precision at warning threshold | 98.724% | 99.148% |
| Recall | 45.828% | **48.657%** |
| False negative rate | 54.172% | **51.343%** |
| False positive rate | 0.4962% | 0.4293% |
| AUROC | 0.94573 | 0.95607 |
| Average precision | 0.94246 | 0.95979 |
| Brier score | 0.09472 | 0.09247 |
| ECE (10 bins) | 0.06022 | 0.07409 |

Test confusion matrix: TP **25,479**, FP **219**, FN **26,885**, TN **50,796**. FPR 95% Wilson interval **0.3762–0.4899%**; recall interval **48.2295–49.0857%**. Wilson intervals treat URLs as independent and may understate uncertainty within correlated campaigns; domain/campaign bootstrap intervals are not provided. No URL was declared safe by the model.

Validation tradeoff: threshold .5 has recall77.182% / FPR6.811%; .75 has recall54.224% / FPR1.024%; selected .822073 has recall45.828% / FPR.496%; .95 has recall26.157% / FPR.0682%; .99 has recall6.545% / zero observed false positives (not zero risk). The threshold and hyperparameters were not selected using test metrics.

Test slices expose limitations: HTTP recall31.34% versus HTTPS52.54%, despite scheme-invariant inference (other dataset characteristics differ). URLs longer than100 characters have recall72.24% / FPR.737%; shorter URLs recall45.81% / FPR.404%. Actual historical labels can be stale, and legitimate login paths can look like phishing. URLs with missing/unsupported structure abstain instead of becoming clean checks.

Observed precision reflects the approximately balanced benchmark. Applying the measured TPR/FPR to a hypothetical **0.1% phishing prevalence yields only about10.19% precision**; at1% prevalence it yields53.38%. These are illustrations, not measured real-traffic performance. Scores are not a probability of safety. Calibration under actual deployment prevalence, new attacks, language/TLD shifts, redirects, compromised sites and adversarial manipulation is unverified.

The benign synthetic raw-Gist control `https://gist.githubusercontent.com/person/id/raw/hello.txt` triggers a v2 model warning. There is no Gist-specific malware rule, and this is never a confirmed malware verdict; it is a known lexical-model false positive. Removing the old hardcoded rule does not eliminate learned false positives. This control did not change the trained artifact or threshold.

## Experiment history and promotion

v1 used the scheme in lexical aggregates and an HTTPS indicator. Post-training benign controls exposed a shortcut: `http://example.com`, `http://google.com` and `http://github.com` warned while HTTPS variants did not. v2 removes the scheme from **all** aggregate features and freezes hyperparameters and validation-threshold policy. Those paired benign controls now have identical estimates and no warnings; Wikipedia also passes. No allowlist or domain-specific suppression was introduced.

**v1's test had already been viewed. v2 is a second evaluation of the same fixed test, not a newly untouched benchmark.** This limitation prevents treating the result as independent final certification. Prior v1 artifacts and source snapshots remain under `model/v1/`; v1 is superseded and must not serve users. A fresh independent temporal benchmark is required before any broad accuracy or superiority claim.

All validation-based promotion gates pass: empirical FPR≤.5%; FPR Wilson upper≤1%; precision≥80%; recall≥10%; artifact<1MB; benign protocol-pair invariance and no warnings for those controls. These gates permit only the supporting-warning role and do not establish production reliability.

## Runtime validation and references

`runtime-verification.json` records 100 native-XGBoost margin/raw/calibrated fixtures and23 canonical URL feature controls. Maximum probability disagreement is under8×10⁻⁸ and margin disagreement under2.4×10⁻⁷. Corrupt graphs/features/nonfinite inputs fail closed. On the recorded Windows Node24 machine, warmed local extraction+inference p50≈.007ms / p95≈.039ms; these are not end-to-end scanner latency or Worker production measurements.

Research foundations: [Chen & Guestrin, XGBoost](https://arxiv.org/abs/1603.02754), [Prasad & Chandra, PhiUSIIL](https://doi.org/10.1016/j.cose.2023.103545), [PhreshPhish](https://arxiv.org/abs/2507.10854), [official XGBoost model IO](https://xgboost.readthedocs.io/en/stable/tutorials/saving_model.html). Data attribution/license details are in `LICENSE-DATA.md`; reproducible commands and monitoring/rollback policy are in `ml/README.md`.
