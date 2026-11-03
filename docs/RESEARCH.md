# Model research and archived limitations

The active scanner now executes a separately trained, versioned XGBoost model exported as bounded decision trees for the Worker. Rules remain a separate heuristic engine. See `ml/` for acquisition/training/verification code and `model/` for native/edge artifacts, evaluation and model card. `npm run test:model` checks committed artifact integrity and native parity fixtures without needing raw training data. It is not a retraining command.

## Current evaluation

The active `xgb-url-2026-11-03-v2` artifact has 160 trees and 69 protocol-invariant lexical features. The domain-disjoint, time-separated fixed test contains 103,379 eligible URLs: precision about 99.148%, recall 48.657%, false-negative rate 51.343%, and false-positive rate 0.4293%. These are historical warning-classifier measurements, not website safety guarantees. At a hypothetical 0.1% phishing base rate, the implied positive predictive value is only about 10.19%. v1's test was already viewed before the protocol-shortcut correction: v2 is a second fixed-test evaluation, not a newly untouched benchmark. Read the exact counts, calibration, slices, dates, known benign Gist false positive and sampling limits in `model/evaluation.json` and `model/MODEL-CARD.md` before interpreting these figures.

A positive produces supporting warning evidence; a negative cannot increase remote-provider coverage or certify safety. The substantial miss rate makes reputation, domain impersonation and transparent uncertainty essential. No head-to-head benchmark establishes superiority over SENTINEL-X.

Primary methodological sources are [Chen and Guestrin's XGBoost paper](https://arxiv.org/abs/1603.02754), [PhiUSIIL at UCI](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+website+dataset), and [PhreshPhish's dataset paper](https://arxiv.org/abs/2507.10854). Acquisition manifests document the actual selected dataset versions, licenses, checksums and dates; the UCI resource is included only as an undated publication-2024 training prior, never as fabricated dated test observations.

## Archived implementation

`repo/` contains original notebooks, CSV snapshots and a pickle. Production does not load them. Never deserialize an untrusted pickle.

The local audit found:

- Training uses 16 predictors after dropping `Domain`; the old Worker used eight, including placeholders.
- The 10,000-row combined CSV has 5,626 duplicate complete rows, 771 distinct predictor vectors and 109 vectors with both labels.
- Random row splitting risks duplicate/domain leakage. Notebook-recorded 86.4% accuracy is not a current application metric.
- Initial shuffling/several estimators are unseeded; there is no pinned Python environment.
- Autoencoder reconstruction accuracy is compared with label accuracy; decoder wiring bypasses its intended bottleneck.
- Standalone IP detection tests complete URLs; WHOIS is used with its import commented out; iframe matching uses a character class; network requests have no timeout.
- Age/expiry logic disagrees with descriptions, traffic extraction uses an old Alexa endpoint, CSV headers differ (`Tiny_URL`/`TinyURL`), and notebook paths differ from checked-in names.

Original artifacts are preserved rather than silently rewriting historical results. The new pipeline has separate pinned dependencies, versioned safe lexical extraction and deduplicated/domain-isolated evaluation. Historical notebook metrics do not validate the new model.

## Nested repository

The outer repository records `repo` as a gitlink without `.gitmodules`. Its existing local checkout is preserved; a fresh clone may omit the research and normal submodule initialization cannot discover its remote.

Research is unnecessary for app builds. Obtain an independent copy by cloning the attributed [upstream research](https://github.com/shreyagopal/Phishing-Website-Detection-by-Machine-Learning-Techniques) elsewhere. Repairing gitlink metadata should be an explicit repository-maintenance change, not deletion of a user's nested checkout.
