"use client";

import { Scale } from "lucide-react";

/**
 * VerdictBadge — always visible on historic case cards.
 * Crimson outline, mono caps ("VERDICT: GUILTY"). Not guilty is shown in ink
 * so an acquitted person never reads as a perpetrator.
 */
export function VerdictBadge({ verdict }: { verdict: string }) {
  const acquitted = verdict.toLowerCase() === "not guilty";
  const color = acquitted ? "var(--cb-ink)" : "var(--cb-crimson)";
  return (
    <span
      className="cb-mono inline-flex items-center gap-1.5 border px-2 py-1 text-[12px] uppercase tracking-[0.1em]"
      style={{ color, borderColor: color }}
    >
      <Scale className="h-3 w-3" />
      Verdict: {verdict}
    </span>
  );
}
