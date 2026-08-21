import React from 'react';

export default function URLScanner({ 
  url, 
  setUrl, 
  onSubmit, 
  loading, 
  isWaitingForWake, 
  error, 
  progress, 
  scanStep 
}) {
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-lg border border-white/10 bg-white/[0.02] shadow-2xl relative">
      <form onSubmit={onSubmit} className="space-y-6">
        
        <div className="flex flex-col gap-2">
          <label 
            className="font-mono text-[10px] font-bold text-[#8a8a92] uppercase tracking-widest" 
            htmlFor="url-input"
          >
            ENTER URL TO SCAN
          </label>
          
          <div className="relative group flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#8a8a92] group-focus-within:text-[#8b5cf6] transition-colors">
                <span className="material-symbols-outlined text-lg">link</span>
              </div>
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={loading || isWaitingForWake}
                className="block w-full rounded border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-sm text-white placeholder:text-[#8a8a92]/40 focus:border-[#8b5cf6]/40 focus:ring-1 focus:ring-[#8b5cf6]/20 transition-all outline-none font-mono text-xs sm:text-sm"
                placeholder="example.com or https://example.com/..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || isWaitingForWake}
              className="flex items-center justify-center rounded bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white px-8 py-4 text-xs font-mono tracking-widest uppercase font-bold transition-all disabled:opacity-50 disabled:cursor-wait shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:scale-[1.02] active:scale-[0.98]"
            >
              {(loading || isWaitingForWake) ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>SCANS RUNNING</span>
                </div>
              ) : (
                <span>ANALYZE →</span>
              )}
            </button>
          </div>

          {/* Pre-Queue Wake Warning */}
          {isWaitingForWake && (
            <div className="mt-3 p-4 rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 flex items-start gap-3 animate-in">
              <span className="material-symbols-outlined text-[#8b5cf6] animate-pulse mt-0.5">cloud_sync</span>
              <div className="flex flex-col gap-1">
                <p className="text-xs font-mono font-bold text-[#8b5cf6]">// WAKING CLOUD BACKEND</p>
                <p className="text-[11px] text-[#8a8a92] leading-relaxed">
                  The backend server is waking up on the free tier. Please wait 1-2 minutes while the engine boots.<br />
                  <span className="text-[#8b5cf6]/80 font-bold">Your scan will start automatically once ready.</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-[#ef4444] font-mono mt-3 flex items-center gap-1.5 animate-in">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>ERROR: {error}</span>
            </div>
          )}

          <p className="text-[10px] font-mono text-[#8a8a92]/60 mt-4 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">lock</span>
            <span>URLs are processed only to generate a result.</span>
          </p>
        </div>
      </form>

      {/* DYNAMIC SCANNERS STATUSES CARDS (when loading is running) */}
      {loading && (
        <div className="mt-8 pt-6 border-t border-white/5 space-y-4 animate-in">
          
          <div className="flex justify-between items-center font-mono text-[10px] text-[#8a8a92] tracking-wider">
            <span>PIPELINE PROGRESS</span>
            <span className="font-bold text-white">{Math.floor(progress)}%</span>
          </div>

          <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
            <div 
              className="h-full bg-[#8b5cf6] transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)]" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Detailed step tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 font-mono text-[10px] tracking-wider text-[#8a8a92]">
            <div className={`flex items-center gap-2 ${scanStep >= 1 ? 'text-white' : 'opacity-50'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>DNS CHECKS</span>
            </div>
            <div className={`flex items-center gap-2 ${scanStep >= 2 ? 'text-white' : 'opacity-50'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${scanStep >= 2 ? 'bg-emerald-500' : 'bg-[#8b5cf6] animate-pulse'}`}></span>
              <span>SSL PROTOCOL</span>
            </div>
            <div className={`flex items-center gap-2 ${scanStep >= 2 ? 'text-white' : 'opacity-50'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${scanStep === 3 ? 'bg-[#8b5cf6] animate-pulse' : (scanStep >= 2 ? 'bg-emerald-500' : 'bg-white/10')}`}></span>
              <span>AI CLASSIFICATION</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
