import { useState } from 'react';
import { ArrowUpRight, Database, Globe, BrainCircuit, ScanLine } from 'lucide-react';
import Dialog from './Dialog';
import ModelObservation from './ReportModel';
import ReportEvidence from './ReportEvidence';
import { STATUS_LABELS, engineKind, reportTime } from './report-format';

export function SourceDetails({ engine, registration }) {
  return <div className="report-inspector">
    <p className="report-kicker">{engineKind(engine)} · {STATUS_LABELS[engine.status]}</p>
    <p>{engine.message || 'No source summary was returned.'}</p>
    <p className="report-muted">Observed {reportTime(engine.observed_at)}</p>
    {engine.error_code && <p className="report-mono">{engine.error_code}</p>}
    <ModelObservation engine={engine} />
    {registration && <dl className="report-facts">{Object.entries(registration).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value == null ? 'Not reported' : String(value)}</dd></div>)}</dl>}
    {engine.evidence.length > 0 && <ReportEvidence evidence={engine.evidence} />}
    <h3>Requested targets ({engine.targets.length})</h3>
    {engine.targets.map(target => <section key={target.url} className="report-target">
      <p className="report-mono">{target.url}</p><strong>{STATUS_LABELS[target.status]}</strong>
      {target.message && <p>{target.message}</p>}{target.error_code && <p className="report-mono">{target.error_code}</p>}
      <p className="report-muted">Observed {reportTime(target.observed_at)} · expires {reportTime(target.expires_at)}</p>
      {target.evidence.length > 0 && <ReportEvidence evidence={target.evidence} />}
      {target.data && Object.keys(target.data).length > 0 && <details><summary>Complete source data</summary><pre className="report-data">{JSON.stringify(target.data, null, 2)}</pre></details>}
    </section>)}
  </div>;
}

export default function SourceGridInspector({ engines, registration }) {
  const [selected, setSelected] = useState(null);
  return <><div className="report-source-grid">{engines.map(engine => {
    const Icon = engine.kind === 'model' ? BrainCircuit : engine.kind === 'active' ? Globe : engine.kind === 'heuristic' ? ScanLine : Database;
    return <button key={engine.id} type="button" className="report-source" onClick={() => setSelected(engine)} aria-haspopup="dialog">
      <span className="report-source-top"><Icon size={18} aria-hidden="true" /><span className={`report-status status-${engine.status}`}>{STATUS_LABELS[engine.status]}</span></span>
      <strong>{engine.name}</strong><span className="report-muted">{engineKind(engine)}</span>
      <span className="report-source-summary">{engine.message || engine.targets.find(target => target.message)?.message || (engine.evidence.length ? `${engine.evidence.length} recorded observations` : 'No additional source summary returned.')}</span>
      <span className="report-source-action">Inspect evidence <ArrowUpRight size={14} aria-hidden="true" /></span>
    </button>;
  })}</div><Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Source evidence'}>{selected && <div className="report-workspace"><SourceDetails engine={selected} registration={engineKind(selected) === 'Registration context' ? registration : undefined} /></div>}</Dialog></>;
}
