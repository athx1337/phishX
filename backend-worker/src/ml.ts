import type { EngineResult } from '../../shared/scan';
import type { ParsedInput } from './url';
import { aggregate, evidence, target } from './evidence';
import { extractFeatures, FEATURE_VERSION } from '../../ml/features.mjs';
import { createPredictor } from '../../ml/inference.mjs';
import artifact from '../../model/xgboost-edge.json';
import evaluation from '../../model/evaluation.json';

let predict: ReturnType<typeof createPredictor> | null = null;
try { predict = createPredictor(artifact); } catch { /* A damaged/unsupported model never becomes a clean check. */ }

/** Actual XGBoost inference. Local model negatives never establish remote coverage or safety. */
export function analyzeModel(input: ParsedInput): EngineResult {
  return aggregate('xgboost', 'XGBoost URL model', 'model', input.targets.map(url => {
    if (!predict) return target(url, 'unavailable', { error_code: 'MODEL_UNAVAILABLE', message: 'The trained model artifact could not be validated.' });
    try {
      const prediction = predict(extractFeatures(url, input.domain.registrable_domain));
      const promoted = evaluation.promoted === true;
      const findings = prediction.warning && promoted ? [evidence('XGBoost URL model', 'xgboost-warning', 'Trained URL model warning',
        `Model ${artifact.model_version} exceeded its validation-selected warning threshold. This is supporting URL-only model evidence, not a confirmed threat or a guarantee about page content.`,
        'warning', 'suspicious_structure', url)] : [];
      return target(url, promoted ? (findings.length ? 'detected' : 'no_detection') : 'unknown', {
        evidence: findings,
        message: promoted ? 'A genuine trained XGBoost classifier evaluated the URL. A negative model estimate does not prove safety.' : 'The genuine model is running in shadow mode because promotion gates were not met.',
        data: { model_version: artifact.model_version, features_version: FEATURE_VERSION, raw_score: prediction.raw_probability,
          calibrated_score: prediction.probability, warning_threshold: artifact.warning_threshold, model_warning: prediction.warning,
          promoted, feature_count: artifact.feature_names.length, tree_count: artifact.trees.length,
          calibration: 'Platt scaling on a separate calibration partition; historical sampling limits apply.' },
      });
    } catch {
      return target(url, 'error', { error_code: 'MODEL_INPUT_INVALID', message: 'The URL could not be evaluated by the model; this is not a clean result.' });
    }
  }));
}
