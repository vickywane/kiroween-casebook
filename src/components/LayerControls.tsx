"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Menu, Search, SlidersHorizontal, X } from "lucide-react";
import { InstallButton } from "./InstallButton";

interface Props {
  area: string;
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

function monthLong(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Top-of-map controls: current area pill and the filter menu. */
export function LayerControls({
  area,
  onOpenCities,
  inline = false,
  floatAlways = false,
  months,
  month,
  onMonthChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the menu or on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = month ?? months?.[months.length - 1] ?? null;

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
          className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-4 shadow-md"
          role="status"
          aria-label="Current area"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate text-[15px]">{area}</span>
        </div>

        {/* Desktop has it in the top navbar. */}
        <InstallButton className="lg:hidden [&>button]:h-12 [&>button]:w-12 [&>button]:border-0 [&>button]:shadow-md" />
        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Filters"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-colors"
            style={open ? { background: "var(--cb-ink)", color: "#fff" } : { background: "#fff", color: "var(--cb-ink)" }}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>

          {open && (
            <div
              role="dialog"
              aria-label="Filters"
              className="absolute right-0 top-14 z-[1100] w-[280px] rounded-2xl border bg-white p-4 shadow-xl"
              style={{ borderColor: "var(--cb-border)", color: "var(--cb-ink)" }}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">Filters</p>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--cb-stone)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-4 block">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" />
                  police.uk month
                </span>
                {months && months.length > 0 ? (
                  <select
                    value={shown ?? undefined}
                    onChange={(e) => onMonthChange?.(e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border bg-white px-3 text-[15px] outline-none"
                    style={{ borderColor: "var(--cb-border)" }}
                  >
                    {[...months].reverse().map((m) => (
                      <option key={m} value={m}>
                        {monthLong(m)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="mt-2 block text-sm" style={{ color: "var(--cb-muted)" }}>
                    Loading months…
                  </span>
                )}
                <span className="mt-2 block text-xs" style={{ color: "var(--cb-muted)" }}>
                  Recent crime counts for this month. Old Bailey cases are always shown.
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
