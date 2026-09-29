import React from 'react';

export default function GlitchText({
  text,
  children,
  intensity = 'low',
  className = '',
  as: Component = 'span',
}) {
  // Map intensity to animation duration (lower intensity = slower/less frequent glitching)
  const duration = intensity === 'low' ? '3s' : intensity === 'medium' ? '1.5s' : '0.5s';

  return (
    <Component
      className={`relative inline-block glitch-wrapper ${className}`}
      data-text={text}
      style={{ '--glitch-duration': duration }}
    >
      <span className="relative z-10">{children || text}</span>
      <span 
        className="absolute inset-0 z-0 glitch-layer-1 opacity-50"
        aria-hidden="true"
        data-text={text}
      />
      <span 
        className="absolute inset-0 z-0 glitch-layer-2 opacity-50"
        aria-hidden="true"
        data-text={text}
      />
    </Component>
  );
}
