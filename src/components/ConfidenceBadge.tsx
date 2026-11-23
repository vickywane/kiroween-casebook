"use client";

import type { GeocodeConfidence } from "@/lib/mock-data";

const LEVEL: Record<GeocodeConfidence, { n: number; word: string; basis: string }> = {
  exact: { n: 3, word: "high", basis: "exact address" },
  street: { n: 2, word: "medium", basis: "street" },
  area: { n: 1, word: "low", basis: "area" },
};

/** Three gold bars + "Location match: high". Basis is in the tooltip. */
export function ConfidenceBadge({
  confidence,
}: {
  confidence: GeocodeConfidence;
}) {
  const { n, word, basis } = LEVEL[confidence];
  return (
    <span
      className="inline-flex items-center gap-2"
      title={`Matched to ${basis}`}
    >
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-3"
            style={{
              background: i <= n ? "var(--cb-gold)" : "var(--cb-border)",
            }}
          />
        ))}
      </span>
      <span
        className="cb-mono text-[12px]"
        style={{ color: "var(--cb-muted)" }}
      >
        Location match: {word} ({basis})
      </span>
    </span>
  );
}
