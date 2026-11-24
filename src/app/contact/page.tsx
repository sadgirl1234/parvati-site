"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Heart, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

const PETAL_COLORS = [
  { base: "#fb7185", edge: "#e11d48", highlight: "#ffe4e6" },
  { base: "#f472b6", edge: "#db2777", highlight: "#fce7f3" },
  { base: "#fda4af", edge: "#f43f5e", highlight: "#fff1f2" },
  { base: "#f9a8d4", edge: "#ec4899", highlight: "#fdf2f8" },
];

function drawLovelyPetalWithShadow(ctx: CanvasRenderingContext2D, p: RosePetal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.alpha;

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

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, 0);
  ctx.quadraticCurveTo(0, -r * 0.1, r * 0.62, 0);
  ctx.stroke();

  ctx.restore();
}

export default function ContactPage() {
  const [senderName, setSenderName] = useState("");
  const [senderNote, setSenderNote] = useState("");
  const [sending, setSending] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const petalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<RosePetal[]>([]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = senderName.trim().slice(0, 50) || "Guest";
    const cleanMsg = senderNote.trim().slice(0, 500);
    if (!cleanMsg || sending) return;

    setSending(true);
    setStatusText(null);
    const createdAt = new Date().toISOString();

    try {
      const localRecord = {
        id: `contact-${Date.now()}`,
        sender_name: cleanName,
        message: cleanMsg,
        created_at: createdAt,
      };
      try {
        const raw = localStorage.getItem("parvati_contact_messages_v1");
        const prev = raw ? (JSON.parse(raw) as unknown[]) : [];
        localStorage.setItem(
          "parvati_contact_messages_v1",
          JSON.stringify([localRecord, ...prev].slice(0, 300))
        );
      } catch {
        // Ignored
      }

      const { error } = await supabase.from("parvati_contact_messages").insert([
        {
          sender_name: cleanName,
          message: cleanMsg,
          created_at: createdAt,
        },
      ]);

      if (error) {
        setStatusText(`Saved locally (DB error: ${error.message})`);
      } else {
        setStatusText("Sent and saved permanently!");
        setSenderName("");
        setSenderNote("");
      }
    } catch {
      setStatusText("Saved locally.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-100/80 via-[#fff9f5] to-rose-100/80 text-rose-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <canvas
        ref={petalCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 w-full h-full z-20"
      />

      <div className="relative z-10 max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-[#fffdf9]/95 border border-pink-200/90 shadow-lg shadow-pink-100/80 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/80 text-xs font-mono font-bold uppercase tracking-wider text-pink-700">
            <Heart size={13} className="fill-pink-500 text-pink-500" />
            <span>Contact</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-rose-950">
            Kumari Parvati Singh
          </h1>
          <p className="text-xs sm:text-sm text-rose-900/75">
            Reach out or leave a warm note anytime.
          </p>
        </div>

        <div className="flex justify-center text-xs font-mono">
          <a
            href="https://ig.me/m/parvatisingh3118"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#fff8f3] hover:bg-pink-100/80 border border-pink-200 text-rose-800 font-bold transition-colors"
          >
            <MessageCircle size={16} className="text-pink-500" />
            <span>@parvatisingh3118</span>
          </a>
        </div>

        <form onSubmit={handleSend} className="space-y-3">
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name..."
            className="w-full px-4 py-2.5 rounded-2xl bg-[#fff8f3] border border-pink-200 focus:border-pink-400 focus:bg-white focus:outline-none text-xs text-rose-950"
          />
          <textarea
            rows={3}
            value={senderNote}
            onChange={(e) => setSenderNote(e.target.value)}
            placeholder="Write your message..."
            className="w-full px-4 py-2.5 rounded-2xl bg-[#fff8f3] border border-pink-200 focus:border-pink-400 focus:bg-white focus:outline-none text-xs text-rose-950"
          />
          <div className="flex items-center justify-between gap-3">
            {statusText ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-pink-700 font-bold">
                <CheckCircle2 size={14} /> {statusText}
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={sending || !senderNote.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-mono text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              <span>{sending ? "Sending..." : "Send"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}