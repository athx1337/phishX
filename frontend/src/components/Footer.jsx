import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function Footer({ onLegalClick }) {
  const footerRef = useRef(null);

  // ── Scroll-triggered fade-up via IntersectionObserver + anime.js ──────────
  useEffect(() => {
    if (!footerRef.current) return;
    const el = footerRef.current;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(el, {
            opacity:    [0, 1],
            translateY: ['20px', '0px'],
            duration: 700,
            easing: 'easeOutExpo',
          });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLinkHover = (e) => {
    animate(e.currentTarget, { translateY: '-2px', opacity: 1, duration: 150, easing: 'easeOutCubic' });
  };
  const handleLinkLeave = (e) => {
    animate(e.currentTarget, { translateY: '0px', opacity: 0.6, duration: 150, easing: 'easeOutCubic' });
  };

  return (
    <footer
      ref={footerRef}
      className="border-t border-white/5 py-12 bg-black/[0.2] font-mono text-[10px] tracking-wider text-[#8a8a92] relative z-20"
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Left Side */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-sans font-bold tracking-widest uppercase">PHISHX</span>
            <span>© 2026</span>
          </div>
          <span className="uppercase text-[9px]">BY ATHX1337 // EDUCATION PROJECT</span>
        </div>

        {/* Center ticker */}
        <div className="hidden lg:block text-center border-x border-white/5 px-12 py-1">
          <span className="text-[#8b5cf6]/60">PHISHX // SECURITY ENGINE // ONLINE</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          {[
            { label: 'PRIVACY POLICY', onClick: () => onLegalClick('privacy') },
            { label: 'TERMS OF SERVICE', onClick: () => onLegalClick('tos') },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{ opacity: 0.6 }}
              className="uppercase transition-none inline-block"
              onMouseEnter={handleLinkHover}
              onMouseLeave={handleLinkLeave}
            >
              {label}
            </button>
          ))}

          <a
            href="https://github.com/athx1337"
            target="_blank"
            rel="noopener noreferrer"
            style={{ opacity: 0.6 }}
            className="uppercase inline-block"
            onMouseEnter={handleLinkHover}
            onMouseLeave={handleLinkLeave}
          >
            GITHUB
          </a>
        </div>

      </div>
    </footer>
  );
}
