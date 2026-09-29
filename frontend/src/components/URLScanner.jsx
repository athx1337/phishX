import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { GlowingEffect } from './ui/glowing-effect';

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
  const cardRef      = useRef(null);
  const progressRef  = useRef(null);
  const dotsRef      = useRef([]);
  const btnRef       = useRef(null);
  const errorRef     = useRef(null);
  const prevError    = useRef(null);
  const prevProgress = useRef(0);

  // ── Mount: card slides up into view ──────────────────────────────────────
  useEffect(() => {
    if (!cardRef.current) return;
    animate(cardRef.current, {
      opacity:    [0, 1],
      translateY: ['24px', '0px'],
      duration: 700,
      delay: 300,
      easing: 'easeOutExpo',
    });
  }, []);

  // ── Progress bar: anime.js drives the width for buttery motion ────────────
  useEffect(() => {
    if (!progressRef.current) return;
    const from = prevProgress.current;
    const to   = progress;
    prevProgress.current = to;

    animate(progressRef.current, {
      width: [`${from}%`, `${to}%`],
      duration: 400,
      easing: 'easeOutQuad',
    });
  }, [progress]);

  // ── Scan step dots: bounce in when they activate ─────────────────────────
  useEffect(() => {
    dotsRef.current.forEach((dot, i) => {
      if (!dot) return;
      if (scanStep > i) {
        // Step completed → pulse green flash then settle
        animate(dot, {
          scale:           [1, 1.6, 1],
          backgroundColor: ['#10b981', '#10b981'],
          duration: 400,
          easing: 'easeOutElastic(1, 0.5)',
        });
      }
    });
  }, [scanStep]);

  // ── Error: shake animation on new error ──────────────────────────────────
  useEffect(() => {
    if (error && error !== prevError.current && errorRef.current) {
      prevError.current = error;
      animate(errorRef.current, {
        translateX: [0, -6, 6, -5, 5, -3, 3, 0],
        duration: 500,
        easing: 'easeInOutQuad',
      });
    }
  }, [error]);

  // ── Button: pulse glow while loading ─────────────────────────────────────
  useEffect(() => {
    if (!btnRef.current) return;
    if (loading || isWaitingForWake) {
      const anim = animate(btnRef.current, {
        boxShadow: [
          '0 0 8px rgba(139,92,246,0.3)',
          '0 0 22px rgba(139,92,246,0.8)',
          '0 0 8px rgba(139,92,246,0.3)',
        ],
        duration: 1200,
        loop: true,
        easing: 'easeInOutSine',
      });
      return () => anim.pause();
    } else {
      animate(btnRef.current, {
        boxShadow: '0 0 15px rgba(139,92,246,0.2)',
        duration: 300,
      });
    }
  }, [loading, isWaitingForWake]);

  return (
    <div
      ref={cardRef}
      style={{ opacity: 0 }}
      className="glass-panel p-6 sm:p-8 rounded-lg border border-white/10 bg-white/[0.02] shadow-2xl relative"
    >
      <GlowingEffect spread={60} glow={true} disabled={false} proximity={100} inactiveZone={0.01} variant="default" />
      <form onSubmit={onSubmit} className="space-y-6">

        <div className="flex flex-col gap-2">
          <label
            className="font-gothic-block text-sm font-black text-[#8a8a92] uppercase tracking-widest"
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
                onChange={e => setUrl(e.target.value)}
                required
                disabled={loading || isWaitingForWake}
                className="block w-full rounded border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-sm text-white placeholder:text-[#8a8a92]/40 focus:border-[#8b5cf6]/40 focus:ring-1 focus:ring-[#8b5cf6]/20 transition-all outline-none font-techmono text-xs sm:text-sm"
                placeholder="example.com or https://example.com/..."
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <button
              ref={btnRef}
              type="submit"
              disabled={loading || isWaitingForWake}
              className="flex items-center justify-center rounded bg-[#8b5cf6] hover:bg-[#8b5cf6]/90 text-white px-10 py-4 text-base font-gothic-block tracking-widest uppercase font-black transition-colors disabled:opacity-50 disabled:cursor-wait shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              onMouseEnter={e => {
                if (!loading && !isWaitingForWake) {
                  animate(e.currentTarget, { scale: 1.04, duration: 180, easing: 'easeOutCubic' });
                }
              }}
              onMouseLeave={e => {
                animate(e.currentTarget, { scale: 1, duration: 180, easing: 'easeOutCubic' });
              }}
              onMouseDown={e => animate(e.currentTarget, { scale: 0.97, duration: 100, easing: 'easeOutCubic' })}
              onMouseUp={e => animate(e.currentTarget, { scale: 1.04, duration: 100, easing: 'easeOutCubic' })}
            >
              {(loading || isWaitingForWake) ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>SCANS RUNNING</span>
                </div>
              ) : (
                <span>ANALYZE →</span>
              )}
            </button>
          </div>

          {/* Wake Warning */}
          {isWaitingForWake && (
            <div className="mt-3 p-4 rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 flex items-start gap-3 animate-in glass-panel">
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

          {/* Error */}
          {error && (
            <div
              ref={errorRef}
              className="text-xs text-[#ef4444] font-mono mt-3 flex items-center gap-1.5 animate-in"
            >
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

      {/* Scan progress panel */}
      {loading && (
        <div className="mt-8 pt-6 border-t border-white/5 space-y-4 animate-in">

          <div className="flex justify-between items-center font-mono text-[10px] text-[#8a8a92] tracking-wider">
            <span>PIPELINE PROGRESS</span>
            <span className="font-bold text-white">{Math.floor(progress)}%</span>
          </div>

          {/* Progress bar — width driven by anime.js ref */}
          <div className="h-1 w-full bg-white/5 rounded overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.6)] rounded"
              style={{ width: '0%' }}
            />
          </div>

          {/* Step dots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 font-mono text-[10px] tracking-wider text-[#8a8a92]">
            {['DNS CHECKS', 'SSL PROTOCOL', 'AI CLASSIFICATION'].map((label, i) => (
              <div key={i} className={`flex items-center gap-2 ${scanStep > i ? 'text-white' : 'opacity-50'}`}>
                <span
                  ref={el => dotsRef.current[i] = el}
                  className="h-1.5 w-1.5 rounded-full inline-block"
                  style={{
                    backgroundColor: scanStep > i
                      ? '#10b981'
                      : (scanStep === i ? '#8b5cf6' : 'rgba(255,255,255,0.1)'),
                  }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
