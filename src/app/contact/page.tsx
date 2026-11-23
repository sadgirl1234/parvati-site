"use client";

import { ArrowUpRight } from "lucide-react";

const INSTAGRAM_DM_URL = "https://ig.me/m/parvatisingh3118";

function InstagramDirectLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="igDmBadgeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <path
        d="M21.5 3.5L2.8 10.7c-1.1.4-1 2 .1 2.4l4.7 1.6 1.8 5.6c.4 1.1 1.8 1.3 2.5.4l2.7-3.4 4.8 3.5c.9.7 2.2.1 2.4-1l2.7-16.2c.2-1.1-.9-2-2-1.5z"
        fill="url(#igDmBadgeGrad)"
      />
      <path
        d="M7.6 14.7l11.8-8.9-9.1 10.6"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function InstagramDmCard() {
  return (
    <a
      href={INSTAGRAM_DM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-6 rounded-3xl bg-white/95 border border-rose-200/90 hover:border-pink-400 shadow-sm hover:shadow-xl transition-all space-y-3"
    >
      <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
        <InstagramDirectLogo size={16} />
        <span>DIRECT MESSAGE</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg sm:text-xl font-heading font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
          Message Parvati on Instagram
        </h3>
        <ArrowUpRight
          size={18}
          className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0"
        />
      </div>

      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Want to connect or say hello? Slide straight into Instagram Direct.
      </p>
    </a>
  );
}