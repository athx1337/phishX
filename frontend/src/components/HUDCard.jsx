import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { GlowingEffect } from './ui/glowing-effect';

// Generic wrapper that slides + fades a HUD card in on mount from a given direction
function useHUDEntrance(ref, direction = 'left', delay = 0) {
  useEffect(() => {
    if (!ref.current) return;
    const x = direction === 'left' ? '-20px' : direction === 'right' ? '20px' : '0px';
    const y = direction === 'up' ? '20px' : '0px';
    animate(ref.current, {
      opacity:    [0, 1],
      translateX: [x, '0px'],
      translateY: [y, '0px'],
      duration: 600,
      delay,
      easing: 'easeOutExpo',
    });
  }, []);
}

// Animates a numeric text node from 0 to `target`
function useCountUp(ref, target, shouldRun, duration = 800) {
  useEffect(() => {
    if (!ref.current || !shouldRun || target == null) return;
    const num = parseFloat(target);
    if (isNaN(num)) return;

    const obj = { val: 0 };
    animate(obj, {
      val: num,
      duration,
      easing: 'easeOutQuad',
      onUpdate() {
        if (ref.current) ref.current.textContent = Math.round(obj.val);
      },
    });
  }, [target, shouldRun]);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HUDCard({ type, loading, result, error }) {
  const cardRef  = useRef(null);
  const scoreRef = useRef(null);

  if (type === 'safety-score') {
    const getScoreInfo = () => {
      if (loading) return { score: null, displayScore: '---', text: 'ANALYZING...', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' };
      if (error)   return { score: null, displayScore: 'ERR', text: 'SCAN ERROR',   color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20' };
      if (result) {
        if (result.is_phishing) {
          return { score: 18, displayScore: '18', text: '● CRITICAL THREAT', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
        }
        const suspiciousCount = result.features_extracted?.reduce((a, b) => a + b, 0) ?? 0;
        const score = Math.max(70, 100 - suspiciousCount * 10);
        return { score, displayScore: `${score}`, text: '● VERY SAFE', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      }
      return { score: 98, displayScore: '98', text: '● SYSTEM READY', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/10' };
    };

    const info = getScoreInfo();

    useHUDEntrance(cardRef, 'left', 600);
    useCountUp(scoreRef, info.score, !!info.score);

    return (
      <div ref={cardRef} style={{ opacity: 0 }}
        className="glass-panel relative p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// SAFETY SCORE</span>
        <div className="flex items-baseline gap-1 mt-2">
          <span ref={scoreRef} className="text-3xl font-black text-white">
            {info.displayScore}
          </span>
          <span className="text-xs text-[#8a8a92]">/100</span>
        </div>
        <div className={`mt-3 py-1 px-2 rounded text-[9px] font-bold tracking-widest text-center ${info.color} ${info.bg} border`}>
          {info.text}
        </div>
      </div>
    );
  }

  if (type === 'threat-intel') {
    const getThreatInfo = () => {
      if (loading) return { text: 'POLLING FEEDS',     detail: '18 GLOBAL DATABASES' };
      if (result) {
        const malicious = result.engines?.filter(e => e.malicious).length ?? 0;
        const total     = result.engines?.length ?? 1;
        return { text: `${malicious} FLAGS DETECTED`, detail: `SCAN COMPLETE ON ${total} ENGINES` };
      }
      return { text: '800+ ACTIVE SOURCES', detail: 'THREAT DATABASE ONLINE' };
    };

    const info = getThreatInfo();
    useHUDEntrance(cardRef, 'right', 700);

    return (
      <div ref={cardRef} style={{ opacity: 0 }}
        className="glass-panel relative p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// THREAT INTEL</span>
        <p className="text-sm font-bold text-white mt-2 leading-none">{info.text}</p>
        <span className="text-[8px] text-[#8a8a92]/60 mt-3 block tracking-widest uppercase">{info.detail}</span>
      </div>
    );
  }

  if (type === 'ai-analysis') {
    const getAIInfo = () => {
      if (loading) return { text: 'EVALUATING MODEL', detail: 'XGBOOST CLASSIFIER' };
      if (result) {
        return result.is_phishing
          ? { text: 'HIGH RISK LOGIC', detail: 'MODEL VALUE: DETECTED' }
          : { text: 'CLEAN PROFILE',   detail: 'MODEL VALUE: PASS' };
      }
      return { text: 'HEURISTICS READY', detail: 'AI PRE-CLASSIFIER: SLEEP' };
    };

    const info = getAIInfo();
    useHUDEntrance(cardRef, 'left', 800);

    return (
      <div ref={cardRef} style={{ opacity: 0 }}
        className="glass-panel relative p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// AI ANALYSIS</span>
        <p className="text-sm font-bold text-white mt-2 leading-none truncate" title={info.text}>{info.text}</p>
        <div className="mt-3 w-full bg-white/5 h-[1px]" />
        <span className="text-[8px] text-[#8a8a92]/60 mt-2 block tracking-widest uppercase">{info.detail}</span>
      </div>
    );
  }

  if (type === 'verdict') {
    const getVerdictInfo = () => {
      if (loading) return { icon: '🔄', text: 'RUNNING PIPELINE', color: 'text-yellow-500' };
      if (error)   return { icon: '⚠️',  text: 'SCAN FAIL',        color: 'text-red-500' };
      if (result) {
        return result.is_phishing
          ? { icon: '✗', text: 'MALICIOUS LINK',  color: 'text-red-500' }
          : { icon: '✓', text: 'NO THREATS FOUND', color: 'text-emerald-500' };
      }
      return { icon: '●', text: 'WAITING INPUT', color: 'text-[#8a8a92]' };
    };

    const info = getVerdictInfo();
    useHUDEntrance(cardRef, 'right', 900);

    // Pop the icon when verdict arrives
    const iconRef = useRef(null);
    useEffect(() => {
      if (result && iconRef.current) {
        animate(iconRef.current, {
          scale:  [0.5, 1.3, 1],
          rotate: ['-10deg', '5deg', '0deg'],
          duration: 500,
          easing: 'easeOutElastic(1, 0.6)',
        });
      }
    }, [result]);

    return (
      <div ref={cardRef} style={{ opacity: 0 }}
        className="glass-panel relative p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// FINAL VERDICT</span>
        <div className="flex items-center gap-3 mt-2">
          <span ref={iconRef} className={`text-2xl font-black ${info.color} inline-block`}>{info.icon}</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{info.text}</span>
        </div>
      </div>
    );
  }

  return null;
}
