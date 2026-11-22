"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Heart,
  Send,
  ThumbsUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";

interface GuestbookNote {
  id: number;
  name: string;
  message: string;
  likes: number;
  created_at: string;
}

const LIKED_KEY = "parvati_guestbook_liked";

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

export default function Guestbook() {
  const [notes, setNotes] = useState<GuestbookNote[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function loadNotes() {
    const { data } = await supabase
      .from("parvati_guestbook")
      .select("id, name, message, likes, created_at")
      .order("created_at", { ascending: false })
      .limit(12);

    if (data) setNotes(data);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIKED_KEY);
      if (saved) setLikedIds(JSON.parse(saved));
    } catch {
      // Ignored
    }
    loadNotes();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase.from("parvati_guestbook").insert([
      {
        name: name.trim().slice(0, 40),
        message: message.trim().slice(0, 400),
      },
    ]);

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("success");
    setName("");
    setMessage("");
    await loadNotes();
    setTimeout(() => setStatus("idle"), 3000);
  }

  async function handleLike(noteId: number) {
    if (likedIds.includes(noteId)) return;

    const { data, error } = await supabase.rpc("increment_parvati_like", {
      note_id: noteId,
    });

    if (!error && typeof data === "number") {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, likes: data } : n))
      );
      const updated = [...likedIds, noteId];
      setLikedIds(updated);
      try {
        localStorage.setItem(LIKED_KEY, JSON.stringify(updated));
      } catch {
        // Ignored
      }
    }
  }

  return (
    <section className="space-y-7 pt-6">
      <div className="text-center space-y-2">
        <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-mono font-bold text-rose-600 uppercase tracking-wider">
          <MessageCircle size={13} /> Guestbook
        </p>
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
          Leave a Sweet Note 🌸
        </h2>
        <p className="text-sm text-slate-600">
          Say hi, drop a compliment, or leave a little message for Parvati!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-rose-200/80 shadow-[0_12px_35px_rgba(244,63,94,0.08)] space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Your Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya"
              className="w-full px-4 py-2.5 rounded-2xl bg-rose-50/40 border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold uppercase text-slate-700">
              Your Message
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something cute..."
              className="w-full px-4 py-2.5 rounded-2xl bg-rose-50/40 border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm text-slate-900 resize-none"
            />
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 size={15} className="shrink-0" />
              Note posted! Thanks for stopping by 🌸
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-md shadow-rose-500/25 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={14} />
            {status === "loading" ? "Posting..." : "Post Note"}
          </button>
        </form>

        {/* Notes Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {notes.length === 0 ? (
            <div className="sm:col-span-2 p-8 rounded-3xl bg-white/80 border border-rose-100 text-center text-sm text-slate-500">
              <Heart size={20} className="mx-auto mb-2 text-rose-400" />
              No notes yet—be the first to leave one!
            </div>
          ) : (
            notes.map((note) => {
              const hasLiked = likedIds.includes(note.id);
              const ts = formatDateTime(note.created_at);
              return (
                <div
                  key={note.id}
                  className="p-5 rounded-3xl bg-white/90 border border-rose-100 hover:border-rose-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <p className="text-sm text-slate-800 leading-relaxed">
                    &ldquo;{note.message}&rdquo;
                  </p>

                  <div className="pt-2.5 border-t border-rose-100 flex items-end justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-heading font-bold text-slate-900">
                        {note.name}
                      </p>
                      {ts && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400">
                          <Clock size={10} /> {ts}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLike(note.id)}
                      disabled={hasLiked}
                      className={`inline-flex flex-col items-center justify-center min-w-[40px] px-2 py-1.5 rounded-2xl border transition-all ${
                        hasLiked
                          ? "bg-rose-50 border-rose-300 text-rose-600 cursor-default"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-400 hover:text-rose-600 cursor-pointer"
                      }`}
                    >
                      <ThumbsUp
                        size={14}
                        className={hasLiked ? "fill-rose-500 text-rose-600" : ""}
                      />
                      <span className="text-[10px] font-mono font-bold mt-0.5">
                        {note.likes ?? 0}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}