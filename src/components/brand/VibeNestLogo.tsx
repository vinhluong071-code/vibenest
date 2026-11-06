"use client";

import { useId } from "react";

export interface VibeNestLogoProps {
  variant?: "full" | "mark" | "monochrome";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { svg: "w-6 h-6", text: "text-lg" },
  md: { svg: "w-7 h-7", text: "text-xl" },
  lg: { svg: "w-9 h-9", text: "text-2xl" },
} as const;

export function VibeNestLogo({
  variant = "full",
  size = "md",
  className = "",
}: VibeNestLogoProps) {
  const dimensions = SIZE_MAP[size];
  const isMono = variant === "monochrome";
  const gradientId = `vibenest-brand-gradient-${useId().replace(/:/g, "")}`;

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        className={`${dimensions.svg} shrink-0 transition-transform duration-200 group-hover:scale-105`}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {!isMono && (
          <defs>
            <linearGradient id={gradientId} x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="52%" stopColor="#E11D48" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        )}
        <path
          d="M5.5 19.5C5.5 26.956 11.096 31.5 18 31.5C24.904 31.5 30.5 26.956 30.5 19.5"
          stroke={isMono ? "currentColor" : `url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M9.5 21.5C11.3 25.3 14.35 27.25 18 27.25C21.65 27.25 24.7 25.3 26.5 21.5"
          stroke={isMono ? "currentColor" : `url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
        <path
          d="M8.5 15.25C11.2 15.25 11.8 9.5 14.5 9.5C17.2 9.5 16.8 18.5 19.5 18.5C22.2 18.5 22.5 11.5 25.2 11.5C26.8 11.5 27.3 14.25 28.5 14.25"
          stroke="currentColor"
          className="text-slate-900 dark:text-white"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {variant !== "mark" && (
        <span className={`font-display ${dimensions.text} font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap`}>
          VibeNest
        </span>
      )}
    </span>
  );
}
