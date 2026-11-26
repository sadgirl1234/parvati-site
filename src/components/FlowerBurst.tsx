"use client";

import { useEffect, useRef } from "react";

interface BurstFlower {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  scale: number;
  rotation: number;
  vRot: number;
  alpha: number;
  fadeRate: number;
  spriteIdx: number;
}

const FLOWERS = ["🌸", "🌷", "🌺", "🌼", "🌹"];

export default function FlowerBurst() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Pre-render each flower emoji once to a tiny offscreen canvas (20x faster than fillText)
    const sprites: HTMLCanvasElement[] = FLOWERS.map((emoji) => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 40;
      const sctx = c.getContext("2d");
      if (sctx) {
        sctx.font =
          '28px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        sctx.textAlign = "center";
        sctx.textBaseline = "middle";
        sctx.fillText(emoji, 20, 22);
      }
      return c;
    });

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // 1x DPR for fast-moving particles keeps GPU clear/draw instant on mobile & PC
      canvas.width = width;
      canvas.height = height;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const particles: BurstFlower[] = [];
    let rafId = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.vx *= 0.985;
        p.rotation += p.vRot;
        p.alpha -= p.fadeRate;

        if (p.alpha <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
          continue;
        }

        const sprite = sprites[p.spriteIdx];
        const drawSize = 36 * p.scale;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(animate);
      } else {
        rafId = 0;
      }
    };

    const spawnBurst = (x: number, y: number) => {
      // Cap active particles so rapid tapping never lags
      if (particles.length > 30) {
        particles.splice(0, 10);
      }

      const count = 10;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI + Math.random() * Math.PI;
        const speed = 2.2 + Math.random() * 4.8;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * speed - 1.1,
          gravity: 0.45 + Math.random() * 0.25,
          scale: 0.55 + Math.random() * 0.45,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.22,
          alpha: 1,
          fadeRate: 0.022 + Math.random() * 0.015,
          spriteIdx: Math.random() < 0.45 ? 0 : Math.floor(Math.random() * sprites.length),
        });
      }

      if (!rafId) {
        rafId = window.requestAnimationFrame(animate);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      spawnBurst(e.clientX, e.clientY);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handlePointerDown);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-full h-full z-[9999]"
    />
  );
}