"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";

/**
 * Leaflet must only run on the client — SSR would throw because it accesses
 * `window` and `document` during module initialisation.
 */
const SherlockMap = dynamic(
  () => import("@/components/MapClient"),
  { ssr: false, loading: () => <MapSkeleton /> },
);

export default function Home() {
  const [started, setStarted] = useState(false);

  return (
    <div className="h-full w-full overflow-hidden">
      {started ? (
        <SherlockMap />
      ) : (
        <WelcomeScreen onEnter={() => setStarted(true)} />
      )}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: "var(--hist-bg)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--hist-amber)" }}
        />
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--hist-muted)" }}
        >
          Loading map…
        </p>
      </div>
    </div>
  );
}
