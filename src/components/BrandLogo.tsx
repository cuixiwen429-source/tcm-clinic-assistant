"use client";

import { useId } from "react";

interface BrandLogoProps {
  size?: number;
  className?: string;
}

/** 简约 Logo — 药草 + 圆环 */
export function BrandLogo({ size = 76, className }: BrandLogoProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `g-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ flexShrink: 0 }}
      aria-label="药谷云阁"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C53030" />
          <stop offset="100%" stopColor="#9B2C2C" />
        </linearGradient>
      </defs>

      {/* Thin circle */}
      <circle cx="50" cy="50" r="44" fill="none" stroke={`url(#${gradId})`} strokeWidth="3" />

      {/* Herb leaf — two elegant arcs */}
      <path
        d="M50 28 Q68 42 50 72 Q32 42 50 28Z"
        fill={`url(#${gradId})`}
        opacity="0.9"
      />

      {/* Center vein line */}
      <line x1="50" y1="32" x2="50" y2="66" stroke="white" strokeWidth="1.4" opacity="0.7" />
    </svg>
  );
}
