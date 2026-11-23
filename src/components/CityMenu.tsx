"use client";

import { Check, Crosshair, MapPin, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { citiesByCountry, type City } from "@/lib/cities";

type RowState = "selected" | "available" | "soon";

/** Figma: "City row" — Selected / Available / Coming soon. */
export function CityRow({
  city,
  state,
  meta,
  onSelect,
}: {
  city: City;
  state: RowState;
  meta?: string;
  onSelect?: () => void;
}) {
  const selected = state === "selected";
  const soon = state === "soon";
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soon || !onSelect}
      aria-pressed={onSelect && !soon ? selected : undefined}
      aria-disabled={soon || undefined}
      className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors enabled:hover:bg-[var(--cb-stone)] disabled:cursor-default"
      style={{
        background: selected ? "var(--cb-note-bg)" : "#fff",
        border: `${selected ? 2 : 1}px solid ${selected ? "var(--cb-crimson)" : "var(--cb-border)"}`,
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
        style={
          soon
            ? { background: "var(--cb-stone)", color: "var(--cb-muted)" }
            : { background: "var(--cb-crimson)", color: "#fff" }
        }
      >
        <MapPin className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[17px] font-semibold"
          style={{ color: soon ? "var(--cb-muted)" : "var(--cb-ink)" }}
        >
          {city.name}
        </span>
        <span className="block truncate text-[13px]" style={{ color: "var(--cb-muted)" }}>
          {meta ?? city.sources}
        </span>
      </span>
      {soon ? (
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wider"
          style={{ background: "var(--cb-stone)", color: "var(--cb-muted)" }}
        >
          SOON
        </span>
      ) : selected ? (
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "var(--cb-crimson)" }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : (
        <span
          className="h-[22px] w-[22px] shrink-0 rounded-full border-2"
          style={{ borderColor: "var(--cb-border)" }}
        />
      )}
    </button>
  );
}

/** Figma: M11 · City menu — left sidebar drawer over the map. */
export function CityMenu({
  open,
  city,
  detected,
  onSelect,
  onClose,
}: {
  open: boolean;
  city: City;
  /** City matched from the user's location, if any. */
  detected: City | null;
  onSelect: (c: City) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[1300] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none"
        style={{ background: "rgba(23,20,15,.45)", opacity: open ? 1 : 0 }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Choose a city"
        inert={!open}
        className="absolute inset-y-0 left-0 flex w-[min(340px,86vw)] flex-col gap-3 overflow-y-auto rounded-r-3xl bg-white px-4 pb-6 pt-6 shadow-[8px_0_30px_rgba(0,0,0,.18)] transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
        style={{ transform: open ? "translateX(0)" : "translateX(-105%)" }}
      >
        <div className="flex items-center">
          <div className="flex-1">
            <Overline>Choose a city</Overline>
            <h2 className="cb-serif text-[22px] font-bold">Cities</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close city menu"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md hover:bg-[var(--cb-stone)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {citiesByCountry().map(({ country, cities }) => {
          const live = cities.filter((c) => c.available).length;
          return (
            <section
              key={country.id}
              aria-label={country.name}
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderColor: "var(--cb-border)" }}
            >
              <div
                className="flex items-center gap-2 px-3.5 pb-2.5 pt-3"
                style={{ background: "var(--cb-stone)" }}
              >
                <h3 className="flex-1 text-[17px] font-semibold">{country.name}</h3>
                <span className="text-[13px]" style={{ color: "var(--cb-muted)" }}>
                  {live ? `${live} of ${cities.length} live` : "Coming soon"}
                </span>
              </div>
              <ul className="divide-y" style={{ borderColor: "var(--cb-border)" }}>
                {cities.map((c) => (
                  <li key={c.id} style={{ borderColor: "var(--cb-border)" }}>
                    <CityItem
                      city={c}
                      selected={c.id === city.id}
                      here={detected?.id === c.id}
                      onSelect={() => onSelect(c)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <p
          className="mt-auto flex items-center gap-2 pt-4 text-[13px]"
          style={{ color: "var(--cb-muted)" }}
        >
          <Crosshair className="h-4 w-4 shrink-0" />
          {detected
            ? `Detected from your location: ${detected.name}`
            : "Allow location to pick your city automatically"}
        </p>
      </aside>
    </div>
  );
}

/** Figma: "City item" — compact city line inside a country group. */
function CityItem({
  city,
  selected,
  here,
  onSelect,
}: {
  city: City;
  selected: boolean;
  /** The user's detected location is in this city. */
  here: boolean;
  onSelect: () => void;
}) {
  const soon = !city.available;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={soon}
      aria-current={selected ? "true" : undefined}
      className="flex h-12 w-full items-center gap-2.5 px-3.5 text-left text-[15px] transition-colors enabled:hover:bg-[var(--cb-stone)] disabled:cursor-default"
      style={{
        background: selected ? "var(--cb-note-bg)" : undefined,
        color: soon ? "var(--cb-muted)" : "var(--cb-ink)",
        fontWeight: selected ? 600 : 400,
      }}
    >
      <span className="min-w-0 flex-1 truncate">
        {city.name}
        {here && (
          <span className="ml-2 text-[13px] font-normal" style={{ color: "var(--cb-muted)" }}>
            · You’re here
          </span>
        )}
      </span>
      {soon ? (
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold tracking-wider"
          style={{ background: "var(--cb-stone)", color: "var(--cb-muted)" }}
        >
          SOON
        </span>
      ) : selected ? (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "var(--cb-crimson)" }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : (
        <span className="h-5 w-5 shrink-0 rounded-full border-2" style={{ borderColor: "var(--cb-border)" }} />
      )}
    </button>
  );
}

function Overline({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
      {children}
    </p>
  );
}
