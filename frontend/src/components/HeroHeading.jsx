import { useEffect, useRef, useState } from 'react';

const LINES = ['Detect', 'phishing.', 'Stay ahead.'];
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
    <p className="font-mono text-xs text-violet-300 tracking-[0.13em]"><span className="sr-only">{EYEBROW}</span><span aria-hidden="true">{eyebrow}</span></p>
    <h1 aria-label="Detect phishing. Stay ahead." className="hero-heading select-none">
      <span aria-hidden="true" className="hero-line"><span data-text={line(0)} className="hero-glitch text-white">{line(0) || '\u00a0'}</span>{' '}<em className="phishing-italic">{line(1) || '\u00a0'}</em></span>
      <span aria-hidden="true" className="hero-line"><span data-text={line(2)} className="hero-glitch metallic-text">{line(2) || '\u00a0'}</span></span>
    </h1>
    <p className="text-slate-300 text-base max-w-[47ch] leading-relaxed pt-2">Understand unfamiliar URLs with trained machine learning, independent threat intelligence and explainable URL rules. See what was found, what was checked, and what remains unknown.</p>
  </div>;
}
