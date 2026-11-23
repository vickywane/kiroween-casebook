"use client";

import { MapPin } from "lucide-react";
import { DEFAULT_CITY, type City } from "@/lib/cities";
import { CityRow } from "./CityMenu";
import { MapArt } from "./MapArt";
import { PrimaryButton, TextButton } from "./ui";

/**
 * Figma: M3a · City detected / M3b · City not covered yet.
 * Shown after location is allowed during onboarding.
 */
export function CityDetected({
  detected,
  onContinue,
  onChooseCity,
}: {
  /** City matched from the GPS fix; null when it matches none we know. */
  detected: City | null;
  /** Enter the app with the given city selected. */
  onContinue: (city: City) => void;
  onChooseCity: () => void;
}) {
  const supported = detected?.available ? detected : null;
  const start = supported ?? DEFAULT_CITY;

  let title: string;
  let body: string;
  if (supported) {
    title = `You’re in ${supported.name}`;
    body = `We’ve opened the ${supported.name} casebook for you, based on where you are now. You can switch city any time from the menu.`;
  } else if (detected) {
    title = `${detected.name} is coming soon`;
    body = `It looks like you’re in ${detected.name}. Its records aren’t ready yet, so we’ll start you in ${start.name}. You can switch city any time from the menu.`;
  } else {
    title = `Casebook covers ${start.name} for now`;
    body = `We couldn’t match your location to a city we cover yet, so we’ll start you in ${start.name}. More cities are on the way.`;
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0">
        <MapArt className="h-full w-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[520px] rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-[0_-8px_30px_rgba(0,0,0,.12)]">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--cb-note-bg)", color: "var(--cb-crimson)" }}
        >
          <MapPin className="h-6 w-6" />
        </span>
        <h1 className="cb-serif mt-5 text-[28px] font-bold leading-tight">{title}</h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--cb-muted)" }}>
          {body}
        </p>
        <div className="mt-4">
          {detected ? (
            <CityRow
              city={detected}
              state={supported ? "selected" : "soon"}
              meta="Detected from your location"
            />
          ) : (
            <CityRow city={start} state="selected" />
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <PrimaryButton onClick={() => onContinue(start)}>
            {supported ? `Open the ${start.name} casebook` : `Explore ${start.name} instead`}
          </PrimaryButton>
          <TextButton onClick={onChooseCity}>
            {supported ? "Choose a different city" : "See all cities"}
          </TextButton>
        </div>
        <p className="mt-2 text-center text-[13px]" style={{ color: "var(--cb-muted)" }}>
          Your location isn&apos;t stored or shared.
        </p>
      </div>
    </div>
  );
}
