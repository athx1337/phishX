export default function Navbar({ serverStatus, onHistoryClick }) {
  const status = serverStatus === 'awake' ? 'API reachable' : serverStatus === 'offline' ? 'API unavailable' : 'Checking API';
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 glass-panel px-5 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
      <a href="#main" className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"><span className="block font-gothic-block text-2xl font-extrabold tracking-widest text-white">PHISHX</span><span className="block text-[9px] text-slate-400 font-mono tracking-wider">BY ATHX1337</span></a>
      <div className="flex items-center gap-2 sm:gap-4">
        <p role="status" className="text-[10px] sm:text-xs font-mono text-slate-300 flex items-center gap-2"><span aria-hidden="true" className={`rounded-full w-1.5 h-1.5 ${serverStatus === 'awake' ? 'bg-sky-300' : serverStatus === 'offline' ? 'bg-amber-300' : 'bg-slate-400'}`} /><span>{status}</span></p>
        <button type="button" onClick={onHistoryClick} className="border border-white/15 rounded px-3 py-2 text-xs sm:text-sm text-violet-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">Recent scans</button>
      </div>
    </div>
  </header>;
}
