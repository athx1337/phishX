# Reproducible URL-only XGBoost

The active model is genuinely trained XGBoost, evaluated locally by numeric trees in the Worker. There are no ML API keys, Python services, live URL fetches, HTML features, pickle loading, or heuristic substitutes. Its positive output is a **supporting warning**; its negative output never establishes safety or remote-provider coverage.

## Verify the checked-in model

From the repository root after `npm --prefix backend-worker ci`:

```sh
node ml/verify.mjs
npm --prefix backend-worker run test -- test/ml.spec.ts
npm --prefix backend-worker run typecheck
```

The Node verifier requires no Python, corpus, or network. It checks SHA256 integrity of the feature module and both model artifacts, promotion gates, native-versus-edge margins/probabilities, 23 canonical URL feature fixtures, benign protocol invariance, malformed trees, and nonfinite inputs. `node ml/verify.mjs --record` additionally refreshes the machine-specific local latency record. It measures only warmed feature extraction plus inference, not scanner/network latency.

## Reproduce training

Python 3.14.3 and Node 24.19.0 were used. Install the backend's locked dependencies and these ML dependencies in a virtual environment:

```sh
python -m venv .venv
# Activate .venv using your shell's normal command.
python -m pip install -r ml/requirements.txt
python -m pytest ml/tests -q
python ml/download.py
python ml/train.py
node ml/verify.mjs --record
```

Training rewrites the tracked artifacts under `model/`; review the resulting diff. Dataset downloads and feature/split caches stay in ignored `ml/data/`. The feature projection can use hundreds of MB of RAM/storage. No GPU is needed. Do not run artifact verification concurrently with training: the artifact bundle is written as several files.

`sources.json` freezes all 77 Parquet shard URLs to a converted-data commit and includes every projected-shard checksum plus the UCI archive/corpus checksums. The downloader fails on mismatch, projects only URL/label/date, and never visits dataset URLs. First-two-row-group projection is deterministic but is not asserted to be a uniform population sample. A deliberate dataset refresh requires a newly reviewed manifest, attribution, evaluation, and model version.

`feature-runner.mjs` uses the runtime's locked `tldts` PSL and `ipaddr.js` for canonical/public-host eligibility, then imports the **same** `features.mjs` used by the Worker. The canonical URL has no fragment or embedded credentials, and features are float32. A scheme is accepted for parsing but excluded from every lexical aggregate and direct feature. HTTP and HTTPS alone cannot change the estimate. Explicit ports remain structural URL features after standard URL normalization.

`train.py` removes conflicting labels and duplicate URLs, partitions by actual collection time, purges earlier observations of domains owned by later partitions, and caps each domain at 30 URLs by label-blind stable URL hash. Domain groups use the PSL including private suffixes. UCI has no per-row collection dates and is included only as a publication-2024 training prior. A separate August–September partition fits Platt calibration. The June–July validation partition chooses the warning threshold, and October–December is the fixed test. See the model card for the important second-evaluation disclosure.

The JSON native model is exported using the documented XGBoost model format. The compact export supports numeric `binary:logistic` trees only; categorical exports fail. Runtime graph/schema checks reject unsupported, cyclic, malformed, or nonfinite models. Version, feature order, training library, calibration, threshold, checksums, corpus provenance, partition counts and metrics are retained.

## Integration and operation

`backend-worker/src/ml.ts` exports `analyzeModel(ParsedInput): EngineResult`, one result per canonical target, `kind: 'model'`. Results include model/feature versions, raw and calibrated estimates, warning threshold, tree/feature count and promotion state. A failed artifact is `unavailable`; failed inputs are `error`; a model that misses promotion gates is `unknown` shadow mode. No branch falls back to keyword logic or reports an unavailable model as a clean check.

Keep raw URLs out of metrics/logs; historical corpus URLs remain ignored. Monitor aggregate model version, warning/error rate and latency. Labels and real traffic prevalence are not currently collected, so production precision, drift and calibration are **unverified**. A changed warning rate or failed integrity/latency check calls for shadow mode and investigation, not a silent threshold adjustment. Roll back the entire feature/model/evaluation bundle together. `model/v1` is retained for forensic comparison only and must not be restored to production because its scheme shortcut is known.

For improvement, collect a newly dated, independent, legally shareable benchmark and delayed labels before tuning further. Investigate false negatives and long-URL false positives; evaluate secure page-content signals in an isolated scanner separately. Do not infer superiority over another scanner from this offline experiment.
