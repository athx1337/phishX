import React from 'react';

export default function Footer({ onLegalClick }) {
  return (
    <footer className="border-t border-white/5 py-12 bg-black/[0.2] font-mono text-[10px] tracking-wider text-[#8a8a92] relative z-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Left Side */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-sans font-bold tracking-widest uppercase">PHISHX</span>
            <span>© 2026</span>
          </div>
          <span className="uppercase text-[9px]">BY ATHX1337 // EDUCATION PROJECT</span>
        </div>

        {/* Center / Right - Technical Identifier */}
        <div className="hidden lg:block text-center border-x border-white/5 px-12 py-1">
          <span className="text-[#8b5cf6]/60">PHISHX // SECURITY ENGINE // ONLINE</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onLegalClick('privacy')}
            className="hover:text-white transition-colors uppercase"
          >
            PRIVACY POLICY
          </button>
          <button 
            onClick={() => onLegalClick('tos')}
            className="hover:text-white transition-colors uppercase"
          >
            TERMS OF SERVICE
          </button>
          <a 
            href="https://github.com/athx1337" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white transition-colors uppercase"
          >
            GITHUB
          </a>
        </div>

      </div>
    </footer>
  );
}
