"use client";

import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Info,
  Quote,
  Share2,
  ArrowLeftRight,
} from "lucide-react";
import type { HistoricalCase } from "@/lib/mock-data";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { VerdictBadge } from "./VerdictBadge";
import { ContentNote, Eyebrow, RoundButton, SecondaryButton } from "./ui";

interface Props {
  caseRecord: HistoricalCase;
  distanceLabel: string;
  saved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onCompare: () => void;
}

/**
 * HistoricCasePanel — M5 / D2 / T2. Casebook tone: serif title, mono labels,
 * crimson accents. Verdict, source and location confidence are always shown.
 */
export function HistoricCasePanel({
  caseRecord: c,
  distanceLabel,
  saved,
  onToggleSave,
  onClose,
  onCompare,
}: Props) {
  const testimonies =
    c.testimonies ?? [{ speaker: "From the trial record", text: c.testimony_excerpt }];
  const share = () => {
    if (navigator.share) {
      void navigator.share({ title: c.title ?? "Casebook", url: c.source_url });
    } else {
      void navigator.clipboard?.writeText(c.source_url);
    }
  };

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between px-5 pb-2 pt-4 md:px-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Nearby
        </button>
        <div className="flex gap-2">
          <RoundButton
            label={saved ? "Remove from saved" : "Save case file"}
            onClick={onToggleSave}
            className="!h-10 !w-10 border"
          >
            <Bookmark
              className="h-4 w-4"
              fill={saved ? "var(--cb-crimson)" : "none"}
              style={{ color: saved ? "var(--cb-crimson)" : undefined }}
            />
          </RoundButton>
          <RoundButton label="Share" onClick={share} className="!h-10 !w-10 border">
            <Share2 className="h-4 w-4" />
          </RoundButton>
        </div>
      </div>

      <div className="space-y-5 px-5 pb-10 pt-2 md:px-6">
        <div>
          <p className="cb-mono text-[12px] uppercase tracking-[0.12em]" style={{ color: "var(--cb-crimson)" }}>
            Case file · {c.ref ?? c.id.toUpperCase()} · {distanceLabel}
          </p>
          <h1 className="cb-serif mt-3 text-[32px] font-bold leading-[1.15]">
            {c.title ?? `${c.offence_category} · ${c.location_raw}`}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={c.verdict} />
            <span className="cb-mono text-xs" style={{ color: "var(--cb-muted)" }}>
              {c.date_label ?? c.year}
            </span>
          </div>
          <div className="mt-3">
            <ConfidenceBadge confidence={c.geocode_confidence} />
            {c.match_basis && (
              <p className="mt-1 text-sm" style={{ color: "var(--cb-muted)" }}>
                {c.match_basis}
              </p>
            )}
          </div>
        </div>

        {c.is_violent && <ContentNote />}

        {c.timeline && (
          <section>
            <Eyebrow>Timeline</Eyebrow>
            <ol className="mt-3">
              {c.timeline.map((t, i) => (
                <li key={i} className="relative pb-4 pl-7 last:pb-0">
                  {i < c.timeline!.length - 1 && (
                    <span className="absolute left-[4px] top-3 h-full w-px" style={{ background: "var(--cb-border)" }} />
                  )}
                  <span className="absolute left-0 top-1.5 h-[9px] w-[9px] rounded-full" style={{ background: "var(--cb-crimson)" }} />
                  <p className="cb-mono text-xs" style={{ color: "var(--cb-muted)" }}>{t.date}</p>
                  <p className="text-[17px] font-semibold leading-snug">{t.title}</p>
                  {t.detail && (
                    <p className="text-sm" style={{ color: "var(--cb-muted)" }}>{t.detail}</p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section
          className="rounded-2xl p-5 text-white"
          style={{ background: "var(--cb-ink)" }}
        >
          <p className="cb-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
            The charge
          </p>
          <p className="mt-3 text-lg leading-relaxed">{c.summary}</p>
          <p className="mt-3 text-sm text-white/75">
            The charge as the court recorded it, shortened. Read it against the
            testimony below.
          </p>
        </section>

        {c.outcome && (
          <section>
            <Eyebrow>Outcome</Eyebrow>
            <p className="mt-1 font-semibold">{c.outcome}</p>
          </section>
        )}

        <section>
          <Eyebrow>Original testimony</Eyebrow>
          <div className="mt-3 space-y-4">
            {testimonies.map((t, i) => (
              <blockquote key={i} className="border-l-[3px] pl-5" style={{ borderColor: "var(--cb-crimson)" }}>
                <p className="cb-mono flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--cb-muted)" }}>
                  <Quote className="h-3 w-3" style={{ color: "var(--cb-crimson)" }} />
                  {t.speaker} · sworn
                </p>
                <p className="mt-2 text-xl italic leading-relaxed">“{t.text}”</p>
              </blockquote>
            ))}
          </div>
        </section>

        <a href={c.source_url} target="_blank" rel="noreferrer" className="block">
          <SecondaryButton type="button">Read the full transcript</SecondaryButton>
        </a>

        <button
          onClick={onCompare}
          className="flex w-full items-center gap-4 rounded-2xl p-4 text-left"
          style={{ background: "var(--cb-stone)" }}
        >
          <ArrowLeftRight className="h-5 w-5 shrink-0" style={{ color: "var(--cb-crimson)" }} />
          <span className="flex-1">
            <span className="block font-semibold">Compare this street</span>
            <span className="block text-sm" style={{ color: "var(--cb-muted)" }}>
              Old Bailey trials alongside modern police counts
            </span>
          </span>
          <ChevronRight className="h-5 w-5" />
        </button>

        <a
          href={c.source_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: "var(--cb-stone)" }}
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            <Eyebrow>Source</Eyebrow>
            <span className="block text-sm">
              Old Bailey Proceedings Online, {c.ref?.toLowerCase() ?? c.id} (CC BY-NC 4.0, non-commercial use)
            </span>
          </span>
          <ExternalLink className="h-4 w-4" style={{ color: "var(--cb-crimson)" }} />
        </a>

        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--cb-muted)" }}>
          <Info className="h-4 w-4" />
          Spotted a mistake? Check the source record above.
        </p>
      </div>
    </div>
  );
}
