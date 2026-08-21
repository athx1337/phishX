import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroVisual() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear any previous canvas on mount / HMR
    const container = mountRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = container.clientWidth || 450;
    const height = container.clientHeight || 450;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // Helper to generate a procedural neon environment map canvas
    const createProceduralEnvMap = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Base dark void background
      ctx.fillStyle = '#040406';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyan light source (left reflection zone)
      let gradCyan = ctx.createRadialGradient(100, 128, 5, 100, 128, 180);
      gradCyan.addColorStop(0, '#00f5ff');
      gradCyan.addColorStop(0.2, '#005f73');
      gradCyan.addColorStop(0.6, '#0a0915');
      gradCyan.addColorStop(1, 'transparent');
      ctx.fillStyle = gradCyan;
      ctx.beginPath();
      ctx.arc(100, 128, 180, 0, Math.PI * 2);
      ctx.fill();

      // Electric purple light source (right reflection zone)
      let gradPurple = ctx.createRadialGradient(412, 128, 5, 412, 128, 180);
      gradPurple.addColorStop(0, '#d946ef');
      gradPurple.addColorStop(0.2, '#701a75');
      gradPurple.addColorStop(0.6, '#0a0915');
      gradPurple.addColorStop(1, 'transparent');
      ctx.fillStyle = gradPurple;
      ctx.beginPath();
      ctx.arc(412, 128, 180, 0, Math.PI * 2);
      ctx.fill();

      // Sharp white specular light bar (top reflecting edge)
      let gradWhite = ctx.createLinearGradient(0, 20, 0, 70);
      gradWhite.addColorStop(0, 'transparent');
      gradWhite.addColorStop(0.5, '#ffffff');
      gradWhite.addColorStop(1, 'transparent');
      ctx.fillStyle = gradWhite;
      ctx.fillRect(0, 20, canvas.width, 50);

      // Extra neon magenta streak
      let gradMagenta = ctx.createLinearGradient(0, 180, canvas.width, 220);
      gradMagenta.addColorStop(0.2, 'transparent');
      gradMagenta.addColorStop(0.5, '#c084fc');
      gradMagenta.addColorStop(0.8, 'transparent');
      ctx.fillStyle = gradMagenta;
      ctx.fillRect(0, 170, canvas.width, 60);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      return texture;
    };

    // Instantiate and assign the environment texture
    const envTexture = createProceduralEnvMap();
    scene.environment = envTexture;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // 4. Centerpiece 3D Chrome "X" Object
    const xGroup = new THREE.Group();

    // Material with liquid chrome metallic characteristics
    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white color acts as a mirror for the envMap
      metalness: 1.0, // Fully metallic
      roughness: 0.02, // Polished mirror surface
      envMapIntensity: 3.5, // Amplify reflection brightness
      flatShading: true // Gives a sharp, machined, tech look
    });

    // Material for smooth organic liquid metal elements (no flatShading)
    const smoothChromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1.0,
      roughness: 0.02,
      envMapIntensity: 3.5,
      flatShading: false
    });

    // Outer wireframe details
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });

    // Create the X bar meshes (sharp box geometries)
    const barGeom = new THREE.BoxGeometry(0.5, 2.5, 0.5);
    const coreGeom = new THREE.OctahedronGeometry(0.5, 0);

    const bar1 = new THREE.Mesh(barGeom, chromeMaterial);
    bar1.rotation.z = Math.PI / 4;
    xGroup.add(bar1);

    const bar2 = new THREE.Mesh(barGeom, chromeMaterial);
    bar2.rotation.z = -Math.PI / 4;
    xGroup.add(bar2);

    // Add a center diamond core
    const core = new THREE.Mesh(coreGeom, chromeMaterial);
    xGroup.add(core);

    scene.add(xGroup);

    // 5. Outer Orbiting Ring (Torus)
    const torusGeom = new THREE.TorusGeometry(1.8, 0.015, 8, 64);
    const torus = new THREE.Mesh(torusGeom, wireMaterial);
    torus.rotation.x = Math.PI / 3;
    scene.add(torus);

    // 5.1 Floating Liquid Metal Blobs (representing top-left and bottom-right visual reference)
    const blobGeom = new THREE.TorusKnotGeometry(0.24, 0.07, 128, 16);
    
    // Top-left organic blob
    const blob1 = new THREE.Mesh(blobGeom, smoothChromeMaterial);
    blob1.position.set(-1.8, 1.3, -0.5);
    scene.add(blob1);

    // Bottom-right organic blob
    const blob2 = new THREE.Mesh(blobGeom, smoothChromeMaterial);
    blob2.position.set(1.8, -1.3, -0.5);
    scene.add(blob2);

    // 5.2 Orbiting Chrome Sparkles (representing stars in the reference image)
    const sparkleGeom = new THREE.OctahedronGeometry(0.04, 0);
    const sparkleGroup = new THREE.Group();
    const numSparkles = 8;
    for (let i = 0; i < numSparkles; i++) {
      const sparkle = new THREE.Mesh(sparkleGeom, chromeMaterial);
      const angle = (i / numSparkles) * Math.PI * 2;
      const radius = 1.8;
      sparkle.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      sparkle.position.y = (Math.random() - 0.5) * 0.4;
      sparkleGroup.add(sparkle);
    }
    sparkleGroup.rotation.x = Math.PI / 3;
    scene.add(sparkleGroup);

    // 6. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight1.position.set(3, 5, 6);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 2.0);
    dirLight2.position.set(-5, 5, 3);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x00f5ff, 2.0);
    dirLight3.position.set(5, -5, 3);
    scene.add(dirLight3);

    const pointLight = new THREE.PointLight(0xc084fc, 1.5, 8);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    // 7. Mouse Interaction Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (event) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 8. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Continuous centerpiece rotation
      xGroup.rotation.y = elapsedTime * 0.25;
      xGroup.position.y = Math.sin(elapsedTime * 0.8) * 0.12;

      // Rotate torus ring and sparkles
      torus.rotation.z = -elapsedTime * 0.15;
      torus.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 0.5) * 0.08;
      
      sparkleGroup.rotation.z = elapsedTime * 0.18;

      // Mouse Parallax Lerping
      targetX = mouseX * 0.8;
      targetY = mouseY * 0.8;

      xGroup.rotation.x += (targetY - xGroup.rotation.x) * 0.05;
      xGroup.rotation.z += (targetX - xGroup.rotation.z) * 0.05;

      // Animate organic liquid metal blobs
      blob1.rotation.x = elapsedTime * 0.2;
      blob1.rotation.y = -elapsedTime * 0.15;
      const wave1 = 1.3 + Math.sin(elapsedTime * 0.6) * 0.08;
      blob1.position.set(-1.8 + targetX * 0.6, wave1 + targetY * 0.6, -0.5);

      blob2.rotation.x = -elapsedTime * 0.15;
      blob2.rotation.y = elapsedTime * 0.2;
      const wave2 = -1.3 + Math.sin(elapsedTime * 0.5 + 2.0) * 0.08;
      blob2.position.set(1.8 + targetX * 0.6, wave2 + targetY * 0.6, -0.5);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose geometries, materials & textures
      barGeom.dispose();
      coreGeom.dispose();
      torusGeom.dispose();
      blobGeom.dispose();
      sparkleGeom.dispose();
      chromeMaterial.dispose();
      smoothChromeMaterial.dispose();
      wireMaterial.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[480px] relative flex items-center justify-center pointer-events-none select-none z-10">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      {/* Decorative technical coordinate overlay */}
      <div className="absolute top-4 left-4 font-mono text-[8px] text-[#8a8a92]/40 tracking-wider hidden md:block">
        GRID_LOC // 45.92.83.1A <br />
        OBJECT // CHROME_X_CENTRAL
      </div>
      <div className="absolute bottom-4 right-4 font-mono text-[8px] text-[#8a8a92]/40 tracking-wider hidden md:block">
        ROTATION // AUTO_LERP <br />
        RENDER_ENGINE // THREE_WEBGL
      </div>
    </div>
  );
}
