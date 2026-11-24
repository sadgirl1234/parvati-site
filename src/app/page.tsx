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

const INITIAL_BG_COLOR = "rgb(44, 48, 45)";

export default function HomePage() {
  const [muted, setMuted] = useState(true);
  const [bgColor, setBgColor] = useState<string>(INITIAL_BG_COLOR);

  const dpVideoRef = useRef<HTMLVideoElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (dpVideoRef.current) {
      dpVideoRef.current.muted = muted;
    }
  }, [muted]);

  // Sample outer edge pixels of the video frame so the surrounding background matches the video's exact color
  useEffect(() => {
    const canvas = sampleCanvasRef.current;
    const video = dpVideoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const w = 24;
    const h = 24;
    canvas.width = w;
    canvas.height = h;

    const syncExactBg = () => {
      if (video.readyState < 2 || video.paused) return;

      try {
        ctx.drawImage(video, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isOuterEdge = x < 2 || x >= w - 2 || y < 2;
            if (!isOuterEdge) continue;

            const idx = (y * w + x) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count += 1;
          }
        }

        if (count > 0) {
          const r = Math.round(rSum / count);
          const g = Math.round(gSum / count);
          const b = Math.round(bSum / count);
          setBgColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        // Ignored
      }
    };

    const interval = window.setInterval(syncExactBg, 250);
    return () => window.clearInterval(interval);
  }, []);

  const featheredEdgeMask =
    "radial-gradient(ellipse 74% 76% at 50% 48%, #000 56%, rgba(0,0,0,0.65) 76%, transparent 100%)";

  return (
    <div
      className="min-h-screen w-full text-slate-100 flex flex-col items-center justify-center px-4 py-10 relative transition-colors duration-300"
      style={{ backgroundColor: bgColor }}
    >
      {/* Full-viewport single background layer */}
      <div
        aria-hidden="true"
        className="fixed inset-0 w-screen h-screen -z-10 transition-colors duration-300"
        style={{ backgroundColor: bgColor }}
      />

      <canvas ref={sampleCanvasRef} className="hidden" aria-hidden="true" />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center space-y-6">
        {/* Zoomed video with feathered edges merged seamlessly into the surrounding background */}
        <div className="relative flex items-center justify-center overflow-hidden w-72 h-80 sm:w-80 sm:h-96">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              maskImage: featheredEdgeMask,
              WebkitMaskImage: featheredEdgeMask,
            }}
          >
            <video
              ref={dpVideoRef}
              src="/videos/sweetie-dp.mp4"
              autoPlay
              loop
              muted={muted}
              playsInline
              className="w-full h-full object-contain scale-[1.22] border-0 outline-none shadow-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? "Unmute DP video" : "Mute DP video"}
            title={muted ? "Unmute sound" : "Mute sound"}
            className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/20 text-xs font-mono text-rose-200">
            <Sparkles size={13} />
            <span>Parvati • Sweetie🌸</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-white">
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
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/20 hover:bg-black/35 text-white font-mono text-xs font-bold transition-all"
          >
            <MessageCircle size={15} />
            <span>@parvatisingh3118</span>
          </a>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-black/20 hover:bg-black/35 text-slate-200 font-mono text-xs font-bold transition-all"
          >
            <Shield size={14} />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </div>
  );
}