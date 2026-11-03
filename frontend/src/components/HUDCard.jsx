import { VERDICT_LABELS } from '../../../shared/scan';

export default function HUDCard({ type, loading, result, error, expired = false }) {
  const heuristic = result?.engines.find(engine => engine.kind === 'heuristic');
  const model = result?.engines.find(engine => engine.kind === 'model');
  const shadowModel = model?.targets.some(target => target.data?.promoted === false);
  const cards = {
    verdict: { label: 'Assessment', value: loading ? 'Checking sources' : error ? 'Request incomplete' : result ? (expired && result.verdict === 'no_known_threats' ? 'Report expired' : VERDICT_LABELS[result.verdict]) : 'Awaiting a URL', detail: expired ? 'Historical evidence · refresh for current assessment' : 'Evidence-based category, not a probability' },
    coverage: { label: 'Remote coverage', value: result ? `${result.coverage.completed} / ${result.coverage.total} completed` : 'No checks performed', detail: result ? `${result.coverage.pending} pending · ${result.coverage.error + result.coverage.unavailable + result.coverage.unknown} incomplete` : 'Availability is reported for each provider' },
    heuristic: { label: 'URL heuristics', value: heuristic ? (heuristic.status === 'detected' ? 'Review structural signals' : 'No rule triggered') : 'Explainable URL rules', detail: 'Local structural analysis · not trained ML' },
    model: { label: 'Trained XGBoost', value: !model ? 'No inference performed' : shadowModel ? 'Shadow inference only' : model.status === 'detected' ? 'Model warning' : model.status === 'no_detection' ? 'Warning threshold not reached' : 'Inference unavailable', detail: model?.targets[0]?.data?.model_version ? `Model ${model.targets[0].data.model_version} · no safety guarantee` : 'Local inference is separate from reputation coverage' },
    provenance: { label: 'Observation', value: result ? (expired ? 'Expired snapshot' : result.cached ? 'Cached report' : 'Current report') : 'No telemetry collected', detail: result ? new Date(result.observed_at).toLocaleString() : 'Measurements appear only when returned by a source' },
  };
  const card = cards[type];
  if (!card) return null;
  return <div className="rounded-lg glass-panel border border-white/10 p-4 min-w-0 h-full">
    <p className="font-mono text-[10px] tracking-widest uppercase text-violet-300">// {card.label}</p>
    <p className="mt-3 font-bold text-sm text-white break-words">{card.value}</p>
    <p className="mt-2 text-xs text-slate-400 leading-relaxed">{card.detail}</p>
  </div>;
}
