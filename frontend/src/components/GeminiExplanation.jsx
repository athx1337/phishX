import { explanationStatus } from '../lib/explanation';

export default function GeminiExplanation({ result, expired }) {
  const explanation = result.explanation;
  const selected = new Set(explanation?.evidence_ids || []);
  const observations = [...result.reasons, ...result.engines.flatMap(engine => [
    ...engine.evidence, ...engine.targets.flatMap(target => target.evidence),
  ])];
  const evidence = observations.filter((item, index) => selected.has(item.id) && observations.findIndex(other => other.id === item.id) === index);
  const gemini = explanation?.source === 'gemini';
  return <section className="glass-panel gemini-panel rounded-lg p-5 sm:p-6 space-y-4" aria-label="Gemini AI explanation">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="font-mono text-[10px] tracking-widest uppercase text-violet-300">// Gemini evidence assistant</p><h3 className="text-lg font-semibold text-white mt-2">Gemini AI explanation</h3></div>
      <span className="text-xs text-violet-100 rounded border border-violet-300/30 bg-violet-400/10 px-3 py-2">{explanationStatus(explanation)}</span>
    </div>
    {expired && <p className="text-sm text-amber-200">Historical explanation · refresh the expired report for current evidence.</p>}
    <p className="text-sm text-slate-200 leading-relaxed">{explanation?.text || 'No explanation was included in this report. The recorded findings and provider coverage remain available below.'}</p>
    <p className="text-xs text-slate-300 leading-relaxed">{gemini ? 'Gemini selected recorded observations. Wording is assembled from validated evidence/templates; the model cannot replace the official verdict.' : 'Deterministic explanation from recorded observations. Gemini did not generate this explanation.'}{explanation?.model ? ` Model: ${explanation.model}.` : ''}</p>
    {evidence.length > 0 && <div className="space-y-2"><p className="text-xs font-mono text-violet-200">Referenced evidence</p><ul className="space-y-3">{evidence.map(item => <li key={item.id} className="border-l border-violet-400/40 pl-3 text-sm text-slate-300">{result.reasons.some(reason => reason.id === item.id) ? <a href={`#evidence-${encodeURIComponent(item.id)}`} className="text-violet-200 underline underline-offset-4">{item.title}</a> : <strong className="text-violet-200">{item.title}</strong>}<p className="mt-1 leading-relaxed">{item.description}</p><p className="mt-1 text-xs text-slate-400">{item.source}</p></li>)}</ul></div>}
    <p className="text-xs text-slate-400 leading-relaxed">The assistant uses existing evidence only. It does not browse the destination or independently detect threats.</p>
  </section>;
}
