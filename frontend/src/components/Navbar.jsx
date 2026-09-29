import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export default function Navbar({ serverStatus, onNavClick }) {
  const navRef = useRef(null);
  const logoRef = useRef(null);
  const rightRef = useRef(null);

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'awake':   return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'waking':  return 'bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]';
      case 'offline': return 'bg-red-500';
      default:        return 'bg-slate-400 animate-pulse';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'awake':   return 'SYSTEM READY';
      case 'waking':  return 'SYSTEM WAKING';
      case 'offline': return 'SYSTEM OFFLINE';
      default:        return 'SYSTEM CHECKING';
    }
  };

  // ── Mount: slide navbar down + stagger children ──────────────────────────
  useEffect(() => {
    if (!navRef.current) return;

    // Navbar bar slides in from top
    animate(navRef.current, {
      translateY: ['-100%', '0%'],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutExpo',
    });

    // Logo text letters stagger in
    if (logoRef.current) {
      animate(logoRef.current.querySelectorAll('.logo-char'), {
        opacity:    [0, 1],
        translateY: ['-8px', '0px'],
        duration: 500,
        delay: stagger(60, { start: 200 }),
        easing: 'easeOutCubic',
      });
    }

    // Right-side items slide in from right
    if (rightRef.current) {
      animate(rightRef.current.querySelectorAll('.nav-item'), {
        opacity:    [0, 1],
        translateX: ['16px', '0px'],
        duration: 500,
        delay: stagger(80, { start: 400 }),
        easing: 'easeOutCubic',
      });
    }
  }, []);

  return (
    <header
      ref={navRef}
      style={{ opacity: 0 }}
      className="fixed top-0 left-0 w-full z-50 border-b border-white/5 glass-panel px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Left Side — Logo */}
        <div ref={logoRef} className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-sans font-bold tracking-[0.2em] text-lg text-white flex">
              {'PHISHX'.split('').map((c, i) => (
                <span key={i} className="logo-char inline-block" style={{ opacity: 0 }}>{c}</span>
              ))}
            </span>
            <span className="font-mono text-[9px] tracking-widest text-[#8a8a92] uppercase mt-0.5">
              BY ATHX1337
            </span>
          </div>
        </div>

        {/* Right Side */}
        <div ref={rightRef} className="flex items-center gap-4">

          {/* Status Badge */}
          <div className="nav-item flex items-center gap-2 border border-white/5 bg-white/[0.01] px-3 py-1.5 rounded font-mono text-[10px] tracking-wider text-[#8a8a92]"
            style={{ opacity: 0 }}>
            <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor()}`} />
            <span>{getStatusText()}</span>
          </div>

          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item flex items-center gap-2 px-3 py-1.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white border border-[#8b5cf6]/20 transition-colors font-mono text-[10px] tracking-wider uppercase font-bold"
            style={{ opacity: 0 }}
            onMouseEnter={e => animate(e.currentTarget, { scale: [1, 1.05], duration: 200, easing: 'easeOutCubic' })}
            onMouseLeave={e => animate(e.currentTarget, { scale: [1.05, 1], duration: 200, easing: 'easeOutCubic' })}
          >
            <span className="material-symbols-outlined text-xs">local_cafe</span>
            <span>Coffee</span>
          </a>

        </div>
      </div>
    </header>
  );
}
