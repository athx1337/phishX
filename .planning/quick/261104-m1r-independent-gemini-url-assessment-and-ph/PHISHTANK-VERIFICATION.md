# Offline benchmark verification

The runner evaluated all forty supplied entries using the unchanged production model `xgb-url-2026-11-03-v2`, its current runtime feature extractor and fixed calibrated warning threshold `0.8220732808113098`.

Reproduction command, run from the repository root with the private input present:

```powershell
node scripts/evaluate-phishing-holdout.mjs --input .cache/phishtank-user-sample.json --output .planning/quick/261104-m1r-independent-gemini-url-assessment-and-ph
```

The runner verifies the pinned model, feature, corpus and split-manifest hashes against `model/evaluation.json`. The model and features are checked again before output. The final runner also checks that the corpus and split manifest stayed unchanged. The input SHA256 identifies the exact text loaded into memory. Model artifacts and the threshold are read-only throughout evaluation.

The model runtime verifier passed 100 native/edge parity fixtures and 23 serving feature fixtures. `node --check scripts/evaluate-phishing-holdout.mjs` passed. An additional local synthetic overlap control demonstrated exact matching, a scheme-only alternate that matches only the scheme-independent key, a new path matching only the historical domain, fragment removal and canonical deduplication. A null label/status row stayed outside the positive denominator. These control records and raw inputs remain in ignored `.cache`.

The real sample contains forty unique canonical URLs grouped into thirty-five registrable domains. The runner scanned all 902,110 pinned corpus rows. It excluded 7,416 historically ineligible URL records using the public-host and canonicalization rules and matched against the remainder. No sample URL matched exactly or after removing the scheme. IDs 9554440, 9554439, 9554437 and 9554436 match a historical-test domain. None of the forty sample domains matched the train, validation or calibration split domains.

Among the thirty-nine user-labeled valid/online entries, twenty-three reached the threshold and sixteen fell below it. Warning recall against these supplied labels is 58.97%. Removing every historical-corpus domain match leaves thirty-six labeled entries, twenty warnings and sixteen misses, giving 55.56%. Entry 9554436 has incomplete labels and a below-threshold model output. It is scored descriptively and omitted from both labeled denominators.

Entry 9554574 produced raw model output `0.8756469724587815` and calibrated output `0.6816205660577672`, below the fixed warning threshold. Its exact URL, scheme-independent URL and registrable domain had no historical overlap. Its current PhishTank status could not be confirmed because official detail requests were blocked. The supplied valid/online label is preserved as provenance.

A redaction check confirmed the exported result JSON contains none of the forty input URLs or hostnames. The JSON publishes per-ID URL/domain hashes, score values and overlap flags. The raw sample is ignored by Git. No destination, DNS, reputation, browser or Gemini requests were used to generate predictions. Separate official PhishTank metadata checks are documented in `PHISHTANK-PROVENANCE.md`.

This is a selected positive sample with user-transcribed labels and several repeated domain/campaign patterns. Dates were absent, so temporal novelty could not be established. It supports a direct account of model warnings and misses on these entries. It provides no estimate of precision, false-positive rate or general traffic accuracy. The descriptive Wilson interval in the generated report assumes independent rows and should be read with the recorded clustering limitation.
