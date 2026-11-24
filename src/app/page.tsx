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
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GuestbookEntry {
  id: string | number;
  name: string;
  message: string;
  created_at: string;
  likes?: number | null;
}

const LOVE_NOTES = [
  "Every quiet moment feels softer when you're around, and even simple days turn into sweet memories.",
  "A little warmth, a little laughter, and a whole lot of heart — always keeping things genuine and close.",
  "Some connections don't need loud words; just being there makes everything feel brighter and calm.",
];

const GUESTBOOK_STORAGE_KEY = "parvati_guestbook_entries_v2";
const LIKED_IDS_STORAGE_KEY = "parvati_guestbook_liked_ids_v2";

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
    <div className="fixed inset-0 -z-10 bg-[#09090f] overflow-hidden pointer-events-none">
      <div className="min-h-screen w-full bg-[#09090f] text-slate-100 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden selection:bg-rose-500 selection:text-white">
        <style jsx>{`
          @keyframes bladeFlow {
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

          @keyframes katanaSweep {
            0% {
              transform: translateX(-140%) skewX(-28deg);
              opacity: 0;
            }
            20% {
              opacity: 0.7;
            }
            50% {
              opacity: 0.15;
            }
            100% {
              transform: translateX(240%) skewX(-28deg);
              opacity: 0;
            }
          }

          @keyframes pulseAura {
            0%,
            100% {
              filter: drop-shadow(0 0 14px rgba(244, 63, 94, 0.45));
            }
            50% {
              filter: drop-shadow(0 0 26px rgba(251, 191, 36, 0.6));
            }
          }

          .ninja-backdrop-grid {
            background-image: linear-gradient(
                to right,
                rgba(244, 63, 94, 0.06) 1px,
                transparent 1px
              ),
              linear-gradient(
                to bottom,
                rgba(244, 63, 94, 0.06) 1px,
                transparent 1px
              );
            background-size: 44px 44px;
          }

          .katana-beam-1 {
            animation: katanaSweep 7s ease-in-out infinite;
          }

          .katana-beam-2 {
            animation: katanaSweep 11s ease-in-out infinite 3.2s;
          }

          .ninja-cutout-outer {
            clip-path: polygon(
              18% 0%,
              82% 0%,
              100% 18%,
              100% 82%,
              82% 100%,
              18% 100%,
              0% 82%,
              0% 18%
            );
            background: linear-gradient(
              135deg,
              #f43f5e,
              #fbbf24,
              #ec4899,
              #e11d48,
              #f59e0b
            );
            background-size: 280% 280%;
            animation: bladeFlow 4.5s ease infinite;
          }

          .ninja-cutout-inner {
            clip-path: polygon(
              18% 0%,
              82% 0%,
              100% 18%,
              100% 82%,
              82% 100%,
              18% 100%,
              0% 82%,
              0% 18%
            );
          }

          .ninja-aura {
            animation: pulseAura 4s ease-in-out infinite;
          }

          .ninja-card-cut {
            clip-path: polygon(
              18px 0%,
              calc(100% - 18px) 0%,
              100% 18px,
              100% calc(100% - 18px),
              calc(100% - 18px) 100%,
              18px 100%,
              0% calc(100% - 18px),
              0% 18px
            );
          }

          .ninja-btn-cut {
            clip-path: polygon(
              12px 0%,
              100% 0%,
              calc(100% - 12px) 100%,
              0% 100%
            );
          }

          .ninja-chip-cut {
            clip-path: polygon(
              8px 0%,
              calc(100% - 8px) 0%,
              100% 50%,
              calc(100% - 8px) 100%,
              8px 100%,
              0% 50%
            );
          }

          .animated-name-text {
            background: linear-gradient(
              90deg,
              #fb7185,
              #fde047,
              #f43f5e,
              #f472b6,
              #fbbf24
            );
            background-size: 260% 260%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: bladeFlow 5s ease infinite;
          }
        `}</style>

        {/* Full-Page Ninja Backdrop & Katana Light Slashes */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 ninja-backdrop-grid opacity-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-rose-600/20 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -bottom-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-amber-500/15 blur-[130px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 left-0 w-44 bg-gradient-to-r from-transparent via-rose-400/20 to-transparent katana-beam-1"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-y-0 left-0 w-32 bg-gradient-to-r from-transparent via-amber-300/15 to-transparent katana-beam-2"
        />

        <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center space-y-8">
          {/* Top Showcase Row: Ninja Video DP (Left) | Kumari Parvati Singh (Center) | Ninja parvati.jpg DP (Right) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-7 md:gap-4">
            {/* Left: Sharp Octagonal Ninja Cutout Video DP */}
            <div className="flex flex-col items-center justify-center relative">
              <div className="relative ninja-aura">
                <div className="p-[3px] ninja-cutout-outer shadow-2xl">
                  <div className="w-44 h-44 sm:w-48 sm:h-48 ninja-cutout-inner overflow-hidden bg-slate-950 relative">
                    <video
                      ref={dpVideoRef}
                      src="/videos/sweetie-dp.mp4"
                      autoPlay
                      loop
                      muted={muted}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-rose-300/30 ninja-cutout-inner" />
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-amber-400"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-rose-500"
                />

                <button
                  type="button"
                  onClick={() => setMuted((prev) => !prev)}
                  aria-label={muted ? "Unmute DP video" : "Mute DP video"}
                  title={muted ? "Unmute sound" : "Mute sound"}
                  className="absolute -bottom-2 left-2 w-9 h-9 ninja-chip-cut bg-slate-900 hover:bg-rose-600 border border-rose-400/50 text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer"
                >
                  {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </div>
            </div>

            {/* Center: Full Name with Sharp Katana Divider (no sparkles logo) */}
            <div className="flex flex-col items-center justify-center space-y-3 px-2 relative">
              <div className="w-32 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

              <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight animated-name-text leading-tight drop-shadow-[0_2px_16px_rgba(244,63,94,0.35)]">
                Kumari Parvati Singh
              </h1>

              <div className="w-36 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

              <p className="text-xs sm:text-sm text-slate-300 max-w-xs leading-relaxed">
                Warm vibes, playful moments, and sweet conversations anytime.
              </p>
            </div>

            {/* Right: Sharp Octagonal Ninja Cutout parvati.jpg DP */}
            <div className="flex flex-col items-center justify-center relative">
              <div className="relative ninja-aura">
                <div className="p-[3px] ninja-cutout-outer shadow-2xl">
                  <div className="w-44 h-44 sm:w-48 sm:h-48 ninja-cutout-inner overflow-hidden bg-slate-950 relative">
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
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-amber-300/30 ninja-cutout-inner" />
                  </div>
                </div>

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-amber-400"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Love Notes Card with Sharp Chamfered Ninja Cutout */}
          <div className="max-w-xl w-full p-[1.5px] ninja-card-cut bg-gradient-to-r from-rose-500/70 via-amber-400/60 to-pink-500/70 shadow-[0_12px_40px_rgba(244,63,94,0.18)]">
            <div className="w-full h-full p-5 sm:p-6 ninja-card-cut bg-[#11111a]/95 backdrop-blur-md space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-rose-400">
                <Heart size={14} className="fill-rose-500 text-rose-500" />
                <span>Love Notes</span>
              </div>

              <p className="text-sm sm:text-base text-slate-200 italic leading-relaxed">
                &ldquo;{LOVE_NOTES[noteIdx]}&rdquo;
              </p>

              <div className="flex items-center justify-center gap-2 pt-1">
                {LOVE_NOTES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNoteIdx(idx)}
                    aria-label={`Show love note ${idx + 1}`}
                    className={`h-2 transition-all cursor-pointer ${
                      noteIdx === idx
                        ? "w-7 bg-gradient-to-r from-rose-500 to-amber-400 skew-x-[-20deg]"
                        : "w-2.5 bg-slate-700 hover:bg-rose-400/60 skew-x-[-20deg]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Ninja Cutout Guestbook Form + Messages from parvati_guestbook */}
          <div className="max-w-2xl w-full p-[1.5px] ninja-card-cut bg-gradient-to-br from-rose-500/60 via-slate-800 to-amber-400/50 shadow-[0_14px_45px_rgba(0,0,0,0.55)] text-left">
            <div className="w-full h-full p-5 sm:p-6 ninja-card-cut bg-[#11111a]/95 backdrop-blur-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                  <BookOpen size={15} />
                  <span>Guestbook ({entries.length})</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 ninja-chip-cut bg-rose-500/20 border border-rose-500/40 text-amber-300 text-[10px]">
                    <Flame size={11} className="text-rose-400" /> {totalLikes} likes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSortBy((prev) =>
                        prev === "newest" ? "likes" : "newest"
                      )
                    }
                    className="px-3 py-1 ninja-btn-cut bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-[11px] font-mono font-bold text-rose-200 cursor-pointer"
                  >
                    {sortBy === "newest" ? "Sort: Newest" : "Sort: Top Likes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void fetchGuestbookFromDb(true)}
                    aria-label="Refresh guestbook"
                    className="inline-flex items-center gap-1 px-3 py-1 ninja-btn-cut bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-200 cursor-pointer"
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
                    className="px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-rose-500/30 focus:border-amber-400 focus:bg-slate-900 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Write a sweet message..."
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-lg bg-slate-900/90 border border-rose-500/30 focus:border-amber-400 focus:bg-slate-900 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !guestMessage.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 ninja-btn-cut bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-mono text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send size={13} />
                    <span>{submitting ? "Posting..." : "Post Note"}</span>
                  </button>
                </div>
              </form>

              {/* All Guestbook Messages from parvati_guestbook */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pt-3 border-t border-rose-500/20 pr-1">
                {displayedEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
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
                        className="p-3.5 rounded-xl bg-slate-900/80 border-l-2 border-l-rose-500 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="font-bold text-amber-300">
                            {item.name}
                          </span>
                          <span className="text-slate-400">
                            {formatMessageDateTime(item.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(item)}
                            aria-label={isLiked ? "Unlike message" : "Like message"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 ninja-chip-cut text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                              isLiked
                                ? "bg-rose-600/30 text-amber-300 border border-rose-400/50"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            }`}
                          >
                            <ThumbsUp
                              size={12}
                              className={
                                isLiked ? "fill-amber-300 text-amber-300" : ""
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
      </div>
    </div>
  );
}