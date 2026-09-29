/**
 * HeroVisual.jsx
 * Right-column centerpiece — now powered by AsciiSimulation (skiper14 equivalent).
 * Falls back gracefully: if no .glb is found it renders the procedural Chrome-X.
 */
import React from 'react';
import AsciiSimulation from './ui/AsciiSimulation';

export default function HeroVisual() {
  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[480px] relative flex items-center justify-center select-none z-10">

      {/* Subtle dark orb to separate ASCII from the chaotic background waves */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-black/90 blur-[90px] rounded-full pointer-events-none z-0"></div>

      {/* ── ASCII Simulation (skiper14 equivalent) ─────────────────────────────
          modelPath: tries to load /public/models/shield.glb
          Falls back automatically to the procedural Chrome-X if model is missing
      ──────────────────────────────────────────────────────────────────────── */}
      <AsciiSimulation
        modelPath="/models/shield.glb"
        chars="@#X%S+=-:,. "
        fontSize={9}
        color="#c084fc"
        bgColor="transparent"
        rotationSpeed={0.4}
        enableZoom={true}
        enablePan={false}
        className="absolute inset-0 w-full h-full pointer-events-auto"
      />

      {/* ── Decorative HUD overlays ────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 font-mono text-[8px] text-[#8a8a92]/40 tracking-wider hidden md:block pointer-events-none z-20">
        GRID_LOC // 45.92.83.1A <br />
        RENDER // ASCII_SIM_ENGINE
      </div>
      <div className="absolute bottom-4 right-4 font-mono text-[8px] text-[#8a8a92]/40 tracking-wider hidden md:block pointer-events-none z-20">
        CHARS // @#X%S+=-:,. <br />
        BACKEND // THREE_WEBGL
      </div>

    </div>
  );
}
