export default function Footer({ onLegalClick }) {
  return <footer className="border-t border-white/10 px-5 py-8 relative text-xs text-slate-400">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
      <div><p className="font-semibold text-slate-200 tracking-wider">PHISHX © 2026</p><p className="mt-1">Educational URL analysis · evidence with limitations</p></div>
      <div className="flex flex-wrap gap-5">
        <button type="button" className="hover:text-white underline-offset-4 hover:underline" onClick={() => onLegalClick('privacy')}>Privacy policy</button>
        <button type="button" className="hover:text-white underline-offset-4 hover:underline" onClick={() => onLegalClick('tos')}>Terms of service</button>
        <a className="hover:text-white underline-offset-4 hover:underline" href="https://github.com/athx1337/phishX" target="_blank" rel="noopener noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </div>
  </footer>;
}
