import AsciiSimulation from './ui/AsciiSimulation';

export default function HeroVisual({ animated = false }) {
  return <div className="w-full h-full min-h-[350px] md:min-h-[480px] relative flex items-center justify-center select-none z-10" aria-hidden="true" data-testid="hero-visual" data-motion={animated ? 'running' : 'static'}>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-black/90 blur-[90px] rounded-full pointer-events-none z-0" />
    {animated ? <AsciiSimulation chars="@#X%S+=-:,. " fontSize={9} color="#c084fc" bgColor="transparent" rotationSpeed={0.4} enableZoom={false} enablePan={false} className="absolute inset-0 w-full h-full pointer-events-none" /> : <div className="ascii-static" data-testid="ascii-static">X</div>}
  </div>;
}
