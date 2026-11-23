"use client";

import { ArrowLeft, Check, Clock, ExternalLink, Info, Scale, ShieldAlert } from "lucide-react";
import type { RecentAreaCount, RecentConcludedCase } from "@/lib/mock-data";
import { PrimaryButton } from "./ui";

/**
 * Recent layer — plain, factual tone. Sans-serif only, blue accent, no
 * casebook styling. Two shapes: a concluded case (M6) or a police.uk area
 * count. Counts of 1 or 2 are suppressed upstream (count === null).
 */
type Props =
  | { kind: "case"; data: RecentConcludedCase; onClose: () => void }
  | { kind: "count"; data: RecentAreaCount; onClose: () => void };

function Back({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="flex items-center gap-2 text-[15px] font-medium">
      <ArrowLeft className="h-5 w-5" />
      Nearby
    </button>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
      style={{ borderColor: "var(--cb-border)" }}
    >
      {icon}
      {children}
    </span>
  );
}

export function RecentCasePanel(props: Props) {
  if (props.kind === "count") {
    const r = props.data;
    return (
      <div className="bg-white px-5 pb-10 pt-4 md:px-6" style={{ color: "var(--cb-ink)" }}>
        <Back onClose={props.onClose} />
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
          Recent · Area statistics
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{r.category_label}</h1>
        <p className="mt-4 text-4xl font-semibold">
          {r.count !== null ? r.count : "A small number"}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--cb-muted)" }}>
          reported in this area, {r.month} · {r.force}
        </p>
        <div className="mt-5 flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: "var(--cb-info-bg)", color: "var(--cb-text)" }}>
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Counts are for an area, not an address. Counts of 1 or 2 are not shown.
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
          Source
        </p>
        <p className="mt-1 text-sm">data.police.uk · Open Government Licence</p>
      </div>
    );
  }

  const c = props.data;
  return (
    <div className="bg-white px-5 pb-10 pt-4 md:px-6" style={{ color: "var(--cb-ink)" }}>
      <Back onClose={props.onClose} />
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-blue)" }}>
        Recent · Concluded case
      </p>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight">{c.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip icon={<Check className="h-4 w-4" />}>{c.verdict}</Chip>
        <Chip icon={<Scale className="h-4 w-4" />}>{c.appeal_status}</Chip>
        <Chip icon={<Clock className="h-4 w-4" />}>{c.concluded}</Chip>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: "var(--cb-info-bg)", color: "var(--cb-text)" }}>
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        This case is concluded and the court&apos;s judgment is published.
        Casebook repeats only what the court found.
      </div>

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
        What the court found
      </h2>
      <p className="mt-2 text-lg leading-relaxed">{c.finding}</p>

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
        Location
      </h2>
      <p className="mt-2 text-sm" style={{ color: "var(--cb-muted)" }}>
        Approximate area: {c.area}. Location match: {c.match}.
      </p>

      <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
        Source
      </h2>
      <div className="mt-2 rounded-2xl border p-4" style={{ borderColor: "var(--cb-border)" }}>
        <p className="text-sm" style={{ color: "var(--cb-muted)" }}>{c.source_name}</p>
        <p className="mt-1 text-lg font-semibold">{c.source_ref}</p>
        <a href={c.source_url} target="_blank" rel="noreferrer" className="mt-3 block">
          <PrimaryButton type="button" tone="blue">
            Read the judgment <ExternalLink className="h-4 w-4" />
          </PrimaryButton>
        </a>
      </div>

      <p
        className="mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm"
        style={{ borderColor: "var(--cb-border)", color: "var(--cb-muted)" }}
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        This is a recent, real case. People affected by it may live nearby.
      </p>
    </div>
  );
}
