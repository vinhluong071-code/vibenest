"use client";

import { useEffect, useState } from "react";

export function AnimatedSplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    const showTimer = window.setTimeout(() => setPhase("visible"), 0);
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), 1200);
    const removeTimer = window.setTimeout(() => setPhase("hidden"), 1650);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;
  return (
    <div className={`vibenest-splash vibenest-splash--${phase}`} role="status" aria-label="VibeNest đang khởi động">
      <svg className="vibenest-splash__mark" viewBox="0 0 512 512" aria-hidden="true">
        <defs>
          <linearGradient id="vn-splash-neon" x1="78" y1="300" x2="434" y2="456">
            <stop offset="0" stopColor="#F43F5E" />
            <stop offset="1" stopColor="#9333EA" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="108" fill="#08080E" />
        <path d="M82 218 C132 218 151 102 211 102 C273 102 274 302 324 302 C371 302 379 154 430 154 C457 154 468 190 492 190"
          fill="none" stroke="#F7F4FA" strokeWidth="31" strokeLinecap="round" strokeLinejoin="round" />
        <g fill="none" stroke="url(#vn-splash-neon)" strokeLinecap="round">
          <path d="M78 278 C78 410 158 472 256 472 C354 472 434 410 434 278" strokeWidth="34" />
          <path d="M142 316 C166 382 210 411 256 411 C302 411 346 382 370 316" strokeWidth="29" />
        </g>
      </svg>
    </div>
  );
}

export default AnimatedSplashScreen;
