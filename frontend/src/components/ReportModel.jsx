export default function ModelObservation({ engine }) {
  if (engine.kind !== 'model') return null;
  return <section className="report-model" data-testid="model-observations">
    <h4>Trained XGBoost URL model</h4>
    <p>Local inference over the trained model’s decision trees. Its output supplements evidence; a negative prediction does not verify reputation or make a URL safe.</p>
    {engine.targets.map(target => <div key={target.url} className="report-target">
      <p className="report-mono">{target.url}</p>
      <dl className="report-facts"><div><dt>Model version</dt><dd>{String(target.data?.model_version || 'Unavailable')}</dd></div><div><dt>Feature version</dt><dd>{String(target.data?.features_version || target.data?.feature_version || 'Not reported')}</dd></div>
      {typeof target.data?.raw_score === 'number' && <div><dt>Raw model output</dt><dd>{target.data.raw_score.toFixed(4)}</dd></div>}
      {typeof target.data?.calibrated_score === 'number' && <div><dt>Historically calibrated model output</dt><dd>{target.data.calibrated_score.toFixed(4)}</dd></div>}
      <div><dt>Warning threshold</dt><dd>{typeof (target.data?.warning_threshold ?? target.data?.threshold) === 'number' ? (target.data.warning_threshold ?? target.data.threshold).toFixed(4) : 'Not reported'}</dd></div></dl>
      <p>{target.data?.promoted === false ? 'Model ran in shadow mode; its predictions do not affect the verdict.' : target.status === 'detected' ? 'Model warning threshold reached.' : target.status === 'no_detection' ? 'Model warning threshold not reached.' : 'Model inference was not available.'} This is not a safety score or a probability that visiting is safe.</p>
    </div>)}
  </section>;
}
