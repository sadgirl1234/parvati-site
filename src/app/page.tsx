"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  Volume2,
  VolumeX,
  Heart,
  BookOpen,
  Send,
  ThumbsUp,
  RefreshCw,
  Lock,
  LogIn,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeaCoffeeTreat from "@/components/TeaCoffeeTreat";

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
  spriteIdx: number;
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

function getGoogleDisplayName(user: User | null): string {
  if (!user) return "";
  const meta = user.user_metadata || {};
  const fullName =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === "string" && meta.name.trim()
      ? meta.name.trim()
      : "";
  if (fullName) return fullName;
  if (user.email) return user.email.split("@")[0];
  return "Google User";
}

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

// Pre-render each petal color once to an offscreen canvas (eliminates per-frame shadowBlur lag)
function createPetalSprites(): HTMLCanvasElement[] {
  return PETAL_COLORS.map((palette) => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 40;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.translate(20, 20);
      const r = 13;
      const grad = ctx.createLinearGradient(-r, -r * 0.7, r, r * 0.7);
      grad.addColorStop(0, palette.highlight);
      grad.addColorStop(0.45, palette.base);
      grad.addColorStop(1, palette.edge);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, 0);
      ctx.bezierCurveTo(-r * 0.55, -r * 0.82, r * 0.45, -r * 0.75, r * 0.95, -r * 0.08);
      ctx.bezierCurveTo(r * 0.65, r * 0.78, -r * 0.45, r * 0.82, -r * 0.85, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, 0);
      ctx.quadraticCurveTo(0, -r * 0.1, r * 0.62, 0);
      ctx.stroke();
    }
    return c;
  });
}

export default function HomePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [muted, setMuted] = useState(true);
  const [noteIdx, setNoteIdx] = useState(0);
  const [dpSrc, setDpSrc] = useState("/parvati.jpg");

  const [guestMessage, setGuestMessage] = useState("");
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "likes">("newest");

  const dpVideoRef = useRef<HTMLVideoElement | null>(null);
  const petalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<RosePetal[]>([]);

  const googleName = getGoogleDisplayName(authUser);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthUser(data?.user ?? null);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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

  useEffect(() => {
    const canvas = petalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const sprites = createPetalSprites();
    const PETAL_COUNT = 20;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const makePetal = (fromTop: boolean, index?: number): RosePetal => {
      const baseX =
        typeof index === "number"
          ? ((index + 0.5) / PETAL_COUNT) * width + (Math.random() - 0.5) * 40
          : Math.random() * width;

      return {
        x: ((baseX % width) + width) % width,
        y: fromTop ? -20 - Math.random() * 80 : Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: 0.3 + Math.random() * 0.26,
        size: 16 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.012 + Math.random() * 0.01,
        swayAmp: 0.35 + Math.random() * 0.45,
        spriteIdx: Math.floor(Math.random() * sprites.length),
        alpha: 0.72 + Math.random() * 0.2,
      };
    };

    petalsRef.current = Array.from({ length: PETAL_COUNT }, (_, idx) =>
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
      rafId = window.requestAnimationFrame(animatePetals);
      if (document.hidden) return;

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

        const sprite = sprites[p.spriteIdx];
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
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
    if (!authUser) {
      router.push("/ai");
      return;
    }

    const fixedGoogleName = getGoogleDisplayName(authUser).slice(0, 60);
    const cleanMsg = guestMessage.trim().slice(0, 240);
    if (!cleanMsg || submitting) return;

    setSubmitting(true);
    const createdIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const optimisticEntry: GuestbookEntry = {
      id: tempId,
      name: fixedGoogleName,
      message: cleanMsg,
      created_at: createdIso,
      likes: 0,
    };

    const optimisticList = [optimisticEntry, ...entries];
    setEntries(optimisticList);
    setGuestMessage("");

    try {
      const { data } = await supabase
        .from("parvati_guestbook")
        .insert([
          {
            name: fixedGoogleName,
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
    <div className="min-h-screen w-full text-rose-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-pink-500 selection:text-white">
      <style jsx>{`
        @keyframes borderOrbit {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes smoothFlowerSwayLeft {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(-10deg);
          }
          50% {
            transform: translate3d(0, -5px, 0) rotate(10deg);
          }
        }

        @keyframes smoothFlowerSwayRight {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(10deg);
          }
          50% {
            transform: translate3d(0, -5px, 0) rotate(-10deg);
          }
        }

        @keyframes smoothBloomTurn {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .lovely-ring {
          background: linear-gradient(135deg, #f472b6, #fb7185, #fde68a, #f43f5e);
        }

        .thin-rotating-name-shell {
          position: relative;
          overflow: hidden;
          border-radius: 9999px;
          padding: 2px;
        }

        .thin-rotating-name-beam {
          position: absolute;
          inset: -160%;
          background: conic-gradient(
            from 0deg,
            #ec4899,
            #f59e0b,
            #fb7185,
            #fde68a,
            #e11d48,
            #ec4899
          );
          animation: borderOrbit 5s linear infinite;
          will-change: transform;
        }

        .thin-rotating-name-inner {
          position: relative;
          z-index: 1;
          border-radius: 9999px;
          padding: 0.45rem 1.25rem;
        }

        .hd-flower-4k {
          will-change: transform;
        }

        .flower-sway-left {
          animation: smoothFlowerSwayLeft 3.4s ease-in-out infinite;
        }

        .flower-sway-right {
          animation: smoothFlowerSwayRight 3.4s ease-in-out infinite 0.85s;
        }

        .flower-bloom-spin {
          animation: smoothBloomTurn 8.5s linear infinite;
        }
      `}</style>

      {/* Pre-rendered Falling Rose Petals (zero shadowBlur lag) */}
      <canvas
        ref={petalCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full z-20"
      />

      <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-8">
        {/* Top Showcase Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-6 md:gap-4">
          {/* Left: Profile Image */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full lovely-ring">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-[#fffdf9] relative">
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

          {/* Center: Name + Tea/Coffee */}
          <div className="flex flex-col items-center justify-center space-y-2.5 px-3 py-3">
            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-3 text-xl sm:text-2xl select-none"
            >
              <span className="hd-flower-4k flower-sway-left inline-block">
                🌷
              </span>
              <span className="hd-flower-4k flower-bloom-spin inline-block">
                🌸
              </span>
              <span className="hd-flower-4k flower-sway-right inline-block">
                🌺
              </span>
            </div>

            <div className="thin-rotating-name-shell">
              <div aria-hidden="true" className="thin-rotating-name-beam" />
              <div className="thin-rotating-name-inner flex items-center justify-center gap-2">
                <span
                  aria-hidden="true"
                  className="hd-flower-4k flower-sway-left text-base sm:text-lg select-none"
                >
                  🌸
                </span>
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight hd-animated-name leading-tight whitespace-nowrap">
                  Kumari Parvati Singh
                </h1>
                <span
                  aria-hidden="true"
                  className="hd-flower-4k flower-sway-right text-base sm:text-lg select-none"
                >
                  🌸
                </span>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-3 text-sm sm:text-base select-none"
            >
              <span className="hd-flower-4k flower-sway-right inline-block">
                🌼
              </span>
              <span className="hd-flower-4k flower-sway-left inline-block">
                🌹
              </span>
              <span className="hd-flower-4k flower-sway-right inline-block">
                🌼
              </span>
            </div>

            <p className="text-xs sm:text-sm font-medium max-w-xs leading-relaxed">
              Warm vibes, playful moments, and sweet conversations anytime.
            </p>

            <TeaCoffeeTreat defaultName={googleName} />
          </div>

          {/* Right: Video DP */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full lovely-ring">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-[#fffdf9] relative">
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
                className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Love Notes Card */}
        <div className="max-w-xl w-full p-5 sm:p-6 rounded-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
            <Heart size={13} className="fill-pink-500 text-pink-500" />
            <span>Love Notes</span>
          </div>

          <p className="text-sm sm:text-base italic leading-relaxed">
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
                  noteIdx === idx ? "w-7" : "w-2.5"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Guestbook Section */}
        <div className="ps-guestbook-container max-w-2xl w-full p-5 sm:p-6 rounded-3xl space-y-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
              <BookOpen size={15} />
              <span>Guestbook ({entries.length})</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px]">
                <Heart size={11} className="fill-pink-500 text-pink-500" />{" "}
                {totalLikes} likes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) => (prev === "newest" ? "likes" : "newest"))
                }
                className="px-3 py-1 rounded-full text-[11px] font-mono font-bold cursor-pointer"
              >
                {sortBy === "newest" ? "Sort: Newest" : "Sort: Top Likes"}
              </button>

              <button
                type="button"
                onClick={() => void fetchGuestbookFromDb(true)}
                aria-label="Refresh guestbook"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-bold cursor-pointer"
              >
                <RefreshCw
                  size={11}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {!authChecked ? (
            <div className="p-4 rounded-2xl text-xs font-mono text-center">
              Checking Google login status...
            </div>
          ) : !authUser ? (
            <div className="p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium">
                Sign in with your Google account to post a guestbook message.
              </p>
              <button
                type="button"
                onClick={() => router.push("/ai")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-mono text-xs font-bold cursor-pointer"
              >
                <LogIn size={13} />
                <span>Login with Google</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuestbookSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div
                  title="Name synced from your Google account"
                  className="px-4 py-2.5 rounded-2xl text-xs font-mono font-bold flex items-center justify-between gap-2 select-none"
                >
                  <span className="truncate">{googleName}</span>
                  <Lock size={12} className="shrink-0" />
                </div>
                <input
                  type="text"
                  value={guestMessage}
                  onChange={(e) => setGuestMessage(e.target.value)}
                  placeholder="Write a sweet message..."
                  className="sm:col-span-2 px-4 py-2.5 rounded-2xl focus:outline-none text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !guestMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full font-mono text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{submitting ? "Posting..." : "Post Note"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Guestbook Messages */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pt-3 pr-1">
            {displayedEntries.length === 0 ? (
              <p className="text-xs text-center py-3">
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
                    className="ps-guestbook-msg p-3.5 rounded-2xl space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold">{item.name}</span>
                      <span>{formatMessageDateTime(item.created_at)}</span>
                    </div>

                    <p className="text-xs leading-relaxed">{item.message}</p>

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(item)}
                        aria-label={isLiked ? "Unlike message" : "Like message"}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold cursor-pointer"
                      >
                        <ThumbsUp
                          size={12}
                          className={isLiked ? "fill-white text-white" : ""}
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