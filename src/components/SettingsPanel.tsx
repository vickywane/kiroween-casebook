"use client";

import {
  BarChart3,
  Building2,
  ChevronRight,
  Map as MapIcon,
  Navigation,
  Scale,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, Eyebrow } from "./ui";

export interface Settings {
  historic: boolean;
  recent: boolean;
  stats: boolean;
  overlay: boolean;
  units: "mi" | "km";
}

interface Props {
  value: Settings;
  onChange: (next: Settings) => void;
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="relative h-8 w-14 shrink-0 rounded-full transition-colors"
      style={{ background: on ? "var(--cb-crimson)" : "var(--cb-border)" }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "28px" : "4px" }}
      />
    </button>
  );
}

function Row({
  icon,
  title,
  sub,
  right,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  right: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--cb-border)" }}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight">{title}</p>
        <p className="text-sm" style={{ color: "var(--cb-muted)" }}>{sub}</p>
      </div>
      {right}
    </div>
  );
}

const SOURCES = [
  { name: "Old Bailey Online", licence: "CC BY 4.0", href: "https://www.oldbaileyonline.org" },
  { name: "police.uk", licence: "Open Government Licence", href: "https://data.police.uk" },
  { name: "Wikipedia & Wikidata", licence: "CC BY-SA / CC0", href: "https://www.wikidata.org" },
  { name: "Find Case Law", licence: "The National Archives", href: "https://caselaw.nationalarchives.gov.uk" },
];

/** M8 · Settings. */
export function SettingsPanel({ value, onChange }: Props) {
  const toggle = (k: "historic" | "recent" | "stats" | "overlay") =>
    onChange({ ...value, [k]: !value[k] });
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-28 pt-8 md:px-6">
      <h1 className="cb-serif text-[32px] font-bold">Settings</h1>

      <div className="mt-6"><Eyebrow>Layers</Eyebrow></div>
      <Card className="mt-2">
        <Row icon={<Building2 className="h-5 w-5" />} title="Historic cases" sub="Old Bailey, 1674–1913"
          right={<Switch on={value.historic} onChange={() => toggle("historic")} label="Historic cases" />} />
        <Row icon={<Scale className="h-5 w-5" />} title="Recent concluded cases" sub="Court judgments & Wikidata"
          right={<Switch on={value.recent} onChange={() => toggle("recent")} label="Recent concluded cases" />} />
        <Row icon={<BarChart3 className="h-5 w-5" />} title="Area statistics" sub="police.uk, rounded counts"
          right={<Switch on={value.stats} onChange={() => toggle("stats")} label="Area statistics" />} />
        <Row icon={<MapIcon className="h-5 w-5" />} title="Historic map overlay" sub="Rocque's map of London, 1746"
          right={<Switch on={value.overlay} onChange={() => toggle("overlay")} label="Historic map overlay" />} />
      </Card>

      <div className="mt-6"><Eyebrow>Reading</Eyebrow></div>
      <Card className="mt-2">
        <Row icon={<ShieldAlert className="h-5 w-5" />} title="Content notes" sub="Always on for case files"
          right={<span className="text-sm" style={{ color: "var(--cb-muted)" }}>Always on</span>} />
        <Row icon={<Navigation className="h-5 w-5" />} title="Distance units" sub=""
          right={
            <span className="flex rounded-full p-1" style={{ background: "var(--cb-stone)" }}>
              {(["mi", "km"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => onChange({ ...value, units: u })}
                  className="rounded-full px-4 py-1 text-sm font-medium"
                  style={value.units === u ? { background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.12)" } : { color: "var(--cb-muted)" }}
                >
                  {u}
                </button>
              ))}
            </span>
          } />
      </Card>

      <div className="mt-6"><Eyebrow>About the data</Eyebrow></div>
      <Card className="mt-2">
        {SOURCES.map((s) => (
          <a
            key={s.name}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
            style={{ borderColor: "var(--cb-border)" }}
          >
            <span>
              <span className="block text-[15px] font-semibold leading-tight">{s.name}</span>
              <span className="text-sm" style={{ color: "var(--cb-muted)" }}>{s.licence}</span>
            </span>
            <ChevronRight className="h-5 w-5" />
          </a>
        ))}
      </Card>
    </div>
  );
}
