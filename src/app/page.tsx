"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  Heart,
  BookOpen,
  Send,
  ThumbsUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GuestbookEntry {
  id: string | number;
  name: string;
  message: string;
  created_at: string;
  likes?: number | null;
}

interface RosePetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  baseColor: string;
  edgeColor: string;
  highlightColor: string;
  alpha: number;
}

const LOVE_NOTES = [
  "Every quiet moment feels softer when you're around, and even simple days turn into sweet memories.",
  "A little warmth, a little laughter, and a whole lot of heart — always keeping things genuine and close.",
  "Some connections don't need loud words; just being there makes everything feel brighter and calm.",
];

const GUESTBOOK_STORAGE_KEY = "parvati_guestbook_entries_v2";
const LIKED_IDS_STORAGE_KEY = "parvati_guestbook_liked_ids_v2";

const PETAL_COLORS = [
  { base: "#fb7185", edge: "#e11d48", highlight: "#ffe4e6" },
  { base: "#f472b6", edge: "#db2777", highlight: "#fce7f3" },
  { base: "#fda4af", edge: "#f43f5e", highlight: "#fff1f2" },
  { base: "#f9a8d4", edge: "#ec4899", highlight: "#fdf2f8" },
];

function formatMessageDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function drawLovelyPetalWithShadow(ctx: CanvasRenderingContext2D, p: RosePetal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.alpha;

  // Soft rose & warm blush drop shadow beneath each petal
  ctx.shadowColor = "rgba(190, 24, 93, 0.24)";
  ctx.shadowBlur = Math.max(8, p.size * 0.9);
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = Math.max(5, p.size * 0.55);

  const r = p.size;
  const grad = ctx.createLinearGradient(-r, -r * 0.7, r, r * 0.7);
  grad.addColorStop(0, p.highlightColor);
  grad.addColorStop(0.45, p.baseColor);
  grad.addColorStop(1, p.edgeColor);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.bezierCurveTo(
    -r * 0.55,
    -r * 0.82,
    r * 0.45,
    -r * 0.75,
    r * 0.95,
    -r * 0.08
  );
  ctx.bezierCurveTo(
    r * 0.65,
    r * 0.78,
    -r * 0.45,
    r * 0.82,
    -r * 0.85,
    0
  );
  ctx.closePath();
  ctx.fill();

  // Subtle vein highlight without extra shadow
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, 0);
  ctx.quadraticCurveTo(0, -r * 0.1, r * 0.62, 0);
  ctx.stroke();

  ctx.restore();
}

export default function HomePage() {
  const [muted, setMuted] = useState(true);
  const [noteIdx, setNoteIdx] = useState(0);
  const [dpSrc, setDpSrc] = useState("/parvati.jpg");

  const [guestName, setGuestName] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "likes">("newest");

  const dpVideoRef = useRef<HTMLVideoElement | null>(null);
  const petalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<RosePetal[]>([]);

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

  // Continuous slow-falling rose petals with soft shadows
  useEffect(() => {
    const canvas = petalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const makePetal = (fromTop: boolean, index?: number): RosePetal => {
      const palette =
        PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      const baseX =
        typeof index === "number"
          ? ((index + 0.5) / 38) * width + (Math.random() - 0.5) * 32
          : Math.random() * width;

      return {
        x: ((baseX % width) + width) % width,
        y: fromTop ? -20 - Math.random() * 90 : Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: 0.26 + Math.random() * 0.24,
        size: 8.5 + Math.random() * 6.5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.012 + Math.random() * 0.01,
        swayAmp: 0.35 + Math.random() * 0.45,
        baseColor: palette.base,
        edgeColor: palette.edge,
        highlightColor: palette.highlight,
        alpha: 0.72 + Math.random() * 0.2,
      };
    };

    petalsRef.current = Array.from({ length: 38 }, (_, idx) =>
      makePetal(false, idx)
    );

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize, { passive: true });

    let rafId = 0;
    let breeze = 0;

    const animatePetals = () => {
      breeze += 0.004;
      const gentleBreeze = Math.sin(breeze) * 0.25;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petalsRef.current.length; i++) {
        const p = petalsRef.current[i];
        p.swayPhase += p.swaySpeed;
        p.x += gentleBreeze + p.vx + Math.sin(p.swayPhase) * p.swayAmp;
        p.y += p.vy;
        p.rotation += p.vRot + Math.cos(p.swayPhase) * 0.004;

        if (p.x < -30) p.x = width + 24;
        if (p.x > width + 30) p.x = -24;

        if (p.y > height + 28) {
          petalsRef.current[i] = makePetal(true, i);
          continue;
        }

        drawLovelyPetalWithShadow(ctx, p);
      }

      rafId = window.requestAnimationFrame(animatePetals);
    };

    rafId = window.requestAnimationFrame(animatePetals);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const fetchGuestbookFromDb = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await supabase
        .from("parvati_guestbook")
        .select("id, name, message, likes, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (Array.isArray(data)) {
        const rows = data as GuestbookEntry[];
        setEntries(rows);
        try {
          localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(rows));
        } catch {
          // Ignored
        }
      }
    } catch {
      // Ignored
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      const rawLikes = localStorage.getItem(LIKED_IDS_STORAGE_KEY);
      if (rawLikes) {
        const parsedLikes = JSON.parse(rawLikes) as unknown;
        if (Array.isArray(parsedLikes)) {
          setLikedIds(parsedLikes.map(String));
        }
      }
    } catch {
      // Ignored
    }

    try {
      const raw = localStorage.getItem(GUESTBOOK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GuestbookEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed);
        }
      }
    } catch {
      // Ignored
    }

    void fetchGuestbookFromDb(false);
  }, [fetchGuestbookFromDb]);

  const handleGuestbookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = guestName.trim().slice(0, 40) || "Guest";
    const cleanMsg = guestMessage.trim().slice(0, 240);
    if (!cleanMsg || submitting) return;

    setSubmitting(true);
    const createdIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry: GuestbookEntry = {
      id: tempId,
      name: cleanName,
      message: cleanMsg,
      created_at: createdIso,
      likes: 0,
    };

    const optimisticList = [optimisticEntry, ...entries];
    setEntries(optimisticList);
    setGuestName("");
    setGuestMessage("");

    try {
      const { data } = await supabase
        .from("parvati_guestbook")
        .insert([
          {
            name: cleanName,
            message: cleanMsg,
            likes: 0,
            created_at: createdIso,
          },
        ])
        .select("id, name, message, likes, created_at")
        .maybeSingle();

      if (data) {
        const inserted = data as GuestbookEntry;
        const synced = optimisticList.map((item) =>
          item.id === tempId ? inserted : item
        );
        setEntries(synced);
        try {
          localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(synced));
        } catch {
          // Ignored
        }
      }
    } catch {
      // Ignored
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (entry: GuestbookEntry) => {
    const idStr = String(entry.id);
    const alreadyLiked = likedIds.includes(idStr);
    const currentLikes = Math.max(0, Number(entry.likes ?? 0));
    const nextLikes = alreadyLiked
      ? Math.max(0, currentLikes - 1)
      : currentLikes + 1;

    const nextLikedIds = alreadyLiked
      ? likedIds.filter((x) => x !== idStr)
      : [...likedIds, idStr];

    setLikedIds(nextLikedIds);
    try {
      localStorage.setItem(
        LIKED_IDS_STORAGE_KEY,
        JSON.stringify(nextLikedIds)
      );
    } catch {
      // Ignored
    }

    const updatedEntries = entries.map((item) =>
      String(item.id) === idStr ? { ...item, likes: nextLikes } : item
    );
    setEntries(updatedEntries);
    try {
      localStorage.setItem(
        GUESTBOOK_STORAGE_KEY,
        JSON.stringify(updatedEntries)
      );
    } catch {
      // Ignored
    }

    if (!idStr.startsWith("temp-")) {
      try {
        await supabase
          .from("parvati_guestbook")
          .update({ likes: nextLikes })
          .eq("id", entry.id);
      } catch {
        // Ignored
      }
    }
  };

  const totalLikes = entries.reduce(
    (sum, item) => sum + Math.max(0, Number(item.likes ?? 0)),
    0
  );

  const displayedEntries = [...entries].sort((a, b) => {
    if (sortBy === "likes") {
      const diff =
        Math.max(0, Number(b.likes ?? 0)) - Math.max(0, Number(a.likes ?? 0));
      if (diff !== 0) return diff;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-100/80 via-[#fff9f5] to-rose-100/80 text-rose-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-pink-500 selection:text-white">
      <style jsx>{`
        @keyframes lovelyGlow {
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

        .lovely-ring {
          background: linear-gradient(
            135deg,
            #f472b6,
            #fb7185,
            #fde68a,
            #f9a8d4,
            #f43f5e
          );
          background-size: 250% 250%;
          animation: lovelyGlow 6s ease infinite;
        }

        .lovely-name-gradient {
          background: linear-gradient(
            90deg,
            #db2777,
            #e11d48,
            #ec4899,
            #d97706,
            #db2777
          );
          background-size: 240% 240%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: lovelyGlow 6s ease infinite;
        }
      `}</style>

      {/* Soft Pinkish & Cream Ambient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-20 bg-gradient-to-b from-pink-100/80 via-[#fff9f5] to-rose-100/80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-24 left-1/4 w-96 h-96 rounded-full bg-pink-200/45 blur-3xl -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-1/4 w-96 h-96 rounded-full bg-amber-100/60 blur-3xl -z-10"
      />

      {/* Continuous Slow-Falling Rose Petals with Shadows */}
      <canvas
        ref={petalCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full z-20"
      />

      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-8">
        {/* Top Showcase Row: Video DP (Left) | Kumari Parvati Singh (Center) | parvati.jpg (Right) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-4">
          {/* Left: Rounded Lovely Video DP */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full lovely-ring shadow-lg shadow-pink-200/70">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-[#fffdf9] relative ring-2 ring-[#fffdf9]">
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
                className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#fffdf9] hover:bg-pink-500 text-rose-600 hover:text-white border border-pink-200 flex items-center justify-center shadow-md transition-colors cursor-pointer"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>

          {/* Center: Full Name with Lovely Pink-Cream Gradient */}
          <div className="flex flex-col items-center justify-center space-y-2.5 px-4 py-5 rounded-3xl bg-[#fffdf9]/85 border border-pink-200/80 shadow-sm backdrop-blur-sm">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight lovely-name-gradient leading-tight">
              Kumari Parvati Singh
            </h1>

            <p className="text-xs sm:text-sm text-rose-900/75 max-w-xs leading-relaxed">
              Warm vibes, playful moments, and sweet conversations anytime.
            </p>
          </div>

          {/* Right: Rounded Lovely parvati.jpg Profile Image */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full lovely-ring shadow-lg shadow-pink-200/70">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-[#fffdf9] relative ring-2 ring-[#fffdf9]">
                <img
                  src={dpSrc}
                  alt="Kumari Parvati Singh"
                  onError={() => {
                    if (dpSrc === "/parvati.jpg") {
                      setDpSrc("/parvati.png");
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cream & Pink Rounded Love Notes Card */}
        <div className="max-w-xl w-full p-5 sm:p-6 rounded-3xl bg-[#fffdf9]/95 border border-pink-200/90 shadow-md shadow-pink-100/80 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/80 text-xs font-mono font-bold uppercase tracking-wider text-pink-700">
            <Heart size={13} className="fill-pink-500 text-pink-500" />
            <span>Love Notes</span>
          </div>

          <p className="text-sm sm:text-base text-rose-950/85 italic leading-relaxed">
            &ldquo;{LOVE_NOTES[noteIdx]}&rdquo;
          </p>

          <div className="flex items-center justify-center gap-2 pt-1">
            {LOVE_NOTES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNoteIdx(idx)}
                aria-label={`Show love note ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  noteIdx === idx
                    ? "w-7 bg-gradient-to-r from-pink-500 to-rose-400"
                    : "w-2.5 bg-pink-200 hover:bg-pink-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cream & Pink Rounded Guestbook Section */}
        <div className="max-w-2xl w-full p-5 sm:p-6 rounded-3xl bg-[#fffdf9]/95 border border-pink-200/90 shadow-lg shadow-pink-100/80 space-y-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-pink-700">
              <BookOpen size={15} />
              <span>Guestbook ({entries.length})</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-200 text-rose-700 text-[10px]">
                <Sparkles size={11} className="text-pink-500" /> {totalLikes}{" "}
                likes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) => (prev === "newest" ? "likes" : "newest"))
                }
                className="px-3 py-1 rounded-full bg-pink-100/80 hover:bg-pink-200/80 border border-pink-200 text-[11px] font-mono font-bold text-pink-800 transition-colors cursor-pointer"
              >
                {sortBy === "newest" ? "Sort: Newest" : "Sort: Top Likes"}
              </button>

              <button
                type="button"
                onClick={() => void fetchGuestbookFromDb(true)}
                aria-label="Refresh guestbook"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-mono font-bold text-rose-800 transition-colors cursor-pointer"
              >
                <RefreshCw
                  size={11}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleGuestbookSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name..."
                className="px-4 py-2.5 rounded-2xl bg-[#fff8f3] border border-pink-200 focus:border-pink-400 focus:bg-white focus:outline-none text-xs text-rose-950 placeholder:text-rose-400/70"
              />
              <input
                type="text"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                placeholder="Write a sweet message..."
                className="sm:col-span-2 px-4 py-2.5 rounded-2xl bg-[#fff8f3] border border-pink-200 focus:border-pink-400 focus:bg-white focus:outline-none text-xs text-rose-950 placeholder:text-rose-400/70"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !guestMessage.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-mono text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{submitting ? "Posting..." : "Post Note"}</span>
              </button>
            </div>
          </form>

          {/* All Guestbook Messages from parvati_guestbook */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pt-3 border-t border-pink-100 pr-1">
            {displayedEntries.length === 0 ? (
              <p className="text-xs text-rose-800/60 text-center py-3">
                No guestbook messages yet. Be the first to post!
              </p>
            ) : (
              displayedEntries.map((item) => {
                const idStr = String(item.id);
                const isLiked = likedIds.includes(idStr);
                const likeCount = Math.max(0, Number(item.likes ?? 0));

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-[#fff8f3] to-pink-50/60 border border-pink-200/70 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-pink-800">
                        {item.name}
                      </span>
                      <span className="text-rose-400">
                        {formatMessageDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-rose-950/85 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(item)}
                        aria-label={isLiked ? "Unlike message" : "Like message"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                          isLiked
                            ? "bg-pink-500 text-white shadow-xs"
                            : "bg-[#fffdf9] hover:bg-pink-100/70 text-rose-700 border border-pink-200"
                        }`}
                      >
                        <ThumbsUp
                          size={12}
                          className={
                            isLiked ? "fill-white text-white" : ""
                          }
                        />
                        <span>{likeCount}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}