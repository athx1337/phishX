import { isScanReport, VERDICT_LABELS } from '../../../shared/scan';
import CloudflareDeepAnalysis from '../CloudflareDeepAnalysis';
import { useReportExpiry } from '../hooks/use-report-expiry';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Copy, RefreshCw, ShieldAlert } from 'lucide-react';
import { ModelObservation, RegistrationSummary } from './AnalysisExtensions';
import GeminiExplanation from './GeminiExplanation';
import SourceGridInspector from './SourceGridInspector';
import ReportEvidence from './ReportEvidence';
import { reportTime as time } from './report-format';
import './report.css';

const PRESENTATION = {
  malicious: { icon: '✕', recommendation: 'Avoid this URL. Threat evidence was reported by a security source.' },
  suspicious: { icon: '!', recommendation: 'Use caution and verify the destination independently. Do not enter credentials or download files.' },
  no_known_threats: { icon: '○', recommendation: 'Completed checks found no known threat. This is not a guarantee of safety; verify the domain and context.' },
  unknown: { icon: '?', recommendation: 'There is not enough completed evidence to assess this URL. Treat it as unverified.' },
};
const TABS = ['Overview', 'Sources', 'Browser', 'Model & AI'];

export default function ResultsDashboard({ result, resetScan, onRescan, pollError, pollNotice, pollingStopped, expired, completionReason }) {
  const snapshotExpired = useReportExpiry(result);
  const heading = useRef(null);
  const tabs = useRef([]);
  const id = useId();
  const [active, setActive] = useState('Overview');
  const [copyStatus, setCopyStatus] = useState('');
  const [allFindings, setAllFindings] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState(null);
  useEffect(() => { heading.current?.focus(); }, [result?.scan_id]);
  useEffect(() => {
    if (!pendingEvidence || active !== 'Overview') return;
    const element = document.getElementById(`evidence-${encodeURIComponent(pendingEvidence)}`);
    element?.focus(); element?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }, [pendingEvidence, active, allFindings]);
  if (!isScanReport(result)) return <section role="alert" className="glass-panel rounded-lg p-6"><h2>Report unavailable</h2><p>This report has an unsupported format. No safety conclusion can be displayed.</p><button type="button" onClick={resetScan}>Start a new scan</button></section>;
  const isExpired = expired || snapshotExpired;
  const expiredNegative = isExpired && result.verdict === 'no_known_threats';
  const presentation = PRESENTATION[expiredNegative ? 'unknown' : result.verdict];
  const incomplete = result.coverage.total - result.coverage.completed;
  const actualDomain = result.domain.registrable_domain || (result.domain.is_ip ? result.domain.hostname : null);
  const observations = [...result.reasons, ...result.engines.flatMap(engine => [...engine.evidence, ...engine.targets.flatMap(target => target.evidence)])];
  const selected = new Set(result.explanation?.evidence_ids || []);
  const findings = observations.filter((item, index) => (result.reasons.some(reason => reason.id === item.id) || selected.has(item.id)) && observations.findIndex(other => other.id === item.id) === index);
  const visibleFindings = allFindings ? findings : findings.slice(0, 4);
  const partial = completionReason || pollError || (pollingStopped ? 'Report updates stopped. Pending observations remain unverified; the provider may still finish its scan.' : pollNotice);
  const copyDomain = async () => {
    try { await navigator.clipboard.writeText(actualDomain); setCopyStatus('Actual domain copied.'); }
    catch { setCopyStatus('Clipboard unavailable. Select the domain text and copy it manually.'); }
  };
  const evidenceNavigation = evidenceId => { setAllFindings(true); setActive('Overview'); setPendingEvidence(evidenceId); const element = document.getElementById(`evidence-${encodeURIComponent(evidenceId)}`); element?.focus(); };
  const selectTab = index => { setActive(TABS[index]); tabs.current[index]?.focus(); };
  const tabKey = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = TABS.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(next); }
  };
  return <section className="report-workspace" aria-label="URL assessment">
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">Assessment for {actualDomain || result.domain.hostname}: {expiredNegative ? 'Report expired' : VERDICT_LABELS[result.verdict]}. {result.coverage.completed} of {result.coverage.total} remote providers completed.</p>
    <header className="report-toolbar"><p className="report-kicker">Evidence report <span>· {result.cached ? 'Cached snapshot' : 'Current snapshot'} · {time(result.observed_at)}</span></p><div className="report-actions"><button type="button" onClick={onRescan}><RefreshCw size={15} aria-hidden="true" />Refresh report</button><button type="button" onClick={resetScan}>Check another URL <ArrowRight size={15} aria-hidden="true" /></button></div></header>
    {partial && <div className="report-alert" role={pollError && !pollingStopped ? 'alert' : 'status'}><ShieldAlert size={18} aria-hidden="true" /><div><strong>Partial report</strong><p>{partial}</p><p>Refresh to request a fresh assessment.</p></div></div>}
    {isExpired && <div className="report-alert" role="alert"><div><strong>Report expired — refresh to assess current evidence.</strong><p>Historical assessment: {VERDICT_LABELS[result.verdict]}. These observations are retained for context and do not assess the URL now.</p>{['malicious', 'suspicious'].includes(result.verdict) && <p>The previous warning remains visible. Expiry does not establish that the threat has gone away.</p>}</div></div>}
    <div className={`report-summary verdict-${expiredNegative ? 'unknown' : result.verdict}`}>
      <div className="report-verdict"><p className="report-kicker">Recorded assessment</p><h2 ref={heading} tabIndex={-1} data-testid="verdict" className={expiredNegative ? 'text-slate-200' : undefined}><span aria-hidden="true">{presentation.icon} </span>{expiredNegative ? 'Report expired' : VERDICT_LABELS[result.verdict]}</h2><p>{expiredNegative ? 'This historical report cannot assess the URL now. Refresh to obtain current evidence.' : presentation.recommendation}</p><p className="report-muted">{isExpired ? 'Historical summary: ' : ''}{result.summary}</p></div>
      <div className="report-identity"><div className="report-domain-row"><div><p className="report-kicker">Actual registrable domain</p><p data-testid="registrable-domain" className="report-domain">{actualDomain || 'Not established'}</p></div><button type="button" onClick={copyDomain} disabled={!actualDomain} aria-label="Copy actual domain"><Copy size={16} aria-hidden="true" /></button></div><p role="status" aria-live="polite" className="report-muted">{copyStatus}</p><p className="report-mono">{result.url}</p><p className="report-muted">Full hostname: {result.domain.hostname}</p>{result.domain.unicode_hostname !== result.domain.hostname && <p className="report-warning">Unicode display: {result.domain.unicode_hostname}</p>}
      <div className="report-coverage"><strong>{result.coverage.completed} of {result.coverage.total} remote providers completed</strong><p className="report-muted">{result.coverage.pending} pending · {result.coverage.unavailable} unavailable · {result.coverage.error} failed · {result.coverage.unknown} unknown</p><p className="report-muted">{result.coverage.detected} detected · {result.coverage.no_detection} no detection. Local context is separate.</p></div></div>
    </div>
    {incomplete > 0 && <p className="report-coverage-note">Partial analysis: {incomplete} remote {incomplete === 1 ? 'provider has' : 'providers have'} incomplete coverage. Missing evidence does not establish safety.</p>}
    <div className="report-tabs" role="tablist" aria-label="Report sections">{TABS.map((tab, index) => <button key={tab} ref={node => { tabs.current[index] = node; }} type="button" role="tab" aria-label={tab === 'Sources' ? `Sources ${result.engines.length}` : tab} id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === tab} tabIndex={active === tab ? 0 : -1} onClick={() => setActive(tab)} onKeyDown={event => tabKey(event, index)}>{tab}{tab === 'Sources' && <span className="report-tab-count">{result.engines.length}</span>}</button>)}</div>
    <div role="tabpanel" id={`${id}-panel-${TABS.indexOf(active)}`} aria-labelledby={`${id}-tab-${TABS.indexOf(active)}`} className="report-tab-panel">
      {active === 'Overview' && <div className="report-overview"><section className="report-panel report-findings-panel"><div className="report-panel-heading"><h3>Why this assessment</h3><span className="report-muted">{findings.length} recorded findings</span></div>{findings.length ? <ReportEvidence evidence={visibleFindings} anchors /> : <div className="report-empty"><ShieldAlert size={24} aria-hidden="true" /><h4>No specific threat evidence returned</h4><p>Consult source coverage before drawing a conclusion. Missing checks do not establish safety.</p></div>}{findings.length > 4 && <button type="button" className="report-text-button" onClick={() => setAllFindings(!allFindings)}>{allFindings ? 'Show fewer findings' : `Show all findings (${findings.length})`}</button>}<p className="report-muted report-findings-caveat">Derived from recorded evidence. Local URL rules and trained-model predictions are supporting signals; neither independently confirms a diagnosis.</p></section><aside className="report-overview-aside"><GeminiExplanation result={result} expired={isExpired} compact onEvidence={evidenceNavigation} /><RegistrationSummary result={result} /><section className="report-panel"><div className="report-panel-heading"><h3>Requested protocol variants</h3></div><ul className="report-url-list">{result.checked_urls.map(url => <li key={url}>{url}</li>)}</ul><p className="report-muted">Requested scheme: {new URL(result.url).protocol === 'https:' ? 'HTTPS' : 'HTTP'}. The URL scheme alone does not verify a TLS connection or certificate.</p><button type="button" className="report-text-button" onClick={() => selectTab(2)}>Browser & observed destinations ({result.destinations?.length || 0}) <ArrowRight size={14} aria-hidden="true" /></button></section></aside></div>}
      {active === 'Sources' && <><div className="report-section-heading"><h3>Source evidence</h3><p>Inspect a source for every requested target, errors, timestamps and complete observations.</p></div><SourceGridInspector engines={result.engines} registration={result.registration} /></>}
      {active === 'Browser' && <CloudflareDeepAnalysis reports={result.cloudflare_reports} destinations={result.destinations} />}
      {active === 'Model & AI' && <div className="report-overview"><section className="report-panel"><div className="report-panel-heading"><h3>Local model evidence</h3><span className="report-muted">Supporting signal</span></div>{result.engines.filter(engine => engine.kind === 'model').map(engine => <ModelObservation key={engine.id} engine={engine} />)}{!result.engines.some(engine => engine.kind === 'model') && <p>No trained-model observations were included in this report.</p>}</section><GeminiExplanation result={result} expired={isExpired} onEvidence={evidenceNavigation} /></div>}
    </div>
    {TABS.filter(tab => tab !== active).map(tab => <div key={tab} role="tabpanel" hidden id={`${id}-panel-${TABS.indexOf(tab)}`} aria-labelledby={`${id}-tab-${TABS.indexOf(tab)}`} />)}
    <footer className="report-footer">{isExpired ? 'Historical snapshot' : 'Snapshot'} observed {time(result.observed_at)} · expires {time(result.expires_at)} · policy {result.policy_version}. {result.cached ? 'Cached observations retain their original timestamps.' : ''} Completed checks cannot guarantee safety.</footer>
  </section>;
}
