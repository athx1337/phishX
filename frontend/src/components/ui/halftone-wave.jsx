import React, { useEffect, useRef } from 'react';

// --- Simple 2D Simplex Noise Implementation ---
// A fast, lightweight implementation of 2D simplex noise
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

function buildPermutationTable() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = Math.floor(Math.random() * 256);
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = (perm[i] % 12);
  }
  return { perm, permMod12 };
}

const { perm, permMod12 } = buildPermutationTable();

function simplex2d(xin, yin) {
  let n0, n1, n2; 
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t; 
  const Y0 = j - t; 
  const x0 = xin - X0; 
  const y0 = yin - Y0; 
  
  let i1, j1; 
  if (x0 > y0) { i1 = 1; j1 = 0; } 
  else { i1 = 0; j1 = 1; }
  
  const x1 = x0 - i1 + G2; 
  const y1 = y0 - j1 + G2; 
  const x2 = x0 - 1.0 + 2.0 * G2; 
  const y2 = y0 - 1.0 + 2.0 * G2; 
  
  const ii = i & 255;
  const jj = j & 255;
  
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    const gi0 = permMod12[ii + perm[jj]];
    const gradX = gi0 < 4 ? 1 : gi0 < 8 ? -1 : 0;
    const gradY = gi0 < 4 ? 0 : gi0 < 8 ? (gi0 % 2 === 0 ? 1 : -1) : gi0 % 2 === 0 ? 1 : -1;
    n0 = t0 * t0 * (gradX * x0 + gradY * y0);
  }
  
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    const gi1 = permMod12[ii + i1 + perm[jj + j1]];
    const gradX = gi1 < 4 ? 1 : gi1 < 8 ? -1 : 0;
    const gradY = gi1 < 4 ? 0 : gi1 < 8 ? (gi1 % 2 === 0 ? 1 : -1) : gi1 % 2 === 0 ? 1 : -1;
    n1 = t1 * t1 * (gradX * x1 + gradY * y1);
  }
  
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    const gi2 = permMod12[ii + 1 + perm[jj + 1]];
    const gradX = gi2 < 4 ? 1 : gi2 < 8 ? -1 : 0;
    const gradY = gi2 < 4 ? 0 : gi2 < 8 ? (gi2 % 2 === 0 ? 1 : -1) : gi2 % 2 === 0 ? 1 : -1;
    n2 = t2 * t2 * (gradX * x2 + gradY * y2);
  }
  
  return 70.0 * (n0 + n1 + n2);
}

/**
 * Animated halftone dot grid with noise.
 */
export default function HalftoneWave({
  className = '',
  dotColor = 'rgba(255, 255, 255, 0.4)', // White/grey dots like the image
  backgroundColor = 'transparent',
  spacing = 12, // Tighter grid
  maxRadius = 7, // Radius slightly larger than half spacing so dots touch
  speed = 0.003,
  noiseScale = 0.03 // Controls how "zoomed in" the noise clouds are
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resize = () => {
      // Use devicePixelRatio for crisp rendering on high-DPI screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      time += speed;
      
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.fillStyle = dotColor;

      const cols = Math.floor(width / spacing) + 1;
      const rows = Math.floor(height / spacing) + 1;

      // Center the grid
      const offsetX = (width - (cols - 1) * spacing) / 2;
      const offsetY = (height - (rows - 1) * spacing) / 2;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = offsetX + x * spacing;
          const py = offsetY + y * spacing;

          // Generate 2D noise at this grid position, offset by time to make it move
          // Noise returns -1 to 1. We normalize it to 0 to 1.
          let n = simplex2d(x * noiseScale, y * noiseScale - time);
          
          // Map noise (-1 to 1) to (0 to 1)
          let intensity = (n + 1) / 2;
          
          // Add a subtle secondary noise layer for complexity
          let n2 = simplex2d(x * noiseScale * 2 - time * 1.5, y * noiseScale * 2);
          intensity += (n2 * 0.2); // Add 20% of detail noise
          
          // Clamp intensity
          intensity = Math.max(0, Math.min(1, intensity));

          // Sharpen the contrast slightly (mimicking the image)
          intensity = Math.pow(intensity, 1.5);

          const radius = intensity * maxRadius;

          if (radius > 0.5) {
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dotColor, backgroundColor, spacing, maxRadius, speed, noiseScale]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ display: 'block' }}
    />
  );
}
