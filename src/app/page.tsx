"use client";

import Link from "next/link";
import Guestbook from "@/components/Guestbook";
import { ArrowRight } from "lucide-react";

function InstagramIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
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
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-12 animate-fade-up">
      {/* Clean Hero Section with Animated DP */}
      <section className="flex flex-col items-center text-center space-y-5 pt-6 sm:pt-10">
        <div className="relative animate-float-dp">
          <div className="p-1.5 rounded-full bg-gradient-to-tr from-rose-400 via-pink-400 to-fuchsia-400 shadow-[0_18px_45px_rgba(244,63,94,0.28)]">
            <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-white bg-rose-100">
              <img
                src="/parvati.jpg"
                alt="Kumari Parvati Singh"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="inline-block space-y-2">
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight bg-gradient-to-r from-slate-900 via-rose-600 to-pink-600 bg-clip-text text-transparent">
            Kumari Parvati Singh
          </h1>
          <div className="relative h-[2.5px] w-full overflow-hidden rounded-full bg-rose-200/70">
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-rose-500 to-pink-400 animate-shimmer-line" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/ai"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:scale-105 transition-all"
          >
            Sweetie🌸 <ArrowRight size={15} />
          </Link>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 border border-rose-200 hover:border-rose-400 hover:bg-rose-50 font-bold text-sm shadow-sm hover:scale-105 transition-all"
          >
            <InstagramIcon size={16} className="text-rose-500" /> Instagram DM
          </Link>
        </div>
      </section>

      {/* Guestbook Section */}
      <Guestbook />
    </div>
  );
}