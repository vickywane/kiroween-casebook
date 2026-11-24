"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { BeforeYouBegin } from "@/components/BeforeYouBegin";
import { LocationPermission } from "@/components/LocationPermission";
import { LocationBlocked } from "@/components/LocationBlocked";
import { InstallSheet } from "@/components/InstallSheet";
import { CityDetected } from "@/components/CityDetected";
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

type Step = "welcome" | "before" | "permission" | "blocked" | "city" | "app";

export default function Home() {
  // Cached onboarding answers (null until storage can be read on the client).
  const profile = useProfile();
  const [step, setStep] = useState<Step | null>(null);
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [city, setCity] = useState<City | null>(null);
  const [detected, setDetected] = useState<City | null>(null);
  const [openCityMenu, setOpenCityMenu] = useState(false);
  const current: Step | null =
    step ?? (profile ? (profile.onboarded ? "app" : "welcome") : null);

  const chooseCity = (c: City) => {
    saveCity(c);
    setCity(c);
  };

  /** Finish onboarding: cache it so later visits open straight on the map. */
  const enterApp = (opts?: {
    cityMenu?: boolean;
    location?: "granted" | "denied" | "skipped";
  }) => {
    updateProfile({
      onboarded: true,
      ...(opts?.location ? { location: opts.location } : {}),
    });
    setOpenCityMenu(!!opts?.cityMenu);
    setStep("app");
  };

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Offer "Add to home screen" once, a few seconds after the map opens.
  useEffect(() => {
    if (current !== "app") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone || localStorage.getItem("casebook.install-dismissed")) return;
    const t = setTimeout(() => setShowInstall(true), 6000);
    return () => clearTimeout(t);
  }, [current]);

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
        setDetected(match);
        if (match?.available) chooseCity(match);
        setStep("city");
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
  const cachedDetected = detected ?? getCity(profile.detectedCityId) ?? null;

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {current === "welcome" && (
        <WelcomeScreen
          onBegin={() => setStep("before")}
          onAllow={requestLocation}
          onSearch={() => enterApp({ location: "skipped" })}
          onHowWeHandle={() => setStep("before")}
        />
      )}
      {current === "before" && (
        <BeforeYouBegin
          onBack={() => setStep("welcome")}
          onContinue={() => setStep("permission")}
        />
      )}
      {current === "permission" && (
        <LocationPermission
          onAllow={requestLocation}
          onSearch={() => enterApp({ location: "skipped" })}
        />
      )}
      {current === "blocked" && (
        <LocationBlocked
          onSearch={() => enterApp({ location: "denied" })}
          onRetry={requestLocation}
        />
      )}
      {current === "city" && (
        <CityDetected
          detected={detected}
          onContinue={(c) => {
            chooseCity(c);
            enterApp();
          }}
        />
      )}
      {current === "app" && (
        <SherlockMap
          city={city ?? loadCity()}
          detectedCity={cachedDetected}
          onCityChange={chooseCity}
          initialCityMenuOpen={openCityMenu}
        />
      )}
      {showInstall && (
        <InstallSheet
          installEvent={installEvent}
          onClose={() => {
            localStorage.setItem("casebook.install-dismissed", "1");
            setShowInstall(false);
          }}
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
