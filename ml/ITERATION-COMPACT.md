# XGBoost iteration compact

Goal: real reproducible URL-only XGBoost inference on the Worker, as supporting warning evidence.
Who cares: people assessing unfamiliar URLs; false reassurance is unacceptable.
Decision owner: deterministic evidence policy, never model probability alone.
Changed action: a sufficiently high model estimate can contribute a suspicious warning. A negative model estimate cannot establish safety or increase remote coverage.
Success: Python native XGBoost and exported edge trees agree within 1e-6; useful precision/recall on domain/time-separated observations; bounded Worker artifact and latency.
Guardrails: threshold selected on validation only, independent calibration and untouched test; duplicate/conflicting labels removed; no registrable-domain overlap across partitions.
Mistake budget: prioritize low false-positive rate for model-only warnings; target validation FPR <=0.5%, report Wilson uncertainty and achieved recall rather than manufacture a gate.
Unacceptable: label-derived features, network-dependent training/serving mismatch, malformed artifacts returning a clean prediction, hidden dataset temporal leakage, test tuning.
Signals: URL lexical structure only; no imported PhiUSIIL label-derived similarity/popularity features.
Sources: UCI PhiUSIIL 2024 and PhreshPhish URL/label/date metadata (CC BY 4.0; anti-phishing educational research).
Known risks: source/base-rate shift, stale historical labels, URL-only evasion, source-biased lexical patterns; no claim of current live validity or superiority.
Fallback: report model unavailable/unknown on schema or artifact failure; maintain reputation and explicit unknown behavior.
