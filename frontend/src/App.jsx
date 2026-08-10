import { useState, useEffect } from 'react';
import CloudflareDeepAnalysis from './CloudflareDeepAnalysis';
import Navbar from './components/Navbar';
import HeroVisual from './components/HeroVisual';
import HUDCard from './components/HUDCard';
import URLScanner from './components/URLScanner';
import Footer from './components/Footer';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Modal states for legal docs
  const [activeModal, setActiveModal] = useState(null);

  // Loading animation states
  const [progress, setProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);

  // System Status State ('checking', 'waking', 'awake', 'offline')
  const [serverStatus, setServerStatus] = useState('checking');
  const [isWaitingForWake, setIsWaitingForWake] = useState(false);

  // Tab UI State
  const [activeTab, setActiveTab] = useState('overview');

  // Global effect to wake up backend on page load and keep it alive
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

    const pingServer = () => {
      const timeout = setTimeout(() => {
        setServerStatus(prev => prev === 'checking' ? 'waking' : prev);
      }, 2000);

      fetch(`${apiUrl}/api/ping`)
        .then(res => {
          if (res.ok || res.status === 404) setServerStatus('awake');
          else setServerStatus('offline');
        })
        .catch(() => {
          setServerStatus('waking');
        })
        .finally(() => {
          clearTimeout(timeout);
        });
    };

    pingServer();

    // Heartbeat every 10 minutes to keep worker active
    const heartbeatTimer = setInterval(pingServer, 10 * 60 * 1000);

    return () => {
      clearInterval(heartbeatTimer);
    };
  }, []);

  // Simulated scan progress effect
  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      setScanStep(0);

      const startTime = Date.now();

      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95;

          const newProgress = prev + Math.random() * 8;
          const elapsedSeconds = (Date.now() - startTime) / 1000;

          if (newProgress > 60) setScanStep(2);
          else if (newProgress > 30) setScanStep(1);

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

  // Rapid polling effect when waiting for wake
  useEffect(() => {
    let pollInterval;
    if (isWaitingForWake) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';

      const poll = () => {
        fetch(`${apiUrl}/api/ping`)
          .then(res => {
            if (res.ok || res.status === 404) {
              setServerStatus('awake');
            }
          })
          .catch(() => {
            setServerStatus('waking');
          });
      };

      pollInterval = setInterval(poll, 3000);
      poll();
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isWaitingForWake]);

  const checkUrl = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!url) return;

    if (serverStatus !== 'awake') {
      setIsWaitingForWake(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setIsWaitingForWake(false);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
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
  };

  // Effect to auto-start the scan once the server announces it is awake
  useEffect(() => {
    if (isWaitingForWake && serverStatus === 'awake' && url) {
      setIsWaitingForWake(false);
      checkUrl();
    }
  }, [serverStatus, isWaitingForWake]);

  const resetScan = () => {
    setResult(null);
    setUrl('');
    setError(null);
    setActiveTab('overview');
  };

  return (
    <div className="bg-[#050507] text-[#f5f5f5] min-h-screen flex flex-col font-sans antialiased selection:bg-[#8b5cf6]/20 selection:text-[#c084fc] relative">
      
      {/* Background Layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0"></div>
      <div className="fixed inset-0 purple-glow pointer-events-none z-0"></div>

      {/* Navigation */}
      <Navbar serverStatus={serverStatus} onNavClick={setActiveModal} />

      {/* Main Container */}
      <main className="flex-1 flex flex-col pt-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-12 w-full">
          
          {/* Left Column: Dynamics (Scanner/Welcome OR Results Display) */}
          <div className="lg:col-span-7 space-y-8 text-left animate-in w-full">
            {!result ? (
              /* SCANNER & WELCOME TEXT */
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="font-mono text-xs text-[#8b5cf6] tracking-[0.3em] uppercase block">
                    /// REAL-TIME URL ANALYSIS
                  </span>
                  
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase flex flex-col">
                    <span>DETECT</span>
                    <span className="text-[#8b5cf6]">PHISHING.</span>
                    <span className="metallic-text">STAY AHEAD.</span>
                  </h1>

                  <p className="text-[#8a8a92] text-sm max-w-lg leading-relaxed pt-2">
                    phishX analyzes suspicious URLs instantly using machine learning, global threat intelligence and deep heuristics to keep you safe from credentials theft and online exploits.
                  </p>
                </div>

                {/* Glassmorphic Scanner Box */}
                <div className="max-w-xl">
                  <URLScanner 
                    url={url} 
                    setUrl={setUrl} 
                    onSubmit={checkUrl}
                    loading={loading} 
                    isWaitingForWake={isWaitingForWake} 
                    error={error}
                    progress={progress} 
                    scanStep={scanStep}
                  />
                </div>
              </div>
            ) : (
              /* RESULTS DASHBOARD */
              <div className="space-y-8 animate-in w-full">
                
                {/* Result Title & Rescan */}
                <div className="flex flex-col gap-4">
                  <span className="font-mono text-xs text-[#8b5cf6] tracking-[0.2em] uppercase">
                    // SCAN RESULT IDENTIFIED
                  </span>
                  
                  <h2 className="text-3xl font-bold tracking-tight text-white">Is this URL safe?</h2>
                  
                  <div className="relative flex w-full max-w-xl items-center mt-2">
                    <span className="absolute left-4 text-[#8a8a92] material-symbols-outlined">link</span>
                    <input
                      className="w-full h-14 pl-12 pr-32 rounded bg-black/40 border border-white/10 text-white focus:outline-none text-xs font-mono"
                      type="text"
                      readOnly
                      value={result.url}
                    />
                    <button 
                      onClick={resetScan} 
                      className="absolute right-2 h-10 px-6 rounded bg-[#8b5cf6] text-white text-xs font-mono tracking-wider font-bold hover:bg-[#8b5cf6]/90 transition-colors"
                    >
                      RESCAN
                    </button>
                  </div>
                </div>

                {/* Verdict Display Panel */}
                <div className={`flex flex-col rounded border-2 overflow-hidden w-full ${
                  result.is_phishing 
                    ? 'border-[#ef4444]/40 bg-red-950/10 shadow-[0_0_30px_rgba(239,68,68,0.05)]' 
                    : 'border-[#22c55e]/40 bg-emerald-950/10 shadow-[0_0_30px_rgba(34,197,94,0.05)]'
                }`}>
                  
                  <div className="flex flex-col items-center justify-center gap-4 py-8 border-b border-white/5 bg-white/[0.01]">
                    <div className={`size-12 rounded-full flex items-center justify-center text-black font-black text-xl shadow-lg ${
                      result.is_phishing ? 'bg-[#ef4444]' : 'bg-[#22c55e]'
                    }`}>
                      {result.is_phishing ? '✗' : '✓'}
                    </div>
                    
                    <div className="text-center px-4">
                      <h3 className="text-lg font-black tracking-widest uppercase">
                        {result.is_phishing ? 'MALICIOUS LINK DETECTED' : 'SAFE TO VISIT'}
                      </h3>
                      <p className="text-[#8a8a92] text-[10px] mt-1 font-mono uppercase tracking-wide">
                        {result.is_phishing 
                          ? 'This URL exhibits strong patterns matching known phishing techniques.' 
                          : 'No security threats were identified by our analytics engines.'}
                      </p>
                      
                      {result.cloudflare_report && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded bg-white/[0.02] border border-white/5 text-[#8a8a92] font-mono text-[9px] tracking-wider uppercase">
                          <span className="material-symbols-outlined text-[10px] text-[#8b5cf6]">shield</span>
                          <span>Verified via {result.cloudflare_report.asn}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sub-Tab Navigation for Result View */}
                  <div className="bg-black/40 border-b border-white/5 flex font-mono text-[10px] tracking-wider">
                    <button 
                      onClick={() => setActiveTab('overview')} 
                      className={`flex-1 py-3 text-center font-bold border-b-2 transition-colors ${
                        activeTab === 'overview' 
                          ? 'border-[#8b5cf6] text-[#8b5cf6] bg-[#8b5cf6]/5' 
                          : 'border-transparent text-[#8a8a92] hover:text-white'
                      }`}
                    >
                      OVERVIEW
                    </button>
                    <button 
                      onClick={() => setActiveTab('deep')} 
                      className={`flex-1 py-3 text-center font-bold border-b-2 transition-colors ${
                        activeTab === 'deep' 
                          ? 'border-[#8b5cf6] text-[#8b5cf6] bg-[#8b5cf6]/5' 
                          : 'border-transparent text-[#8a8a92] hover:text-white'
                      }`}
                    >
                      DEEP REPORT
                    </button>
                  </div>

                  {/* Result Details Container */}
                  <div className="p-4 bg-black/20">
                    {activeTab === 'overview' ? (
                      <div className="space-y-6">
                        
                        {/* Indicators checklist */}
                        <div className="border border-white/10 rounded overflow-hidden">
                          <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3">
                            <h4 className="font-mono text-[10px] font-bold text-white tracking-widest uppercase flex items-center gap-2">
                              <span className="material-symbols-outlined text-xs text-[#8b5cf6]">dns</span>
                              TECHNICAL INDICATORS
                            </h4>
                          </div>
                          
                          <div className="divide-y divide-white/5 font-sans text-xs">
                            {/* Indicator HTTPS */}
                            <div className="flex items-start gap-3 p-4 hover:bg-white/[0.01] transition-colors">
                              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                result.url.startsWith('https') ? 'text-emerald-500' : 'text-[#ef4444]'
                              }`}>
                                {result.url.startsWith('https') ? 'lock' : 'lock_open'}
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">HTTPS Support</span>
                                  <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    result.url.startsWith('https') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-[#ef4444]'
                                  }`}>
                                    {result.url.startsWith('https') ? 'Secure' : 'Warning'}
                                  </span>
                                </div>
                                <p className="text-[#8a8a92] text-[11px] leading-relaxed">
                                  {result.url.startsWith('https') 
                                    ? 'The site has a secure, encrypted HTTPS connection.' 
                                    : 'The link is insecure (HTTP), opening possibilities for sniffing.'}
                                </p>
                              </div>
                            </div>

                            {/* Indicator IP Host */}
                            <div className="flex items-start gap-3 p-4 hover:bg-white/[0.01] transition-colors">
                              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                result.features_extracted[0] === 1 ? 'text-[#ef4444]' : 'text-emerald-500'
                              }`}>
                                alternate_email
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">IP Domain Format</span>
                                  <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    result.features_extracted[0] === 1 ? 'bg-red-500/10 text-[#ef4444]' : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {result.features_extracted[0] === 1 ? 'Alert' : 'Clean'}
                                  </span>
                                </div>
                                <p className="text-[#8a8a92] text-[11px] leading-relaxed">
                                  {result.features_extracted[0] === 1 
                                    ? 'Host uses a raw IP address instead of a DNS domain.' 
                                    : 'Domain name resolves standard DNS notation.'}
                                </p>
                              </div>
                            </div>

                            {/* Indicator Shortener */}
                            <div className="flex items-start gap-3 p-4 hover:bg-white/[0.01] transition-colors">
                              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                result.features_extracted[4] === 1 ? 'text-yellow-500' : 'text-emerald-500'
                              }`}>
                                link
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">Link Shortener</span>
                                  <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    result.features_extracted[4] === 1 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {result.features_extracted[4] === 1 ? 'Flagged' : 'Clean'}
                                  </span>
                                </div>
                                <p className="text-[#8a8a92] text-[11px] leading-relaxed">
                                  {result.features_extracted[4] === 1 
                                    ? 'A URL shortening service is used to mask the destination path.' 
                                    : 'No known shortening pattern detected.'}
                                </p>
                              </div>
                            </div>

                            {/* Indicator Redirects */}
                            <div className="flex items-start gap-3 p-4 hover:bg-white/[0.01] transition-colors">
                              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                result.features_extracted[2] === 1 ? 'text-yellow-500' : 'text-emerald-500'
                              }`}>
                                alt_route
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">Suspicious Redirects</span>
                                  <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    result.features_extracted[2] === 1 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {result.features_extracted[2] === 1 ? 'Flagged' : 'Clean'}
                                  </span>
                                </div>
                                <p className="text-[#8a8a92] text-[11px] leading-relaxed">
                                  {result.features_extracted[2] === 1 
                                    ? 'Multiple sequential HTTP redirects occur during analysis.' 
                                    : 'No abnormal redirect loops found.'}
                                </p>
                              </div>
                            </div>

                            {/* Indicator XGBoost */}
                            <div className="flex items-start gap-3 p-4 hover:bg-white/[0.01] transition-colors">
                              <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                result.is_phishing ? 'text-[#ef4444]' : 'text-emerald-500'
                              }`}>
                                psychology
                              </span>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className="font-bold text-white uppercase text-[10px]">XGBoost AI Model</span>
                                  <span className={`font-mono text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    result.is_phishing ? 'bg-red-500/10 text-[#ef4444]' : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {result.is_phishing ? 'Malicious' : 'Clean'}
                                  </span>
                                </div>
                                <p className="text-[#8a8a92] text-[11px] leading-relaxed">
                                  {result.is_phishing 
                                    ? 'The AI model decision tree flagged the combined structure of this URL as high risk.' 
                                    : 'The URL structure matches benign safety patterns.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* AI Threat Analysis Summary */}
                        <div className="border border-white/10 rounded p-4 bg-white/[0.01]">
                          <h4 className="font-mono text-[10px] font-bold text-white tracking-widest uppercase flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-xs text-[#8b5cf6]">auto_awesome</span>
                            AI ASSESSMENT
                          </h4>
                          <div className="border-l-2 border-[#8b5cf6] pl-3 py-0.5">
                            <p className="text-[11px] text-[#8a8a92] leading-relaxed font-mono">
                              {result.gemini_analysis || "No advanced AI assessor analysis returned."}
                            </p>
                          </div>
                        </div>

                        {/* Domain Metrics (WHOIS OSINT) */}
                        <div className="border border-white/10 rounded p-4 bg-white/[0.01]">
                          <h4 className="font-mono text-[10px] font-bold text-white tracking-widest uppercase mb-3">// DOMAIN METRICS (OSINT)</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-[10px] text-[#8a8a92]">
                            <div>
                              <span className="text-[8px] text-[#8a8a92]/60 block mb-0.5">REGISTRAR</span>
                              <span className="text-white font-bold truncate block" title={result.whois?.registrar}>{result.whois?.registrar || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-[#8a8a92]/60 block mb-0.5">CREATION DATE</span>
                              <span className="text-white font-bold block truncate">{result.whois?.creation_date || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-[#8a8a92]/60 block mb-0.5">ORIGIN ASN</span>
                              <span className="text-white font-bold truncate block" title={result.cloudflare_report?.asn}>{result.cloudflare_report?.asn || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-[#8a8a92]/60 block mb-0.5">IP ADDRESS</span>
                              <span className="text-white font-bold block">{result.cloudflare_report?.ip || 'Unknown'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] text-[#8a8a92]/60 block mb-0.5">SERVER LOCATION</span>
                              <span className="text-white font-bold block truncate" title={result.cloudflare_report?.server_location}>{result.cloudflare_report?.server_location || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Engines Scan Details */}
                        <div className="border border-white/10 rounded p-4 bg-white/[0.01]">
                          <h4 className="font-mono text-[10px] font-bold text-white tracking-widest uppercase mb-3">// SECURITY ENGINES DETECTION</h4>
                          <div className="flex items-baseline gap-1 mb-2 font-mono">
                            <span className={`text-2xl font-black ${result.is_phishing ? 'text-[#ef4444]' : 'text-emerald-500'}`}>
                              {result.engines ? result.engines.filter(e => e.malicious).length : 0}
                            </span>
                            <span className="text-[9px] text-[#8a8a92]">/ {result.engines ? result.engines.length : 1} MALICIOUS FLAGS</span>
                          </div>
                          
                          <div className="w-full bg-white/5 h-1 rounded overflow-hidden mb-3">
                            <div 
                              className={`h-full rounded transition-all duration-1000 ${
                                result.is_phishing ? 'bg-[#ef4444]' : 'bg-emerald-500'
                              }`} 
                              style={{ 
                                width: `${result.engines ? (result.engines.filter(e => e.malicious).length / result.engines.length) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[9px] text-[#8a8a92]">
                            {result.engines && result.engines.map((engine, idx) => (
                              <div key={idx} className={`flex items-center gap-1 font-bold truncate ${
                                engine.error ? 'text-orange-500' : (engine.malicious ? 'text-[#ef4444]' : 'text-emerald-500')
                              }`}>
                                <span className="material-symbols-outlined text-[10px] shrink-0">
                                  {engine.error ? 'warning' : (engine.malicious ? 'cancel' : 'check_circle')}
                                </span>
                                <span className="truncate">{engine.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* VirusTotal stats if present */}
                        {result.engines && result.engines.find(e => e.name === "VirusTotal")?.data && (
                          <div className="border border-white/10 rounded p-4 bg-white/[0.01]">
                            <h4 className="font-mono text-[10px] font-bold text-white tracking-widest uppercase mb-3">// VIRUSTOTAL METRICS</h4>
                            {(() => {
                              const vtData = result.engines.find(e => e.name === "VirusTotal").data;
                              return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[9px] text-[#8a8a92] text-center">
                                  <div className="bg-white/[0.02] border border-white/5 p-2 rounded">
                                    <p className="text-[#8a8a92]/60">MALICIOUS</p>
                                    <p className={`text-sm font-bold mt-0.5 ${vtData.malicious_count > 0 ? 'text-[#ef4444]' : 'text-white'}`}>{vtData.malicious_count}</p>
                                  </div>
                                  <div className="bg-white/[0.02] border border-white/5 p-2 rounded">
                                    <p className="text-[#8a8a92]/60">SUSPICIOUS</p>
                                    <p className="text-sm font-bold text-orange-400 mt-0.5">{vtData.suspicious_count}</p>
                                  </div>
                                  <div className="bg-white/[0.02] border border-white/5 p-2 rounded">
                                    <p className="text-[#8a8a92]/60">HARMLESS</p>
                                    <p className="text-sm font-bold text-emerald-500 mt-0.5">{vtData.harmless_count}</p>
                                  </div>
                                  <div className="bg-white/[0.02] border border-white/5 p-2 rounded">
                                    <p className="text-[#8a8a92]/60">UNDETECTED</p>
                                    <p className="text-sm font-bold text-white mt-0.5">{vtData.undetected_count}</p>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="w-full">
                        <CloudflareDeepAnalysis report={result.cloudflare_report} />
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>

          {/* Right Column: Centerpiece (Visual & Telemetry HUD) ALWAYS VISIBLE */}
          <div className="lg:col-span-5 relative flex items-center justify-center min-h-[450px] md:min-h-[550px] w-full">
            
            {/* 3D Visual Centerpiece */}
            <div className="absolute inset-0 z-10">
              <HeroVisual />
            </div>

            {/* Floating HUD Cards (positioned around X centerpiece, dynamically synced to loading/result) */}
            <div className="hidden md:block absolute top-4 left-0 z-20">
              <HUDCard type="safety-score" loading={loading} result={result} error={error} />
            </div>
            <div className="hidden md:block absolute top-20 right-0 z-20">
              <HUDCard type="threat-intel" loading={loading} result={result} error={error} />
            </div>
            <div className="hidden md:block absolute bottom-24 left-0 z-20">
              <HUDCard type="ai-analysis" loading={loading} result={result} error={error} />
            </div>
            <div className="hidden md:block absolute bottom-8 right-0 z-20">
              <HUDCard type="verdict" loading={loading} result={result} error={error} />
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer onLegalClick={setActiveModal} />

      {/* Legal Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in">
          <div className="glass-panel w-full max-w-lg rounded shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <h2 className="font-sans font-bold text-lg text-white">
                {activeModal === 'privacy' ? 'PRIVACY POLICY' : 'TERMS OF SERVICE'}
              </h2>
              <button 
                onClick={() => setActiveModal(null)} 
                className="text-[#8a8a92] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <div className="p-6 text-xs text-[#8a8a92] space-y-4 font-sans leading-relaxed">
              {activeModal === 'privacy' && (
                <>
                  <p className="font-mono text-[#8b5cf6] font-bold text-sm tracking-wider uppercase">// EDUCATION PLATFORM GUIDELINES</p>
                  <p>PhishX is an educational sandbox built by athx1337 for pattern analysis and URL threat visualization.</p>
                  <p>Submitted URLs are forwarded to Cloudflare Radar endpoints and model classifiers purely to compute threat metrics. No permanent logs are saved.</p>
                  <p>This software utilizes standard TLS encryption tunnels. User credentials, locations, or identities are never tracked.</p>
                </>
              )}
              {activeModal === 'tos' && (
                <>
                  <p className="font-mono text-[#8b5cf6] font-bold text-sm tracking-wider uppercase">// PLATFORM WARNING & DISCLAIMERS</p>
                  <p>All safety score outputs represent algorithmic predictions calculated by an experimental XGBoost decision tree.</p>
                  <p>This tool is served purely for demonstration. Never rely on this service as your sole cybersecurity firewall provider.</p>
                  <p>The system operator disclaims all liability for breaches, malicious link interactions, or network exploits resulting from external navigations.</p>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button 
                onClick={() => setActiveModal(null)} 
                className="px-6 py-2.5 rounded bg-[#8b5cf6] text-white text-xs font-mono tracking-widest font-bold hover:bg-[#8b5cf6]/90 transition-colors uppercase"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
