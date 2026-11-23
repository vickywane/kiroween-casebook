"use client";

import { Building2, Check, Scale, BarChart3 } from "lucide-react";
import {
  ContentNote,
  Logo,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "./ui";
import { HistoricPin, MapArt } from "./MapArt";
import { VerdictBadge } from "./VerdictBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  /** Mobile: go to "Before you begin". */
  onBegin: () => void;
  /** Desktop: ask for location and enter the app. */
  onAllow: () => void;
  /** Desktop: skip location and search for a place. */
  onSearch: () => void;
  onHowWeHandle: () => void;
}

/** M1 · Welcome (mobile) and D4 · Welcome + location (desktop). */
export function WelcomeScreen({ onBegin, onAllow, onSearch, onHowWeHandle }: Props) {
  return (
    <>
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-6 lg:hidden">
        <Logo />
        <MapArt className="mt-4 h-[320px] shrink-0 rounded-3xl border" river={false}>
          <HistoricPin className="left-[18%] top-[22%]" size={32} />
          <HistoricPin className="right-[10%] top-[10%]" size={30} />
          <HistoricPin className="left-[48%] top-[34%]" size={42} active />
          <div
            className="absolute -bottom-6 left-[6%] right-[-4%] -rotate-[2deg] rounded-2xl border bg-white p-4 shadow-lg"
            style={{ borderColor: "var(--cb-border)" }}
          >
            <div className="flex justify-between">
              <span className="cb-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
                Case file · T17850112-12
              </span>
              <span className="cb-mono text-[11px]" style={{ color: "var(--cb-crimson)" }}>
                120 m
              </span>
            </div>
            <p className="cb-serif mt-2 text-xl font-bold leading-tight">
              Highway robbery on Fleet Street
            </p>
          </div>
        </MapArt>

        <h1 className="cb-serif mt-10 text-[40px] font-bold leading-[1.1]">
          Every street keeps a case file.
        </h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          Walk with Casebook open and it surfaces the trials, verdicts and
          witness testimony tied to the ground beneath your feet.
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-8">
          <PrimaryButton onClick={onBegin}>Begin the walk</PrimaryButton>
          <TextButton onClick={onHowWeHandle}>How we handle real cases</TextButton>
        </div>
      </div>

      <div className="hidden h-full lg:flex">
        <MapArt className="h-full w-[55.5%] shrink-0" river>
          <HistoricPin className="left-[30%] top-[28%]" size={32} />
          <HistoricPin className="left-[66%] top-[24%]" size={30} />
          <HistoricPin className="left-[50%] top-[38%]" size={44} active />
          <HistoricPin className="left-[77%] top-[48%]" size={30} />
          <div
            className="absolute bottom-[14%] left-[36%] w-[360px] -rotate-[2deg] rounded-2xl border bg-white p-5 shadow-xl"
            style={{ borderColor: "var(--cb-border)" }}
          >
            <div className="flex justify-between">
              <span className="cb-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--cb-muted)" }}>
                Case file · T17850112-12
              </span>
              <span className="cb-mono text-[11px]" style={{ color: "var(--cb-crimson)" }}>
                120 m
              </span>
            </div>
            <p className="cb-serif mt-2 text-2xl font-bold leading-tight">
              Highway robbery on Fleet Street
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--cb-muted)" }}>
              A coachman was stopped near Temple Bar and robbed of a silver
              watch. Two witnesses described the struggle.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <VerdictBadge verdict="Guilty" />
              <span className="cb-mono text-xs" style={{ color: "var(--cb-muted)" }}>12 Jan 1785</span>
            </div>
            <div className="mt-2">
              <ConfidenceBadge confidence="exact" />
            </div>
          </div>
        </MapArt>

        <div className="flex flex-1 flex-col px-14 pb-12 pt-14">
          <Logo />
          <div className="my-auto max-w-[500px]">
            <h1 className="cb-serif text-[40px] font-bold leading-tight">
              Every street keeps a case file.
            </h1>
            <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
              Walk with Casebook open and it surfaces the trials, verdicts and
              witness testimony tied to the ground beneath your feet.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {[
                [Building2, "Names only for cases over 100 years old"],
                [Scale, "Recent cases: concluded only, linked to the court record"],
                [BarChart3, "Area statistics, never addresses"],
                [Check, "Every case shows its verdict and source"],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Check;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <I className="h-4 w-4" style={{ color: "var(--cb-crimson)" }} />
                    {text as string}
                  </li>
                );
              })}
            </ul>
            <div className="mt-6">
              <ContentNote />
            </div>
            <div className="mt-6 flex gap-3">
              <PrimaryButton onClick={onAllow}>Allow location &amp; begin</PrimaryButton>
              <SecondaryButton onClick={onSearch}>Search a place</SecondaryButton>
            </div>
            <p className="mt-4 text-sm" style={{ color: "var(--cb-muted)" }}>
              Location is read only while this page is open. It isn&apos;t
              stored or shared.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
