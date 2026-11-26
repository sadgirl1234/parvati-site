"use client";

import React, { useEffect, useState } from "react";

type DrinkType = "tea" | "coffee" | null;

export default function TeaCoffeeTreat({
  defaultName = "",
}: {
  defaultName?: string;
}) {
  const [selected, setSelected] = useState<DrinkType>(null);
  const [userName, setUserName] = useState<string>(defaultName);
  const [animKey, setAnimKey] = useState<number>(0);

  // Sync if user signs in via Google/Guestbook or has a saved name in localStorage
  useEffect(() => {
    if (defaultName && defaultName.trim()) {
      setUserName(defaultName.trim());
      return;
    }
    try {
      const saved =
        localStorage.getItem("guestbook_name") ||
        localStorage.getItem("user_name") ||
        "";
      if (saved.trim()) setUserName(saved.trim());
    } catch {
      // ignore storage access issues
    }
  }, [defaultName]);

  const handleSelect = (drink: "tea" | "coffee") => {
    setSelected(drink);
    setAnimKey((prev) => prev + 1);
  };

  const handleNameChange = (val: string) => {
    setUserName(val);
    try {
      localStorage.setItem("user_name", val);
    } catch {
      // ignore
    }
  };

  const displayName = userName.trim() || "Sweet Guest";
  const isTea = selected === "tea";

  return (
    <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-md mx-auto">
      {/* Two Action Buttons (automatically styled with fl-3.jpg & 3D shadow by globals.css) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleSelect("tea")}
          className="px-5 py-2.5 rounded-full text-sm sm:text-base tracking-wide transition-transform duration-200 active:scale-95 hover:scale-105 cursor-pointer"
        >
          🍵 Get Tea
        </button>

        <button
          type="button"
          onClick={() => handleSelect("coffee")}
          className="px-5 py-2.5 rounded-full text-sm sm:text-base tracking-wide transition-transform duration-200 active:scale-95 hover:scale-105 cursor-pointer"
        >
          ☕ Get Coffee
        </button>
      </div>

      {/* Animated Cup + Animated User Name Card */}
      {selected && (
        <div
          key={animKey}
          className="w-full rounded-3xl p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden"
          style={{
            animation: "psCupReveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close drink card"
            className="px-2.5 py-1 rounded-full text-xs self-end cursor-pointer"
          >
            ✕
          </button>

          {/* Animated Steam + Cup SVG */}
          <div className="relative flex flex-col items-center justify-center pt-2">
            {/* Rising Steam */}
            <div className="flex items-end gap-2.5 h-8 mb-1">
              <span
                className="w-1.5 h-6 rounded-full bg-white/80 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out infinite",
                }}
              />
              <span
                className="w-1.5 h-7 rounded-full bg-white/90 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out 0.35s infinite",
                }}
              />
              <span
                className="w-1.5 h-5 rounded-full bg-white/75 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out 0.7s infinite",
                }}
              />
            </div>

            {/* Animated Cup Filling with Tea or Coffee */}
            <svg
              width="124"
              height="104"
              viewBox="0 0 124 104"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)]"
            >
              <defs>
                <clipPath id={`cupBowlClip-${animKey}`}>
                  <path d="M22 22 H90 V56 C90 76 74 90 56 90 C38 90 22 76 22 56 Z" />
                </clipPath>
                <linearGradient
                  id={`liquidGrad-${animKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  {isTea ? (
                    <>
                      <stop offset="0%" stopColor="#e59a4c" />
                      <stop offset="55%" stopColor="#b96524" />
                      <stop offset="100%" stopColor="#7c3a10" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#8b5a3c" />
                      <stop offset="50%" stopColor="#4b2816" />
                      <stop offset="100%" stopColor="#261107" />
                    </>
                  )}
                </linearGradient>
              </defs>

              {/* Saucer */}
              <ellipse
                cx="56"
                cy="95"
                rx="44"
                ry="6"
                fill="rgba(255,255,255,0.88)"
              />

              {/* Cup Handle */}
              <path
                d="M90 32 H101 C109 32 114 38 114 47 C114 56 109 62 101 62 H90"
                stroke="#ffffff"
                strokeWidth="7"
                strokeLinecap="round"
              />

              {/* Cup Outer Body */}
              <path
                d="M20 20 H92 V56 C92 77 75 92 56 92 C37 92 20 77 20 56 Z"
                fill="rgba(255,255,255,0.22)"
                stroke="#ffffff"
                strokeWidth="4"
              />

              {/* Liquid Filling Up Inside Cup */}
              <g clipPath={`url(#cupBowlClip-${animKey})`}>
                <rect
                  x="18"
                  y="28"
                  width="76"
                  height="66"
                  fill={`url(#liquidGrad-${animKey})`}
                  style={{
                    transformOrigin: "56px 90px",
                    animation:
                      "psLiquidFill 1.15s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                  }}
                />
                {/* Crema / Milk Foam Top Rim */}
                <ellipse
                  cx="56"
                  cy="31"
                  rx="33"
                  ry="4.5"
                  fill={isTea ? "#f5c58e" : "#c89d7c"}
                  style={{
                    animation: "psFoamFade 1.25s ease-out forwards",
                  }}
                />
              </g>
            </svg>
          </div>

          {/* Animated User Name Badge */}
          <div
            className="px-4 py-1.5 rounded-full"
            style={{
              animation: "psNameFloat 2.4s ease-in-out infinite",
            }}
          >
            <span className="text-base sm:text-lg tracking-wide">
              ✨ For {displayName} ✨
            </span>
          </div>

          <p className="text-xs sm:text-sm opacity-95">
            {isTea
              ? `Fresh hot masala chai brewed with warmth for ${displayName}!`
              : `Rich hot coffee brewed with love for ${displayName}!`}
          </p>

          {/* Optional quick name input so any visitor can personalize their cup */}
          <input
            type="text"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Type your name for your cup..."
            maxLength={32}
            className="w-full max-w-xs px-3.5 py-2 rounded-full text-center text-xs sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}