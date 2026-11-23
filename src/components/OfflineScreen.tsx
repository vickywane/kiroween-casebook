"use client";

import { X } from "lucide-react";
import type { HistoricalCase } from "@/lib/mock-data";
import { HistoricCaseCard } from "./CaseCard";
import { SecondaryButton } from "./ui";

/** E5 · Offline. Shows case files saved on this device. */
export function OfflineScreen({
  saved,
  onRetry,
  onOpen,
}: {
  saved: HistoricalCase[];
  onRetry: () => void;
  onOpen: (c: HistoricalCase) => void;
}) {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-28 pt-16 md:px-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ background: "var(--cb-note-bg)", color: "var(--cb-crimson)" }}>
          <X className="h-8 w-8" />
        </span>
        <h1 className="cb-serif mt-5 text-[26px] font-bold">You&apos;re offline</h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          Case files you&apos;ve opened are saved on this device. Reconnect to
          search new places.
        </p>
      </div>
      <div className="mt-5">
        <SecondaryButton onClick={onRetry}>Retry</SecondaryButton>
      </div>
      <p className="cb-mono mt-6 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--cb-muted)" }}>
        Saved on this device · {saved.length}
      </p>
      <div className="mt-3 space-y-3">
        {saved.length === 0 && (
          <p className="text-sm" style={{ color: "var(--cb-muted)" }}>
            Nothing saved yet. Tap the bookmark on a case file to keep it here.
          </p>
        )}
        {saved.map((c) => (
          <HistoricCaseCard key={c.id} c={c} distance="" saved onOpen={() => onOpen(c)} />
        ))}
      </div>
    </div>
  );
}
