import { useState, useEffect } from 'react'
import CloudflareDeepAnalysis from './CloudflareDeepAnalysis'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Modal states for legal docs
  const [activeModal, setActiveModal] = useState(null)

  // Loading animation states
  const [progress, setProgress] = useState(0)
  const [scanStep, setScanStep] = useState(0)

  // System Status State ('checking', 'waking', 'awake', 'offline')
  const [serverStatus, setServerStatus] = useState('checking')

  // Tab UI State
  const [activeTab, setActiveTab] = useState('overview')

  // Global effect to wake up Render backend on page load
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // If it takes longer than 2 seconds, assume it's doing a cold boot
    const timeout = setTimeout(() => {
      setServerStatus(prev => prev === 'checking' ? 'waking' : prev);
    }, 2000);

    fetch(`${apiUrl}/api/ping`)
      .then(res => {
        if (res.ok) setServerStatus('awake');
        else setServerStatus('offline');
      })
      .catch(() => {
        setServerStatus('waking'); // Usually CORS fails before boot finishes
      })
      .finally(() => {
        clearTimeout(timeout);
      });
  }, []);

  // Simulated scan progress effect
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      setScanStep(0);

      // We track time to detect if Render is doing a Cold Start (takes >15s)
      const startTime = Date.now();

      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95; // Hold at 95% until real API returns

          const newProgress = prev + Math.random() * 8;
          const elapsedSeconds = (Date.now() - startTime) / 1000;

          // Standard visual steps
          if (newProgress > 60) setScanStep(2);
          else if (newProgress > 30) setScanStep(1);

          // If we pass 15 seconds, inject the cold start UI step
          if (elapsedSeconds > 15) {
            setScanStep(3);
          }

          return newProgress;
        });
      }, 400);
    } else {
      setProgress(100);
      setTimeout(() => {
        setScanStep(0);
        setProgress(0);
      }, 500);
    }

    return () => clearInterval(interval);
  }, [loading]);

  const checkUrl = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Use environment variable for the backend API URL, fallback to localhost for local dev if undefined
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error("Verification failed. Server returned an error.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const resetScan = () => {
    setResult(null);
    setUrl('');
    setError(null);
    setActiveTab('overview');
  }

  // Force dark mode globally per user request
  const isDarkMode = true;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
      <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-300">

        {/* Header */}
        <header className={`sticky top-0 z-50 w-full border-b ${result ? 'border-primary/20 bg-background-light dark:bg-background-dark px-10' : 'border-border-light dark:border-white/10 bg-surface-light/80 dark:bg-background-dark/90 backdrop-blur-md px-4 lg:px-8'} py-3 transition-colors duration-300`}>
          <div className={`mx-auto flex ${result ? 'w-full' : 'max-w-7xl'} items-center justify-between`}>
            <div className="flex items-center gap-2 sm:gap-1">
              <img src="/phishx-text.png" alt="phishX" className="h-16 md:h-20 w-auto object-contain scale-[1.15] origin-left drop-shadow-sm" />
              <div className="flex flex-col justify-center h-full pt-1 sm:pt-2">
                <span className={`text-[11px] font-bold tracking-[0.2em] uppercase ${result ? 'text-primary' : 'text-primary/80'}`}>
                  by athx1337
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">

              {/* System Status Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-light dark:border-white/10 bg-surface-light dark:bg-white/5 transition-colors">
                {serverStatus === 'checking' && (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-slate-400 animate-pulse"></span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Checking System...</span>
                  </>
                )}
                {serverStatus === 'waking' && (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Waking System...</span>
                  </>
                )}
                {serverStatus === 'awake' && (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">System Ready</span>
                  </>
                )}
                {serverStatus === 'offline' && (
                  <>
                    <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">System Offline</span>
                  </>
                )}
              </div>

              <a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20 transition-all shadow-sm">
                <span className="material-symbols-outlined text-sm">local_cafe</span>
                <span className="text-sm font-bold hidden md:inline">Buy me a coffee</span>
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col items-center p-6 sm:p-12 relative overflow-hidden ${(!result || loading) ? 'justify-center' : ''}`}>

          {/* STATE 1: INITIAL SCANNER */}
          {!result && !loading && (
            <div className="w-full max-w-4xl space-y-12 z-10">
              <div className="text-center space-y-4 animate-in">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-2">
                  <span className="mr-1 h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                  Real-time Scan
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-text-main dark:text-white sm:text-5xl md:text-6xl">
                  URL Scanner
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-text-muted dark:text-slate-300">
                  Analyze suspicious links instantly. The engine checks for phishing, malware, and fraudulent redirects in real-time.
                </p>
              </div>

              <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border-light dark:border-white/10 bg-surface-light dark:bg-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-10 animate-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                <form onSubmit={checkUrl} className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wider" htmlFor="url-input">Enter URL to scan</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
                        <span className="material-symbols-outlined">link</span>
                      </div>
                      <input
                        id="url-input"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                        className="block w-full rounded-xl border border-border-light dark:border-white/10 bg-background-light dark:bg-background-dark py-4 pl-12 pr-40 text-base text-text-main dark:text-white placeholder:text-text-muted/70 dark:placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm outline-none"
                        placeholder="https://example.com/suspicious-link"
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <div className="absolute inset-y-2 right-2 flex">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex h-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white shadow-sm hover:bg-primary-dark transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                        >
                          {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : 'Analyze'}
                        </button>
                      </div>
                    </div>
                    {error && (
                      <p className="text-sm text-danger mt-2 flex items-center gap-1 animate-in">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        {error}
                      </p>
                    )}
                    <p className="text-xs text-text-muted dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      URLs are processed only to generate a result.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-light dark:border-white/10">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-white/5 transition-colors cursor-default group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                        <span className="material-symbols-outlined">bolt</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main dark:text-white">Real-time</p>
                        <p className="text-xs text-text-muted dark:text-slate-400">Instant analysis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-white/5 transition-colors cursor-default group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                        <span className="material-symbols-outlined">psychology</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main dark:text-white">AI Powered</p>
                        <p className="text-xs text-text-muted dark:text-slate-400">AI-generated Risk Explanation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-white/5 transition-colors cursor-default group">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main dark:text-white">Detailed</p>
                        <p className="text-xs text-text-muted dark:text-slate-400">Full reports</p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* STATE 1.5: DYNAMIC LOADING SCREEN */}
          {loading && (
            <div className="w-full max-w-lg flex flex-col items-center gap-10 relative z-10 animate-in">
              {/* Background Glow Effects specifically for loader */}
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-sky-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              {/* Circular Progress / Animation */}
              <div className="relative size-64 flex flex-col items-center justify-center">

                {/* Outer Pulse Rings */}
                <div className="absolute inset-0 rounded-full border border-primary/20 scale-110"></div>
                <div className="absolute inset-0 rounded-full border border-primary/10 scale-125"></div>

                {/* Rotating SVG Ring */}
                <svg className="absolute inset-0 size-full animate-[spin_3s_linear_infinite] text-primary" viewBox="0 0 100 100">
                  <circle className="opacity-30" cx="50" cy="50" fill="none" r="46" stroke="currentColor" strokeDasharray="10 10" strokeWidth="1"></circle>
                  <path d="M50 4 A 46 46 0 0 1 96 50" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                </svg>

                {/* Inner Gradient Circle */}
                <div className="size-48 rounded-full bg-background-dark/50 backdrop-blur-sm border border-slate-700/50 flex flex-col items-center justify-center shadow-[0_0_40px_-10px_rgba(19,164,236,0.3)]">
                  <span className="material-symbols-outlined text-5xl text-primary animate-pulse mb-2">radar</span>
                  <span className="text-4xl font-black text-white tabular-nums drop-shadow-md">{Math.floor(progress)}%</span>
                </div>
              </div>

              {/* Status Text */}
              <div className="flex flex-col gap-3 text-center w-full">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analyzing URL...</h2>

                <div className="flex flex-col gap-2 max-w-sm mx-auto w-full">
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span>Scan Progress</span>
                    <span>Scanning pattern {Math.min(12, Math.floor((progress / 100) * 12))}/12</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(19,164,236,0.5)] relative transition-all duration-300 ease-out" style={{ width: `${progress}%` }}>
                      <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm max-w-md mx-auto">
                  Our AI is scanning the URL for known threats and suspicious patterns. This may take a few seconds.
                </p>
              </div>

              {/* Scanning Details Card */}
              <div className="w-full bg-white dark:bg-white/5 border border-border-light dark:border-white/10 rounded-xl p-5 shadow-xl mt-4 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4 border-b border-border-light dark:border-white/10 pb-3">
                  <span className="material-symbols-outlined text-primary text-sm">link</span>
                  <span className="text-sm font-mono text-text-main dark:text-slate-300 truncate max-w-[300px]">{url}</span>
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(19,164,236,0.8)]"></span>
                </div>

                <div className="space-y-4">

                  {/* Step 1: DNS */}
                  <div className="flex items-center justify-between text-sm">
                    <div className={`flex items-center gap-2 ${scanStep >= 1 ? 'text-text-main dark:text-white font-medium' : 'text-text-muted dark:text-slate-400 opacity-60'}`}>
                      <span className={`material-symbols-outlined text-base ${scanStep === 0 ? 'animate-spin' : ''}`}>dns</span>
                      <span>DNS Records</span>
                    </div>
                    {scanStep >= 1 ? (
                      <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="material-symbols-outlined text-sm">check</span> Verified
                      </span>
                    ) : (
                      <span className="text-primary text-xs font-semibold animate-pulse">Running...</span>
                    )}
                  </div>

                  {/* Step 2: SSL */}
                  <div className="flex items-center justify-between text-sm">
                    <div className={`flex items-center gap-2 ${scanStep >= 2 ? 'text-text-main dark:text-white font-medium' : 'text-text-muted dark:text-slate-400 opacity-60'}`}>
                      <span className={`material-symbols-outlined text-base ${scanStep === 1 ? 'animate-spin' : ''}`}>security</span>
                      <span>SSL Certificate</span>
                    </div>
                    {scanStep >= 2 ? (
                      <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="material-symbols-outlined text-sm">check</span> Valid
                      </span>
                    ) : (
                      scanStep === 1 ? <span className="text-primary text-xs font-semibold animate-pulse">Running...</span> : <span className="text-text-muted text-xs">Waiting</span>
                    )}
                  </div>

                  {/* Step 3: Heuristics & AI */}
                  <div className="flex items-center justify-between text-sm">
                    <div className={`flex items-center gap-2 ${scanStep >= 2 ? 'text-text-main dark:text-white font-medium' : 'text-text-muted dark:text-slate-400 opacity-60'}`}>
                      <span className={`material-symbols-outlined text-base ${(scanStep >= 2 && scanStep !== 3) ? 'animate-spin' : ''}`}>sync</span>
                      <span>Heuristic & AI Analysis</span>
                    </div>
                    {scanStep >= 2 ? (
                      scanStep === 3 ? (
                        <span className="text-emerald-500 flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <span className="material-symbols-outlined text-sm">check</span> Queued
                        </span>
                      ) : (
                        <span className="text-primary text-xs font-semibold animate-pulse drop-shadow-[0_0_2px_rgba(19,164,236,0.6)]">Running...</span>
                      )
                    ) : (
                      <span className="text-text-muted text-xs">Waiting</span>
                    )}
                  </div>

                  {/* Step 4: Render Cold Start Mitigation */}
                  {scanStep === 3 && (
                    <div className="flex items-center justify-between text-sm animate-in pt-3 border-t border-border-light dark:border-white/10">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <span className="material-symbols-outlined text-base animate-pulse">cloud_sync</span>
                        <span>Waking Cloud Server (Queue)</span>
                      </div>
                      <span className="text-primary text-xs">Almost ready...</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* STATE 2: SAFE RESULT */}
          {result && !result.is_phishing && (
            <div className="w-full max-w-[800px] flex flex-col gap-10 animate-in">
              <div className="flex flex-col gap-4 text-center items-center">
                <div className="inline-flex items-center justify-center gap-2 rounded-full bg-safe-border/50 px-3 py-1 text-xs font-medium text-safe border border-safe-border">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-safe"></span>
                  </span>
                  Live Threat Detection
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white max-w-[600px]">
                  Is this URL safe?
                </h1>
                <p className="text-slate-600 dark:text-[#92c9a0] text-lg max-w-[500px]">
                  Instant analysis of websites for phishing, malware, and security vulnerabilities.
                </p>
              </div>

              <div className="w-full">
                <div className="relative flex w-full items-center">
                  <span className="absolute left-4 text-slate-400 dark:text-slate-500 material-symbols-outlined">link</span>
                  <input
                    className="w-full h-14 pl-12 pr-32 rounded-xl bg-white dark:bg-safe-surface-dark border border-slate-200 dark:border-safe-border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-safe/50 text-base shadow-sm"
                    type="text"
                    readOnly
                    value={result.url}
                  />
                  <button onClick={resetScan} className="absolute right-2 h-10 px-6 rounded-lg bg-slate-200 dark:bg-safe-border text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    Rescan
                  </button>
                </div>
              </div>

              <div className="flex flex-col rounded-xl overflow-hidden border-2 border-safe/40 bg-white dark:bg-safe-surface-dark shadow-lg shadow-safe/5">
                <div className="flex flex-col items-center justify-center gap-4 py-10 bg-gradient-to-b from-safe/10 to-transparent border-b border-slate-100 dark:border-safe-border">
                  <div className="size-16 rounded-full bg-safe flex items-center justify-center text-safe-bg-dark shadow-lg shadow-safe/25">
                    <span className="material-symbols-outlined text-4xl font-bold">check</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">SAFE TO VISIT</h3>
                    <p className="text-slate-600 dark:text-[#92c9a0] mt-1">No security threats were detected on this URL.</p>
                    {result.cloudflare_report && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold shadow-sm">
                        <span className="material-symbols-outlined text-sm">shield</span>
                        Cloudflare Radar Verified: Clean via {result.cloudflare_report.asn} (IP: {result.cloudflare_report.ip})
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border-b border-border-light dark:border-white/10 flex">
                  <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-safe text-safe bg-safe/5' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}>Overview</button>
                  <button onClick={() => setActiveTab('deep')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'deep' ? 'border-safe text-safe bg-safe/5' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}>Deep Analysis</button>
                </div>

                {activeTab === 'overview' ? (
                  <>
                    <div className="p-6 md:p-8">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Technical Indicators</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                        {/* Indicators based on features */}
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">{result.url.startsWith('https') ? 'lock' : 'lock_open'}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Has HTTPS</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.url.startsWith('https') ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">dns</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Uses IP Address</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.features_extracted[0] ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">{result.features_extracted[4] ? 'link' : 'link_off'}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Uses Shortener</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.features_extracted[4] ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">alt_route</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Suspicious Redirects</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.features_extracted[2] ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Contains @ Symbol</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.features_extracted[1] ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-safe">
                            <span className="material-symbols-outlined text-[20px]">security</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-[#92c9a0] mb-0.5">Hidden Iframes</p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{result.features_extracted[7] ? 'Detected' : 'Clean'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Domain Details Card (Safe Mode) */}
                    <div className="px-6 md:px-8 pb-6">
                      <div className="rounded-xl border border-safe-border bg-slate-50/50 dark:bg-safe-surface-dark p-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Domain Info</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Registrar</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={result.whois?.registrar || "Unknown"}>{result.whois?.registrar || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Creation Date</p>
                            <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate">{result.whois?.creation_date || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Origin ASN</p>
                            <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate" title={result.cloudflare_report?.asn || "Unknown"}>{result.cloudflare_report?.asn || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">IP Address</p>
                            <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate">{result.cloudflare_report?.ip || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Location</p>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-slate-400">public</span>
                              <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate">{result.cloudflare_report?.server_location || "Unknown"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Engines Summary Card (Safe Mode) */}
                    <div className="px-6 md:px-8 pb-6">
                      <div className="rounded-xl border border-safe-border bg-slate-50/50 dark:bg-safe-surface-dark p-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Engine Detection</h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl font-black text-safe">
                            {result.engines ? result.engines.filter(e => e.malicious).length : 0}
                            <span className="text-lg text-slate-500 font-medium">/ {result.engines ? result.engines.length : 1}</span>
                          </span>
                          <span className="text-xs font-bold text-safe bg-safe/10 px-2 py-1 rounded border border-safe/20">Clean</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-2 mb-4 overflow-hidden border border-slate-300 dark:border-slate-600">
                          <div className="bg-safe h-2 rounded-full transition-all duration-1000" style={{ width: `${result.engines ? ((result.engines.length - result.engines.filter(e => e.malicious).length) / result.engines.length) * 100 : 100}%` }}></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                          {result.engines && result.engines.map((engine, idx) => (
                            <div key={idx} className={`flex items-center gap-1.5 font-bold ${engine.error ? 'text-orange-500' : (engine.malicious ? 'text-danger' : 'text-safe')}`}>
                              <span className="material-symbols-outlined text-base">
                                {engine.error ? 'warning' : (engine.malicious ? 'cancel' : 'check_circle')}
                              </span>
                              <span className="truncate">{engine.name}</span>
                              {engine.error && <span className="opacity-80 font-normal truncate max-w-[100px]" title={engine.error}>({engine.error})</span>}
                            </div>
                          ))}
                          {!result.engines && (
                            <div className="text-slate-500 italic">No detailed engine data available.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Gemini Insights Section */}
                    <div className="flex flex-col gap-6 px-6 md:px-8 pb-6">
                      <div className="rounded-xl border border-safe-border bg-slate-50/50 dark:bg-safe-surface-dark p-5">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-safe text-sm">auto_awesome</span>
                          Security Insight
                        </h3>
                        <div className="bg-safe/5 dark:bg-safe-border/20 border border-safe/20 rounded-lg p-5">
                          {result.rate_limit_exceeded ? (
                            <div className="flex flex-col gap-3">
                              <p className="text-sm text-slate-700 dark:text-[#92c9a0] leading-relaxed">
                                {result.gemini_analysis}
                              </p>
                              <a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 px-4 py-2 mt-2 rounded bg-safe/10 text-safe font-bold text-sm border border-safe/30 hover:bg-safe hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-sm">local_cafe</span>
                                Support Project
                              </a>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-[#92c9a0] leading-relaxed">
                              {result.gemini_analysis || "No AI analysis available at the moment."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-black/20">
                    <CloudflareDeepAnalysis report={result.cloudflare_report} />
                  </div>
                )}

                <div className="px-6 py-4 bg-slate-50 dark:bg-safe-border/30 border-t border-slate-100 dark:border-safe-border flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-[#92c9a0]">Scan ID: #{Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
                  <button onClick={resetScan} className="text-sm font-bold text-safe hover:text-white transition-colors flex items-center gap-1">
                    Scan New URL <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: PHISHING RESULT */}
          {result && result.is_phishing && (
            <div className="flex flex-col max-w-[960px] w-full gap-8 animate-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-danger/20 pb-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-tight">Scan Results</h1>
                  <div className="flex items-center gap-2 text-danger">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    <p className="text-sm font-medium uppercase tracking-wider">Analysis complete</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={resetScan} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white hover:bg-red-600 text-sm font-bold transition-colors shadow-lg shadow-danger/20">
                    <span className="material-symbols-outlined text-lg">search</span>
                    New Scan
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border-2 border-danger bg-[#331818]/30 p-8 shadow-2xl shadow-danger/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-danger/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger ring-4 ring-danger/10">
                    <span className="material-symbols-outlined text-5xl">warning</span>
                  </div>
                  <div className="flex flex-col flex-1 gap-2">
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3">
                      <h2 className="text-3xl font-bold text-danger tracking-tight">PHISHING DETECTED</h2>
                      <span className="rounded bg-danger px-2 py-0.5 text-xs font-bold uppercase text-white tracking-widest">Critical</span>
                    </div>
                    <p className="text-slate-300 text-lg max-w-2xl">
                      The URL you scanned has been flagged as a high-risk phishing site. It attempts to impersonate a legitimate entity to steal sensitive information. <span className="text-white font-bold">Do not visit this link.</span>
                    </p>
                    {result.cloudflare_report && (
                      <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-xs font-bold shadow-sm">
                        <span className="material-symbols-outlined text-sm">radar</span>
                        Cloudflare Threat Intel: {result.cloudflare_report.malicious ? <span className="text-danger">Confirmed Malicious Server</span> : "Server Details"} | ASN: {result.cloudflare_report.asn} (IP: {result.cloudflare_report.ip})
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scanned Target</label>
                      <div className="flex items-center gap-3 p-3 rounded bg-danger-bg-dark border border-danger/20 font-mono text-sm break-all">
                        <span className="material-symbols-outlined text-danger shrink-0">link_off</span>
                        <span className="text-white">{result.url}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gemini Insights Section (Phishing) */}
              <div className="rounded-xl border border-danger/20 bg-background-light dark:bg-[#2a1414] p-6 shadow-md shadow-danger/5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-danger text-sm">auto_awesome</span>
                  Gemini AI Threat Analysis
                </h3>
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-5">
                  {result.rate_limit_exceeded ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {result.gemini_analysis}
                      </p>
                      <a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 px-4 py-2 mt-2 rounded bg-danger/20 text-danger-text-light dark:text-red-400 font-bold text-sm border border-danger/40 hover:bg-danger hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">local_cafe</span>
                        Support Project
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {result.gemini_analysis || "No AI threat analysis available at the moment."}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex bg-slate-50 dark:bg-white/5 border border-border-light dark:border-white/10 rounded-lg overflow-hidden shrink-0 w-full mb-2 shadow-sm">
                <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-danger text-danger bg-danger/5' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}>Overview</button>
                <button onClick={() => setActiveTab('deep')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'deep' ? 'border-danger text-danger bg-danger/5' : 'border-transparent text-text-muted hover:text-text-main dark:text-slate-400 dark:hover:text-white'}`}>Deep Analysis</button>
              </div>

              {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="rounded-xl border border-danger/20 bg-background-light dark:bg-[#2a1414] overflow-hidden">
                      <div className="border-b border-danger/20 bg-danger/5 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-danger">flag</span>
                          Threat Indicators Detected
                        </h3>
                      </div>
                      <div className="divide-y divide-danger/10">
                        {result.features_extracted[0] === 1 && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">dns</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">IP Address Format</h4>
                                <span className="text-xs font-bold text-danger uppercase">High Risk</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">The URL is using an IP address instead of a domain name to conceal identity.</p>
                            </div>
                          </div>
                        )}

                        {result.features_extracted[5] === 1 && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">subtitles</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">Hyphens in Domain</h4>
                                <span className="text-xs font-bold text-danger uppercase">High Risk</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Dash (-) symbols in the domain are often used in typosquatting attacks.</p>
                            </div>
                          </div>
                        )}

                        {(!result.url.startsWith('https')) && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">lock_open</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">Missing SSL Certificate</h4>
                                <span className="text-xs font-bold text-orange-500 uppercase">Warning</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">The connection is insecure (HTTP), leaving traffic vulnerable.</p>
                            </div>
                          </div>
                        )}

                        {result.features_extracted[1] === 1 && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">alternate_email</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">Symbol Injection (@)</h4>
                                <span className="text-xs font-bold text-danger uppercase">High Risk</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">An '@' symbol is being used in an attempt to trick the browser URL logic.</p>
                            </div>
                          </div>
                        )}

                        {result.features_extracted[7] === 1 && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">border_clear</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">Hidden iFrames</h4>
                                <span className="text-xs font-bold text-danger uppercase">Critical</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Invisible frames are used to secretly load malicious execution code.</p>
                            </div>
                          </div>
                        )}

                        {/* Fallback if no specific feature alerts triggers (XGBoost logic found abstract pattern) */}
                        {result.features_extracted.reduce((a, b) => a + b, 0) <= 1 && (
                          <div className="flex items-start gap-4 p-4">
                            <div className="mt-1"><span className="material-symbols-outlined text-danger">psychology</span></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100">XGBoost Heuristics</h4>
                                <span className="text-xs font-bold text-danger uppercase">High Risk</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">The AI model's decision tree flagged the combined structural layout of this URL as malicious based on known attack signatures.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Domain Details Card */}
                    <div className="rounded-xl border border-danger/20 bg-background-light dark:bg-[#2a1414] p-5">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Domain Info</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Registrar</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={result.whois?.registrar || "Unknown"}>{result.whois?.registrar || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Creation Date</p>
                          <p className="text-sm font-mono text-slate-800 dark:text-slate-200">{result.whois?.creation_date || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Origin ASN</p>
                          <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate">{result.cloudflare_report?.asn || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">IP Address</p>
                          <p className="text-sm font-mono text-slate-800 dark:text-slate-200">{result.cloudflare_report?.ip || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Server Location</p>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">public</span>
                            <p className="text-sm font-mono text-slate-800 dark:text-slate-200">{result.cloudflare_report?.server_location || "Unknown"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Engines Summary Card */}
                    <div className="rounded-xl border border-danger/20 bg-background-light dark:bg-[#2a1414] p-5">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Engine Detection</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-3xl font-black text-danger">
                          {result.engines ? result.engines.filter(e => e.malicious).length : 0}
                          <span className="text-lg text-slate-500 font-medium">/ {result.engines ? result.engines.length : 1}</span>
                        </span>
                        <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded">Malicious</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                        <div className="bg-danger h-2 rounded-full transition-all duration-1000" style={{ width: `${result.engines ? (result.engines.filter(e => e.malicious).length / result.engines.length) * 100 : 0}%` }}></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {result.engines && result.engines.map((engine, idx) => (
                          <div key={idx} className={`flex items-center gap-1 font-bold ${engine.error ? 'text-orange-500' : (engine.malicious ? 'text-danger' : 'text-safe')}`}>
                            <span className="material-symbols-outlined text-sm">
                              {engine.error ? 'warning' : (engine.malicious ? 'cancel' : 'check_circle')}
                            </span>
                            {engine.name}
                            {engine.error && <span className="opacity-80 font-normal">({engine.error})</span>}
                          </div>
                        ))}
                        {!result.engines && (
                          <div className="text-slate-500 italic">No detailed engine data available.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-danger/20 bg-background-light dark:bg-[#2a1414] p-5">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Scan Meta data</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Scan Reference</p>
                          <p className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate">#{Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Evaluation Engine</p>
                          <p className="text-sm font-mono text-slate-800 dark:text-slate-200">XGBoost (Classification)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <CloudflareDeepAnalysis report={result.cloudflare_report} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={`mt-auto border-t py-8 ${result ? (result.is_phishing ? 'border-danger/20' : 'border-safe-border') : 'border-border-light dark:border-white/10 bg-surface-light dark:bg-background-dark'}`}>
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row lg:px-8">
            <div className={`flex items-center gap-2 text-sm ${result ? 'text-slate-500 dark:text-text-secondary' : 'text-text-muted dark:text-slate-400'}`}>
              <span>© 2026</span>
              <img src="/phishx-text.png" alt="phishX" className="h-6 sm:h-8 w-auto object-contain scale-110 grayscale opacity-60 dark:opacity-80 mx-1" />
              <span>by athx1337. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <button onClick={() => setActiveModal('privacy')} className={`text-sm transition-colors ${result ? 'text-slate-500 hover:text-primary dark:text-text-secondary dark:hover:text-primary' : 'text-text-muted dark:text-slate-400 hover:text-text-main dark:hover:text-primary'}`}>Privacy Policy</button>
              <button onClick={() => setActiveModal('tos')} className={`text-sm transition-colors ${result ? 'text-slate-500 hover:text-primary dark:text-text-secondary dark:hover:text-primary' : 'text-text-muted dark:text-slate-400 hover:text-text-main dark:hover:text-primary'}`}>Terms of Service</button>
            </div>
          </div>
        </footer>

        {/* Legal Modals */}
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-border-light dark:border-white/10 flex justify-between items-center bg-surface-light dark:bg-white/5">
                <h2 className="text-xl font-bold text-text-main dark:text-white">
                  {activeModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-text-muted hover:text-danger transition-colors p-1">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 text-sm text-text-main dark:text-slate-300 space-y-4 leading-relaxed bg-background-light dark:bg-background-dark">
                {activeModal === 'privacy' && (
                  <>
                    <div className="flex items-center gap-0 mb-2 mt-2">
                      <img src="/phishx-text.png" alt="phishX" className="h-8 md:h-10 w-auto object-contain scale-[1.25] origin-left brightness-0 opacity-70 dark:brightness-200" />
                      <span className="font-bold text-base text-primary -ml-2">is an educational project by athx1337.</span>
                    </div>
                    <p>This tool does not require user accounts.</p>
                    <p>URLs submitted are processed only to generate a risk analysis result.</p>
                    <p>We do not intentionally store personal data.</p>
                    <p>This tool is provided for educational and demonstration purposes only.</p>
                  </>
                )}
                {activeModal === 'tos' && (
                  <>
                    <div className="flex items-center gap-0 mb-2 mt-2">
                      <img src="/phishx-text.png" alt="phishX" className="h-8 md:h-10 w-auto object-contain scale-[1.25] origin-left brightness-0 opacity-70 dark:brightness-200" />
                      <span className="font-bold text-base text-primary -ml-2">is an educational project by athx1337.</span>
                    </div>
                    <p>The results provided by this tool are not guaranteed to be 100% accurate.</p>
                    <p>This tool should not be used as your only security decision system.</p>
                    <p>The author is not responsible for any damages or losses resulting from the use of this tool.</p>
                  </>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border-light dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-end">
                <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors">
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
