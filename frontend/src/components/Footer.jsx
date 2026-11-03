export default function Footer({ onLegalClick }) {
  return <footer className="glass-panel border-t border-white/5 px-6 py-12 relative z-20 font-mono text-[10px] tracking-wider text-slate-300">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 justify-between items-center">
      <div className="text-center md:text-left"><p className="font-semibold text-slate-200 tracking-wider">PHISHX © 2026</p><p className="mt-1 text-[9px] uppercase">BY ATHX1337 // EDUCATION PROJECT</p></div>
      <p className="hidden xl:block text-center border-x border-white/10 px-8 py-1 text-violet-300">PHISHX // EVIDENCE BEFORE TRUST</p>
      <div className="flex flex-wrap gap-5">
        <button type="button" className="hover:text-white underline-offset-4 hover:underline" onClick={() => onLegalClick('privacy')}>Privacy policy</button>
        <button type="button" className="hover:text-white underline-offset-4 hover:underline" onClick={() => onLegalClick('tos')}>Terms of service</button>
        <a className="hover:text-white underline-offset-4 hover:underline" href="https://github.com/athx1337/phishX" target="_blank" rel="noopener noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </div>
  </footer>;
}
