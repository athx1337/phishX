/**
 * AsciiSimulation.jsx
 * Equivalent to @skiper-ui/skiper14 — built manually without a Pro license.
 *
 * Renders a Three.js scene (or a .glb model) as real-time ASCII characters
 * on a 2D canvas overlay. Compatible with Three.js r185+.
 *
 * Props:
 *  modelPath      {string}   Path to .glb model in /public. If omitted, renders
 *                            the built-in procedural Chrome-X object.
 *  chars          {string}   ASCII ramp from densest → sparsest  (default: '@#S%?*+;:,. ')
 *  fontSize       {number}   Cell size in px                     (default: 9)
 *  color          {string}   CSS color for ASCII chars            (default: '#c084fc')
 *  bgColor        {string}   CSS background                       (default: 'transparent')
 *  rotationSpeed  {number}   Auto-rotation speed                  (default: 0.3)
 *  enableZoom     {boolean}  Allow scroll-zoom via OrbitControls  (default: true)
 *  enablePan      {boolean}  Allow mouse-pan via OrbitControls    (default: false)
 *  className      {string}   Extra class names for wrapper div
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_CHARS = '@#S%?*+;:,. ';
const DEFAULT_COLOR = '#c084fc';
const DEFAULT_FONT_SIZE = 9;

// ─── ASCII renderer core ───────────────────────────────────────────────────────
function buildAsciiRenderer(glRenderer, camera, chars, fontSize, color) {
  const domElement = document.createElement('canvas');
  domElement.style.position = 'absolute';
  domElement.style.top = '0';
  domElement.style.left = '0';
  domElement.style.width = '100%';
  domElement.style.height = '100%';
  domElement.style.imageRendering = 'pixelated';
  domElement.className = 'ascii-canvas ascii-mount';

  const ctx2d = domElement.getContext('2d', { willReadFrequently: true });

  // Offscreen pixel-read buffer (low-res)
  const pixelCanvas = document.createElement('canvas');
  const pixelCtx = pixelCanvas.getContext('2d', { willReadFrequently: true });

  function setSize(w, h) {
    domElement.width = w;
    domElement.height = h;

    const cols = Math.floor(w / fontSize);
    const rows = Math.floor(h / fontSize);
    pixelCanvas.width = cols;
    pixelCanvas.height = rows;
  }

  function render(scene) {
    const w = domElement.width;
    const h = domElement.height;
    if (!w || !h) return;

    const cols = pixelCanvas.width;
    const rows = pixelCanvas.height;
    if (!cols || !rows) return;

    // Render Three.js scene to its canvas
    glRenderer.render(scene, camera);

    // Downscale WebGL output into pixelCanvas
    pixelCtx.clearRect(0, 0, cols, rows);
    pixelCtx.drawImage(glRenderer.domElement, 0, 0, cols, rows);

    const imageData = pixelCtx.getImageData(0, 0, cols, rows).data;

    // Draw ASCII to output canvas
    ctx2d.fillStyle = 'rgba(0,0,0,0)';
    ctx2d.clearRect(0, 0, w, h);

    ctx2d.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx2d.textBaseline = 'top';
    ctx2d.fillStyle = color;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        const a = imageData[idx + 3];

        if (a < 20) continue; // transparent → skip

        // Perceived brightness (ITU-R BT.709)
        const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const charIdx = Math.floor(brightness * (chars.length - 1));
        const char = chars[charIdx] || ' ';

        if (char === ' ') continue;

        // Tint the character with the model's own colour but multiply brightness heavily
        const boost = 2.2;
        ctx2d.fillStyle = `rgba(${Math.min(r * boost, 255)},${Math.min(g * boost, 255)},${Math.min(b * boost, 255)},${Math.min(a / 255 + 0.4, 1)})`;
        ctx2d.fillText(char, col * fontSize, row * fontSize);
      }
    }
  }

  return { domElement, setSize, render };
}

// ─── Build procedural Chrome-X (fallback when no .glb is provided) ─────────────
function buildProceduralScene(scene) {
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512;
  envCanvas.height = 256;
  const ec = envCanvas.getContext('2d');

  ec.fillStyle = '#040406';
  ec.fillRect(0, 0, 512, 256);

  const gradCyan = ec.createRadialGradient(100, 128, 5, 100, 128, 180);
  gradCyan.addColorStop(0, '#00f5ff');
  gradCyan.addColorStop(0.4, '#005f73');
  gradCyan.addColorStop(1, 'transparent');
  ec.fillStyle = gradCyan;
  ec.beginPath(); ec.arc(100, 128, 180, 0, Math.PI * 2); ec.fill();

  const gradPurple = ec.createRadialGradient(412, 128, 5, 412, 128, 180);
  gradPurple.addColorStop(0, '#d946ef');
  gradPurple.addColorStop(0.4, '#701a75');
  gradPurple.addColorStop(1, 'transparent');
  ec.fillStyle = gradPurple;
  ec.beginPath(); ec.arc(412, 128, 180, 0, Math.PI * 2); ec.fill();

  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envTex;

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.02, envMapIntensity: 3.5, flatShading: true,
  });
  const smoothChrome = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 1.0, roughness: 0.02, envMapIntensity: 3.5,
  });

  const xGroup = new THREE.Group();
  const bar = new THREE.BoxGeometry(0.5, 2.5, 0.5);
  const b1 = new THREE.Mesh(bar, chrome); b1.rotation.z = Math.PI / 4; xGroup.add(b1);
  const b2 = new THREE.Mesh(bar, chrome); b2.rotation.z = -Math.PI / 4; xGroup.add(b2);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), chrome); xGroup.add(core);
  scene.add(xGroup);

  const blobGeom = new THREE.TorusKnotGeometry(0.24, 0.07, 128, 16);
  const blob1 = new THREE.Mesh(blobGeom, smoothChrome);
  blob1.position.set(-1.8, 1.3, -0.5);
  scene.add(blob1);
  const blob2 = new THREE.Mesh(blobGeom, smoothChrome);
  blob2.position.set(1.8, -1.3, -0.5);
  scene.add(blob2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.1));
  const d1 = new THREE.DirectionalLight(0xffffff, 3); d1.position.set(3, 5, 6); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xa855f7, 2); d2.position.set(-5, 5, 3); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0x00f5ff, 2); d3.position.set(5, -5, 3); scene.add(d3);
  scene.add(new THREE.PointLight(0xc084fc, 1.5, 8));

  return {
    animate(t, targetX, targetY) {

      xGroup.rotation.y = t * 0.25;
      xGroup.position.y = Math.sin(t * 0.8) * 0.12;
      xGroup.rotation.x += (targetY * 0.8 - xGroup.rotation.x) * 0.05;
      xGroup.rotation.z += (targetX * 0.8 - xGroup.rotation.z) * 0.05;
      blob1.rotation.x = t * 0.2; blob1.rotation.y = -t * 0.15;
      blob1.position.set(-1.8 + targetX * 0.6, 1.3 + Math.sin(t * 0.6) * 0.08 + targetY * 0.6, -0.5);
      blob2.rotation.x = -t * 0.15; blob2.rotation.y = t * 0.2;
      blob2.position.set(1.8 + targetX * 0.6, -1.3 + Math.sin(t * 0.5 + 2) * 0.08 + targetY * 0.6, -0.5);
    },
    dispose() {
      bar.dispose(); blobGeom.dispose(); chrome.dispose(); smoothChrome.dispose(); envTex.dispose();
    },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AsciiSimulation({
  modelPath,
  chars = DEFAULT_CHARS,
  fontSize = DEFAULT_FONT_SIZE,
  color = DEFAULT_COLOR,
  bgColor = 'transparent',
  rotationSpeed = 0.3,
  enableZoom = true,
  enablePan = false,
  className = '',
}) {
  const wrapperRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let rafId;
    let destroyed = false;

    // ── WebGL renderer (hidden, used as pixel source) ──────────────────────────
    const glRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    glRenderer.setPixelRatio(1); // keep offscreen renderer cheap
    glRenderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 6;

    // ── ASCII canvas overlay ────────────────────────────────────────────────────
    const ascii = buildAsciiRenderer(glRenderer, camera, chars, fontSize, color);
    ascii.domElement.style.background = bgColor;
    wrapper.appendChild(ascii.domElement);

    // ── OrbitControls on the ASCII canvas ──────────────────────────────────────
    const controls = new OrbitControls(camera, ascii.domElement);
    controls.enableZoom = enableZoom;
    controls.enablePan = enablePan;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = rotationSpeed * 10;

    // ── Procedural fallback or .glb load ───────────────────────────────────────
    let procedural = null;
    let modelAnimMixer = null;

    function finishSetup() {
      if (destroyed) return;
      setLoaded(true);

      // Size sync
      function syncSize() {
        if (!wrapper) return;
        const w = wrapper.clientWidth || 450;
        const h = wrapper.clientHeight || 450;
        glRenderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        ascii.setSize(w, h);
      }
      syncSize();
      const ro = new ResizeObserver(syncSize);
      ro.observe(wrapper);

      // Mouse parallax (only for procedural)
      let mx = 0, my = 0;
      function onMouse(e) {
        mx = (e.clientX / window.innerWidth) - 0.5;
        my = (e.clientY / window.innerHeight) - 0.5;
      }
      if (!modelPath) window.addEventListener('mousemove', onMouse);

      const clock = new THREE.Clock();

      function loop() {
        rafId = requestAnimationFrame(loop);
        const t = clock.getElapsedTime();
        if (procedural) procedural.animate(t, mx, my);
        if (modelAnimMixer) modelAnimMixer.update(clock.getDelta());
        controls.update();
        ascii.render(scene);
      }
      loop();

      return () => {
        ro.disconnect();
        if (!modelPath) window.removeEventListener('mousemove', onMouse);
      };
    }

    if (modelPath) {
      // ── Load .glb ────────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(5, 8, 5);
      scene.add(sun);
      const fill = new THREE.DirectionalLight(0xa855f7, 1.5);
      fill.position.set(-5, 2, -3);
      scene.add(fill);

      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          if (destroyed) return;
          const model = gltf.scene;

          // Auto-center & scale
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3()).length();
          model.position.sub(center);
          model.scale.setScalar(4 / size);
          scene.add(model);

          if (gltf.animations?.length) {
            modelAnimMixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach(clip => modelAnimMixer.clipAction(clip).play());
          }

          controls.autoRotate = true;
          finishSetup();
        },
        undefined,
        (err) => {
          console.warn('[AsciiSimulation] GLB load failed, falling back to procedural.', err);
          setLoadError('model-fallback');
          procedural = buildProceduralScene(scene);
          finishSetup();
        }
      );
    } else {
      // ── Procedural Chrome-X ───────────────────────────────────────────────
      procedural = buildProceduralScene(scene);
      controls.autoRotate = false; // procedural has its own rotation
      finishSetup();
    }

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      controls.dispose();
      if (procedural) procedural.dispose();
      glRenderer.dispose();
      if (wrapper.contains(ascii.domElement)) wrapper.removeChild(ascii.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelPath, chars, fontSize, color, bgColor, rotationSpeed, enableZoom, enablePan]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${className}`}
      style={{ background: bgColor }}
    >
      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
          <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[9px] text-[#8a8a92] tracking-[0.3em] uppercase animate-pulse">
            INIT ASCII ENGINE
          </span>
        </div>
      )}

      {/* Debug note if model fell back */}
      {loadError === 'model-fallback' && (
        <div className="absolute bottom-2 left-2 font-mono text-[7px] text-yellow-500/40 pointer-events-none z-20">
          MODEL LOAD FAILED · PROCEDURAL FALLBACK
        </div>
      )}
    </div>
  );
}
