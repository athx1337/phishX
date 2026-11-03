import { isScanReport, VERDICT_LABELS } from '../../../shared/scan';
import CloudflareDeepAnalysis from '../CloudflareDeepAnalysis';
import { useReportExpiry } from '../hooks/use-report-expiry';
import { useEffect, useRef, useState } from 'react';
import AnalysisExtensions, { ModelObservation } from './AnalysisExtensions';

const PRESENTATION = {
  malicious: { border: 'border-red-400/60', background: 'bg-red-500/5', text: 'text-red-300', icon: '✕', recommendation: 'Avoid this URL. Threat evidence was reported by a security source.' },
  suspicious: { border: 'border-amber-400/60', background: 'bg-amber-500/5', text: 'text-amber-200', icon: '!', recommendation: 'Use caution and verify the destination independently. Do not enter credentials or download files.' },
  no_known_threats: { border: 'border-sky-400/50', background: 'bg-sky-500/5', text: 'text-sky-200', icon: '○', recommendation: 'Completed checks found no known threat. This is not a guarantee of safety; verify the domain and context.' },
  unknown: { border: 'border-slate-400/50', background: 'bg-slate-500/5', text: 'text-slate-200', icon: '?', recommendation: 'There is not enough completed evidence to assess this URL. Treat it as unverified.' },
};
const STATUS_LABELS = { detected: 'Evidence found', no_detection: 'No detection', unavailable: 'Unavailable', error: 'Check failed', pending: 'Pending', unknown: 'Unknown / stale' };
const statusColor = status => status === 'detected' ? 'text-amber-200' : status === 'no_detection' ? 'text-sky-200' : 'text-slate-300';
const time = value => new Date(value).toLocaleString();

function EvidenceList({ evidence }) {
  return <ul className="space-y-3">{evidence.map((item, index) => <li key={`${item.id}-${index}`} className="border-l-2 border-violet-400/50 pl-4 space-y-1">
    <p className="text-sm font-semibold text-white">{item.title}</p>
    <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
    <p className="text-xs text-slate-400">{item.source} · {item.threat_type.replaceAll('_', ' ')} · <time dateTime={item.observed_at}>{time(item.observed_at)}</time></p>
  </li>)}</ul>;
}

export default function ResultsDashboard({ result, resetScan, onRescan, polling, pollError, pollNotice, pollingStopped, onCancelPolling, expired }) {
  const snapshotExpired = useReportExpiry(result);
  const heading = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => { heading.current?.focus(); }, [result?.scan_id]);
  if (!isScanReport(result)) return <section role="alert" className="glass-panel rounded-lg p-6"><h2 className="text-xl font-bold">Report unavailable</h2><p className="text-slate-300 mt-2">This report has an unsupported format. No safety conclusion can be displayed.</p><button type="button" onClick={resetScan} className="mt-4 text-violet-300">Start a new scan</button></section>;
  const isExpired = expired || snapshotExpired;
  const expiredNegative = isExpired && result.verdict === 'no_known_threats';
  const presentation = PRESENTATION[expiredNegative ? 'unknown' : result.verdict];
  const incomplete = result.coverage.total - result.coverage.completed;
  const actualDomain = result.domain.registrable_domain || (result.domain.is_ip ? result.domain.hostname : null);
  const copyDomain = async () => {
    try { await navigator.clipboard.writeText(actualDomain); setCopyStatus('Actual domain copied.'); }
    catch { setCopyStatus('Clipboard unavailable. Select the domain text and copy it manually.'); }
  };
  return <section className="space-y-6 min-w-0" aria-label="URL assessment">
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">Assessment for {actualDomain || result.domain.hostname}: {expiredNegative ? 'Report expired' : VERDICT_LABELS[result.verdict]}. {result.coverage.completed} of {result.coverage.total} remote providers completed.</p>
    {isExpired && <div role="alert" className="rounded-lg border border-amber-300/50 bg-amber-300/5 p-5 space-y-2">
      <p className="font-semibold text-amber-200">Report expired — refresh to assess current evidence.</p>
      <p className="text-sm text-slate-200">Historical assessment: {VERDICT_LABELS[result.verdict]}. These observations are retained for context and do not assess the URL now.</p>
      {['malicious', 'suspicious'].includes(result.verdict) && <p className="text-sm text-amber-200">The previous warning remains visible. Expiry does not establish that the threat has gone away.</p>}
    </div>}
    <div className={`rounded-lg border-2 p-5 sm:p-7 ${presentation.border} ${presentation.background}`}>
      <p className="text-xs font-mono tracking-widest text-violet-300 mb-4">// EVIDENCE REPORT {result.cached ? '· CACHED' : ''}</p>
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className={`text-3xl font-bold ${presentation.text}`}>{presentation.icon}</span>
        <div className="min-w-0">
          <h2 ref={heading} tabIndex={-1} data-testid="verdict" className={`font-gothic-block text-3xl sm:text-4xl font-bold leading-tight outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${presentation.text}`}>{expiredNegative ? 'Report expired' : VERDICT_LABELS[result.verdict]}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">{expiredNegative ? 'This historical report cannot assess the URL now. Refresh to obtain current evidence.' : presentation.recommendation}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-300">{isExpired ? 'Historical summary: ' : ''}{result.summary}</p>
    </div>

    <div className="glass-panel rounded-lg p-5 space-y-4">
      <div><h3 className="text-xs text-violet-300 uppercase font-mono tracking-widest">URL being checked</h3><p className="mt-2 font-mono text-xs break-all text-slate-200 select-all">{result.url}</p></div>
      <div className="bg-black/30 p-4 rounded border border-white/10">
        <h3 className="font-semibold text-sm text-white">Actual registrable domain</h3>
        <p data-testid="registrable-domain" className="font-mono mt-2 text-lg text-violet-200 break-all">{result.domain.registrable_domain || (result.domain.is_ip ? result.domain.hostname : 'Not established')}</p>
        <button type="button" disabled={!actualDomain} onClick={copyDomain} className="mt-3 rounded border border-violet-300/50 px-3 py-2 text-sm text-violet-100 hover:bg-white/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300">Copy actual domain</button>
        <p role="status" aria-live="polite" className="mt-2 text-xs text-slate-300">{copyStatus}</p>
        <p className="text-xs text-slate-400 mt-2 break-all">Full hostname: {result.domain.hostname}</p>
        {result.domain.unicode_hostname !== result.domain.hostname && <p className="text-xs text-amber-200 mt-2 break-all">Unicode display: {result.domain.unicode_hostname}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={resetScan} className="px-4 py-2.5 rounded bg-violet-600 hover:bg-violet-500 text-sm font-semibold">Check another URL</button>
        <button type="button" onClick={onRescan} className="px-4 py-2.5 rounded border border-white/20 text-sm hover:bg-white/5">Refresh report</button>
      </div>
    </div>

    <div className="glass-panel rounded-lg p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Why this assessment</h3>
      {result.reasons.length ? <EvidenceList evidence={result.reasons} /> : <p className="text-sm text-slate-300">No specific threat evidence was returned. Consult coverage below before drawing a conclusion.</p>}
      <p className="text-xs text-slate-400">This explanation is derived from recorded evidence. Local URL rules and trained-model predictions are supporting signals; neither independently confirms a diagnosis.</p>
    </div>

    <div className="glass-panel rounded-lg p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Scan coverage</h3>
      {isExpired && <p className="text-sm text-amber-200">Coverage below describes the historical snapshot. Its validity has expired.</p>}
      <p className="text-sm text-slate-200"><strong>{result.coverage.completed} of {result.coverage.total} remote providers completed</strong> across every requested protocol.</p>
      <p className="text-xs text-slate-400">{result.coverage.pending} pending · {result.coverage.unavailable} unavailable · {result.coverage.error} failed · {result.coverage.unknown} unknown. Local heuristics are reported separately and do not count as remote coverage.</p>
      {incomplete > 0 && <p className="text-sm text-amber-200">Partial analysis: {incomplete} remote {incomplete === 1 ? 'provider has' : 'providers have'} incomplete coverage. Missing evidence does not establish safety.</p>}
      <div className="text-xs text-slate-300 space-y-2"><p className="font-semibold">Requested protocol variants</p><ul className="list-disc pl-5 space-y-1">{result.checked_urls.map(url => <li key={url} className="font-mono break-all">{url}</li>)}</ul><p>These are the requested targets. Each source below states whether its check actually completed.</p></div>
      {polling && <div role="status" className="rounded border border-violet-400/30 p-4 space-y-3"><p className="text-sm text-violet-200">Active browser inspection is pending. This report will update when observations are available.</p><button type="button" onClick={onCancelPolling} className="text-sm underline underline-offset-4 text-slate-200">Stop report updates</button></div>}
      {pollNotice && polling && <p role="status" className="text-sm text-amber-200">{pollNotice}</p>}
      {pollError && <p role="alert" className="text-sm text-amber-200">{pollError}</p>}
      {pollingStopped && <p role="status" className="text-sm text-amber-200">Report updates stopped. Pending observations remain unverified; the provider may still finish its scan.</p>}
    </div>

    <AnalysisExtensions result={result} />
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white">Source results</h3>
      {result.engines.map(engine => <details key={engine.id} className="glass-panel rounded-lg border border-white/10">
        <summary className="p-4 cursor-pointer text-sm font-semibold marker:text-violet-400"><span className="inline-flex flex-wrap justify-between gap-2 w-[90%]"><span>{engine.name}</span><span className={statusColor(engine.status)}>{STATUS_LABELS[engine.status]}</span></span></summary>
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-slate-400">{engine.kind === 'heuristic' ? 'Local URL structure rules' : engine.kind === 'model' ? 'Local trained-model inference' : engine.kind === 'active' ? 'Remote browser observation' : 'Reputation source'} · observed {time(engine.observed_at)}</p>
          <ModelObservation engine={engine} />
          {engine.message && <p className="text-sm text-slate-300">{engine.message}</p>}
          {engine.evidence.length > 0 && <EvidenceList evidence={engine.evidence} />}
          <ul className="space-y-3">{engine.targets.map(target => <li key={target.url} className="bg-black/20 p-3 rounded border border-white/5 space-y-2">
            <p className="text-xs font-mono break-all text-slate-300">{target.url}</p>
            <p className={`text-sm font-semibold ${statusColor(target.status)}`}>{STATUS_LABELS[target.status]}</p>
            {target.message && <p className="text-xs text-slate-300">{target.message}</p>}
            {target.error_code && <p className="text-xs font-mono text-slate-400">{target.error_code.replaceAll('_', ' ')}</p>}
            <p className="text-xs text-slate-400">Observed {time(target.observed_at)}{target.expires_at ? ` · expires ${time(target.expires_at)}` : ''}</p>
            {target.evidence.length > 0 && <EvidenceList evidence={target.evidence} />}
          </li>)}</ul>
        </div>
      </details>)}
    </div>

    <details className="glass-panel rounded-lg border border-white/10" open={undefined}>
      <summary className="p-4 cursor-pointer text-lg font-semibold marker:text-violet-400">Technical observations</summary>
      <div className="p-4 pt-0 space-y-5">
        <p className="text-sm text-slate-300">Requested scheme: {new URL(result.url).protocol === 'https:' ? 'HTTPS' : 'HTTP'}. The URL scheme alone does not verify a TLS connection or certificate.</p>
        <div className="text-sm text-slate-300 space-y-1"><h4 className="font-semibold text-white">Domain registration</h4>
          <p>Registrar: {result.whois.registrar || 'Unavailable'}</p><p>Created: {result.whois.creation_date || 'Unavailable'}</p>
          <p className="text-xs text-slate-400">{result.whois.source ? `${result.whois.source}${result.whois.observed_at ? ` · observed ${time(result.whois.observed_at)}` : ''}` : 'No registration source returned usable data.'}</p>
        </div>
        <CloudflareDeepAnalysis reports={result.cloudflare_reports} />
      </div>
    </details>
    <p className="text-xs text-slate-400 leading-relaxed">Report observed <time dateTime={result.observed_at}>{time(result.observed_at)}</time> · expires <time dateTime={result.expires_at}>{time(result.expires_at)}</time> · policy {result.policy_version}. {result.cached ? 'Cached observations retain their original timestamps.' : ''}</p>
  </section>;
}
