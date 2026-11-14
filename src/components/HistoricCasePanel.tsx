"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { HistoricalCase } from "@/lib/mock-data";
import { VerdictBadge } from "./VerdictBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ContentNote } from "./ContentNote";
import { CrimeIcon } from "@/lib/crime-icons";

interface Props {
  caseRecord: HistoricalCase;
  onClose: () => void;
}

export function HistoricCasePanel({ caseRecord, onClose }: Props) {
  const [testimonyOpen, setTestimonyOpen] = useState(false);

  const categoryLabel = caseRecord.offence_category;

  return (
    /*
     * Historical layer — casebook / detective styling.
     * Dark background, aged-paper card, Playfair Display serif, amber accents.
     */
    <div
      className="flex flex-col overflow-y-auto"
      style={{
        background: "var(--hist-bg)",
        color: "var(--hist-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3"
        style={{
          background: "var(--hist-bg)",
          borderColor: "var(--hist-card-border)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--hist-amber)" }}
        >
          Case File
        </span>
        <button
          onClick={onClose}
          aria-label="Close case file"
          className="rounded p-1 transition-colors hover:bg-white/10"
        >
          <X className="h-4 w-4" style={{ color: "var(--hist-muted)" }} />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Content note for violent cases */}
        {caseRecord.is_violent && <ContentNote />}

        {/* Title block */}
        <div className="flex items-start gap-4">
          {/* Category icon — panel size */}
          <div
            className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl"
            style={{ background: "var(--hist-card)", border: "1px solid var(--hist-card-border)" }}
          >
            <CrimeIcon
              category={caseRecord.offence_category}
              size="panel"
              color="var(--hist-amber)"
            />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <h2
              className="font-serif text-2xl font-bold italic leading-tight"
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                color: "var(--hist-sepia)",
              }}
            >
              {categoryLabel}
            </h2>
            <p className="text-sm" style={{ color: "var(--hist-muted)" }}>
              Old Bailey, {caseRecord.year}
            </p>
          </div>
        </div>

        {/* Verdict — always shown prominently */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--hist-muted)" }}
          >
            Verdict
          </span>
          <VerdictBadge verdict={caseRecord.verdict} />
        </div>

        {/* Parties */}
        <div
          className="rounded-lg border p-3"
          style={{
            background: "var(--hist-card)",
            borderColor: "var(--hist-card-border)",
          }}
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {caseRecord.defendant_name && (
              <>
                <dt style={{ color: "var(--hist-muted)" }}>
                  {caseRecord.verdict.toLowerCase() === "not guilty"
                    ? "Acquitted"
                    : "Defendant"}
                </dt>
                <dd style={{ color: "var(--hist-text)" }}>
                  {caseRecord.defendant_name}
                  {caseRecord.verdict.toLowerCase() === "not guilty" && (
                    <span
                      className="ml-1 text-xs"
                      style={{ color: "var(--hist-muted)" }}
                    >
                      (found not guilty)
                    </span>
                  )}
                </dd>
              </>
            )}
            {caseRecord.victim_name && (
              <>
                <dt style={{ color: "var(--hist-muted)" }}>Victim</dt>
                <dd style={{ color: "var(--hist-text)" }}>
                  {caseRecord.victim_name}
                </dd>
              </>
            )}
            <dt style={{ color: "var(--hist-muted)" }}>Location</dt>
            <dd style={{ color: "var(--hist-text)" }}>
              {caseRecord.location_raw}
            </dd>
          </dl>
        </div>

        {/* Location confidence */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--hist-muted)" }}
          >
            Location match
          </span>
          <ConfidenceBadge confidence={caseRecord.geocode_confidence} />
        </div>

        {/* AI Summary */}
        <div className="flex flex-col gap-2">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--hist-muted)" }}
          >
            Summary
          </span>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--hist-text)" }}
          >
            {caseRecord.summary}
          </p>
        </div>

        {/* Testimony excerpt — collapsible */}
        <div
          className="rounded-lg border"
          style={{ borderColor: "var(--hist-card-border)" }}
        >
          <button
            onClick={() => setTestimonyOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5"
          >
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--hist-amber)" }}
            >
              Original Testimony
            </span>
            {testimonyOpen ? (
              <ChevronUp
                className="h-4 w-4"
                style={{ color: "var(--hist-muted)" }}
              />
            ) : (
              <ChevronDown
                className="h-4 w-4"
                style={{ color: "var(--hist-muted)" }}
              />
            )}
          </button>
          {testimonyOpen && (
            <blockquote
              className="border-t px-3 py-3 font-serif text-sm italic leading-relaxed"
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                borderColor: "var(--hist-card-border)",
                color: "var(--hist-sepia)",
              }}
            >
              &ldquo;{caseRecord.testimony_excerpt}&rdquo;
            </blockquote>
          )}
        </div>

        {/* Source link */}
        <a
          href={caseRecord.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs transition-colors hover:underline"
          style={{ color: "var(--hist-amber)" }}
        >
          <ExternalLink className="h-3 w-3" />
          View original record — Old Bailey Online (CC BY 4.0)
        </a>
      </div>
    </div>
  );
}
