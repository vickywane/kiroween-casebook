"use client";

import { Crosshair } from "lucide-react";
import { PrimaryButton, TextButton } from "./ui";

/** E2 · Location blocked. */
export function LocationBlocked({
  onSearch,
  onRetry,
}: {
  onSearch: () => void;
  onRetry: () => void;
}) {
  const steps = [
    "Tap the lock icon in the address bar",
    "Set Location to Allow",
    "Come back and tap Try again",
  ];
  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col px-6 pb-8 pt-24">
      <div className="flex flex-col items-center text-center">
        <span
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
          style={{ background: "var(--cb-note-bg)" }}
        >
          <Crosshair className="h-8 w-8" />
        </span>
        <h1 className="cb-serif mt-6 text-[26px] font-bold">Location is turned off</h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          Casebook needs your location to find cases near you. You can still
          search for any place.
        </p>
      </div>
      <div className="mt-6 rounded-2xl border bg-white p-4" style={{ borderColor: "var(--cb-border)" }}>
        <p className="cb-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--cb-muted)" }}>
          To turn it on
        </p>
        <ol className="mt-3 space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-[15px]">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: "var(--cb-note-bg)", color: "var(--cb-crimson)" }}
              >
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-8">
        <PrimaryButton onClick={onSearch}>Search for a place</PrimaryButton>
        <TextButton onClick={onRetry}>Try again</TextButton>
      </div>
    </div>
  );
}
