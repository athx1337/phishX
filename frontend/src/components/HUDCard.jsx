import React from 'react';

export default function HUDCard({ type, loading, result, error }) {
  // Render different details based on type
  if (type === 'safety-score') {
    const getScoreInfo = () => {
      if (loading) return { score: '---', text: 'ANALYZING...', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' };
      if (error) return { score: 'ERR', text: 'SCAN ERROR', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
      if (result) {
        if (result.is_phishing) {
          return { score: '18', text: '● CRITICAL THREAT', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
        } else {
          // Calculate score based on features extracted
          const suspiciousCount = result.features_extracted ? result.features_extracted.reduce((a, b) => a + b, 0) : 0;
          const score = Math.max(70, 100 - suspiciousCount * 10);
          return { score: `${score}`, text: '● VERY SAFE', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
        }
      }
      return { score: '98', text: '● SYSTEM READY', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/10' };
    };

    const info = getScoreInfo();

    return (
      <div className={`glass-panel p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left transition-all duration-300`}>
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// SAFETY SCORE</span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-black text-white">{info.score}</span>
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
      if (loading) return { text: 'POLLING FEEDS', detail: '18 GLOBAL DATABASES' };
      if (result) {
        const malicious = result.engines ? result.engines.filter(e => e.malicious).length : 0;
        const total = result.engines ? result.engines.length : 1;
        return { text: `${malicious} FLAGS DETECTED`, detail: `SCAN COMPLETE ON ${total} ENGINES` };
      }
      return { text: '800+ ACTIVE SOURCES', detail: 'THREAT DATABASE ONLINE' };
    };

    const info = getThreatInfo();

    return (
      <div className="glass-panel p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left transition-all duration-300">
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
        if (result.is_phishing) {
          return { text: 'HIGH RISK LOGIC', detail: 'MODEL VALUE: DETECTED' };
        } else {
          return { text: 'CLEAN PROFILE', detail: 'MODEL VALUE: PASS' };
        }
      }
      return { text: 'HEURISTICS READY', detail: 'AI PRE-CLASSIFIER: SLEEP' };
    };

    const info = getAIInfo();

    return (
      <div className="glass-panel p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left transition-all duration-300">
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// AI ANALYSIS</span>
        <p className="text-sm font-bold text-white mt-2 leading-none truncate" title={info.text}>{info.text}</p>
        <div className="mt-3 w-full bg-white/5 h-[1px]"></div>
        <span className="text-[8px] text-[#8a8a92]/60 mt-2 block tracking-widest uppercase">{info.detail}</span>
      </div>
    );
  }

  if (type === 'verdict') {
    const getVerdictInfo = () => {
      if (loading) return { icon: '🔄', text: 'RUNNING PIPELINE', color: 'text-yellow-500' };
      if (error) return { icon: '⚠️', text: 'SCAN FAIL', color: 'text-red-500' };
      if (result) {
        if (result.is_phishing) {
          return { icon: '✗', text: 'MALICIOUS LINK', color: 'text-red-500' };
        } else {
          return { icon: '✓', text: 'NO THREATS FOUND', color: 'text-emerald-500' };
        }
      }
      return { icon: '●', text: 'WAITING INPUT', color: 'text-[#8a8a92]' };
    };

    const info = getVerdictInfo();

    return (
      <div className="glass-panel p-4 rounded border border-white/5 bg-white/[0.01] w-48 font-mono text-left transition-all duration-300">
        <span className="text-[9px] text-[#8a8a92] block tracking-wider uppercase">// FINAL VERDICT</span>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-2xl font-black ${info.color}`}>{info.icon}</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{info.text}</span>
        </div>
      </div>
    );
  }

  return null;
}
