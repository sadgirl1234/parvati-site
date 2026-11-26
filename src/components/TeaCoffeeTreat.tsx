"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type DrinkType = "tea" | "coffee" | null;

function createCupFlowersTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const rows = 4;
    const cols = 10;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offsetX = r % 2 === 0 ? 0 : cellW * 0.5;
        const x = (c * cellW + offsetX + cellW * 0.5) % canvas.width;
        const y = r * cellH + cellH * 0.5;
        const size = 14 + ((r + c) % 3) * 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((((r * 7 + c * 13) % 9) - 4) * 0.12);
        ctx.globalAlpha = 0.88;
        ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.fillText("🌸", 0, 0);
        ctx.restore();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createCupNameCanvas(name: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  drawCupName(canvas, name);
  return canvas;
}

function drawCupName(canvas: HTMLCanvasElement, name: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const label = (name.trim() || "Sweet Guest").slice(0, 24);

  ctx.strokeStyle = "rgba(255, 248, 230, 0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(130, 31);
  ctx.lineTo(382, 31);
  ctx.moveTo(155, 99);
  ctx.lineTo(357, 99);
  ctx.stroke();

  let fontSize = 42;
  if (label.length > 14) fontSize = 33;
  if (label.length > 19) fontSize = 27;

  ctx.font = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 3);

  ctx.fillStyle = "#fff9eb";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 1);
}

function createHeartLatteTexture(isTea: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    const halo = ctx.createRadialGradient(128, 128, 15, 128, 128, 105);
    halo.addColorStop(
      0,
      isTea ? "rgba(255, 242, 224, 0.35)" : "rgba(255, 245, 232, 0.4)"
    );
    halo.addColorStop(1, "rgba(255, 245, 232, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(128, 133);

    const drawHeart = (scale: number, color: string) => {
      ctx.save();
      ctx.scale(scale * 0.5, scale * 0.5);
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

    drawHeart(
      1.08,
      isTea ? "rgba(255, 236, 209, 0.5)" : "rgba(248, 232, 210, 0.55)"
    );
    drawHeart(0.95, isTea ? "#fff5e6" : "#fff7eb");
    drawHeart(
      0.55,
      isTea ? "rgba(218, 146, 78, 0.35)" : "rgba(130, 74, 42, 0.38)"
    );
    drawHeart(0.32, "#fffaf2");

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createSteamWispTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
    g.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    g.addColorStop(0.55, "rgba(255, 255, 255, 0.14)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
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

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 1.6, 3.0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 180° horizontal rotation limit
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 5.2;
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = Math.PI / 2;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.25, 0);

    // Lightweight 2-light studio rig
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const isTea = drink === "tea";
    const liquidColor = isTea ? 0xb85d19 : 0x3b1d0e;
    const foamColor = isTea ? 0xde9e5b : 0x6f4329;
    const streamColor = isTea ? 0xc96b24 : 0x4a2411;

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    let liquidMesh: THREE.Mesh | null = null;
    let foamMesh: THREE.Mesh | null = null;
    let heartMesh: THREE.Mesh | null = null;
    let streamMesh: THREE.Mesh | null = null;
    let cupBottomY = 0;
    let maxLiquidHeight = 0.7;
    let streamTopY = 2.4;

    const disposables: { dispose: () => void }[] = [];

    const flowerTexture = createCupFlowersTexture();
    const steamTexture = createSteamWispTexture();
    const heartTexture = createHeartLatteTexture(isTea);
    const nameCanvas = createCupNameCanvas(displayName);
    const nameTexture = new THREE.CanvasTexture(nameCanvas);
    nameTexture.colorSpace = THREE.SRGBColorSpace;
    nameCanvasRef.current = nameCanvas;
    nameTextureRef.current = nameTexture;
    disposables.push(flowerTexture, steamTexture, heartTexture, nameTexture);

    // 7 lightweight wispy steam sprites (low overdraw, smooth 60fps)
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

    for (let i = 0; i < 7; i++) {
      const mat = new THREE.SpriteMaterial({
        map: steamTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      disposables.push(mat);
      const sprite = new THREE.Sprite(mat);
      const angle = (i / 7) * Math.PI * 2;
      const dist = 0.08 + (i % 3) * 0.06;
      const baseX = Math.cos(angle) * dist;
      const baseZ = Math.sin(angle) * dist;
      sprite.position.set(baseX, 0, baseZ);
      steamGroup.add(sprite);
      steamWisps.push({
        sprite,
        speed: 0.3 + (i % 3) * 0.08,
        phase: i * 0.28,
        baseX,
        baseZ,
        rotSpeed: (i % 2 === 0 ? 1 : -1) * 0.35,
        maxScale: 0.52 + (i % 3) * 0.14,
      });
    }
    rootGroup.add(steamGroup);

    const loader = new GLTFLoader();
    const modelUrl = isTea ? "/models/tea.glb" : "/models/coffee.glb";

    let disposed = false;
    const startTime = performance.now();

    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(1.65 / maxDim);

        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y -= scaledBox.min.y + 0.35;

        rootGroup.add(model);
        model.updateMatrixWorld(true);

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
            model.position.x -= localTop.x;
            model.position.z -= localTop.z;
            model.updateMatrixWorld(true);

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

        // 1. Small 🌸 flower print wrapped 360° around all sides
        const flowerWrapGeo = new THREE.CylinderGeometry(
          rimRadius * 1.008,
          rimRadius * 0.94,
          cupHeight * 0.78,
          32,
          1,
          true,
          0,
          Math.PI * 2
        );
        const flowerWrapMat = new THREE.MeshBasicMaterial({
          map: flowerTexture,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        });
        disposables.push(flowerWrapGeo, flowerWrapMat);
        const flowerWrapMesh = new THREE.Mesh(flowerWrapGeo, flowerWrapMat);
        flowerWrapMesh.position.set(0, bowlBottomY + cupHeight * 0.52, 0);
        rootGroup.add(flowerWrapMesh);

        // 2. Curved Printed Name slightly to the side
        const labelGeo = new THREE.CylinderGeometry(
          rimRadius * 1.018,
          rimRadius * 0.99,
          cupHeight * 0.32,
          28,
          1,
          true,
          -Math.PI * 0.14,
          Math.PI * 0.76
        );
        const labelMat = new THREE.MeshBasicMaterial({
          map: nameTexture,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
        });
        disposables.push(labelGeo, labelMat);
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.position.set(0, bowlBottomY + cupHeight * 0.54, 0);
        rootGroup.add(labelMesh);

        // 3. Liquid body
        const liquidGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidBottomRadius,
          1,
          28
        );
        liquidGeo.translate(0, 0.5, 0);
        const liquidMat = new THREE.MeshLambertMaterial({ color: liquidColor });
        disposables.push(liquidGeo, liquidMat);
        liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
        liquidMesh.position.set(0, cupBottomY, 0);
        liquidMesh.scale.set(1, 0.01, 1);
        rootGroup.add(liquidMesh);

        // 4. Top liquid surface
        const foamGeo = new THREE.CylinderGeometry(
          liquidTopRadius,
          liquidTopRadius * 0.99,
          0.024,
          28
        );
        const foamMat = new THREE.MeshLambertMaterial({ color: foamColor });
        disposables.push(foamGeo, foamMat);
        foamMesh = new THREE.Mesh(foamGeo, foamMat);
        foamMesh.position.set(0, cupBottomY + 0.01, 0);
        foamMesh.scale.set(0.86, 1, 0.86);
        rootGroup.add(foamMesh);

        // 5. Heart Latte Art on top
        const heartGeo = new THREE.CircleGeometry(liquidTopRadius * 0.9, 28);
        heartGeo.rotateX(-Math.PI / 2);
        const heartMat = new THREE.MeshBasicMaterial({
          map: heartTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        disposables.push(heartGeo, heartMat);
        heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.position.set(0, cupBottomY + 0.03, 0);
        heartMesh.scale.setScalar(0.25);
        rootGroup.add(heartMesh);

        // 6. Pouring stream
        const streamHeight = Math.max(0.5, streamTopY - cupBottomY);
        const streamGeo = new THREE.CylinderGeometry(0.028, 0.042, streamHeight, 12);
        streamGeo.translate(0, -streamHeight / 2, 0);
        const streamMat = new THREE.MeshLambertMaterial({
          color: streamColor,
          transparent: true,
          opacity: 0.95,
        });
        disposables.push(streamGeo, streamMat);
        streamMesh = new THREE.Mesh(streamGeo, streamMat);
        streamMesh.position.set(0, streamTopY, 0);
        rootGroup.add(streamMesh);

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

    let rafId = 0;
    const FILL_DURATION = 2.6;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

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

        if (heartMesh) {
          heartMesh.position.y = surfaceY + 0.016;
          const heartProgress = Math.max(
            0,
            Math.min(1, (elapsed - (FILL_DURATION - 0.55)) / 1.1)
          );
          const heartEased = 1 - Math.pow(1 - heartProgress, 3);
          const hScale = 0.25 + 0.75 * heartEased;
          heartMesh.scale.set(hScale, 1, hScale);
          (heartMesh.material as THREE.MeshBasicMaterial).opacity =
            heartEased * 0.96;
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

      const steamStrength = Math.max(0, (progress - 0.28) / 0.72);
      for (const wisp of steamWisps) {
        const life = (elapsed * wisp.speed + wisp.phase) % 1.8;
        const t = life / 1.8;
        wisp.sprite.position.y = t * 1.15;
        wisp.sprite.position.x =
          wisp.baseX + Math.sin(elapsed * 1.4 + wisp.phase * 4) * (0.04 + t * 0.1);
        const s = (0.3 + t * 1.0) * wisp.maxScale;
        wisp.sprite.scale.set(s, s * 1.2, 1);

        const mat = wisp.sprite.material as THREE.SpriteMaterial;
        mat.rotation = wisp.phase + elapsed * wisp.rotSpeed;
        mat.opacity = steamStrength * Math.sin(t * Math.PI) * (1 - t * 0.35) * 0.45;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      for (const d of disposables) d.dispose();
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
      // ignore
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

      {selected && (
        <div
          key={animKey}
          className="w-full rounded-3xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden"
          style={{
            animation: "psCupReveal 0.4s ease-out both",
          }}
        >
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

          <Cup3DScene
            drink={selected}
            displayName={displayName}
            replayKey={animKey}
          />

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