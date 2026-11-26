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

  // Load Google's <model-viewer> script once on the client
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (customElements.get("model-viewer")) return;
    const existing = document.querySelector(
      'script[data-model-viewer="true"]'
    );
    if (existing) return;

    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.setAttribute("data-model-viewer", "true");
    document.head.appendChild(script);
  }, []);

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
  const modelSrc = isTea ? "/models/tea.glb" : "/models/coffee.glb";

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

      {/* Interactive 3D Cup + Animated User Name Card */}
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

          {/* Rising Steam + Interactive 3D Model Viewer */}
          <div className="relative w-full flex flex-col items-center justify-center">
            {/* Subtle Rising Steam above 3D Cup */}
            <div className="flex items-end gap-2.5 h-6 -mb-2 z-10 pointer-events-none">
              <span
                className="w-1.5 h-5 rounded-full bg-white/75 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out infinite",
                }}
              />
              <span
                className="w-1.5 h-6 rounded-full bg-white/85 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out 0.35s infinite",
                }}
              />
              <span
                className="w-1.5 h-4 rounded-full bg-white/70 block"
                style={{
                  animation: "psSteamRise 1.6s ease-in-out 0.7s infinite",
                }}
              />
            </div>

            {/* Real 3D .glb Model */}
            <div className="w-full h-56 sm:h-64 flex items-center justify-center">
              {React.createElement("model-viewer" as any, {
                src: modelSrc,
                alt: isTea ? "3D Tea Cup" : "3D Coffee Cup",
                "auto-rotate": true,
                "rotation-per-second": "28deg",
                "camera-controls": true,
                "disable-zoom": false,
                "shadow-intensity": "1.2",
                "shadow-softness": "0.8",
                exposure: "1.1",
                "interaction-prompt": "none",
                loading: "eager",
                style: {
                  width: "100%",
                  height: "100%",
                  backgroundColor: "transparent",
                },
              })}
            </div>
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

          <p className="text-[11px] opacity-80">
            Drag to rotate the 3D cup
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