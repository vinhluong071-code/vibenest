"use client";

import { useEffect, useState } from "react";

export function AnimatedSplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem("vibenest:splash:seen") === "1") return;
      window.sessionStorage.setItem("vibenest:splash:seen", "1");
    } catch {
      // The intro still works when session storage is unavailable.
    }
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
      <div className="vibenest-splash__center">
        <svg className="vibenest-splash__mark" viewBox="0 0 512 512" fill="none" aria-hidden="true">
          <defs><linearGradient id="vn-wave-smile" x1="90" y1="280" x2="430" y2="470"><stop stopColor="#F43F5E"/><stop offset="1" stopColor="#9333EA"/></linearGradient></defs>
          <path d="M92 176h42l23-42 33 88 35-119 38 145 34-92 28 54h95" stroke="white" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M105 302c65 85 145 128 151 128s86-43 151-128" stroke="url(#vn-wave-smile)" strokeWidth="18" strokeLinecap="round"/>
          <path d="M145 320c38 42 78 65 111 65s73-23 111-65" stroke="url(#vn-wave-smile)" strokeWidth="10" strokeLinecap="round"/>
        </svg>
        <span className="vibenest-splash__wordmark">VibeNest</span>
      </div>
    </div>
  );
}
export default AnimatedSplashScreen;
