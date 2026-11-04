import { useId, useState } from 'react';
import { DestinationAssessments } from './components/AnalysisExtensions';
import ReportEvidence from './components/ReportEvidence';
import { reportTime as time } from './components/report-format';

const VIEWS = ['Navigation', 'Certificates', 'HTTP transactions', 'Reported risks', 'Observed links'];
export default function CloudflareDeepAnalysis({ reports = [], destinations = [] }) {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState('Navigation');
  const id = useId();
  const report = reports[index] || reports[0];
  const counts = report ? [report.redirect_chain?.length || 0, report.certificates.length, report.requests.length, report.risks.length, report.links.length] : [];
  return <section className="report-panel report-browser" aria-label="Active browser observations">
    <div className="report-panel-heading"><h3>Browser observations</h3><span className="report-muted">Remote · Cloudflare URL Scanner</span></div>
    {!report ? <div><h4>Active browser observations unavailable</h4><p>No completed Cloudflare browser report is available. IP address, certificates, redirects and transactions have not been established by this report.</p></div> : <>
      <label htmlFor={`${id}-target`}>Requested browser target</label><select id={`${id}-target`} value={index} onChange={event => setIndex(Number(event.target.value))}>{reports.map((item, i) => <option key={item.url} value={i}>{item.url}</option>)}</select>
      <p className="report-muted">{report.source} · observed {time(report.observed_at)}</p>
      <dl className="report-browser-facts report-facts"><div><dt>IP address</dt><dd>{report.ip || 'Not reported'}</dd></div><div><dt>ASN</dt><dd>{report.asn || 'Not reported'}</dd></div><div><dt>Server country</dt><dd>{report.country || 'Not reported'}</dd></div><div><dt>Final observed URL</dt><dd className="report-mono">{report.final_url || 'Not reported'}</dd></div></dl>
      <label htmlFor={`${id}-view`}>Observation view</label><select id={`${id}-view`} value={view} onChange={event => setView(event.target.value)}>{VIEWS.map((name, i) => <option key={name} value={name}>{name} ({counts[i]})</option>)}</select>
      <div className="report-browser-content">
        <h4>{view}</h4>
        {view === 'Navigation' && <><ol className="report-url-list">{report.redirect_chain?.length ? report.redirect_chain.map((url, i) => <li key={`${url}-${i}`}>{url}</li>) : <li>No redirect chain returned.</li>}</ol><p className="report-muted">Observed browser navigation only. Reputation checks for discovered destinations are listed separately.</p></>}
        {view === 'Certificates' && <><p className="report-muted">Certificate observations do not establish that a site is trustworthy.</p>{!report.certificates.length ? <p>No certificate data returned.</p> : <div className="report-table-scroll" role="region" aria-label="Certificate observations" tabIndex={0}><table><thead><tr><th>Subject</th><th>Issuer</th><th>Issued</th><th>Expires</th></tr></thead><tbody>{report.certificates.map((cert, i) => <tr key={i}><td>{cert.subject || 'Not reported'}</td><td>{cert.issuer || 'Not reported'}</td><td>{time(cert.valid_from)}</td><td>{time(cert.valid_to)}</td></tr>)}</tbody></table></div>}</>}
        {view === 'HTTP transactions' && (!report.requests.length ? <p>No transaction data returned.</p> : <div className="report-table-scroll" role="region" aria-label="HTTP transactions" tabIndex={0}><table><thead><tr><th>URL</th><th>Method</th><th>HTTP status</th><th>IP</th></tr></thead><tbody>{report.requests.map((request, i) => <tr key={i}><td className="report-mono">{request.url}</td><td>{request.method || 'Not reported'}</td><td>{request.status ?? 'Not reported'}</td><td>{request.ip || 'Not reported'}</td></tr>)}</tbody></table></div>)}
        {view === 'Reported risks' && (report.risks.length ? <ReportEvidence evidence={report.risks} /> : <p>The source returned no risk observations in this completed report. This is not a guarantee that no threats exist.</p>)}
        {view === 'Observed links' && <><p className="report-muted">Addresses are shown as text to avoid accidentally opening an untrusted destination.</p>{report.links.length ? <ul className="report-url-list">{report.links.map((link, i) => <li key={`${link}-${i}`}>{link}</li>)}</ul> : <p>No observed links returned.</p>}</>}
      </div>
    </>}
    {view === 'Navigation' && <DestinationAssessments destinations={destinations} />}
  </section>;
}
