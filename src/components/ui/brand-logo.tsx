"use client";

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  showSoloBadge?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showTagline = true,
  showSoloBadge = true,
  className = "",
}: BrandLogoProps) {
  const sizeClasses = {
    sm: { text: "text-lg", tagline: "text-[9px]", icon: "w-4 h-4" },
    md: { text: "text-2xl", tagline: "text-[11px]", icon: "w-5 h-5" },
    lg: { text: "text-3xl", tagline: "text-[13px]", icon: "w-7 h-7" },
    xl: { text: "text-5xl", tagline: "text-[16px]", icon: "w-10 h-10" },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`inline-flex flex-col items-start select-none font-sans ${className}`}>
      <div className={`flex items-center gap-1.5 font-black tracking-tight ${currentSize.text}`}>
        <span className="text-lime-400 font-extrabold tracking-wider filter drop-shadow-[0_0_8px_rgba(163,230,53,0.4)] flex items-center">
          GR
          <span
            className="inline-flex items-center justify-center p-0.5 mx-0.5 rounded-lg bg-lime-400 text-zinc-950 shadow-sm shadow-lime-400/50"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={currentSize.icon}
            >
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 2 2v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6v-1.5" />
            </svg>
          </span>
          BBER
        </span>
        {showSoloBadge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 tracking-wide">
            SOLO
          </span>
        )}
      </div>
      {showTagline && (
        <span
          className={`font-semibold tracking-[0.3em] text-white/90 uppercase ${currentSize.tagline} pl-0.5`}
        >
          YOUR DAILY DOSE
        </span>
      )}
    </div>
  );
}
