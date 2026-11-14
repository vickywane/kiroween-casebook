"use client";

import type { GeocodeConfidence } from "@/lib/mock-data";

const LABELS: Record<GeocodeConfidence, string> = {
  exact: "Exact address",
  street: "Street",
  area: "Area",
};

const STYLES: Record<GeocodeConfidence, string> = {
  exact: "bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700",
  street: "bg-yellow-900/30 text-yellow-400 ring-1 ring-yellow-700",
  area: "bg-zinc-700/40 text-zinc-400 ring-1 ring-zinc-600",
};

export function ConfidenceBadge({
  confidence,
}: {
  confidence: GeocodeConfidence;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${STYLES[confidence]}`}
    >
      <span aria-hidden="true">📍</span>
      {LABELS[confidence]}
    </span>
  );
}
