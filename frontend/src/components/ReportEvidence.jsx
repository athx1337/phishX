import { reportTime } from './report-format';

export default function ReportEvidence({ evidence, anchors = false }) {
  return <ul className="report-findings">{evidence.map((item, index) => <li key={`${item.id}-${index}`} id={anchors ? `evidence-${encodeURIComponent(item.id)}` : undefined} tabIndex={anchors ? -1 : undefined}>
    <div className="report-finding-title"><span className={`report-signal signal-${item.severity}`} aria-hidden="true" /><h4>{item.title}</h4></div>
    <p>{item.description}</p><p className="report-muted">{item.source} · {item.threat_type.replaceAll('_', ' ')} · {reportTime(item.observed_at)}</p>
    {item.target_url && <p className="report-mono">{item.target_url}</p>}<p className="report-evidence-id">{item.id} · {item.severity}</p>
  </li>)}</ul>;
}
