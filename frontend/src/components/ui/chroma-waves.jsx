import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_color;
  uniform vec3 u_bgColor;
  uniform float u_speed;
  uniform float u_waveFreq;
  uniform float u_waveAmp;
  uniform float u_distortion;
  uniform float u_chromaShift;
  uniform float u_noiseLevel;
  uniform float u_flatness;

  // 2D Simplex Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Very smooth domain warping (No high-frequency fBm)
  float pattern(vec2 p) {
      float t = u_time * u_speed * 0.1;
      
      // First domain warp (large scale)
      vec2 q = vec2(
          snoise(p + vec2(0.0, 0.0) + t),
          snoise(p + vec2(5.2, 1.3) - t)
      );

      // Second domain warp
      vec2 r = vec2(
          snoise(p + u_distortion * q + vec2(1.7, 9.2) + 0.15 * t),
          snoise(p + u_distortion * q + vec2(8.3, 2.8) - 0.12 * t)
      );

      // Final noise sample
      return snoise(p + u_waveAmp * r);
  }

  float getWave(vec2 p) {
      // Zoom in massively on the noise by keeping frequency very low
      float noiseVal = pattern(p * u_waveFreq);
      
      // Normalize to 0-1
      float val = (noiseVal + 1.0) * 0.5;
      
      // Extremely soft map to create thick, glowing folds
      // We use a sine curve to make it wrap and form thick ridges
      val = sin(val * 3.14159265);
      
      // Smooth and flatten the peaks based on flatness
      val = pow(val, u_flatness);
      return val;
  }

  // PRNG for grain
  float rand(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv;
      p.x *= u_resolution.x / u_resolution.y;

      // Chromatic Aberration Offset
      vec2 shift = vec2(u_chromaShift * 0.01, 0.0);
      
      float valR = getWave(p + shift);
      float valG = getWave(p);
      float valB = getWave(p - shift);

      // A rich, multi-stop gradient function
      // Background (very dark) -> Midtone (rich purple) -> Highlight (bright lilac/white)
      vec3 midColor = vec3(0.22, 0.12, 0.45); // Rich deep purple midtone
      
      // We create a function-like evaluation for each channel
      // R channel
      float tR = valR;
      float r = mix(u_bgColor.r, midColor.r, smoothstep(0.0, 0.4, tR));
      r = mix(r, u_color.r, smoothstep(0.4, 1.0, tR));

      // G channel
      float tG = valG;
      float g = mix(u_bgColor.g, midColor.g, smoothstep(0.0, 0.4, tG));
      g = mix(g, u_color.g, smoothstep(0.4, 1.0, tG));

      // B channel
      float tB = valB;
      float b = mix(u_bgColor.b, midColor.b, smoothstep(0.0, 0.4, tB));
      b = mix(b, u_color.b, smoothstep(0.4, 1.0, tB));

      vec3 col = vec3(r, g, b);

      // Grain overlay
      float grain = (rand(gl_FragCoord.xy + u_time) - 0.5) * u_noiseLevel;
      col += grain;

      gl_FragColor = vec4(col, 1.0);
  }
`;

export default function ChromaWaves({
  width = "100%",
  height = "100%",
  speed = 0.5,
  color = "#FFFFFF",
  backgroundColor = "#8B5CF6", // Purple
  waveFrequency = 0.2,
  waveAmplitude = 0.3,
  distortion = 1.5,
  chromaShift = 0.25,
  noiseLevel = 0.1,
  flatness = 1.0,
  opacity = 1.0,
  quality = "high", // currently unused, resolution can be tied to this
  className = "",
  children
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Set up Three.js Scene
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
    
    // Performance optimization: Render at a lower resolution and scale up.
    // The waves are soft and blurry, so low resolution looks perfectly fine
    // while giving massive performance gains.
    let dpr = 0.5; // low
    if (quality === "medium") dpr = Math.min(1.0, window.devicePixelRatio || 1);
    else if (quality === "high") dpr = Math.min(1.5, window.devicePixelRatio || 1);
    
    renderer.setPixelRatio(dpr);
    container.appendChild(renderer.domElement);

    const parseColor = (hex) => {
      const c = new THREE.Color(hex);
      return new THREE.Vector3(c.r, c.g, c.b);
    };

    const uniforms = {
      u_resolution: { value: new THREE.Vector2() },
      u_time: { value: 0.0 },
      u_color: { value: parseColor(color) },
      u_bgColor: { value: parseColor(backgroundColor) },
      u_speed: { value: speed },
      u_waveFreq: { value: waveFrequency },
      u_waveAmp: { value: waveAmplitude },
      u_distortion: { value: distortion },
      u_chromaShift: { value: chromaShift },
      u_noiseLevel: { value: noiseLevel },
      u_flatness: { value: flatness }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w * dpr, h * dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    let animationId;
    let clock = new THREE.Clock();

    const render = () => {
      uniforms.u_time.value = clock.getElapsedTime();
      
      // Update dynamic uniforms if props changed (React effect deps cover creation, 
      // but to be fully reactive without recreation, you'd typically sync them in a separate effect. 
      // For simplicity, recreation on prop change is acceptable here, or we just rely on the effect).
      
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
      container.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [
    speed, color, backgroundColor, waveFrequency, waveAmplitude, 
    distortion, chromaShift, noiseLevel, flatness, quality
  ]);

  return (
    <div 
      className={`relative overflow-hidden ${className}`} 
      style={{ width, height, opacity }}
    >
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full pointer-events-none" 
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
