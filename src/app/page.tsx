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
  Heart,
} from "lucide-react";

const LOVE_NOTES = [
  "Every quiet moment feels softer when you're around, and even simple days turn into sweet memories.",
  "A little warmth, a little laughter, and a whole lot of heart — always keeping things genuine and close.",
  "Some connections don't need loud words; just being there makes everything feel brighter and calm.",
];

export default function HomePage() {
  const [muted, setMuted] = useState(true);
  const [noteIdx, setNoteIdx] = useState(0);
  const dpVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (dpVideoRef.current) {
      dpVideoRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNoteIdx((prev) => (prev + 1) % LOVE_NOTES.length);
    }, 6000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50/80 via-white to-pink-50/80 text-slate-900 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <style jsx>{`
        @keyframes borderShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animated-dp-border {
          background: linear-gradient(
            120deg,
            #f43f5e,
            #ec4899,
            #f59e0b,
            #e11d48,
            #f43f5e
          );
          background-size: 260% 260%;
          animation: borderShift 5s ease infinite;
        }

        .animated-name-text {
          background: linear-gradient(
            90deg,
            #e11d48,
            #db2777,
            #d97706,
            #f43f5e,
            #e11d48
          );
          background-size: 240% 240%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: borderShift 6s ease infinite;
        }
      `}</style>

      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-8">
        {/* Top Showcase Row: Video DP (Left) | Kumari Parvati Singh (Center) | Previous DP (Right) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-4">
          {/* Left: Animated Video DP with Animated Border */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full animated-dp-border shadow-xl">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-slate-950 relative">
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
                className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-slate-900/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          {/* Center: Full Name with Animated Color */}
          <div className="flex flex-col items-center justify-center space-y-2 px-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/90 border border-rose-200 text-xs font-mono font-bold text-rose-700">
              <Sparkles size={13} />
              <span>Parvati • Sweetie🌸</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight animated-name-text leading-tight">
              Kumari Parvati Singh
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xs leading-relaxed">
              Warm vibes, playful moments, and sweet conversations anytime.
            </p>
          </div>

          {/* Right: Previous DP Image */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-rose-200 via-pink-100 to-amber-100 border border-rose-200 shadow-lg">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-rose-50 relative">
                <img
                  src="/images/parvati-dp.jpg"
                  alt="Kumari Parvati Singh"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Love Notes Card */}
        <div className="max-w-xl w-full p-5 sm:p-6 rounded-3xl bg-white/95 border border-rose-200/80 shadow-md space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
            <Heart size={14} className="fill-rose-500 text-rose-500" />
            <span>Love Notes</span>
          </div>

          <p className="text-sm sm:text-base text-slate-700 italic leading-relaxed">
            &ldquo;{LOVE_NOTES[noteIdx]}&rdquo;
          </p>

          <div className="flex items-center justify-center gap-1.5 pt-1">
            {LOVE_NOTES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNoteIdx(idx)}
                aria-label={`Show love note ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  noteIdx === idx ? "w-6 bg-rose-500" : "w-2 bg-rose-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons (Admin button removed) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/ai"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-mono text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
          >
            <Bot size={15} />
            <span>Chat with Sweetie🌸 AI</span>
            <ArrowRight size={15} />
          </Link>

          <a
            href="https://ig.me/m/parvatisingh3118"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs font-bold shadow-sm transition-all"
          >
            <MessageCircle size={15} />
            <span>@parvatisingh3118</span>
          </a>
        </div>
      </div>
    </div>
  );
}