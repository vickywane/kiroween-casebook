"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { BeforeYouBegin } from "@/components/BeforeYouBegin";
import { LocationPermission } from "@/components/LocationPermission";
import { LocationBlocked } from "@/components/LocationBlocked";
import { InstallSheet } from "@/components/InstallSheet";
import { CityDetected } from "@/components/CityDetected";
import { detectCity, loadCity, saveCity, type City } from "@/lib/cities";

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
  const [step, setStep] = useState<Step>("welcome");
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [city, setCity] = useState<City | null>(null);
  const [detected, setDetected] = useState<City | null>(null);
  const [openCityMenu, setOpenCityMenu] = useState(false);

  const chooseCity = (c: City) => {
    saveCity(c);
    setCity(c);
  };

  const enterApp = (opts?: { cityMenu?: boolean }) => {
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
    if (step !== "app") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone || localStorage.getItem("casebook.install-dismissed")) return;
    const t = setTimeout(() => setShowInstall(true), 6000);
    return () => clearTimeout(t);
  }, [step]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStep("blocked");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Matching happens on-device; the position never leaves the browser.
        const match = detectCity([pos.coords.latitude, pos.coords.longitude]);
        setDetected(match);
        if (match?.available) chooseCity(match);
        setStep("city");
      },
      (err) => setStep(err.code === err.PERMISSION_DENIED ? "blocked" : "app"),
      { timeout: 10_000 },
    );
  };

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {step === "welcome" && (
        <WelcomeScreen
          onBegin={() => setStep("before")}
          onAllow={requestLocation}
          onSearch={() => setStep("app")}
          onHowWeHandle={() => setStep("before")}
        />
      )}
      {step === "before" && (
        <BeforeYouBegin
          onBack={() => setStep("welcome")}
          onContinue={() => setStep("permission")}
        />
      )}
      {step === "permission" && (
        <LocationPermission onAllow={requestLocation} onSearch={() => setStep("app")} />
      )}
      {step === "blocked" && (
        <LocationBlocked onSearch={() => setStep("app")} onRetry={requestLocation} />
      )}
      {step === "city" && (
        <CityDetected
          detected={detected}
          onContinue={(c) => {
            chooseCity(c);
            enterApp();
          }}
          onChooseCity={() => enterApp({ cityMenu: true })}
        />
      )}
      {step === "app" && (
        <SherlockMap
          // The app step is only reached after a click, so localStorage is available here.
          city={city ?? loadCity()}
          detectedCity={detected}
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
