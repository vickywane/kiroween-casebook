"use client";

import type { ReactNode } from "react";
import { Clock, Landmark, MapPin, Navigation, Scale, ShieldAlert } from "lucide-react";
import type { HistoricalCase, RecentAreaCount } from "@/lib/mock-data";
import { CrimeIcon } from "@/lib/crime-icons";
import { monthLabel } from "@/lib/area-stats";

/**
 * Small preview cards shown inside Leaflet popups when a map point is tapped
 * (desktop only). The full case panel opens alongside and carries the source
 * citation and location-match detail, so these stay short: what, where, when,
 * verdict / count and distance. Each fact leads with an icon instead of a label.
 *
 * Two tones (see tone-and-data-rules): the historic card may use casebook
 * styling; the recent card is plain and factual.
 *
 * Figma: Foundations & Components → "Map popup / Historic", "Map popup / Recent".
 */

function Fact({ icon, children, color }: { icon: ReactNode; children: ReactNode; color: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-[2px] shrink-0" style={{ color }} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

const ICON = "h-3.5 w-3.5";

export function HistoricPopup({ c, distance }: { c: HistoricalCase; distance: string }) {
  const acquitted = c.verdict.toLowerCase() === "not guilty";
  const verdictColor = acquitted ? "var(--cb-ink)" : "var(--cb-crimson)";
  const ref = c.ref ?? c.id.toUpperCase();
  const yearsAgo = new Date().getFullYear() - c.year;
  const muted = "var(--cb-muted)";

  return (
    <div className="w-[300px]">
      <div className="flex items-start gap-3 pr-5">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--cb-crimson)", color: "#fff" }}
        >
          <CrimeIcon category={c.offence_category} size={18} />
        </span>
        <div className="min-w-0">
          <p
            className="cb-mono truncate text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "var(--cb-crimson)" }}
          >
            Case file · {ref}
          </p>
          <p className="cb-serif mt-0.5 text-[17px] font-bold leading-tight" style={{ color: "var(--cb-ink)" }}>
            {c.title ?? c.offence_category}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-[12.5px]" style={{ color: "var(--cb-text)" }}>
        <Fact icon={<MapPin className={ICON} />} color={muted}>
          {c.location_raw}
        </Fact>
        <Fact icon={<Clock className={ICON} />} color={muted}>
          {c.date_label ?? c.year}
          <span style={{ color: muted }}> · {yearsAgo} years ago</span>
        </Fact>
        {c.outcome && (
          <Fact icon={<Scale className={ICON} />} color={muted}>
            {c.outcome}
          </Fact>
        )}
        <Fact icon={<Navigation className={ICON} />} color={muted}>
          {distance}
        </Fact>
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className="cb-mono inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: verdictColor, borderColor: verdictColor }}
        >
          <Scale className="h-3 w-3" aria-hidden="true" />
          {c.verdict}
        </span>
        <span
          className="cb-mono border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em]"
          style={{ color: muted, borderColor: "var(--cb-border)" }}
        >
          {c.offence_category}
        </span>
        {c.is_violent && (
          <span
            className="cb-mono inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em]"
            style={{ background: "var(--cb-stone)", color: "var(--cb-text)" }}
          >
            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
            Content note: violence
          </span>
        )}
      </div>
    </div>
  );
}

export function RecentPopup({ r, distance }: { r: RecentAreaCount; distance: string }) {
  const breakdown = r.breakdown ?? [{ label: r.category_label, count: r.count }];
  const total = breakdown.reduce((s, b) => s + b.count, 0);
  const top = breakdown.slice(0, 3);
  const more = breakdown.length - top.length;
  const max = Math.max(...top.map((b) => b.count), 1);

  return (
    <div className="w-[300px] text-[#1f2937]">
      <div className="flex items-start gap-3 pr-5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-600 text-white">
          <CrimeIcon category={r.category} size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">
            Recorded crime{r.month ? ` · ${monthLabel(r.month)}` : ""}
          </p>
          <p className="text-[15px] font-semibold leading-snug">{r.place ?? r.category_label}</p>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] text-slate-600">
        <span className="text-[20px] font-semibold text-slate-900">{total}</span>{" "}
        {total === 1 ? "crime" : "crimes"} recorded at this point
      </p>

      <ul className="mt-2 space-y-1.5">
        {top.map((b) => (
          <li key={b.label} className="text-[12px]">
            <div className="flex justify-between gap-2">
              <span className="truncate">{b.label}</span>
              <span className="tabular-nums text-slate-500">{b.count}</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-slate-100">
              <div className="h-1 rounded-full bg-slate-400" style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {more > 0 && <li className="text-[11.5px] text-slate-500">+ {more} more {more === 1 ? "category" : "categories"}</li>}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-2 text-[11.5px] text-slate-500">
        <span className="flex min-w-0 items-center gap-1.5">
          <Landmark className={`${ICON} shrink-0`} aria-hidden="true" />
          <span className="truncate">{r.force}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Navigation className={ICON} aria-hidden="true" />
          {distance}
        </span>
      </div>
    </div>
  );
}
