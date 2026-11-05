# Supplied PhishTank sample — frozen model evaluation

Run 2026-11-05T07:40:32.803Z. Model xgb-url-2026-11-03-v2. The warning threshold was frozen at 0.8220732808113098.

The supplied list contains 40 rows. 39 were supplied with valid/online labels. 1 has incomplete label/status and is excluded from the positive-label metric. Labels were transcribed from the user. Independent live label confirmation was unavailable.

| Cohort | Rows | Model warnings | Model misses | Warning recall against supplied labels |
| --- | ---: | ---: | ---: | ---: |
| Supplied valid/online | 39 | 23 | 16 | 58.97% |
| Corpus-domain-disjoint supplied valid/online | 36 | 20 | 16 | 55.56% |

The descriptive Wilson 95% interval for supplied-label warning recall is 43.42% to 72.92%. Shared domains and campaign patterns weaken the independent-row assumption. This small selected positive sample cannot estimate false-positive rate, precision, overall accuracy or traffic prevalence.

There are 40 canonical URLs and 35 registrable-domain groups. Against the entire pinned historical corpus, 0 rows have an exact canonical match, 0 have a match after removing the scheme, and 4 have a domain match. The per-row results also identify matches with train, validation, calibration and historical test split hashes.

The runner imported the current runtime feature extractor and tree evaluator, verified the artifact, feature, corpus and split-manifest checksums, and rescanned the pinned corpus locally. It did not retrain, select a new threshold, fetch destinations, call reputation providers or submit URLs to Gemini. Raw URLs remain in ignored `.cache`; exported rows use PhishTank IDs and SHA256 hashes.

Entry 9554574 has calibrated model output 0.681621 and falls below the fixed warning threshold. Its supplied label/status is valid/online. Model output is a supporting warning measurement.

| PhishTank ID | Supplied status | Calibrated output | Warning | Historical exact/scheme/domain overlap |
| --- | --- | ---: | --- | --- |
| 9554496 | valid/online | 0.911993 | yes | false/false/false |
| 9554495 | valid/online | 0.905968 | yes | false/false/false |
| 9554494 | valid/online | 0.875629 | yes | false/false/false |
| 9554493 | valid/online | 0.771433 | no | false/false/false |
| 9554492 | valid/online | 0.776518 | no | false/false/false |
| 9554488 | valid/online | 0.914387 | yes | false/false/false |
| 9554486 | valid/online | 0.916062 | yes | false/false/false |
| 9554483 | valid/online | 0.970966 | yes | false/false/false |
| 9554480 | valid/online | 0.924112 | yes | false/false/false |
| 9554470 | valid/online | 0.973858 | yes | false/false/false |
| 9554467 | valid/online | 0.698518 | no | false/false/false |
| 9554466 | valid/online | 0.910253 | yes | false/false/false |
| 9554465 | valid/online | 0.886058 | yes | false/false/false |
| 9554464 | valid/online | 0.910253 | yes | false/false/false |
| 9554453 | valid/online | 0.956897 | yes | false/false/false |
| 9554442 | valid/online | 0.768115 | no | false/false/false |
| 9554440 | valid/online | 0.914850 | yes | false/false/true |
| 9554439 | valid/online | 0.839786 | yes | false/false/true |
| 9554437 | valid/online | 0.877518 | yes | false/false/true |
| 9554436 | incomplete | 0.737564 | no | false/false/true |
| 9554580 | valid/online | 0.897692 | yes | false/false/false |
| 9554576 | valid/online | 0.926587 | yes | false/false/false |
| 9554575 | valid/online | 0.974542 | yes | false/false/false |
| 9554574 | valid/online | 0.681621 | no | false/false/false |
| 9554568 | valid/online | 0.676677 | no | false/false/false |
| 9554567 | valid/online | 0.676677 | no | false/false/false |
| 9554566 | valid/online | 0.649067 | no | false/false/false |
| 9554565 | valid/online | 0.780475 | no | false/false/false |
| 9554550 | valid/online | 0.906069 | yes | false/false/false |
| 9554549 | valid/online | 0.610111 | no | false/false/false |
| 9554548 | valid/online | 0.929169 | yes | false/false/false |
| 9554545 | valid/online | 0.610111 | no | false/false/false |
| 9554533 | valid/online | 0.820774 | no | false/false/false |
| 9554532 | valid/online | 0.820774 | no | false/false/false |
| 9554531 | valid/online | 0.981706 | yes | false/false/false |
| 9554530 | valid/online | 0.988276 | yes | false/false/false |
| 9554522 | valid/online | 0.855508 | yes | false/false/false |
| 9554499 | valid/online | 0.540390 | no | false/false/false |
| 9554498 | valid/online | 0.540390 | no | false/false/false |
| 9554497 | valid/online | 0.820461 | no | false/false/false |

Full redacted scores, hashes, overlap flags and reproduction metadata are in `PHISHTANK-HOLDOUT.json`.
