"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";

function InstagramIcon({ size = 14 }: { size?: number }) {
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

const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Sweetie🌸", href: "/ai", icon: null },
  { label: "Contact", href: "/contact", icon: InstagramIcon },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-3 left-0 right-0 z-50 px-4">
      <nav className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 rounded-full bg-white/85 backdrop-blur-xl border border-rose-200/80 shadow-[0_10px_30px_rgba(244,63,94,0.10)] flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-heading font-bold text-sm sm:text-base text-slate-900 hover:text-rose-600 transition-colors"
        >
          <img
            src="/parvati.jpg"
            alt="Kumari Parvati Singh"
            className="w-7 h-7 rounded-full object-cover border border-rose-200 shadow-sm shrink-0"
          />
          <span className="truncate">Parvati</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25"
                    : "text-slate-700 hover:bg-rose-50 hover:text-rose-600"
                }`}
              >
                {Icon && <Icon size={14} />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}