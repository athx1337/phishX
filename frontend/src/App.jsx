import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { MotionConfig } from 'motion/react';
import { hasSensitiveParameters } from '../../shared/scan';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import URLScanner from './components/URLScanner';
import ResultsDashboard from './components/ResultsDashboard';
import ScanProgress from './components/ScanProgress';
import HistoryDrawer from './components/HistoryDrawer';
import Dialog from './components/Dialog';
import HUDCard from './components/HUDCard';
import HeroHeading from './components/HeroHeading';
import { useReportExpiry } from './hooks/use-report-expiry';
import { useScanSession } from './hooks/use-scan-session';
import { pingApi } from './lib/api';
import { addToHistory, clearHistory, readHistory, readHistoryPreference, saveHistory, setHistoryPreference } from './lib/history';

const HeroVisual = lazy(() => import('./components/HeroVisual'));
const ChromaWaves = lazy(() => import('./components/ui/chroma-waves'));
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange) {
  const query = window.matchMedia?.(reducedMotionQuery);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return window.matchMedia?.(reducedMotionQuery).matches ?? false;
}

function App() {
  const [url, setUrl] = useState('');
  const [sensitiveConsent, setSensitiveConsent] = useState(false);
  const [geminiAssessment, setGeminiAssessment] = useState(false);
  const [rememberHistory, setRememberHistory] = useState(readHistoryPreference);
  const [history, setHistory] = useState(readHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [legal, setLegal] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const reduceMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const lowPower = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4;
  const animateVisuals = !reduceMotion && !lowPower && !navigator.connection?.saveData;
  const rememberReport = useCallback(report => {
    if (rememberHistory) setHistory(previous => { const next = addToHistory(previous, report); saveHistory(next); return next; });
  }, [rememberHistory]);
  const session = useScanSession(rememberReport);
  const result = session.report;
  const reportExpired = useReportExpiry(result);

  useEffect(() => {
    const controller = new AbortController();
    pingApi({ signal: controller.signal }).then(() => setServerStatus('awake')).catch(() => { if (!controller.signal.aborted) setServerStatus('offline'); });
    return () => controller.abort();
  }, []);

  const changeUrl = value => { setUrl(value); setSensitiveConsent(false); session.setError(null); };
  const changeRememberHistory = enabled => {
    setRememberHistory(enabled); setHistoryPreference(enabled);
    if (!enabled) { clearHistory(); setHistory([]); }
  };
  const startScan = async (targetUrl, refresh = false) => {
    if (hasSensitiveParameters(targetUrl) && !sensitiveConsent) {
      session.setError('Please acknowledge the sensitive information warning before submitting this URL.'); return;
    }
    const accepted = await session.start(targetUrl, { refresh, sensitiveConsent, geminiAssessment });
    if (accepted) setServerStatus('awake');
  };

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
      <div className="min-h-screen bg-[#050507] text-[#f5f5f5] flex flex-col font-sans antialiased relative overflow-x-hidden" data-motion={animateVisuals ? 'running' : 'paused'}>
        <a href="#main" className="skip-link">Skip to scanner</a>
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 opacity-[0.45]">
          <Suspense fallback={<div className="chroma-waves w-full h-full" />}><ChromaWaves color="#ffffff" backgroundColor="#130826" waveFrequency={0.2} waveAmplitude={0.8} distortion={1.2} chromaShift={0.5} noiseLevel={0.06} speed={0.15} quality="low" animated={animateVisuals} /></Suspense>
        </div>
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 original-vignette" />
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 purple-glow z-0" />
        <Navbar serverStatus={serverStatus} onHistoryClick={() => setHistoryOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 relative z-10 pt-32 pb-16 px-6">
          {session.running ? <ScanProgress snapshot={session.snapshot} startedAt={session.startedAt} submittedUrl={session.submittedUrl} geminiRequested={geminiAssessment}
            nextPollAt={session.snapshot?.deep_scan ? Math.max(Date.parse(session.snapshot.deep_scan.next_poll_at), session.retry.next) : null}
            deadline={session.deadline} notice={session.retry.notice} onCancel={session.cancel} onShowPartial={session.showPartial} />
          : result ? <div className="max-w-7xl mx-auto w-full"><h1 className="sr-only">URL inspection report</h1>
              <ResultsDashboard result={result} resetScan={session.reset} onRescan={() => startScan(result.url, true)} expired={reportExpired}
                completionReason={session.completionReason} polling={false} pollError={session.completionReason} pollingStopped={session.stopped} />
            </div>
          : <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
              <div className="lg:col-span-7 min-w-0 space-y-8"><HeroHeading animated={animateVisuals} />
                <div className="max-w-xl"><URLScanner url={url} setUrl={changeUrl} loading={false} error={session.error}
                  onSubmit={event => { event.preventDefault(); startScan(url); }} onCancel={session.cancel}
                  sensitiveConsent={sensitiveConsent} setSensitiveConsent={setSensitiveConsent}
                  rememberHistory={rememberHistory} setRememberHistory={changeRememberHistory}
                  geminiAssessment={geminiAssessment} setGeminiAssessment={setGeminiAssessment} /></div>
              </div>
              <aside aria-label="Scan information" className="lg:col-span-5 min-w-0 w-full space-y-5">
                <div className="hud-composition relative w-full"><div className="hud-visual"><Suspense fallback={<div className="ascii-static" aria-hidden="true">X</div>}><HeroVisual animated={animateVisuals} /></Suspense></div>
                  <div className="hud-position hud-assessment"><HUDCard type="verdict" /></div>
                  <div className="hud-position hud-coverage"><HUDCard type="coverage" /></div>
                  <div className="hud-position hud-model"><HUDCard type="model" /></div>
                  <div className="hud-position hud-gemini"><HUDCard type="gemini" /></div>
                </div>
                {(reduceMotion || lowPower || navigator.connection?.saveData) && <p className="text-xs text-slate-300">Static presentation follows your device or reduced motion preference.</p>}
                <p className="text-xs leading-relaxed text-slate-300">A report is a snapshot of available evidence. Newly created attacks and cloaked content can evade checks. No result guarantees that a website is safe.</p>
              </aside>
            </div>}
        </main>
        <Footer onLegalClick={setLegal} />
        <HistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} history={history}
          onClear={() => { clearHistory(); setHistory([]); }} rememberHistory={rememberHistory} onRememberChange={changeRememberHistory} />
        <Dialog open={Boolean(legal)} onClose={() => setLegal(null)} title={legal === 'privacy' ? 'Privacy and data sharing' : 'Terms and limitations'}>
          {legal === 'privacy' ? <div className="space-y-4 text-sm leading-relaxed text-slate-300">
            <p>Submitting a URL shares its address, including its path and query parameters, with the configured Google Safe Browsing, URLhaus, VirusTotal and Cloudflare services. Registration lookups send the domain name to its RDAP registry, discovered through IANA. These providers apply their own retention policies.</p>
            <p>Cloudflare active scans are requested as unlisted. Unlisted reports are accessible to anyone who knows their report ID; this does not mean private or immediately deleted.</p>
            <p>The evidence explanation sends Gemini a compact verdict, recorded observation titles and severity, and provider coverage/status. If you enable independent Gemini URL review, Google also receives the hostname, registrable domain, and derived path traits such as depth and presence of login terms. Raw path, query, fragment, and page content are excluded. Sensitive URLs skip the independent review. Its probabilistic warning can raise caution; a threat confirmation requires separate evidence.</p>
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
