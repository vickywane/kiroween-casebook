"use client";

import { BarChart3, MapPin, ShieldAlert } from "lucide-react";
import type { HistoricalCase, RecentConcludedCase } from "@/lib/mock-data";
import { HistoricCaseCard, HistoricCaseRow, RecentCaseCard } from "./CaseCard";
import { InfoBox, PrimaryButton, SecondaryButton } from "./ui";

export interface NearbyHistoric {
  c: HistoricalCase;
  distance: string;
}
export interface NearbyRecent {
  c: RecentConcludedCase;
  distance: string;
}

interface Props {
  /** "row" = compact mobile sheet rows, "card" = full cards (tablet/desktop). */
  variant: "row" | "card";
  historic: NearbyHistoric[];
  recent: NearbyRecent[];
  radiusLabel: string;
  loading: boolean;
  outsideLondon: boolean;
  nearestLabel: string | null;
  onWiden: () => void;
  onNearest: () => void;
  onOpenHistoric: (c: HistoricalCase) => void;
  onOpenRecent: (c: RecentConcludedCase) => void;
  showStats: boolean;
  /** Live police.uk figures for the stat cards. */
  stats?: {
    month: string;
    radius: string;
    violent: string;
    street: { street: string; value: string } | null;
  };
}

export function NearbyList(p: Props) {
  if (p.loading) return <LoadingState />;

  const total = p.historic.length + p.recent.length;

  return (
    <div>
      {total === 0 && !p.outsideLondon ? (
        <NoCases radius={p.radiusLabel} nearest={p.nearestLabel} onWiden={p.onWiden} onNearest={p.onNearest} />
      ) : (
        <>
          <h2 className="cb-serif text-[26px] font-bold leading-tight">
            {total} case {total === 1 ? "file" : "files"} nearby
          </h2>
          <p className="cb-mono mt-1 text-[12px]" style={{ color: "var(--cb-muted)" }}>
            Within {p.radiusLabel} · sorted by distance
          </p>

          <div className="mt-4 space-y-3">
            {p.outsideLondon && (
              <>
                <InfoBox
                  tone="note"
                  title="Fewer historic records here"
                  icon={<ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                >
                  Old Bailey trials cover London only. Elsewhere we show notable
                  cases from Wikipedia and Wikidata.
                </InfoBox>
                <InfoBox title="No street-level police data">
                  This area isn&apos;t currently supplying data to police.uk.
                </InfoBox>
              </>
            )}

            {p.showStats && !p.outsideLondon && p.variant === "card" && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label={`police.uk · ${p.stats?.radius ?? "1 mile"}`}
                  value={p.stats?.violent ?? "—"}
                  sub={`violent & sexual offences${p.stats?.month ? ` · ${p.stats.month}` : ""}`}
                  small={(p.stats?.violent ?? "").length > 6}
                />
                <StatCard
                  label="police.uk · street"
                  value={p.stats?.street?.value ?? "—"}
                  sub={p.stats?.street ? `robberies on ${p.stats.street.street}` : "no street data near you"}
                  small
                />
              </div>
            )}

            {p.historic.map(({ c, distance }) =>
              p.variant === "row" ? (
                <HistoricCaseRow key={c.id} c={c} distance={distance} onOpen={() => p.onOpenHistoric(c)} />
              ) : (
                <HistoricCaseCard key={c.id} c={c} distance={distance} onOpen={() => p.onOpenHistoric(c)} />
              ),
            )}
            {p.recent.map(({ c, distance }) => (
              <RecentCaseCard key={c.id} c={c} distance={distance} onOpen={() => p.onOpenRecent(c)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, small = false }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--cb-border)" }}>
      <p className="cb-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>{label}</p>
      <p className={`mt-2 font-semibold ${small ? "text-lg" : "text-4xl"}`}>{value}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--cb-muted)" }}>{sub}</p>
    </div>
  );
}

/** E1 · No cases nearby. */
function NoCases({
  radius,
  nearest,
  onWiden,
  onNearest,
}: {
  radius: string;
  nearest: string | null;
  onWiden: () => void;
  onNearest: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--cb-note-bg)" }}>
        <MapPin className="h-7 w-7" />
      </span>
      <h2 className="cb-serif mt-4 text-[22px] font-bold">No case files within {radius}</h2>
      <p className="mt-2 text-[15px] leading-snug" style={{ color: "var(--cb-muted)" }}>
        The archives are quiet here. Old Bailey records only name places that
        came up in court.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        <PrimaryButton onClick={onWiden}>Widen search to 2 km</PrimaryButton>
        {nearest && (
          <SecondaryButton onClick={onNearest}>Go to nearest case · {nearest}</SecondaryButton>
        )}
      </div>
    </div>
  );
}

/** E4 · Loading nearby cases. */
function LoadingState() {
  return (
    <div>
      <h2 className="cb-serif text-[26px] font-bold leading-tight">Searching the archives…</h2>
      <p className="cb-mono mt-1 text-[12px]" style={{ color: "var(--cb-muted)" }}>
        Matching 197,745 trials to where you&apos;re standing
      </p>
      <div className="mt-4 space-y-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--cb-border)" }}>
            <div className="cb-skeleton h-3 w-1/3" />
            <div className="cb-skeleton h-6 w-4/5" />
            <div className="cb-skeleton h-3 w-full" />
            <div className="cb-skeleton h-3 w-2/3" />
            <div className="cb-skeleton h-6 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm"
      style={{ borderColor: "var(--cb-border)" }}
    >
      <BarChart3 className="h-3.5 w-3.5" style={{ color: "var(--cb-blue)" }} />
      {label}
    </span>
  );
}
