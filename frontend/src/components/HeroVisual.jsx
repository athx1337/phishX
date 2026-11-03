import AsciiSimulation from './ui/AsciiSimulation';

export default function HeroVisual() {
  return <div className="w-full h-full relative select-none" aria-hidden="true">
    <AsciiSimulation chars="@#X%S+=-:,. " fontSize={10} color="#c084fc" bgColor="transparent" rotationSpeed={0.2} enableZoom={false} enablePan={false} className="absolute inset-0 w-full h-full pointer-events-none" />
  </div>;
}
