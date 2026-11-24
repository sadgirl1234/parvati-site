"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  Bot,
  Heart,
  BookOpen,
  Send,
  ThumbsUp,
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

    supabase
      .from("parvati_guestbook")
      .select("id, name, message, likes, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          const rows = data as GuestbookEntry[];
          setEntries(rows);
          try {
            localStorage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(rows));
          } catch {
            // Ignored
          }
        }
      });
  }, []);

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
        {/* Top Showcase Row: Video DP (Left) | Kumari Parvati Singh (Center) | Navbar Avatar Image (Right) */}
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
            <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight animated-name-text leading-tight">
              Kumari Parvati Singh
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-xs leading-relaxed">
              Warm vibes, playful moments, and sweet conversations anytime.
            </p>
          </div>

          {/* Right: Same Avatar Image as Navigation Bar */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative p-1.5 rounded-full animated-dp-border shadow-xl">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-rose-50 relative">
                <img
                  src={dpSrc}
                  alt="Kumari Parvati Singh"
                  onError={() => {
                    if (dpSrc === "/parvati.jpg") {
                      setDpSrc("/parvati.png");
                    } else if (dpSrc === "/parvati.png") {
                      setDpSrc("/images/parvati.jpg");
                    }
                  }}
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

        {/* Action Buttons */}
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

        {/* Guestbook Form + Messages from parvati_guestbook */}
        <div className="max-w-2xl w-full p-5 sm:p-6 rounded-3xl bg-white/95 border border-rose-200/80 shadow-md space-y-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
              <BookOpen size={15} />
              <span>Guestbook ({entries.length})</span>
            </div>
          </div>

          <form onSubmit={handleGuestbookSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name..."
                className="px-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-xs text-slate-900"
              />
              <input
                type="text"
                value={guestMessage}
                onChange={(e) => setGuestMessage(e.target.value)}
                placeholder="Write a sweet message..."
                className="sm:col-span-2 px-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-xs text-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !guestMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-mono text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{submitting ? "Posting..." : "Post Note"}</span>
              </button>
            </div>
          </form>

          {/* All Guestbook Messages from parvati_guestbook */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pt-2 border-t border-rose-100">
            {entries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                Loading guestbook messages...
              </p>
            ) : (
              entries.map((item) => {
                const idStr = String(item.id);
                const isLiked = likedIds.includes(idStr);
                const likeCount = Math.max(0, Number(item.likes ?? 0));

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-slate-900">
                        {item.name}
                      </span>
                      <span className="text-slate-400">
                        {formatMessageDateTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(item)}
                        aria-label={isLiked ? "Unlike message" : "Like message"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                          isLiked
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-white hover:bg-rose-50 text-slate-600 border border-rose-100"
                        }`}
                      >
                        <ThumbsUp
                          size={12}
                          className={
                            isLiked ? "fill-rose-600 text-rose-600" : ""
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