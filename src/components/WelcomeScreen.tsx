"use client";

import { MapPin } from "lucide-react";

interface Props {
  onEnter: () => void;
}

/**
 * WelcomeScreen — M1 · Welcome.
 * Historical / casebook aesthetic. Dark background, Playfair serif, amber.
 */
export function WelcomeScreen({ onEnter }: Props) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-8 py-16 text-center"
      style={{ background: "var(--hist-bg)", color: "var(--hist-text)" }}
    >
      {/* Magnifying glass mark */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 text-4xl"
        style={{
          borderColor: "var(--hist-amber)",
          background: "var(--hist-card)",
        }}
      >
        🔍
      </div>

      {/* Title */}
      <h1
        className="mb-2 font-serif text-4xl font-bold italic leading-tight"
        style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          color: "var(--hist-sepia)",
        }}
      >
        Sherlock
      </h1>

      <p
        className="mb-1 text-sm font-semibold uppercase tracking-widest"
        style={{ color: "var(--hist-amber)" }}
      >
        Crime History at Your Location
      </p>

      {/* Strapline */}
      <p
        className="mt-6 max-w-xs text-sm leading-relaxed"
        style={{ color: "var(--hist-muted)" }}
      >
        Walk the streets of London and uncover the crimes committed where you
        stand — from Old Bailey records spanning 1674–1913 to present-day
        police data.
      </p>

      {/* Sources */}
      <div
        className="mt-8 flex flex-col gap-2 rounded-xl border p-4 text-left text-xs w-full max-w-xs"
        style={{
          background: "var(--hist-card)",
          borderColor: "var(--hist-card-border)",
          color: "var(--hist-muted)",
        }}
      >
        <p className="font-semibold uppercase tracking-widest" style={{ color: "var(--hist-amber)" }}>
          Data sources
        </p>
        <p>Old Bailey Online — CC BY 4.0</p>
        <p>data.police.uk — Open Government Licence</p>
      </div>

      {/* CTA */}
      <button
        onClick={onEnter}
        className="mt-10 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
        style={{
          background: "var(--hist-amber)",
          color: "var(--hist-bg)",
        }}
      >
        <MapPin className="h-4 w-4" />
        Begin Investigation
      </button>

      <p
        className="mt-4 text-[10px] leading-relaxed max-w-xs"
        style={{ color: "var(--hist-muted)" }}
      >
        Location access is requested to show cases near you. No data leaves
        your device.
      </p>
    </div>
  );
}
