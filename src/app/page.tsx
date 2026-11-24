"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  MessageCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Bot,
  Shield,
} from "lucide-react";

interface SyncedPalette {
  bgDark: string;
  bgMid: string;
  glowRgb: string;
}

const DEFAULT_PALETTE: SyncedPalette = {
  bgDark: "#14171a",
  bgMid: "#22272d",
  glowRgb: "244, 63, 94",
};

export default function HomePage() {
  const [muted, setMuted] = useState(true);
  const [palette, setPalette] = useState<SyncedPalette>(DEFAULT_PALETTE);

  const dpVideoRef = useRef<HTMLVideoElement | null>(null);
  const ambientVideoRef = useRef<HTMLVideoElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync audio mute state across both DP and ambient background video
  useEffect(() => {
    if (dpVideoRef.current) {
      dpVideoRef.current.muted = muted;
    }
    if (ambientVideoRef.current) {
      ambientVideoRef.current.muted = true;
    }
  }, [muted]);

  // Sample live frame colors from the DP video to dynamically sync surrounding background
  useEffect(() => {
    const sampleCanvas = sampleCanvasRef.current;
    const videoEl = dpVideoRef.current;
    if (!sampleCanvas || !videoEl) return;

    const ctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    sampleCanvas.width = 16;
    sampleCanvas.height = 16;

    const interval = window.setInterval(() => {
      if (videoEl.readyState < 2 || videoEl.paused) return;

      try {
        ctx.drawImage(videoEl, 0, 0, 16, 16);
        const frame = ctx.getImageData(0, 0, 16, 16).data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let brightR = 0;
        let brightG = 0;
        let brightB = 0;
        let brightCount = 0;
        const pixelCount = frame.length / 4;

        for (let i = 0; i < frame.length; i += 4) {
          const r = frame[i];
          const g = frame[i + 1];
          const b = frame[i + 2];
          rSum += r;
          gSum += g;
          bSum += b;

          // Track warm/bright highlights (kitten fur & hand tones)
          if (r + g + b > 260) {
            brightR += r;
            brightG += g;
            brightB += b;
            brightCount += 1;
          }
        }

        const avgR = Math.round(rSum / pixelCount);
        const avgG = Math.round(gSum / pixelCount);
        const avgB = Math.round(bSum / pixelCount);

        const darkR = Math.max(10, Math.round(avgR * 0.35));
        const darkG = Math.max(12, Math.round(avgG * 0.35));
        const darkB = Math.max(15, Math.round(avgB * 0.38));

        const midR = Math.max(22, Math.round(avgR * 0.72));
        const midG = Math.max(24, Math.round(avgG * 0.72));
        const midB = Math.max(28, Math.round(avgB * 0.75));

        const glowR =
          brightCount > 0 ? Math.round(brightR / brightCount) : Math.min(255, avgR + 70);
        const glowG =
          brightCount > 0 ? Math.round(brightG / brightCount) : Math.min(255, avgG + 55);
        const glowB =
          brightCount > 0 ? Math.round(brightB / brightCount) : Math.min(255, avgB + 65);

        setPalette({
          bgDark: `rgb(${darkR}, ${darkG}, ${darkB})`,
          bgMid: `rgb(${midR}, ${midG}, ${midB})`,
          glowRgb: `${glowR}, ${glowG}, ${glowB}`,
        });
      } catch {
        // Ignored if canvas read is restricted
      }
    }, 260);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main
      className="min-h-screen text-slate-100 flex flex-col items-center justify-center px-4 py-12 overflow-hidden relative transition-colors duration-500"
      style={{
        background: `radial-gradient(circle at 50% 34%, rgba(${palette.glowRgb}, 0.24), ${palette.bgMid} 52%, ${palette.bgDark} 100%)`,
      }}
    >
      {/* Hidden canvas used to read live video frame colors */}
      <canvas ref={sampleCanvasRef} className="hidden" aria-hidden="true" />

      {/* Full-bleed blurred video ambient layer synced to the DP video */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden opacity-30 scale-110 blur-3xl transition-opacity duration-500"
      >
        <video
          ref={ambientVideoRef}
          src="/videos/sweetie-dp.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>

      {/* Soft vignette overlay so text stays crisp */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55"
      />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center space-y-7">
        {/* Animated DP Frame */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-full blur-2xl opacity-65 transition-all duration-500 pointer-events-none"
            style={{
              background: `radial-gradient(circle, rgba(${palette.glowRgb}, 0.55) 0%, rgba(244, 63, 94, 0.18) 65%, transparent 100%)`,
            }}
          />

          <div
            className="relative p-1.5 rounded-full border border-white/20 shadow-2xl transition-shadow duration-500"
            style={{
              background: `linear-gradient(135deg, rgba(${palette.glowRgb}, 0.65), rgba(244, 63, 94, 0.45), rgba(30, 41, 59, 0.75))`,
              boxShadow: `0 0 55px rgba(${palette.glowRgb}, 0.35)`,
            }}
          >
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-slate-950 border-2 border-white/20 relative">
              <video
                ref={dpVideoRef}
                src="/videos/sweetie-dp.mp4"
                autoPlay
                loop
                muted={muted}
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <button
              type="button"
              onClick={() => setMuted((prev) => !prev)}
              aria-label={muted ? "Unmute DP video" : "Mute DP video"}
              title={muted ? "Unmute sound" : "Mute sound"}
              className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-rose-600 border border-white/25 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono text-rose-200">
            <Sparkles size={13} />
            <span>Parvati • Sweetie🌸</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-white drop-shadow">
            Parvati
          </h1>

          <p className="text-sm text-slate-200/90 max-w-md mx-auto leading-relaxed">
            Talk with Sweetie🌸 AI, message directly on Instagram, or inspect
            activity inside the admin panel.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/ai"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-mono text-xs font-bold shadow-lg transition-all hover:scale-[1.02]"
          >
            <Bot size={15} />
            <span>Open Sweetie🌸 AI</span>
            <ArrowRight size={15} />
          </Link>

          <a
            href="https://ig.me/m/parvatisingh3118"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 text-white font-mono text-xs font-bold transition-all"
          >
            <MessageCircle size={15} />
            <span>@parvatisingh3118</span>
          </a>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-black/35 hover:bg-black/50 border border-white/10 text-slate-200 font-mono text-xs font-bold transition-all"
          >
            <Shield size={14} />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </main>
  );
}