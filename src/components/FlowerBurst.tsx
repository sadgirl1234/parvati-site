"use client";

import { useEffect, useRef } from "react";

interface BurstFlower {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
  fadeRate: number;
  emoji: string;
}

const FLOWERS = ["🌸", "🌸", "🌸", "🌷", "🌺", "🌼", "🌹"];

export default function FlowerBurst() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        p.vy += p.gravity; // sudden downward fall
        p.y += p.vy;
        p.vx *= 0.985;
        p.rotation += p.vRot;
        p.alpha -= p.fadeRate;

        if (p.alpha <= 0 || p.y > height + 60) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.font = `${p.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(animate);
      } else {
        rafId = 0;
      }
    };

    const spawnBurst = (x: number, y: number) => {
      const count = 14;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI + Math.random() * Math.PI; // fan upward/outward
        const speed = 2.2 + Math.random() * 5.2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2.4,
          vy: Math.sin(angle) * speed - 1.2,
          gravity: 0.42 + Math.random() * 0.28, // drops suddenly
          size: 16 + Math.random() * 14,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.24,
          alpha: 1,
          fadeRate: 0.018 + Math.random() * 0.014,
          emoji: FLOWERS[Math.floor(Math.random() * FLOWERS.length)],
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