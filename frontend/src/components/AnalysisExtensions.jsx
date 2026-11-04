import { useId, useState } from 'react';
import { VERDICT_LABELS } from '../../../shared/scan';
import ReportEvidence from './ReportEvidence';
import { reportTime as time } from './report-format';
import SourceGridInspector from './SourceGridInspector';

export { default as ModelObservation } from './ReportModel';

export function RegistrationSummary({ result }) {
  const info = result.registration;
  return <section className="report-panel" aria-label="Registration evidence"><div className="report-panel-heading"><h3>Domain registration</h3><span className="report-muted">Supporting context</span></div>
    <dl className="report-facts"><div><dt>Registrar</dt><dd>{info?.registrar || result.whois.registrar || 'Unavailable'}</dd></div><div><dt>Created</dt><dd>{info?.created_at ? time(info.created_at) : result.whois.creation_date || 'Unavailable'}</dd></div><div><dt>Observed domain age</dt><dd>{typeof info?.age_days === 'number' ? `${info.age_days} days` : 'Unavailable'}</dd></div><div><dt>Source</dt><dd>{info?.source || result.whois.source || 'Unavailable'}</dd></div></dl>
    <p className="report-muted">{info ? `${info.status} · observed ${time(info.observed_at)}.` : result.whois.observed_at ? `Observed ${time(result.whois.observed_at)}.` : 'No registration source returned usable data.'} Domain age alone does not establish trust.</p>
    {info?.error_code && <p className="report-mono">{info.error_code}</p>}
  </section>;
}

export function DestinationAssessments({ destinations = [] }) {
  const [index, setIndex] = useState(0);
  const id = useId();
  const destination = destinations[index] || destinations[0];
  if (!destination) return <p className="report-muted">No separately assessed destinations were returned.</p>;
  return <section className="report-destinations" aria-label="Observed destination assessments"><h3>Observed destination assessments</h3>
    <label htmlFor={id}>Observed destination ({destinations.length})</label><select id={id} value={index} onChange={event => setIndex(Number(event.target.value))}>{destinations.map((item, i) => <option key={item.url} value={i}>{item.url}</option>)}</select>
    <div className="report-target"><strong>{VERDICT_LABELS[destination.verdict]}</strong><p className="report-mono">{destination.url}</p><p>Actual domain: <strong>{destination.domain.registrable_domain || destination.domain.hostname}</strong></p><p className="report-muted">Full hostname: {destination.domain.hostname} · Unicode: {destination.domain.unicode_hostname} · IP address: {destination.domain.is_ip ? 'Yes' : 'No'}</p><p>{destination.summary}</p>
    <p>{destination.coverage.completed} of {destination.coverage.total} remote providers completed.</p><p className="report-muted">{destination.coverage.pending} pending · {destination.coverage.unavailable} unavailable · {destination.coverage.error} failed · {destination.coverage.unknown} unknown · {destination.coverage.detected} detected · {destination.coverage.no_detection} no detection · {destination.coverage.sufficient ? 'Sufficient' : 'Insufficient'} coverage</p>
    <ReportEvidence evidence={destination.reasons} /><p className="report-muted">Observed {time(destination.observed_at)} · expires {time(destination.expires_at)}</p></div>
    <SourceGridInspector engines={destination.engines} />
  </section>;
}

export default function AnalysisExtensions({ result }) { return <><RegistrationSummary result={result} /><DestinationAssessments destinations={result.destinations} /></>; }
