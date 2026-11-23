"use client";

import { BookOpen, Info } from "lucide-react";
import {
  MOCK_CATEGORY_COMPARE,
  MOCK_DECADES,
} from "@/lib/mock-data";
import { Card, Eyebrow, InfoBox, SecondaryButton } from "./ui";

interface Props {
  street: string;
  /** Wider (1 mile) vs street-only comparison. */
  wide: boolean;
  onToggleWide: (wide: boolean) => void;
  /** Too few records: show the suppressed state (E6). */
  tooFew?: boolean;
}

/**
 * ComparePanel — M7 / D3 / E6 (Compare). Historic figures use crimson, recent use
 * blue. Bars show each category's share of its own period, never one
 * against the other. Street counts of 1 or 2 show as "a small number".
 */
export function ComparePanel({ street, wide, onToggleWide, tooFew = false }: Props) {
  const maxDecade = Math.max(...MOCK_DECADES.map((d) => d.count));

  if (tooFew) {
    return (
      <div className="px-5 pb-28 pt-6 md:px-6">
        <Eyebrow tone="crimson">Compare</Eyebrow>
        <h1 className="cb-serif mt-2 text-[32px] font-bold">{street}</h1>
        <Card className="mt-4 p-4">
          <Eyebrow tone="crimson">Then · 1780s</Eyebrow>
          <p className="cb-serif mt-2 text-5xl font-bold">14</p>
          <p className="text-[15px]">highway robberies tried at the Old Bailey from this street</p>
        </Card>
        <Card className="mt-3 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
            Now · Last 12 months
          </p>
          <p className="mt-2 text-xl font-semibold">A small number</p>
          <p className="mt-1 text-sm" style={{ color: "var(--cb-muted)" }}>
            Fewer than 5 recent records near here, so we don&apos;t show the
            exact number or a comparison. Small counts can point to real people.
          </p>
        </Card>
        <div className="mt-3">
          <SecondaryButton onClick={() => onToggleWide(true)}>
            Compare a wider area (1 mile)
          </SecondaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28 pt-6 md:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow tone="crimson">Compare</Eyebrow>
          <h1 className="cb-serif mt-2 text-[32px] font-bold leading-tight">{street}</h1>
          <p className="mt-1 text-[15px]" style={{ color: "var(--cb-muted)" }}>
            Old Bailey trials from this street compared with modern police
            records within {wide ? "1 mile" : "the street"}.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "1 mile", v: true },
            { label: "Street only", v: false },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => onToggleWide(o.v)}
              className="h-9 rounded-full border px-4 text-sm font-medium"
              style={
                wide === o.v
                  ? { background: "var(--cb-ink)", color: "#fff", borderColor: "var(--cb-ink)" }
                  : { borderColor: "var(--cb-border)" }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <Eyebrow tone="crimson">Then · 1780s</Eyebrow>
              <p className="cb-serif mt-3 text-5xl font-bold">14</p>
              <p className="mt-1 text-[15px] leading-snug">
                highway robberies tried at the Old Bailey
              </p>
              <p className="cb-mono mt-3 text-xs" style={{ color: "var(--cb-muted)" }}>
                Old Bailey Online
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
                Now · Last 12 mo
              </p>
              <p className="mt-3 text-5xl font-semibold">9</p>
              <p className="mt-1 text-[15px] leading-snug">
                robberies recorded within {wide ? "1 mile" : "this street"}
              </p>
              <p className="mt-3 text-xs" style={{ color: "var(--cb-muted)" }}>police.uk</p>
            </Card>
          </div>

          <InfoBox tone="note" icon={<Info className="mt-0.5 h-4 w-4 shrink-0" />}>
            Not a like-for-like comparison. 18th-century numbers count trials
            that reached court; today&apos;s count crimes reported to police.
          </InfoBox>

          <Card className="p-5">
            <p className="font-semibold">Trials from this street by decade</p>
            <div className="mt-4 flex h-[110px] items-end gap-1.5">
              {MOCK_DECADES.map((d) => (
                <div
                  key={d.label}
                  className="flex-1"
                  title={`${d.label}: ${d.count}`}
                  style={{
                    height: `${(d.count / maxDecade) * 100}%`,
                    background: d.label === "1780s" ? "var(--cb-crimson)" : "var(--cb-gold)",
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {MOCK_DECADES.map((d) => (
                <span key={d.label} className="cb-mono flex-1 text-center text-[10px]" style={{ color: "var(--cb-muted)" }}>
                  {d.label.replace("17", "").replace("18", "")}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-semibold">By category</p>
            <p className="text-sm" style={{ color: "var(--cb-muted)" }}>
              Bars show each category&apos;s share of its own period, not one
              against the other.
            </p>
            <div className="mt-4 space-y-4">
              {MOCK_CATEGORY_COMPARE.map((r) => (
                <div key={r.label}>
                  <p className="text-[15px]">{r.label}</p>
                  <Bar label="Then" value={r.then} max={61} color="var(--cb-crimson)" />
                  <Bar label="Now" value={r.now} max={212} color="var(--cb-blue)" />
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--cb-muted)" }}>
              Burglary today: a small number. Counts of 1 or 2 on a street are
              not shown.
            </p>
          </Card>

          <div className="rounded-2xl p-4" style={{ background: "var(--cb-stone)" }}>
            <p className="flex items-center gap-2 font-semibold">
              <BookOpen className="h-4 w-4" style={{ color: "var(--cb-crimson)" }} />
              Studying GCSE History?
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--cb-muted)" }}>
              Crime and punishment through time: use this street as a
              change-and-continuity case study.
            </p>
            <div className="mt-3">
              <SecondaryButton
                onClick={() =>
                  window.open(
                    "https://www.oldbaileyonline.org/about/education",
                    "_blank",
                    "noreferrer",
                  )
                }
              >
                Teacher notes
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number | null;
  max: number;
  color: string;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <span className="cb-mono w-9 text-[11px]" style={{ color: "var(--cb-muted)" }}>
        {label.toUpperCase()}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--cb-stone)" }}>
        {value !== null && (
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(3, (value / max) * 100)}%`, background: color }}
          />
        )}
      </span>
      <span className="cb-mono w-8 text-right text-sm">{value ?? "—"}</span>
    </div>
  );
}
