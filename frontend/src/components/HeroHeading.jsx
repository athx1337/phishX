/**
 * HeroHeading.jsx
 * Animated hero text using typewriter effect.
 */
import React, { useEffect, useRef, useState } from 'react';
import { animate, createTimeline, scrambleText } from 'animejs';
import GlitchText from './ui/glitch-text';

function TypewriterText({ text, speed = 40, delay = 0, onComplete, className, showCursor = false, glitch = true }) {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let interval;
    const timeout = setTimeout(() => {
      setIsTyping(true);
      let i = 0;
      interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, delay]);

  const content = (
    <>
      {displayed}
      {showCursor && isTyping && <span className="animate-pulse ml-1 opacity-70">_</span>}
    </>
  );

  if (!glitch) {
    return (
      <span className={className}>
        {content}
      </span>
    );
  }

  return (
    <GlitchText
      text={displayed}
      intensity="low"
      className={className}
      as="span"
    >
      {content}
    </GlitchText>
  );
}

export default function HeroHeading() {
  const rootRef   = useRef(null);
  const eyebrowRef = useRef(null);
  
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!rootRef.current) return;
    const tl = createTimeline({ defaults: { easing: 'easeOutExpo' } });

    // 1. Eyebrow — matrix scramble decode effect
    tl.add(eyebrowRef.current, {
      opacity: [0, 1],
      duration: 200,
    });
    tl.add(eyebrowRef.current, {
      ...scrambleText('/// REAL-TIME URL ANALYSIS'),
      duration: 900,
      onComplete: () => setStep(1) // Start typewriter sequence
    }, '-=100');
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* Eyebrow */}
      <span
        ref={eyebrowRef}
        style={{ opacity: 0 }}
        className="font-mono text-xs text-[#8b5cf6] tracking-[0.3em] uppercase block"
      >
        /// REAL-TIME URL ANALYSIS
      </span>

      {/* Headline Typewriter */}
      <h1 className="flex flex-col tracking-tight uppercase select-none overflow-hidden min-h-[220px]">
        {step >= 1 && (
          <TypewriterText
            text="DETECT"
            speed={60}
            showCursor={step === 1}
            onComplete={() => setStep(2)}
            className="text-3xl sm:text-4xl md:text-5xl font-gothic-block font-black tracking-tight text-white/95 inline-block"
          />
        )}

        {step >= 2 && (
          <TypewriterText
            text="phishing."
            speed={80}
            showCursor={step === 2}
            onComplete={() => setStep(3)}
            className="phishing-italic text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] tracking-tight font-normal my-0 normal-case inline-block text-white"
          />
        )}

        {step >= 3 && (
          <TypewriterText
            text="STAY AHEAD."
            speed={60}
            showCursor={step === 3}
            onComplete={() => setTimeout(() => setStep(4), 200)}
            className="metallic-text text-3xl sm:text-4xl md:text-5xl font-gothic-block font-black tracking-tight inline-block"
          />
        )}
      </h1>

      {/* Body Typewriter */}
      <div className="min-h-[60px]">
        {step >= 4 && (
          <TypewriterText
            text="phishX analyzes suspicious URLs instantly using machine learning, global threat intelligence and deep heuristics to keep you safe from credentials theft and online exploits."
            speed={25}
            showCursor={true}
            glitch={false}
            className="text-[#8a8a92] text-sm max-w-lg leading-relaxed pt-2 inline-block"
          />
        )}
      </div>
    </div>
  );
}
