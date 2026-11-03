import { describe, expect, it } from 'vitest';
import { analyzeModel } from '../src/ml';
import { parseInput } from '../src/url';
import { createPredictor, validateArtifact } from '../../ml/inference.mjs';
import { extractFeatures } from '../../ml/features.mjs';
import artifact from '../../model/xgboost-edge.json';
import fixtures from '../../model/parity-fixtures.json';
import controls from '../../model/serving-fixtures.json';

describe('genuine XGBoost edge model', () => {
  it('matches native XGBoost margins, raw estimates and calibrated estimates', () => {
    const predict = createPredictor(artifact);
    for (const row of fixtures) {
      const actual = predict(row.features);
      expect(Math.abs(actual.margin - row.native_margin)).toBeLessThan(1e-6);
      expect(Math.abs(actual.raw_probability - row.native_probability)).toBeLessThan(1e-6);
      expect(Math.abs(actual.probability - row.calibrated_probability)).toBeLessThan(1e-6);
    }
  });
  it('uses identical shared float32 URL features at serving time', () => {
    for (const row of controls) expect(extractFeatures(row.url, row.domain)).toEqual(row.features);
  });
  it('does not treat HTTP or HTTPS as a phishing signal', () => {
    const predict = createPredictor(artifact);
    for (const domain of ['example.com', 'google.com', 'github.com', 'wikipedia.org']) {
      const http = extractFeatures(`http://${domain}/`, domain);
      const https = extractFeatures(`https://${domain}/`, domain);
      expect(http).toEqual(https);
      expect(predict(http).warning).toBe(false);
    }
  });
  it('evaluates every target and labels model negatives as supporting evidence only', () => {
    const engine = analyzeModel(parseInput({ url: 'example.com' }));
    expect(engine.kind).toBe('model');
    expect(engine.targets).toHaveLength(2);
    for (const result of engine.targets) {
      expect(result.status).toBe('no_detection');
      expect(result.data?.model_version).toBe(artifact.model_version);
      expect(result.data?.tree_count).toBeGreaterThan(0);
      expect(result.message).toContain('does not prove safety');
    }
  });
  it('returns only warning evidence when a real model threshold is exceeded', () => {
    const row = controls.find(control => control.warning);
    expect(row, 'Synthetic controls must include a model positive').toBeDefined();
    const engine = analyzeModel(parseInput({ url: row!.url, sensitive_url_consent: true }));
    expect(engine.status).toBe('detected');
    expect(engine.evidence.length).toBeGreaterThan(0);
    expect(engine.evidence.every(item => item.severity === 'warning')).toBe(true);
  });
  it('rejects corrupt artifacts, cyclic trees and nonfinite input', () => {
    const corrupt = structuredClone(artifact);
    corrupt.trees[0].left_children[0] = 0;
    expect(() => validateArtifact(corrupt)).toThrow();
    expect(() => createPredictor(artifact)([NaN])).toThrow();
  });
});
