"use client";

import { useEffect, useState } from "react";

export function AnimatedSplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("vibenest:splash:seen") === "1") return;
      window.sessionStorage.setItem("vibenest:splash:seen", "1");
    } catch {
      // Storage can be unavailable in private browsing; the intro still works once.
    }

    const showTimer = window.setTimeout(() => setPhase("visible"), 0);
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), 1200);
    const removeTimer = window.setTimeout(() => setPhase("hidden"), 1850);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className={`vibenest-splash vibenest-splash--${phase}`} role="status" aria-label="VibeNest đang khởi động">
      <div className="vibenest-splash__glow vibenest-splash__glow--one" />
      <div className="vibenest-splash__glow vibenest-splash__glow--two" />
      <div className="vibenest-splash__center">
        <svg className="vibenest-splash__mark" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <defs><linearGradient id="vn-splash-gradient" x1="12" y1="10" x2="108" y2="112" gradientUnits="userSpaceOnUse"><stop stopColor="#FF668F" /><stop offset=".52" stopColor="#A56BFF" /><stop offset="1" stopColor="#49DDEB" /></linearGradient></defs>
          <path d="M60 101S15 74 15 42C15 20 43 10 60 34C77 10 105 20 105 42C105 74 60 101 60 101Z" stroke="url(#vn-splash-gradient)" strokeWidth="5" strokeLinejoin="round" />
          <path d="M29 58H39L46 43L55 72L64 49L72 62H91" stroke="url(#vn-splash-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="60" r="45" stroke="url(#vn-splash-gradient)" strokeOpacity=".24" strokeWidth="1.5" />
        </svg>
        <span className="vibenest-splash__wordmark">VibeNest</span>
        <span className="vibenest-splash__tagline">Khoảnh khắc đồng điệu</span>
      </div>
      <div className="vibenest-splash__footer">by omni.id.vn</div>
    </div>
  );
}

export default AnimatedSplashScreen;
