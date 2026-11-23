"use client";

import {
  ArrowLeftRight,
  ChevronDown,
  MapPin,
  Bookmark,
  List,
  Map as MapIcon,
  SlidersHorizontal,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { City } from "@/lib/cities";
import { Logo } from "./ui";

export type Tab = "map" | "nearby" | "compare" | "saved" | "settings";

const MOBILE_TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "map", label: "Map", icon: <MapIcon className="h-5 w-5" /> },
  { id: "nearby", label: "Nearby", icon: <List className="h-5 w-5" /> },
  { id: "compare", label: "Compare", icon: <ArrowLeftRight className="h-5 w-5" /> },
  { id: "settings", label: "Settings", icon: <SlidersHorizontal className="h-5 w-5" /> },
];

const DESKTOP_TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "map", label: "Map", icon: <MapIcon className="h-4 w-4" /> },
  { id: "compare", label: "Compare", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
  { id: "settings", label: "Settings", icon: <SlidersHorizontal className="h-4 w-4" /> },
];

const PAD = 6; // nav padding
const GAP = 4; // gap between tabs
const ICON_BTN = 48; // collapsed tab width
const ACTIVE_CHROME = 58; // active tab: left pad 14 + icon 20 + gap 8 + right pad 16

/**
 * Floating pill used on mobile and tablet. The dark highlight slides between
 * tabs while the active tab expands to show its label.
 */
export function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const measureRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [labelW, setLabelW] = useState<number[]>(() =>
    MOBILE_TABS.map((t) => t.label.length * 9),
  );

  useLayoutEffect(() => {
    const measure = () =>
      setLabelW(
        MOBILE_TABS.map((_, i) =>
          Math.ceil(measureRefs.current[i]?.getBoundingClientRect().width ?? 0),
        ),
      );
    measure();
    void document.fonts?.ready.then(measure);
  }, []);

  const activeIdx = Math.max(
    0,
    MOBILE_TABS.findIndex((t) => t.id === tab),
  );
  const widths = MOBILE_TABS.map((_, i) =>
    i === activeIdx ? ACTIVE_CHROME + labelW[i] : ICON_BTN,
  );
  const left =
    PAD + widths.slice(0, activeIdx).reduce((a, w) => a + w + GAP, 0);

  return (
    <nav
      aria-label="Main"
      className="absolute bottom-4 left-1/2 z-[1100] flex -translate-x-1/2 items-center rounded-full border bg-white shadow-lg lg:hidden"
      style={{ borderColor: "var(--cb-border)", padding: PAD, gap: GAP }}
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full transition-[left,width] duration-300 ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
        style={{
          left,
          top: PAD,
          height: ICON_BTN,
          width: widths[activeIdx],
          background: "var(--cb-ink)",
        }}
      />
      {MOBILE_TABS.map((t, i) => {
        const active = i === activeIdx;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-label={t.label}
            aria-current={active ? "page" : undefined}
            className="relative z-10 flex h-12 items-center overflow-hidden whitespace-nowrap rounded-full pl-[14px] text-[15px] font-semibold transition-[width,color] duration-300 ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none"
            style={{
              width: widths[i],
              color: active ? "#fff" : "var(--cb-ink)",
            }}
          >
            <span className="shrink-0">{t.icon}</span>
            <span
              className="ml-2 transition-opacity duration-200 motion-reduce:transition-none"
              style={{ opacity: active ? 1 : 0, transitionDelay: active ? "120ms" : "0ms" }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
      {/* Hidden label measurers */}
      {MOBILE_TABS.map((t, i) => (
        <span
          key={t.id}
          ref={(el) => {
            measureRefs.current[i] = el;
          }}
          aria-hidden="true"
          className="invisible absolute left-0 top-0 -z-10 w-max whitespace-nowrap text-[15px] font-semibold"
        >
          {t.label}
        </span>
      ))}
    </nav>
  );
}

/** Desktop top bar: logo + city switcher on the left, pill tabs in the centre. */
export function TopNav({
  tab,
  onChange,
  city,
  onOpenCities,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  city: City;
  onOpenCities: () => void;
}) {
  return (
    <header
      className="relative z-[1100] hidden h-16 shrink-0 items-center border-b bg-white px-7 lg:flex"
      style={{ borderColor: "var(--cb-border)" }}
    >
      <Logo />
      <button
        onClick={onOpenCities}
        aria-label={`City: ${city.name}. Choose a city`}
        className="ml-4 flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:bg-[var(--cb-stone)]"
        style={{ borderColor: "var(--cb-border)" }}
      >
        <MapPin className="h-4 w-4" style={{ color: "var(--cb-crimson)" }} />
        {city.name}
        <ChevronDown className="h-4 w-4" style={{ color: "var(--cb-muted)" }} />
      </button>
      <nav
        aria-label="Main"
        className="absolute left-1/2 flex -translate-x-1/2 gap-1 rounded-full p-1"
        style={{ background: "var(--cb-stone)" }}
      >
        {DESKTOP_TABS.map((t) => {
          const active = tab === t.id || (t.id === "map" && tab === "nearby");
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active ? "page" : undefined}
              className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium"
              style={
                active
                  ? { background: "var(--cb-ink)", color: "#fff" }
                  : { color: "var(--cb-muted)" }
              }
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
