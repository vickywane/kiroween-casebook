"use client";

import { Building2, CalendarDays, Layers, Menu, Scale, Search, SlidersHorizontal } from "lucide-react";

export type LayerFilter = "historic" | "recent" | "both";

interface Props {
  value: LayerFilter;
  onChange: (v: LayerFilter) => void;
  area: string;
  onOpenSettings: () => void;
  /** Opens the city sidebar. Hidden on desktop, where the top bar has its own switcher. */
  onOpenCities: () => void;
  /** Render in normal flow inside a panel (tablet/desktop). */
  inline?: boolean;
  /** Float over the map on every screen size (used while the sidebar is hidden). */
  floatAlways?: boolean;
  /** police.uk months available, oldest first, and the one shown. */
  months?: string[];
  month?: string | null;
  onMonthChange?: (m: string) => void;
}

function monthShort(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

const OPTIONS: { id: LayerFilter; label: string; icon: React.ReactNode }[] = [
  { id: "historic", label: "Historic", icon: <Building2 className="h-4 w-4" /> },
  { id: "recent", label: "Recent", icon: <Scale className="h-4 w-4" /> },
  { id: "both", label: "Both", icon: <Layers className="h-4 w-4" /> },
];

/** Top-of-map controls: current area pill + Historic / Recent / Both. */
export function LayerControls({
  value,
  onChange,
  area,
  onOpenSettings,
  onOpenCities,
  inline = false,
  floatAlways = false,
  months,
  month,
  onMonthChange,
}: Props) {
  return (
    <div
      className={
        inline
          ? "flex flex-col gap-3"
          : `pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-3 p-4 ${floatAlways ? "" : "md:hidden"}`
      }
    >
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          onClick={onOpenCities}
          aria-label="Choose a city"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div
          className="flex h-12 flex-1 items-center gap-3 rounded-full bg-white px-4 shadow-md"
          role="status"
          aria-label="Current area"
        >
          <Search className="h-4 w-4" />
          <span className="truncate text-[15px]">{area}</span>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Layer settings"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Layers"
        className="pointer-events-auto flex w-fit gap-1 rounded-full p-1 shadow-md backdrop-blur"
        style={{ background: inline ? "var(--cb-stone)" : "rgba(255,255,255,.9)" }}
      >
        {OPTIONS.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className="flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium"
              style={
                active
                  ? { background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.18)", color: "var(--cb-ink)" }
                  : { color: "var(--cb-muted)" }
              }
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
      {months && months.length > 0 && value !== "historic" && (
        <label
          className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium shadow-md"
          style={{ background: inline ? "var(--cb-stone)" : "rgba(255,255,255,.9)", color: "var(--cb-ink)" }}
        >
          <span className="sr-only">police.uk month</span>
          <CalendarDays className="h-4 w-4" />
          <select
            value={month ?? months[months.length - 1]}
            onChange={(e) => onMonthChange?.(e.target.value)}
            className="bg-transparent outline-none"
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>
                {monthShort(m)}
              </option>
            ))}
          </select>
        </label>
      )}
      </div>
    </div>
  );
}
