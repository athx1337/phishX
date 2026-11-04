export default function Navbar({ serverStatus, onHistoryClick }) {
  const status = serverStatus === 'awake' ? 'API reachable' : serverStatus === 'offline' ? 'API unavailable' : 'Checking API';
  return <header className="navbar-enter fixed inset-x-0 top-0 z-50 border-b border-white/5 glass-panel px-6 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
      <a href="#main" className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"><span className="block text-[1.75rem] font-semibold leading-none tracking-[-0.07em] text-white">phish<span className="text-violet-300">X</span></span><span className="mt-1 block text-[10px] text-slate-400 font-mono tracking-[0.08em]">BY ATHX1337</span></a>
      <div className="flex items-center gap-2 sm:gap-4">
        <p role="status" className="text-xs font-medium text-slate-300 flex items-center gap-2 border border-white/10 bg-white/[0.01] px-2 sm:px-3 py-1.5 rounded"><span aria-hidden="true" className={`rounded-full w-1.5 h-1.5 ${serverStatus === 'awake' ? 'bg-sky-300' : serverStatus === 'offline' ? 'bg-amber-300' : 'bg-slate-400'}`} /><span>{status}</span></p>
        <button type="button" onClick={onHistoryClick} className="border border-violet-400/30 bg-violet-400/10 rounded px-2 sm:px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">Recent scans</button>
      </div>
    </div>
  </header>;
}
