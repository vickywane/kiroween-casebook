"use client";

import type { ReactNode } from "react";

/**
 * MapArt — static, decorative street-grid backdrop for onboarding screens
 * (not the live map). Pure CSS so it adds no map dependencies.
 */
export function MapArt({
  className = "",
  children,
  river = false,
  labels = true,
}: {
  className?: string;
  children?: ReactNode;
  river?: boolean;
  labels?: boolean;
}) {
  return (
    <div
      aria-hidden={children ? undefined : true}
      className={`relative overflow-hidden ${className}`}
      style={{
        background: "#e9e8e2",
        backgroundImage: [
          "linear-gradient(#fbfaf7 0 0)",
          "repeating-linear-gradient(0deg, transparent 0 46px, #fbfaf7 46px 54px)",
          "repeating-linear-gradient(90deg, transparent 0 62px, #fbfaf7 62px 71px)",
        ]
          .slice(1)
          .join(","),
      }}
    >
      <div
        className="absolute"
        style={{
          left: "55%",
          top: "-5%",
          width: "34%",
          height: "38%",
          background: "#dde7d7",
          borderRadius: 6,
        }}
      />
      {river && (
        <div
          className="absolute -left-10 -right-10"
          style={{
            bottom: "8%",
            height: "22%",
            background: "#c9dbe4",
            transform: "rotate(-8deg)",
          }}
        />
      )}
      {labels && (
        <>
          <span
            className="cb-mono absolute left-[8%] top-[18%] -rotate-[8deg] text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8b8a80" }}
          >
            Fleet Street
          </span>
          <span
            className="cb-mono absolute right-[6%] top-[8%] -rotate-[8deg] text-[11px] uppercase tracking-[0.12em]"
            style={{ color: "#8b8a80" }}
          >
            Ludgate Hill
          </span>
        </>
      )}
      {children}
    </div>
  );
}

/** Crimson circular pin with a courthouse glyph, as in the designs. */
export function HistoricPin({
  size = 32,
  active = false,
  className = "",
  style,
}: {
  size?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full border-2 border-white text-white shadow-md ${className}`}
      style={{
        width: size,
        height: size,
        background: "var(--cb-crimson)",
        boxShadow: active ? "0 0 0 4px var(--cb-gold)" : undefined,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.5}
        height={size * 0.5}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M3 10l9-6 9 6" />
      </svg>
    </span>
  );
}
