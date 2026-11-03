import { useEffect, useRef, useState } from 'react';

const LINES = ['DETECT', 'phishing.', 'STAY AHEAD.'];
const STARTS = [900, 1260, 1980];
const SPEEDS = [60, 80, 60];
const EYEBROW = '/// REAL-TIME URL ANALYSIS';

export default function HeroHeading({ animated = false }) {
  const [elapsed, setElapsed] = useState(0);
  const progress = useRef(0);
  useEffect(() => {
    if (!animated || progress.current >= 2800) return;
    const start = performance.now();
    const timer = setInterval(() => {
      const next = performance.now() - start;
      progress.current = next;
      setElapsed(next);
      if (next >= 2800) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [animated]);
  const line = index => animated ? LINES[index].slice(0, Math.max(0, Math.floor((elapsed - STARTS[index]) / SPEEDS[index]))) : LINES[index];
  const eyebrow = !animated || elapsed >= 900 ? EYEBROW : [...EYEBROW].map((char, index) => index < elapsed / 35 ? char : char === ' ' ? ' ' : '#X+=01'[Math.floor(elapsed / 80 + index) % 6]).join('');
  return <div className="space-y-4">
    <p className="font-mono text-xs text-violet-300 tracking-[0.3em] uppercase block"><span className="sr-only">{EYEBROW}</span><span aria-hidden="true">{eyebrow}</span></p>
    <h1 aria-label="DETECT phishing. STAY AHEAD." className="hero-heading flex flex-col tracking-tighter uppercase select-none">
      <span aria-hidden="true" data-text={line(0)} className="hero-glitch text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-gothic-block font-extrabold tracking-tighter text-white inline-block leading-none">{line(0) || '\u00a0'}</span>
      <span aria-hidden="true" className="phishing-italic text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] tracking-tight font-normal my-0 normal-case inline-block leading-none -mt-1 sm:-mt-2">{line(1) || '\u00a0'}</span>
      <span aria-hidden="true" data-text={line(2)} className="hero-glitch metallic-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-gothic-block font-extrabold tracking-tighter inline-block leading-none mt-1 sm:mt-2">{line(2) || '\u00a0'}</span>
    </h1>
    <p className="text-slate-300 text-sm max-w-lg leading-relaxed pt-2">Understand unfamiliar URLs with trained machine learning, independent threat intelligence and explainable URL rules. See what was found, what was checked, and what remains unknown.</p>
  </div>;
}
