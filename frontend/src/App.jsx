import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
import { hasSensitiveParameters } from '../../shared/scan';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import URLScanner from './components/URLScanner';
import ResultsDashboard from './components/ResultsDashboard';
import HistoryDrawer from './components/HistoryDrawer';
import Dialog from './components/Dialog';
import HUDCard from './components/HUDCard';
import { useReportExpiry } from './hooks/use-report-expiry';
import { requestScan, pollScan, pingApi } from './lib/api';
import { addToHistory, clearHistory, readHistory, readHistoryPreference, saveHistory, setHistoryPreference } from './lib/history';

const HeroVisual = lazy(() => import('./components/HeroVisual'));

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pollError, setPollError] = useState(null);
  const [pollCancelled, setPollCancelled] = useState(false);
  const [pollRetry, setPollRetry] = useState({ attempt: 0, next: 0, notice: null });
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [rememberHistory, setRememberHistory] = useState(readHistoryPreference);
  const [history, setHistory] = useState(readHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [legal, setLegal] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [visualEnabled, setVisualEnabled] = useState(false);
  const requestController = useRef(null);
  const requestVersion = useRef(0);
  const reduceMotion = useReducedMotion();
  const lowPower = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4;
  const polling = Boolean(result?.deep_scan) && !pollError && !pollCancelled;
  const reportExpired = useReportExpiry(result);

  useEffect(() => {
    const controller = new AbortController();
    pingApi({ signal: controller.signal }).then(() => setServerStatus('awake')).catch(() => {
      if (!controller.signal.aborted) setServerStatus('offline');
    });
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    requestVersion.current += 1;
    requestController.current?.abort();
  }, []);

  const applyReport = useCallback((report) => {
    setResult(report);
    if (rememberHistory) {
      setHistory(previous => {
        const next = addToHistory(previous, report);
        saveHistory(next);
        return next;
      });
    }
  }, [rememberHistory]);

  useEffect(() => {
    if (!polling || !result?.deep_scan) return;
    const job = result.deep_scan;
    const controller = new AbortController();
    const deadline = Date.parse(job.expires_at);
    const deadlineTimer = setTimeout(() => {
      controller.abort();
      setPollError('Active inspection expired. The report below is partial; do not treat missing checks as reassurance.');
    }, Math.max(0, deadline - Date.now()));
    const timer = setTimeout(async () => {
      if (Date.now() >= deadline) {
        setPollError('Active inspection expired. The report below is partial; do not treat missing checks as reassurance.');
        return;
      }
      try {
        const updated = await pollScan(job.poll_path, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (Date.now() >= deadline) {
          setPollError('Active inspection expired before its response arrived. The last report remains partial.');
          return;
        }
        if (updated.scan_id !== result.scan_id || updated.url !== result.url ||
            updated.checked_urls.length !== result.checked_urls.length ||
            updated.checked_urls.some((target, index) => target !== result.checked_urls[index])) {
          throw new Error('The scan service returned a report for a different URL or inspection scope.');
        }
        if (!controller.signal.aborted) {
          setPollRetry({ attempt: 0, next: 0, notice: null });
          applyReport(updated);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          if ([404, 503].includes(err.status) && pollRetry.attempt < 3 && Date.now() + 10000 < deadline) {
            setPollRetry({ attempt: pollRetry.attempt + 1, next: Date.now() + 10000,
              notice: `The active report is temporarily unavailable. Retrying (${pollRetry.attempt + 1}/3); the observations below remain partial.` });
          } else setPollError(`${err.message} The last report remains partial.`);
        }
      }
    }, Math.max(1000, Math.min(Math.max(Date.parse(job.next_poll_at), pollRetry.next), deadline) - Date.now()));
    return () => { clearTimeout(timer); clearTimeout(deadlineTimer); controller.abort(); };
  }, [result, polling, applyReport, pollRetry]);

  const changeUrl = (value) => { setUrl(value); setSensitiveConsent(false); setError(null); };
  const changeRememberHistory = (enabled) => {
    setRememberHistory(enabled);
    setHistoryPreference(enabled);
    if (!enabled) { clearHistory(); setHistory([]); }
  };

  const startScan = async (targetUrl, refresh = false) => {
    if (!targetUrl.trim() || loading) return;
    if (hasSensitiveParameters(targetUrl) && !sensitiveConsent) {
      setError('Please acknowledge the sensitive information warning before submitting this URL.');
      return;
    }
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const version = ++requestVersion.current;
    setLoading(true); setResult(null); setError(null); setPollError(null); setPollCancelled(false);
    setPollRetry({ attempt: 0, next: 0, notice: null });
    try {
      const report = await requestScan({ url: targetUrl, refresh, sensitive_url_consent: sensitiveConsent }, { signal: controller.signal });
      if (!controller.signal.aborted && version === requestVersion.current) {
        applyReport(report);
        setServerStatus('awake');
      }
    } catch (err) {
      if (!controller.signal.aborted && version === requestVersion.current) setError(err.message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const cancelRequest = () => {
    requestVersion.current += 1;
    requestController.current?.abort();
    setLoading(false); setError('Request cancelled. Providers may still finish requests already submitted.');
  };
  const resetScan = () => {
    requestVersion.current += 1;
    requestController.current?.abort();
    setLoading(false); setResult(null); setError(null); setPollError(null); setPollCancelled(false);
    setPollRetry({ attempt: 0, next: 0, notice: null });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#050507] text-[#f5f5f5] flex flex-col font-sans antialiased relative overflow-x-hidden">
        <a href="#main" className="skip-link">Skip to scanner</a>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 purple-glow" />
        <Navbar serverStatus={serverStatus} onHistoryClick={() => setHistoryOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 relative pt-28 pb-16 px-5 sm:px-8">
          <div className="max-w-7xl mx-auto grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
            <div className="min-w-0 space-y-8">
              {!result && <div className="space-y-4">
                <p className="text-violet-400 font-mono text-xs tracking-[0.2em]">/// EVIDENCE BEFORE TRUST</p>
                <h1 className="font-gothic-block text-5xl sm:text-7xl leading-[0.95] font-extrabold tracking-tight">DETECT<br /><span className="phishing-italic normal-case">phishing.</span><br />STAY INFORMED.</h1>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">Understand an unfamiliar URL with explainable URL analysis and independent threat intelligence. See what was found, what was checked, and what remains unknown.</p>
              </div>}
              {!result ? <URLScanner url={url} setUrl={changeUrl} loading={loading} error={error}
                onSubmit={event => { event.preventDefault(); startScan(url); }} onCancel={cancelRequest}
                sensitiveConsent={sensitiveConsent} setSensitiveConsent={setSensitiveConsent}
                rememberHistory={rememberHistory} setRememberHistory={changeRememberHistory} />
                : <><h1 className="sr-only">URL inspection report</h1><ResultsDashboard result={result} resetScan={resetScan} onRescan={() => startScan(result.url, true)}
                  expired={reportExpired}
                  polling={polling} pollError={pollError} pollNotice={pollRetry.notice} pollingStopped={pollCancelled} onCancelPolling={() => setPollCancelled(true)} />
                  {error && <p role="alert" className="text-sm text-red-300">{error}</p>}</>}
            </div>
            <aside aria-label="Scan information" className="space-y-4 lg:sticky lg:top-28 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <HUDCard type="verdict" loading={loading} result={result} error={error} expired={reportExpired} />
                <HUDCard type="coverage" loading={loading} result={result} error={error} expired={reportExpired} />
                <HUDCard type="model" loading={loading} result={result} expired={reportExpired} />
                <HUDCard type="provenance" loading={loading} result={result} expired={reportExpired} />
              </div>
              {!reduceMotion && !lowPower && <div className="hidden lg:block rounded-lg border border-white/5 min-h-20 overflow-hidden">
                {visualEnabled ? <Suspense fallback={<p className="p-6 text-xs text-slate-400">Loading optional visualization…</p>}><div className="h-80" aria-hidden="true"><HeroVisual /></div></Suspense>
                  : <button type="button" onClick={() => setVisualEnabled(true)} className="w-full p-6 text-xs text-violet-300 hover:bg-white/5">Enable decorative 3D visualization</button>}
              </div>}
              <p className="text-xs leading-relaxed text-slate-400 px-1">A report is a snapshot of available evidence. Newly created attacks and cloaked content can evade checks. No result guarantees that a website is safe.</p>
            </aside>
          </div>
        </main>
        <Footer onLegalClick={setLegal} />
        <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} history={history}
          onClear={() => { clearHistory(); setHistory([]); }} rememberHistory={rememberHistory} onRememberChange={changeRememberHistory} />
        <Dialog open={Boolean(legal)} onClose={() => setLegal(null)} title={legal === 'privacy' ? 'Privacy and data sharing' : 'Terms and limitations'}>
          {legal === 'privacy' ? <div className="space-y-4 text-sm leading-relaxed text-slate-300">
            <p>Submitting a URL shares its address, including its path and query parameters, with the configured Google Safe Browsing, URLhaus, VirusTotal and Cloudflare services. Registration lookups send the domain name to its RDAP registry, discovered through IANA. These providers apply their own retention policies.</p>
            <p>Cloudflare active scans are requested as unlisted. Unlisted reports are accessible to anyone who knows their report ID; this does not mean private or immediately deleted.</p>
            <p>When configured, the backend keeps short-lived scan jobs and cached reports with observation and expiry times. Provider requests already submitted cannot be recalled when you cancel the browser request.</p>
            <p>History is off by default. Enabling it saves up to 50 redacted summaries on this device for seven days. Query values and fragments are omitted; a sensitive value embedded in a path may still be present. You can clear history or turn it off at any time.</p>
            <p>Do not submit confidential or single-use links. The sensitive-parameter warning is a convenience and cannot recognize every secret.</p>
          </div> : <div className="space-y-4 text-sm leading-relaxed text-slate-300">
            <p>phishX is an educational URL analysis tool. Its official outcomes are malicious, suspicious, no known threats detected, and unable to determine.</p>
            <p>URL heuristics and the trained XGBoost URL model are separate local evidence sources. A model output is not the probability that visiting a URL is safe. Missing, stale, failed and pending checks do not establish trust. No-known-threats describes available observations and is not permission to visit a URL.</p>
            <p>Use independent judgment and established security controls. The operator cannot guarantee detection of new threats or third-party service availability.</p>
          </div>}
        </Dialog>
      </div>
    </MotionConfig>
  );
}

export default App;
