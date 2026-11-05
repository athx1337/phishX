# Independent Gemini URL review evaluation

All 40 supplied entries and six curated benign controls were processed using the production input shaping, frozen prompt and a three-second Google request bound. This was a direct Node-to-Google evaluation, separate from Worker latency and from the complete phishX scanner. Labels remain user-provided.

| Group | Status counts |
| --- | --- |
| all 40 | 19 abstained, 5 unavailable, 8 risk_signal, 4 timeout, 4 skipped_sensitive |
| labeled 39 | 19 abstained, 5 unavailable, 7 risk_signal, 4 timeout, 4 skipped_sensitive |
| benign controls 6 | 1 unavailable, 5 abstained |

The sample provides 39 positive labels and one incomplete label. Sensitive links skip independent review. An abstention provides no safety assurance. Unavailable and timeout responses count as incomplete assessments. The controls are curated examples and do not establish a population false-positive rate.

The prompt, production model, allowed reasons and timeout were frozen before the full run. Gemini received no benchmark labels, remote findings, XGBoost scores or page content. Model pretraining overlap remains unobservable. Running this evaluation does not fine-tune either model.

| ID | Outcome | Reason codes |
| --- | --- | --- |
| 9554496 | abstained |  |
| 9554495 | abstained |  |
| 9554494 | unavailable |  |
| 9554493 | unavailable |  |
| 9554492 | abstained |  |
| 9554488 | risk_signal | deceptive_host, brand_impersonation |
| 9554486 | risk_signal | deceptive_host, brand_impersonation |
| 9554483 | risk_signal | brand_impersonation |
| 9554480 | timeout |  |
| 9554470 | abstained |  |
| 9554467 | abstained |  |
| 9554466 | abstained |  |
| 9554465 | timeout |  |
| 9554464 | abstained |  |
| 9554453 | unavailable |  |
| 9554442 | abstained |  |
| 9554440 | abstained |  |
| 9554439 | risk_signal | deceptive_host, credential_lure |
| 9554437 | abstained |  |
| 9554436 | risk_signal | credential_lure |
| 9554580 | risk_signal | deceptive_host, brand_impersonation |
| 9554576 | risk_signal | deceptive_host, brand_impersonation |
| 9554575 | abstained |  |
| 9554574 | unavailable |  |
| 9554568 | abstained |  |
| 9554567 | timeout |  |
| 9554566 | unavailable |  |
| 9554565 | timeout |  |
| 9554550 | skipped_sensitive |  |
| 9554549 | skipped_sensitive |  |
| 9554548 | skipped_sensitive |  |
| 9554545 | skipped_sensitive |  |
| 9554533 | abstained |  |
| 9554532 | abstained |  |
| 9554531 | abstained |  |
| 9554530 | risk_signal | deceptive_host, brand_impersonation |
| 9554522 | abstained |  |
| 9554499 | abstained |  |
| 9554498 | abstained |  |
| 9554497 | abstained |  |
| control-example | unavailable |  |
| control-allegro | abstained |  |
| control-lokalnie | abstained |  |
| control-microsoft | abstained |  |
| control-prime | abstained |  |
| control-github | abstained |  |
