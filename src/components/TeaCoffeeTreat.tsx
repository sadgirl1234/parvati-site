"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type DrinkType = "tea" | "coffee" | null;

function createCupNameCanvas(name: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  drawCupName(canvas, name);
  return canvas;
}

function drawCupName(canvas: HTMLCanvasElement, name: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const label = (name.trim() || "Sweet Guest").slice(0, 24);

  // Subtle decorative divider lines above & below the printed name
  ctx.strokeStyle = "rgba(255, 248, 230, 0.75)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(260, 62);
  ctx.lineTo(764, 62);
  ctx.moveTo(310, 198);
  ctx.lineTo(714, 198);
  ctx.stroke();

  // Dynamic font size so long names fit cleanly on the cup
  let fontSize = 86;
  if (label.length > 14) fontSize = 68;
  if (label.length > 19) fontSize = 56;

  ctx.font = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Crisp shadow + warm cream-white ceramic print
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#fff9eb";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 2);

  // Subtle gold highlight stroke
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 224, 160, 0.7)";
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2 + 2);
}

function createHeartLatteTexture(isTea: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);

    // Soft outer creamy halo
    const halo = ctx.createRadialGradient(256, 256, 30, 256, 256, 210);
    halo.addColorStop(
      0,
      isTea ? "rgba(255, 242, 224, 0.35)" : "rgba(255, 245, 232, 0.4)"
    );
    halo.addColorStop(1, "rgba(255, 245, 232, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 512, 512);

    // Latte-art heart path
    ctx.save();
    ctx.translate(256, 266);

    const drawHeart = (scale: number, color: string, blur: number) => {
      ctx.save();
      ctx.scale(scale, scale);
      ctx.filter = `blur(${blur}px)`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 95);
      ctx.bezierCurveTo(-115, 20, -145, -85, -62, -110);
      ctx.bezierCurveTo(-18, -122, 0, -82, 0, -60);
      ctx.bezierCurveTo(0, -82, 18, -122, 62, -110);
      ctx.bezierCurveTo(145, -85, 115, 20, 0, 95);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Soft foam edge + bright creamy center + subtle inner swirl
    drawHeart(1.06, isTea ? "rgba(255, 236, 209, 0.65)" : "rgba(248, 232, 210, 0.7)", 6);
    drawHeart(0.95, isTea ? "#fff5e6" : "#fff7eb", 2);
    drawHeart(0.55, isTea ? "rgba(218, 146, 78, 0.35)" : "rgba(130, 74, 42, 0.38)", 4);
    drawHeart(0.32, "#fffaf2", 1.5);

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSteamWispTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Layered organic soft puffs for realistic curling steam
    const puffs = [
      { x: 128, y: 128, r: 92, a: 0.28 },
      { x: 102, y: 112, r: 64, a: 0.22 },
      { x: 152, y: 138, r: 68, a: 0.2 },
      { x: 126, y: 92, r: 54, a: 0.18 },
    ];

    for (const p of puffs) {
      const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(255, 255, 255, ${p.a})`);
      g.addColorStop(0.55, `rgba(255, 255, 255, ${p.a * 0.45})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function Cup3DScene({
  drink,
  displayName,
  replayKey,
}: {
  drink: "tea" | "coffee";
  displayName: string;
  replayKey: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const nameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Live-update the printed name on the cup whenever user types
  useEffect(() => {
    if (nameCanvasRef.current && nameTextureRef.current) {
      drawCupName(nameCanvasRef.current, displayName);
      nameTextureRef.current.needsUpdate = true;
    }
  }, [displayName]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    setLoading(true);
    setErrorMsg("");

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 3.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Controls — strictly limited to 180° horizontal rotation (-90° to +90°)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 5.5;
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.autoRotate = false;
    controls.target.set(0, 0.25, 0);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffd1dc, 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.9);
    fillLight.position.set(0, 2.5, 2.5);
    scene.add(fillLight);

    // Drink colors
    const isTea = drink === "tea";
    const liquidColor = isTea ? 0xb85d19 : 0x3b1d0e; // Masala chai vs dark coffee
    const foamColor = isTea ? 0xde9e5b : 0x6f4329; // Warm chai surface vs espresso crema
    const streamColor = isTea ? 0xc96b24 : 0x4a2411;

    // Group that holds the cup + printed name + liquid + heart + pour stream + steam
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    let liquidMesh: THREE.Mesh | null = null;
    let foamMesh: THREE.Mesh | null = null;
    let heartMesh: THREE.Mesh | null = null;
    let streamMesh: THREE.Mesh | null = null;
    let cupBottomY = 0;
    let maxLiquidHeight = 0.7;
    let streamTopY = 2.4;

    // Procedural textures
    const steamTexture = createSteamWispTexture();
    const heartTexture = createHeartLatteTexture(isTea);
    const nameCanvas = createCupNameCanvas(displayName);
    const nameTexture = new THREE.CanvasTexture(nameCanvas);
    nameTexture.colorSpace = THREE.SRGBColorSpace;
    nameTexture.anisotropy = 4;
    nameCanvasRef.current = nameCanvas;
    nameTextureRef.current = nameTexture;

    // Realistic wispy steam sprites
    const steamGroup = new THREE.Group();
    const steamWisps: {
      sprite: THREE.Sprite;
      speed: number;
      phase: number;
      baseX: number;
      baseZ: number;
      rotSpeed: number;
      maxScale: number;
    }[] = [];

    for (let i = 0; i < 16; i++) {
      const mat = new THREE.SpriteMaterial({
        map: steamTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
      const dist = Math.random() * 0.22;
      const baseX = Math.cos(angle) * dist;
      const baseZ = Math.sin(angle) * dist;
      sprite.position.set(baseX, 0, baseZ);
      steamGroup.add(sprite);
      steamWisps.push({
        sprite,
        speed: 0.28 + Math.random() * 0.22,
        phase: Math.random() * 1.8,
        baseX,
        baseZ,
        rotSpeed: (Math.random() - 0.5) * 0.65,
        maxScale: 0.42 + Math.random() * 0.34,
      });
    }
    rootGroup.add(steamGroup);

    // Load the user's .glb cup model
    const loader = new GLTFLoader();
    const modelUrl = isTea ? "/models/tea.glb" : "/models/coffee.glb";

    let disposed = false;
    const startTime = performance.now();

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;

        // Normalize overall scale
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 1.65 / maxDim;
        model.scale.setScalar(scale);

        // Place bottom of cup at y = -0.35
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y -= scaledBox.min.y + 0.35;

        rootGroup.add(model);
        model.updateMatrixWorld(true);

        // Find the cup mesh to compute the exact bowl center and full rim radius
        let cupMesh: THREE.Mesh | null = null;
        model.traverse((obj) => {
          if (!cupMesh && (obj as THREE.Mesh).isMesh) {
            cupMesh = obj as THREE.Mesh;
          }
        });

        let bowlBottomY = -0.35;
        let bowlTopY = 0.85;
        let rimRadius = 0.55;

        if (cupMesh) {
          const mesh = cupMesh as THREE.Mesh;
          mesh.geometry.computeBoundingBox();
          const gBox = mesh.geometry.boundingBox;

          if (gBox) {
            const localBottom = new THREE.Vector3(0, 0, gBox.min.z).applyMatrix4(
              mesh.matrixWorld
            );
            const localTop = new THREE.Vector3(0, 0, gBox.max.z).applyMatrix4(
              mesh.matrixWorld
            );

            // Center the circular bowl cleanly at world X=0, Z=0 (ignoring handle)
            model.position.x -= localTop.x;
            model.position.z -= localTop.z;
            model.updateMatrixWorld(true);

            // X-axis has no handle so it gives exact outer bowl diameter
            const finalBox = new THREE.Box3().setFromObject(model);
            rimRadius = (finalBox.max.x - finalBox.min.x) * 0.5;
            bowlBottomY = localBottom.y;
            bowlTopY = localTop.y;
          }
        }

        const cupHeight = Math.max(0.2, bowlTopY - bowlBottomY);
        const liquidTopRadius = rimRadius * 0.93;
        const liquidBottomRadius = rimRadius * 0.8;
        cupBottomY = bowlBottomY + cupHeight * 0.06;
        maxLiquidHeight = cupHeight * 0.84;
        streamTopY = bowlTopY + 1.1;

        // 1. Curved Printed Name wrapped cleanly around the front outer wall of the cup
        const labelHeight = cupHeight * 0.34;
        const labelGeo = new THREE.CylinderGeometry(
          rimRadius * 1.012,
          rimRadius * 0.985,
          labelHeight,
          48,
          1,
          true,
          -Math.PI * 0.42,
          Math.PI * 0.84
        );
        const labelMat = new THREE.MeshStandardMaterial({
          map: nameTexture,
          transparent: true,
          roughness: 0.35,
          metalness: 0.05,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
        });
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.position.set(0, bowlBottomY + cupHeight * 0.54, 0);
        rootGroup.add(labelMesh);

        // 2. Liquid body cylinder (fills flush against inner wall from bottom to top)
        const liquidGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidBottomRadius,
          1,
          48
        );
        liquidGeo.translate(0, 0.5, 0);
        const liquidMat = new THREE.MeshStandardMaterial({
          color: liquidColor,
          roughness: 0.16,
          metalness: 0.06,
        });
        liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
        liquidMesh.position.set(0, cupBottomY, 0);
        liquidMesh.scale.set(1, 0.01, 1);
        rootGroup.add(liquidMesh);

        // 3. Top liquid / crema surface disc
        const foamGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidTopRadius * 0.99,
          0.024,
          48
        );
        const foamMat = new THREE.MeshStandardMaterial({
          color: foamColor,
          roughness: 0.38,
          metalness: 0.02,
        });
        foamMesh = new THREE.Mesh(foamGeo, foamMat);
        foamMesh.position.set(0, cupBottomY + 0.01, 0);
        foamMesh.scale.set(0.86, 1, 0.86);
        rootGroup.add(foamMesh);

        // 4. Latte-art Heart on top surface (blooms at the end of the pour)
        const heartGeo = new THREE.CircleGeometry(liquidTopRadius * 0.9, 48);
        heartGeo.rotateX(-Math.PI / 2);
        const heartMat = new THREE.MeshBasicMaterial({
          map: heartTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.position.set(0, cupBottomY + 0.03, 0);
        heartMesh.scale.setScalar(0.25);
        rootGroup.add(heartMesh);

        // 5. Pouring stream from above directly into the bowl center
        const streamHeight = Math.max(0.5, streamTopY - cupBottomY);
        const streamGeo = new THREE.CylinderGeometry(
          0.028,
          0.042,
          streamHeight,
          16
        );
        streamGeo.translate(0, -streamHeight / 2, 0);
        const streamMat = new THREE.MeshStandardMaterial({
          color: streamColor,
          roughness: 0.14,
          metalness: 0.05,
          transparent: true,
          opacity: 0.95,
        });
        streamMesh = new THREE.Mesh(streamGeo, streamMat);
        streamMesh.position.set(0, streamTopY, 0);
        rootGroup.add(streamMesh);

        // Position steam right above the liquid surface
        steamGroup.position.set(0, bowlTopY - 0.12, 0);

        setLoading(false);
      },
      undefined,
      () => {
        if (disposed) return;
        setLoading(false);
        setErrorMsg(`Could not load ${modelUrl}`);
      }
    );

    // Animation loop (Pour -> Fill -> Heart Latte-Art -> Realistic Steam)
    let rafId = 0;
    const FILL_DURATION = 2.6; // seconds to fill cup

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(1, elapsed / FILL_DURATION);
      const eased = 1 - Math.pow(1 - progress, 2.2);

      if (liquidMesh && foamMesh) {
        const currentH = Math.max(0.01, eased * maxLiquidHeight);
        liquidMesh.scale.y = currentH;

        const wobble = Math.sin(elapsed * 5.5) * 0.005 * (1 - progress * 0.65);
        const surfaceY = cupBottomY + currentH + wobble;
        foamMesh.position.y = surfaceY;
        const foamScale = 0.86 + 0.14 * eased;
        foamMesh.scale.set(foamScale, 1, foamScale);

        // Bloom the heart latte-art right at the final pour
        if (heartMesh) {
          heartMesh.position.y = surfaceY + 0.016;
          const heartProgress = Math.max(
            0,
            Math.min(1, (elapsed - (FILL_DURATION - 0.55)) / 1.1)
          );
          const heartEased = 1 - Math.pow(1 - heartProgress, 3);
          const hScale = 0.25 + 0.75 * heartEased;
          heartMesh.scale.set(hScale, 1, hScale);
          const hMat = heartMesh.material as THREE.MeshBasicMaterial;
          hMat.opacity = heartEased * 0.96;
        }
      }

      if (streamMesh) {
        if (progress < 0.92) {
          streamMesh.visible = true;
          const pulse = 1 + Math.sin(elapsed * 18) * 0.08;
          streamMesh.scale.set(pulse, 1, pulse);
        } else if (progress < 1) {
          const fade = Math.max(0.01, (1 - progress) / 0.08);
          streamMesh.scale.set(fade, fade, fade);
        } else {
          streamMesh.visible = false;
        }
      }

      // Realistic curling, rising steam once cup is warming up
      const steamStrength = Math.max(0, (progress - 0.28) / 0.72);
      for (const wisp of steamWisps) {
        const life = (elapsed * wisp.speed + wisp.phase) % 1.8;
        const t = life / 1.8; // 0 -> 1
        wisp.sprite.position.y = t * 1.15;
        wisp.sprite.position.x =
          wisp.baseX + Math.sin(elapsed * 1.4 + wisp.phase * 4) * (0.04 + t * 0.12);
        wisp.sprite.position.z =
          wisp.baseZ + Math.cos(elapsed * 1.1 + wisp.phase * 3) * (0.03 + t * 0.08);

        const s = (0.28 + t * 1.05) * wisp.maxScale;
        wisp.sprite.scale.set(s, s * 1.25, 1);

        const mat = wisp.sprite.material as THREE.SpriteMaterial;
        mat.rotation = wisp.phase + elapsed * wisp.rotSpeed;
        // Smooth fade-in then gentle dissipate at top
        const alphaCurve = Math.sin(t * Math.PI) * (1 - t * 0.35);
        mat.opacity = steamStrength * alphaCurve * 0.42;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 260;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      steamTexture.dispose();
      heartTexture.dispose();
      nameTexture.dispose();
      controls.dispose();
      renderer.dispose();
    };
  }, [drink, replayKey]);

  return (
    <div className="relative w-full h-60 sm:h-68 flex items-center justify-center">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      {loading && (
        <span className="absolute text-xs opacity-90 pointer-events-none">
          Pouring 3D {drink}...
        </span>
      )}
      {errorMsg && (
        <span className="absolute text-xs text-red-200 pointer-events-none">
          {errorMsg}
        </span>
      )}
    </div>
  );
}

export default function TeaCoffeeTreat({
  defaultName = "",
}: {
  defaultName?: string;
}) {
  const [selected, setSelected] = useState<DrinkType>(null);
  const [userName, setUserName] = useState<string>(defaultName);
  const [animKey, setAnimKey] = useState<number>(0);

  // Sync if user signs in via Google/Guestbook or has a saved name in localStorage
  useEffect(() => {
    if (defaultName && defaultName.trim()) {
      setUserName(defaultName.trim());
      return;
    }
    try {
      const saved =
        localStorage.getItem("guestbook_name") ||
        localStorage.getItem("user_name") ||
        "";
      if (saved.trim()) setUserName(saved.trim());
    } catch {
      // ignore storage access issues
    }
  }, [defaultName]);

  const handleSelect = (drink: "tea" | "coffee") => {
    setSelected(drink);
    setAnimKey((prev) => prev + 1);
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    try {
      localStorage.setItem("user_name", val);
    } catch {
      // ignore
    }
  };

  const displayName = userName.trim() || "Sweet Guest";
  const isTea = selected === "tea";

  return (
    <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      {/* Two Action Buttons (automatically styled with fl-3.jpg & 3D shadow by globals.css) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleSelect("tea")}
          className="px-5 py-2.5 rounded-full text-sm sm:text-base tracking-wide transition-transform duration-200 active:scale-95 hover:scale-105 cursor-pointer"
        >
          🍵 Get Tea
        </button>

        <button
          type="button"
          onClick={() => handleSelect("coffee")}
          className="px-5 py-2.5 rounded-full text-sm sm:text-base tracking-wide transition-transform duration-200 active:scale-95 hover:scale-105 cursor-pointer"
        >
          ☕ Get Coffee
        </button>
      </div>

      {/* Interactive 3D Cup with Printed Name, Pouring, Heart Art & Realistic Steam */}
      {selected && (
        <div
          key={animKey}
          className="w-full rounded-3xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden"
          style={{
            animation: "psCupReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Top Controls: Pour Again + Close */}
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAnimKey((prev) => prev + 1)}
              className="px-3 py-1 rounded-full text-xs cursor-pointer"
            >
              ↻ Pour Again
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close drink card"
              className="px-2.5 py-1 rounded-full text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 3D Cup + Printed Name + Pour + Heart + Realistic Steam */}
          <Cup3DScene
            drink={selected}
            displayName={displayName}
            replayKey={animKey}
          />

          {/* Animated User Name Badge */}
          <div
            className="px-4 py-1.5 rounded-full"
            style={{
              animation: "psNameFloat 2.4s ease-in-out infinite",
            }}
          >
            <span className="text-base sm:text-lg tracking-wide">
              ✨ For {displayName} ✨
            </span>
          </div>

          <p className="text-xs sm:text-sm opacity-95">
            {isTea
              ? `Fresh hot masala chai poured with warmth for ${displayName}!`
              : `Rich hot coffee poured with love for ${displayName}!`}
          </p>

          <p className="text-[11px] opacity-80">
            Drag to rotate the 3D cup (180° view)
          </p>

          {/* Quick name input — updates the name printed on the 3D cup live */}
          <input
            type="text"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Type your name to print on the cup..."
            maxLength={32}
            className="w-full max-w-xs px-3.5 py-2 rounded-full text-center text-xs sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}