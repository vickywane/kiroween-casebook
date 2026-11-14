"use client";

import { X } from "lucide-react";
import type { ThenAndNowRow } from "@/lib/mock-data";
import { CrimeIcon } from "@/lib/crime-icons";

interface Props {
  rows: ThenAndNowRow[];
  onClose: () => void;
}

/**
 * ThenAndNowPanel — side-by-side historical vs recent counts.
 * Split-tone: historical column uses sepia/amber, recent column uses plain grey.
 * Always shows the comparability caveat.
 */
export function ThenAndNowPanel({ rows, onClose }: Props) {
  const histTotal = rows.reduce((s, r) => s + r.historical_count, 0);
  const recentTotal = rows.reduce(
    (s, r) => s + (r.recent_count ?? 0),
    0,
  );

  return (
    <div
      className="flex flex-col overflow-y-auto"
      style={{ background: "var(--hist-bg)", color: "var(--hist-text)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{
          background: "var(--hist-bg)",
          borderColor: "var(--hist-card-border)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--hist-amber)" }}
        >
          Then &amp; Now
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded p-1 hover:bg-white/10"
        >
          <X className="h-4 w-4" style={{ color: "var(--hist-muted)" }} />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Caveat — always shown */}
        <p
          className="rounded-md border p-3 text-xs leading-relaxed"
          style={{
            borderColor: "var(--hist-card-border)",
            background: "var(--hist-card)",
            color: "var(--hist-muted)",
          }}
        >
          These counts measure different things. 18th- and 19th-century Old
          Bailey trials and modern police recording are not directly comparable.
        </p>

        {/* Column headers */}
        <div className="grid grid-cols-3 items-end gap-2 text-xs uppercase tracking-widest">
          <span style={{ color: "var(--hist-muted)" }}>Category</span>
          <span
            className="text-right font-semibold"
            style={{ color: "var(--hist-amber)" }}
          >
            Historical
          </span>
          <span className="text-right font-semibold text-gray-400">
            Recent
          </span>
        </div>

        {/* Rows */}
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--hist-card-border)" }}>
          {rows.map((row) => {
            const histPct =
              histTotal > 0 ? (row.historical_count / histTotal) * 100 : 0;
            const recentPct =
              recentTotal > 0 && row.recent_count != null
                ? (row.recent_count / recentTotal) * 100
                : 0;

            return (
              <div key={row.category} className="flex flex-col gap-2 py-3">
                <div className="grid grid-cols-3 items-center gap-2 text-sm">
                  <span className="flex items-center gap-1.5" style={{ color: "var(--hist-text)" }}>
                    <CrimeIcon
                      category={row.category}
                      size="badge"
                      color="var(--hist-amber)"
                    />
                    <span className="truncate">{row.category_label}</span>
                  </span>
                  <span
                    className="text-right font-semibold"
                    style={{ color: "var(--hist-amber-light)" }}
                  >
                    {row.historical_count}
                  </span>
                  <span className="text-right font-semibold text-gray-300">
                    {row.recent_count !== null
                      ? row.recent_count
                      : "small no."}
                  </span>
                </div>
                {/* Progress bars */}
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${histPct}%`,
                        background: "var(--hist-amber)",
                      }}
                    />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gray-400 transition-all"
                      style={{ width: `${recentPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div
          className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm"
          style={{
            background: "var(--hist-card)",
            borderColor: "var(--hist-card-border)",
          }}
        >
          <span
            className="font-semibold uppercase tracking-wide text-xs"
            style={{ color: "var(--hist-muted)" }}
          >
            Total
          </span>
          <span
            className="text-right font-bold"
            style={{ color: "var(--hist-amber-light)" }}
          >
            {histTotal}
          </span>
          <span className="text-right font-bold text-gray-300">
            {recentTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
