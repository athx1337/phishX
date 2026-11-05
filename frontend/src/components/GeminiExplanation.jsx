import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { explanationStatus } from '../lib/explanation';

export default function GeminiExplanation({ result, expired, compact = false, onEvidence }) {
  const [expanded, setExpanded] = useState(false);
  const explanation = result.explanation;
  const selected = new Set(explanation?.evidence_ids || []);
  const observations = [...result.reasons, ...result.engines.flatMap(engine => [...engine.evidence, ...engine.targets.flatMap(target => target.evidence)])];
  const evidence = observations.filter((item, index) => selected.has(item.id) && observations.findIndex(other => other.id === item.id) === index);
  const gemini = explanation?.source === 'gemini';
  const independent = result.engines.some(engine => engine.id === 'gemini-url');
  const text = explanation?.text || 'No explanation was included in this report. The recorded findings and provider coverage remain available.';
  const collapsed = compact && !expanded && text.length > 260;
  return <section className="report-panel report-assistant" aria-label="Gemini AI explanation">
    <div className="report-panel-heading"><h3><Sparkles size={16} aria-hidden="true" /> {independent ? 'Recorded explanation' : 'Gemini assistant'}</h3><span className="report-status">{independent ? 'Evidence summary' : explanationStatus(explanation)}</span></div>
    {expired && <p className="report-warning">Historical explanation · refresh the expired report for current evidence.</p>}
    <p className="report-assistant-text">{collapsed ? `${text.slice(0, 260)}…` : text}</p>
    {compact && (text.length > 260 || evidence.length > 2) && <button type="button" className="report-text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Show concise explanation' : text.length > 260 ? 'Read full explanation' : 'Show all referenced evidence'}</button>}
    <p className="report-muted">{gemini ? 'Gemini selected recorded observations. Wording is assembled from validated evidence/templates; the model cannot replace the official verdict.' : 'Deterministic explanation from recorded observations. Gemini did not generate this explanation.'}{explanation?.model ? ` Model: ${explanation.model}.` : ''}</p>
    {evidence.length > 0 && <div className="report-references"><p className="report-kicker">Referenced evidence</p>{(compact && !expanded ? evidence.slice(0, 2) : evidence).map(item => <a key={item.id} href={`#evidence-${encodeURIComponent(item.id)}`} onClick={event => { if (onEvidence) { event.preventDefault(); onEvidence(item.id); } }}>{item.title}</a>)}</div>}
    {!compact && <p className="report-muted">The assistant uses existing evidence only. It does not browse the destination or independently detect threats.</p>}
  </section>;
}
