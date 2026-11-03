import { VERDICT_LABELS } from '../../../shared/scan';

const time = value => value ? new Date(value).toLocaleString() : 'Not reported';

export function ModelObservation({ engine }) {
  if (engine.kind !== 'model') return null;
  return <div className="rounded border border-violet-400/25 p-4 space-y-3" data-testid="model-observations">
    <h4 className="font-semibold text-white">Trained XGBoost URL model</h4>
    <p className="text-sm text-slate-300">Local inference over the trained model’s decision trees. Its output supplements evidence; a negative prediction does not verify reputation or make a URL safe.</p>
    {engine.targets.map(target => <div key={target.url} className="text-xs text-slate-300 space-y-1">
      <p className="font-mono break-all">{target.url}</p>
      <p>Model version: <span className="font-mono">{String(target.data?.model_version || 'Unavailable')}</span></p>
      <p>Feature version: <span className="font-mono">{String(target.data?.features_version || target.data?.feature_version || 'Not reported')}</span></p>
      {typeof target.data?.raw_score === 'number' && <p>Raw model output: {target.data.raw_score.toFixed(4)}</p>}
      {typeof target.data?.calibrated_score === 'number' && <p>Historically calibrated model output: {target.data.calibrated_score.toFixed(4)}</p>}
      <p>Warning threshold: {typeof (target.data?.warning_threshold ?? target.data?.threshold) === 'number' ? (target.data.warning_threshold ?? target.data.threshold).toFixed(4) : 'Not reported'}</p>
      <p>{target.data?.promoted === false ? 'Model ran in shadow mode; its predictions do not affect the verdict.' : target.status === 'detected' ? 'Model warning threshold reached.' : target.status === 'no_detection' ? 'Model warning threshold not reached.' : 'Model inference was not available.'} This is not a safety score or a probability that visiting is safe.</p>
    </div>)}
  </div>;
}

export default function AnalysisExtensions({ result }) {
  return <>
    {result.registration && <section className="glass-panel rounded-lg p-5 space-y-3" aria-label="Registration evidence">
      <h3 className="text-lg font-semibold text-white">Registration evidence</h3>
      <p className="text-sm text-slate-300">{result.registration.status === 'available' ? 'Registration data returned by a registry source.' : 'Registration information could not be established.'}</p>
      <dl className="text-sm text-slate-300 grid sm:grid-cols-2 gap-3">
        <div><dt className="text-xs text-slate-400">Source</dt><dd className="break-all">{result.registration.source || 'Unavailable'}</dd></div>
        <div><dt className="text-xs text-slate-400">Registrar</dt><dd>{result.registration.registrar || 'Unavailable'}</dd></div>
        <div><dt className="text-xs text-slate-400">Created</dt><dd>{time(result.registration.created_at)}</dd></div>
        <div><dt className="text-xs text-slate-400">Observed domain age</dt><dd>{typeof result.registration.age_days === 'number' ? `${result.registration.age_days} days` : 'Unavailable'}</dd></div>
      </dl>
      <p className="text-xs text-slate-400">Observed {time(result.registration.observed_at)}. Domain age is supporting context; a new domain is not automatically malicious.</p>
    </section>}
    {result.destinations?.length > 0 && <section className="glass-panel rounded-lg p-5 space-y-4" aria-label="Observed destination assessments">
      <h3 className="text-lg font-semibold text-white">Observed destination assessments</h3>
      <p className="text-sm text-slate-300">These destinations were observed by active inspection and checked separately. The original requested protocols remain listed in the main report.</p>
      {result.destinations.map(destination => <details key={destination.url} className="rounded border border-white/15 p-4">
        <summary className="text-sm cursor-pointer"><span className="font-semibold text-violet-200">{VERDICT_LABELS[destination.verdict]}</span><span className="block font-mono text-xs break-all mt-2">{destination.url}</span></summary>
        <div className="space-y-3 mt-4 text-sm text-slate-300">
          <p>Actual domain: <strong>{destination.domain.registrable_domain || destination.domain.hostname}</strong></p>
          <p>{destination.summary}</p><p>{destination.coverage.completed} of {destination.coverage.total} remote providers completed.</p>
          <ul className="space-y-2">{destination.reasons.map((reason, index) => <li key={`${reason.id}-${index}`}><strong>{reason.title}</strong> — {reason.description} <span className="text-xs text-slate-400">({reason.source})</span></li>)}</ul>
          <p className="text-xs text-slate-400">Observed {time(destination.observed_at)} · expires {time(destination.expires_at)}</p>
        </div>
      </details>)}
    </section>}
    {result.explanation && <section className="glass-panel rounded-lg p-5 space-y-3" aria-label="Grounded explanation">
      <h3 className="text-lg font-semibold text-white">Grounded explanation</h3>
      <p className="text-sm text-slate-300">{result.explanation.text}</p>
      <p className="text-xs text-slate-400">{result.explanation.source === 'gemini' ? 'Gemini selected recorded observations. Wording is assembled from validated evidence/templates; the model cannot replace the official verdict.' : 'Deterministic explanation from the recorded observations.'}</p>
    </section>}
  </>;
}
