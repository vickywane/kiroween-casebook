"use client";

import { ChevronRight, ExternalLink, Navigation } from "lucide-react";
import type { HistoricalCase, RecentConcludedCase } from "@/lib/mock-data";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { VerdictBadge } from "./VerdictBadge";

const titleOf = (c: HistoricalCase) =>
  c.title ?? `${c.offence_category} · ${c.location_raw}`;

/** Historic case card (casebook styling: serif title, mono labels). */
export function HistoricCaseCard({
  c,
  distance,
  onOpen,
  compact = false,
  saved = false,
}: {
  c: HistoricalCase;
  distance: string;
  onOpen: () => void;
  compact?: boolean;
  saved?: boolean;
}) {
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-2xl border bg-white p-4 text-left transition-colors hover:bg-[var(--cb-stone)]"
      style={{ borderColor: "var(--cb-border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="cb-mono text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--cb-muted)" }}>
          Case file · {c.ref ?? c.id.toUpperCase()}
        </span>
        <span className="cb-mono inline-flex items-center gap-1 text-[12px]" style={{ color: "var(--cb-crimson)" }}>
          <Navigation className="h-3 w-3" />
          {saved ? "Saved" : distance}
        </span>
      </div>
      <h3 className="cb-serif mt-2 text-[22px] font-bold leading-tight">{titleOf(c)}</h3>
      {!compact && (
        <p className="mt-2 text-sm leading-snug" style={{ color: "var(--cb-muted)" }}>
          {c.summary.length > 140 ? c.summary.slice(0, 137).trimEnd() + "…" : c.summary}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <VerdictBadge verdict={c.verdict} />
        <span className="cb-mono text-xs" style={{ color: "var(--cb-muted)" }}>
          {c.date_label ?? c.year}
        </span>
      </div>
      <div className="mt-2">
        <ConfidenceBadge confidence={c.geocode_confidence} />
      </div>
    </button>
  );
}

/** Compact row used in the mobile bottom sheet ("1785 · 120 m away"). */
export function HistoricCaseRow({
  c,
  distance,
  onOpen,
}: {
  c: HistoricalCase;
  distance: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition-colors hover:bg-[var(--cb-stone)]"
      style={{ borderColor: "var(--cb-border)" }}
    >
      <span
        className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-xl"
        style={{ background: "#e9e8e2" }}
        aria-hidden="true"
      >
        <span className="h-4 w-4 rounded-full border-2 border-white" style={{ background: "var(--cb-crimson)" }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="cb-mono block text-xs" style={{ color: "var(--cb-muted)" }}>
          {c.year} · {distance} away
        </span>
        <span className="cb-serif mt-1 block text-lg font-bold leading-tight">{titleOf(c)}</span>
        <span className="mt-2 block">
          <VerdictBadge verdict={c.verdict} />
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </button>
  );
}

/** Recent concluded case card (plain tone: sans-serif, blue accent). */
export function RecentCaseCard({
  c,
  distance,
  onOpen,
}: {
  c: RecentConcludedCase;
  distance?: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="block w-full rounded-2xl border bg-white p-4 text-left transition-colors hover:bg-[var(--cb-stone)]"
      style={{ borderColor: "var(--cb-border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
          Recent · Concluded case
        </span>
        <span className="text-sm" style={{ color: "var(--cb-muted)" }}>
          {distance ?? c.distance_label}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
      <p className="mt-1 text-sm leading-snug" style={{ color: "var(--cb-muted)" }}>
        {c.finding.split(". ")[0]}. {c.appeal_status}.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--cb-blue)" }}>
        <ExternalLink className="h-3.5 w-3.5" />
        Find Case Law · {c.source_ref}
      </p>
    </button>
  );
}
