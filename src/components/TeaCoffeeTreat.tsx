"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type DrinkType = "tea" | "coffee" | null;

function Cup3DScene({
  drink,
  replayKey,
}: {
  drink: "tea" | "coffee";
  replayKey: number;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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
    camera.position.set(1.85, 1.7, 2.65);

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

    // Controls (drag to rotate 360°)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.0;
    controls.maxDistance = 6.0;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
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
    const foamColor = isTea ? 0xf2c18d : 0xc69c72; // Creamy milk foam vs espresso crema
    const streamColor = isTea ? 0xc96b24 : 0x4a2411;

    // Group that holds the cup + animated liquid + pour stream
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    let liquidMesh: THREE.Mesh | null = null;
    let foamMesh: THREE.Mesh | null = null;
    let streamMesh: THREE.Mesh | null = null;
    let cupBottomY = 0;
    let maxLiquidHeight = 0.7;
    let streamTopY = 2.4;

    // Steam particles
    const steamGroup = new THREE.Group();
    const steamPuffs: {
      mesh: THREE.Mesh;
      speed: number;
      offset: number;
      baseX: number;
      baseZ: number;
    }[] = [];

    const steamGeo = new THREE.SphereGeometry(0.075, 12, 12);
    for (let i = 0; i < 8; i++) {
      const steamMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(steamGeo, steamMat);
      const baseX = (Math.random() - 0.5) * 0.24;
      const baseZ = (Math.random() - 0.5) * 0.24;
      puff.position.set(baseX, 0.1 + i * 0.14, baseZ);
      steamGroup.add(puff);
      steamPuffs.push({
        mesh: puff,
        speed: 0.35 + Math.random() * 0.25,
        offset: Math.random() * Math.PI * 2,
        baseX,
        baseZ,
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

            // Recompute world box after centering; X-axis has no handle so it gives exact bowl diameter
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

        // 1. Liquid body cylinder (fills flush against inner wall from bottom to top)
        const liquidGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidBottomRadius,
          1,
          48
        );
        liquidGeo.translate(0, 0.5, 0); // pivot at bottom
        const liquidMat = new THREE.MeshStandardMaterial({
          color: liquidColor,
          roughness: 0.16,
          metalness: 0.06,
        });
        liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
        liquidMesh.position.set(0, cupBottomY, 0);
        liquidMesh.scale.set(1, 0.01, 1);
        rootGroup.add(liquidMesh);

        // 2. Creamy foam / surface disc matching exact top radius
        const foamGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidTopRadius * 0.99,
          0.028,
          48
        );
        const foamMat = new THREE.MeshStandardMaterial({
          color: foamColor,
          roughness: 0.42,
          metalness: 0.02,
        });
        foamMesh = new THREE.Mesh(foamGeo, foamMat);
        foamMesh.position.set(0, cupBottomY + 0.01, 0);
        foamMesh.scale.set(0.86, 1, 0.86);
        rootGroup.add(foamMesh);

        // 3. Pouring stream from above directly into the bowl center
        const streamHeight = Math.max(0.5, streamTopY - cupBottomY);
        const streamGeo = new THREE.CylinderGeometry(
          0.028,
          0.042,
          streamHeight,
          16
        );
        streamGeo.translate(0, -streamHeight / 2, 0); // pivot at top
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

        // Position steam above cup rim
        steamGroup.position.set(0, bowlTopY - 0.04, 0);

        setLoading(false);
      },
      undefined,
      () => {
        if (disposed) return;
        setLoading(false);
        setErrorMsg(`Could not load ${modelUrl}`);
      }
    );

    // Animation loop (Pour -> Fill -> Steam)
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
        foamMesh.position.y = cupBottomY + currentH + wobble;
        const foamScale = 0.86 + 0.14 * eased;
        foamMesh.scale.set(foamScale, 1, foamScale);
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

      // Animate rising steam once cup is at least 35% full
      const steamStrength = Math.max(0, (progress - 0.35) / 0.65);
      for (const puff of steamPuffs) {
        const cycle = (elapsed * puff.speed + puff.offset) % 1.4;
        puff.mesh.position.y = cycle * 0.8;
        puff.mesh.position.x =
          puff.baseX + Math.sin(elapsed * 2 + puff.offset) * 0.07;
        const s = 0.6 + cycle * 1.05;
        puff.mesh.scale.setScalar(s);
        const mat = puff.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity =
          steamStrength * Math.sin((cycle / 1.4) * Math.PI) * 0.32;
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

      {/* Interactive 3D Cup with Pouring & Filling Animation */}
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

          {/* 3D Cup + Animated Tea/Coffee Pour & Fill */}
          <Cup3DScene drink={selected} replayKey={animKey} />

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
            Drag to rotate the 3D cup
          </p>

          {/* Optional quick name input so any visitor can personalize their cup */}
          <input
            type="text"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Type your name for your cup..."
            maxLength={32}
            className="w-full max-w-xs px-3.5 py-2 rounded-full text-center text-xs sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}