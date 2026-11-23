"use client";

import { Crosshair, Info } from "lucide-react";
import { MapArt } from "./MapArt";
import { PrimaryButton, SecondaryButton } from "./ui";

/** M3 · Location permission (sheet over a blurred map backdrop). */
export function LocationPermission({
  onAllow,
  onSearch,
}: {
  onAllow: () => void;
  onSearch: () => void;
}) {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <MapArt className="h-full w-full" />
      </div>
      <div className="absolute left-1/2 top-[30%] h-[120px] w-[120px] -translate-x-1/2 rounded-full border border-dashed" style={{ borderColor: "var(--cb-blue)" }} />
      <div className="absolute left-1/2 top-[30%] ml-0 mt-[48px] h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white shadow" style={{ background: "var(--cb-blue)" }} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[520px] rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--cb-note-bg)", color: "var(--cb-crimson)" }}
        >
          <Crosshair className="h-6 w-6" />
        </span>
        <h1 className="cb-serif mt-5 text-[28px] font-bold leading-tight">
          Allow location while you walk
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          Casebook reads your location only while this page is open, to find
          cases near you. It isn&apos;t stored or shared.
        </p>
        <div
          className="mt-4 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--cb-stone)", color: "var(--cb-text)" }}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Keep this tab open on your walk. Web apps can&apos;t alert you in the
          background.
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <PrimaryButton onClick={onAllow}>Allow location</PrimaryButton>
          <SecondaryButton onClick={onSearch}>Search for a place instead</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
