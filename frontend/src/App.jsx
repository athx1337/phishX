import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Modal states for legal docs
  const [activeModal, setActiveModal] = useState(null)

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
  }

  // Force dark mode globally per user request
  const isDarkMode = true;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
      <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-300">

        {/* Header */}
        <header className={`sticky top-0 z-50 w-full border-b ${result ? 'border-primary/20 bg-background-light dark:bg-background-dark px-10' : 'border-border-light dark:border-white/10 bg-surface-light/80 dark:bg-background-dark/90 backdrop-blur-md px-4 lg:px-8'} py-3 transition-colors duration-300`}>
          <div className={`mx-auto flex ${result ? 'w-full' : 'max-w-7xl'} items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center rounded-lg ${result ? 'size-8 text-primary' : 'bg-primary/10 p-2 text-primary'}`}>
                <span className={`material-symbols-outlined ${result ? 'text-3xl' : 'text-2xl'}`}>shield_lock</span>
              </div>
              <div className="flex flex-col">
                <span className={`text-xl font-bold tracking-tight leading-none ${result ? 'text-slate-900 dark:text-white' : 'text-text-main dark:text-white'}`}>phishX</span>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${result ? 'text-primary' : 'text-primary/80'}`}>by athx1337</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 ${!result ? 'justify-center' : ''}`}>

          {/* STATE 1: INITIAL SCANNER */}
          {!result && (
            <div className="w-full max-w-4xl space-y-12">
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
                  </div>
                </div>

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
                        <span className="material-symbols-outlined text-[20px]">route_out</span>
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

                {/* Gemini Insights Section */}
                <div className="flex flex-col gap-6">
                  <div className="rounded-xl border border-safe-border bg-white dark:bg-safe-surface-dark p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-safe text-sm">auto_awesome</span>
                      Security Insight
                    </h3>
                    <div className="bg-safe/5 dark:bg-safe-border/20 border border-safe/20 rounded-lg p-5">
                      <p className="text-sm text-slate-700 dark:text-[#92c9a0] leading-relaxed">
                        {result.gemini_analysis || "No AI analysis available at the moment."}
                      </p>
                    </div>
                  </div>
                </div>

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
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {result.gemini_analysis || "No AI threat analysis available at the moment."}
                  </p>
                </div>
              </div>

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
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={`mt-auto border-t py-8 ${result ? (result.is_phishing ? 'border-danger/20' : 'border-safe-border') : 'border-border-light dark:border-white/10 bg-surface-light dark:bg-background-dark'}`}>
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row lg:px-8">
            <p className={`text-sm ${result ? 'text-slate-500 dark:text-text-secondary' : 'text-text-muted dark:text-slate-400'}`}>© 2026 phishX by athx1337. All rights reserved.</p>
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
                    <p className="font-bold text-base text-primary">phishX is an educational project by athx1337.</p>
                    <p>This tool does not require user accounts.</p>
                    <p>URLs submitted are processed only to generate a risk analysis result.</p>
                    <p>We do not intentionally store personal data.</p>
                    <p>This tool is provided for educational and demonstration purposes only.</p>
                  </>
                )}
                {activeModal === 'tos' && (
                  <>
                    <p className="font-bold text-base text-primary">phishX is an educational project by athx1337.</p>
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
