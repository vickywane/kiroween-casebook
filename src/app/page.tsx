"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { BeforeYouBegin } from "@/components/BeforeYouBegin";
import { LocationPermission } from "@/components/LocationPermission";
import { LocationBlocked } from "@/components/LocationBlocked";
import { detectCity, getCity, loadCity, saveCity, type City } from "@/lib/cities";
import { savePosition, updateProfile, useProfile } from "@/lib/profile-cache";

/**
 * Leaflet must only run on the client — SSR would throw because it accesses
 * `window` and `document` during module initialisation.
 */
const SherlockMap = dynamic(
  () => import("@/components/MapClient"),
  { ssr: false, loading: () => <MapSkeleton /> },
);

/**
 * Onboarding:
 *   mobile:  Welcome → Before you begin → Location → map
 *   desktop: Welcome (rules and location buttons on one screen) → map
 * A denied location shows the "blocked" screen. A granted one opens the map
 * straight away, already set to the detected city; there is no city screen.
 */
type Step = "welcome" | "before" | "permission" | "blocked" | "app";

export default function Home() {
  // Cached onboarding answers (null until storage can be read on the client).
  const profile = useProfile();
  const [step, setStep] = useState<Step | null>(null);
  const [city, setCity] = useState<City | null>(null);
  const current: Step | null =
    step ?? (profile ? (profile.onboarded ? "app" : "welcome") : null);

  const chooseCity = (c: City) => {
    saveCity(c);
    setCity(c);
  };

  /** Finish onboarding: cache it so later visits open straight on the map. */
  const enterApp = (location?: "granted" | "denied" | "skipped") => {
    updateProfile({ onboarded: true, ...(location ? { location } : {}) });
    setStep("app");
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStep("blocked");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Matching happens on-device; the position never leaves the browser.
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const match = detectCity(p);
        savePosition(p, match?.id ?? null);
        if (match?.available) chooseCity(match);
        enterApp("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          updateProfile({ location: "denied" });
          setStep("blocked");
        } else {
          enterApp();
        }
      },
      { timeout: 10_000 },
    );
  };

  // Returning users skip onboarding. Until storage is readable (server render
  // and hydration) show the loading screen instead of flashing the welcome.
  if (profile === null || current === null) return <MapSkeleton />;

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {current === "welcome" && (
        <WelcomeScreen
          onBegin={() => setStep("before")}
          onAllow={requestLocation}
          onSearch={() => enterApp("skipped")}
          onHowWeHandle={() => setStep("before")}
        />
      )}
      {current === "before" && (
        <BeforeYouBegin onBack={() => setStep("welcome")} onContinue={() => setStep("permission")} />
      )}
      {current === "permission" && (
        <LocationPermission onAllow={requestLocation} onSearch={() => enterApp("skipped")} />
      )}
      {current === "blocked" && (
        <LocationBlocked onSearch={() => enterApp("denied")} onRetry={requestLocation} />
      )}
      {current === "app" && (
        <SherlockMap
          city={city ?? loadCity()}
          detectedCity={getCity(profile.detectedCityId) ?? null}
          onCityChange={chooseCity}
          initialCityMenuOpen={false}
        />
      )}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cb-crimson)", borderTopColor: "transparent" }}
        />
        <p className="cb-mono text-xs uppercase tracking-widest" style={{ color: "var(--cb-muted)" }}>
          Loading map…
        </p>
      </div>
    </div>
  );
}
