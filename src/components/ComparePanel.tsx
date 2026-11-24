"use client";

import { useEffect, useState } from "react";
import { BookOpen, Info } from "lucide-react";
import type { CompareResponse, CompareScope } from "@/lib/area-types";
import { GROUPS, GROUP_LABELS, type OffenceGroup } from "@/lib/offence-groups";
import { monthLabel } from "@/lib/area-stats";
import { Card, Eyebrow, InfoBox, SecondaryButton } from "./ui";

interface Props {
  /** Normalised street name, e.g. "fleet street". */
  streetKey: string;
  /** Wider (1 mile) vs street-only comparison. */
  wide: boolean;
  onToggleWide: (wide: boolean) => void;
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: CompareResponse }
  | { status: "missing" }
  | { status: "failed" };

const sum = (g: Record<string, number | undefined>) => Object.values(g).reduce<number>((a, b) => a + (b ?? 0), 0);

/**
 * ComparePanel: one street, then and now. Historic figures use crimson, recent
 * use blue. Bars show each category's share of its own period, never one
 * against the other. Figures come from /api/compare, built in the ETL.
 */
export function ComparePanel({ streetKey, wide, onToggleWide }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/compare/${encodeURIComponent(streetKey)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setState({ status: "missing" });
        if (!res.ok) return setState({ status: "failed" });
        setState({ status: "ready", data: (await res.json()) as CompareResponse });
      })
      .catch(() => !cancelled && setState({ status: "failed" }));
    return () => {
      cancelled = true;
    };
  }, [streetKey]);

  const title = state.status === "ready" ? state.data.name : streetKey.replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="px-5 pb-28 pt-6 md:px-6 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow tone="crimson">Compare</Eyebrow>
          <h1 className="cb-serif mt-2 text-[32px] font-bold leading-tight">{title}</h1>
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

      {state.status === "loading" && (
        <p className="mt-8 text-[15px]" style={{ color: "var(--cb-muted)" }}>Loading figures…</p>
      )}
      {state.status === "missing" && (
        <InfoBox tone="note" icon={<Info className="mt-0.5 h-4 w-4 shrink-0" />}>
          We have no Old Bailey figures for this street yet. Open a case file on a
          nearby street and choose Compare this street.
        </InfoBox>
      )}
      {state.status === "failed" && (
        <InfoBox tone="note" icon={<Info className="mt-0.5 h-4 w-4 shrink-0" />}>
          The figures could not be loaded. Check your connection and try again.
        </InfoBox>
      )}
      {state.status === "ready" && <Figures data={state.data} scope={wide ? state.data.mile : state.data.street} wide={wide} />}
    </div>
  );
}

function Figures({ data, scope, wide }: { data: CompareResponse; scope: CompareScope; wide: boolean }) {
  const decades = Object.keys(scope.decades).map(Number).sort((a, b) => a - b);
  const first = decades[0];
  const last = decades[decades.length - 1];
  const series: { decade: number; count: number }[] = [];
  if (decades.length) for (let d = first; d <= last; d += 10) series.push({ decade: d, count: sum(scope.decades[String(d)] ?? {}) });
  const maxDecade = Math.max(1, ...series.map((s) => s.count));
  const peak = series.reduce((a, b) => (b.count > a.count ? b : a), { decade: 0, count: 0 });

  const oldByGroup = (g: OffenceGroup) =>
    decades.reduce((n, d) => n + (scope.decades[String(d)]?.[g] ?? 0), 0);
  const rows = GROUPS.map((g) => ({
    group: g,
    then: scope.old_total ? (oldByGroup(g) / scope.old_total) * 100 : null,
    now: scope.new_total ? ((scope.new_groups[g] ?? 0) / scope.new_total) * 100 : null,
    nowHas: (scope.new_groups[g] ?? 0) > 0,
  })).filter((r) => (r.then ?? 0) > 0 || r.nowHas);

  const from = monthLabel(data.months[0] ?? null);
  const to = monthLabel(data.months[data.months.length - 1] ?? null);
  const where = wide ? "within 1 mile" : "on this street";

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <Eyebrow tone="crimson">Then · 1674–1913</Eyebrow>
            <p className="cb-serif mt-3 text-5xl font-bold">{scope.old_total.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-[15px] leading-snug">
              {scope.old_total === 1 ? "trial" : "trials"} {wide ? "within 1 mile" : "on this street"} tried at the Old Bailey
            </p>
            <p className="cb-mono mt-3 text-xs" style={{ color: "var(--cb-muted)" }}>
              {peak.count > 0 ? `Busiest decade: ${peak.decade}s (${peak.count})` : "Old Bailey Online"}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
              Now · {from && to ? `${from} to ${to}` : "Last 12 months"}
            </p>
            <p className="mt-3 text-5xl font-semibold">{scope.new_total.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-[15px] leading-snug">crimes recorded {where}</p>
            <p className="mt-3 text-xs" style={{ color: "var(--cb-muted)" }}>police.uk</p>
          </Card>
        </div>

        <InfoBox tone="note" icon={<Info className="mt-0.5 h-4 w-4 shrink-0" />}>
          Not a like-for-like comparison. Old Bailey numbers count trials that
          reached court; today&apos;s count crimes reported to police. Trials are
          placed from the place names in the transcripts, so some sit at a
          street or area rather than a door.
        </InfoBox>

        <Card className="p-5">
          <p className="font-semibold">Trials {wide ? "within 1 mile" : "from this street"} by decade</p>
          {series.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: "var(--cb-muted)" }}>
              No trials were placed on this street. Try the 1 mile view.
            </p>
          ) : (
            <>
              <div className="mt-4 flex h-[110px] items-end gap-1">
                {series.map((d) => (
                  <div
                    key={d.decade}
                    className="flex-1"
                    title={`${d.decade}s: ${d.count}`}
                    style={{
                      height: `${Math.max(2, (d.count / maxDecade) * 100)}%`,
                      background: d.decade === peak.decade ? "var(--cb-crimson)" : "var(--cb-gold)",
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                <span className="cb-mono text-[10px]" style={{ color: "var(--cb-muted)" }}>{first}s</span>
                <span className="cb-mono text-[10px]" style={{ color: "var(--cb-muted)" }}>{last}s</span>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="font-semibold">By category</p>
          <p className="text-sm" style={{ color: "var(--cb-muted)" }}>
            Each bar is that category&apos;s share of its own period, not one
            against the other.
          </p>
          <div className="mt-4 space-y-4">
            {rows.map((r) => (
              <div key={r.group}>
                <p className="text-[15px]">{GROUP_LABELS[r.group]}</p>
                <Bar label="Then" value={r.then} color="var(--cb-crimson)" />
                <Bar label="Now" value={r.group === "Fraud" ? null : r.now} color="var(--cb-blue)" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--cb-muted)" }}>
            police.uk street data has no fraud category, so fraud shows no figure for now.
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
              onClick={() => window.open("https://www.oldbaileyonline.org/about/education", "_blank", "noreferrer")}
            >
              Teacher notes
            </SecondaryButton>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          {data.attribution_cases} {data.attribution}
        </p>
      </div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <span className="cb-mono w-9 text-[11px]" style={{ color: "var(--cb-muted)" }}>
        {label.toUpperCase()}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--cb-stone)" }}>
        {value !== null && value > 0 && (
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(3, Math.min(100, value))}%`, background: color }}
          />
        )}
      </span>
      <span className="cb-mono w-10 text-right text-sm">{value === null ? "—" : `${Math.round(value)}%`}</span>
    </div>
  );
}
