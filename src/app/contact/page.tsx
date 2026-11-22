"use client";

import { ExternalLink, Sparkles } from "lucide-react";

const INSTA_HANDLE = "parvatisingh3118";
const INSTA_DM_URL = `https://ig.me/m/${INSTA_HANDLE}`;

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto pt-8 sm:pt-14 animate-fade-up">
      <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-10 bg-white/90 backdrop-blur-xl border border-rose-200/80 shadow-[0_20px_50px_rgba(244,63,94,0.12)] text-center space-y-6">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600" />

        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
          <InstagramIcon size={32} />
        </div>

        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-rose-600 font-bold">
            <Sparkles size={13} /> Direct Message
          </p>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900">
            Message Parvati on Instagram
          </h1>
          <p className="text-sm text-slate-600">
            Want to connect or say hello? Slide straight into my Instagram DM!
          </p>
        </div>

        <div className="inline-block px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 font-mono text-sm font-bold text-rose-700">
          @{INSTA_HANDLE}
        </div>

        <div>
          <a
            href={INSTA_DM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <InstagramIcon size={18} />
            Open Instagram Direct DM
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}