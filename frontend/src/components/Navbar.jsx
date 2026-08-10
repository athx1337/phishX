import React from 'react';

export default function Navbar({ serverStatus, onNavClick, activeModal }) {
  const getStatusColor = () => {
    switch (serverStatus) {
      case 'awake': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'waking': return 'bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]';
      case 'offline': return 'bg-red-500';
      default: return 'bg-slate-400 animate-pulse';
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'awake': return 'SYSTEM READY';
      case 'waking': return 'SYSTEM WAKING';
      case 'offline': return 'SYSTEM OFFLINE';
      default: return 'SYSTEM CHECKING';
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-brand-black/40 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-sans font-bold tracking-[0.2em] text-lg text-white">PHISHX</span>
            <span className="font-mono text-[9px] tracking-widest text-[#8a8a92] uppercase mt-0.5">
              BY ATHX1337
            </span>
          </div>
        </div>



        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 border border-white/5 bg-white/[0.01] px-3 py-1.5 rounded font-mono text-[10px] tracking-wider text-[#8a8a92]">
            <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor()}`}></span>
            <span>{getStatusText()}</span>
          </div>

          <a 
            href="#" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#8b5cf6]/10 text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white border border-[#8b5cf6]/20 transition-all font-mono text-[10px] tracking-wider uppercase font-bold"
          >
            <span className="material-symbols-outlined text-xs">local_cafe</span>
            <span>Coffee</span>
          </a>
        </div>

      </div>
    </header>
  );
}
