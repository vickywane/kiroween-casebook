"use client";

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
// @ts-ignore — maplibre-gl-leaflet has no bundled types
import MaplibreLayer from "@maplibre/maplibre-gl-leaflet";
import {
  MOCK_HISTORICAL_CASES,
  MOCK_RECENT_COUNTS,
  MOCK_THEN_AND_NOW,
  type HistoricalCase,
  type RecentAreaCount,
} from "@/lib/mock-data";
import { buildMapIconHtml } from "@/lib/crime-icons";
import { LayerControls } from "./LayerControls";
import { HistoricCasePanel } from "./HistoricCasePanel";
import { RecentCasePanel } from "./RecentCasePanel";
import { ThenAndNowPanel } from "./ThenAndNowPanel";

// Fix Leaflet default icon paths broken by webpack/next
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Per-category map icons — built on demand and memoised in a Map
const iconCache = new Map<string, L.DivIcon>();

function getHistoricalIcon(category: string): L.DivIcon {
  const key = `hist:${category}`;
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: "",
        html: buildMapIconHtml(category, "historical"),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      }),
    );
  }
  return iconCache.get(key)!;
}

function getRecentIcon(category: string): L.DivIcon {
  const key = `recent:${category}`;
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: "",
        html: buildMapIconHtml(category, "recent"),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      }),
    );
  }
  return iconCache.get(key)!;
}

// User location icon — compass crosshair
const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:20px;height:20px;
    border-radius:50%;
    background:rgba(59,130,246,.8);
    border:3px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Default map centre — City of London
const DEFAULT_CENTRE: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 16;

/**
 * Stadia Alidade Smooth Dark vector tile layer.
 *
 * Shows: streets, place names, landmarks (parks, hospitals, universities),
 *        water, boundaries, buildings.
 * Hides: all business/shop/restaurant POIs. The base style has none of those
 *        in its layer list — only parks, hospitals, and universities appear as
 *        named POIs, which is exactly what we want.
 *
 * Works on localhost without an API key (Stadia Maps policy).
 * Attribution: © Stadia Maps © OpenMapTiles © OpenStreetMap contributors.
 */
function StadiaVectorLayer() {
  const map = useMap();
  const addedRef = useRef(false);

  useEffect(() => {
    if (addedRef.current) return;
    addedRef.current = true;

    // maplibreGL is a factory: maplibreGL({ style }) returns a Leaflet Layer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { maplibreGL } = MaplibreLayer as any;
    const layer = maplibreGL({
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
    });
    layer.addTo(map);

    // move the GL canvas behind Leaflet's overlay pane so markers sit on top
    layer.once("add", () => {
      const container: HTMLElement | undefined = layer.getContainer?.();
      if (container) container.style.zIndex = "0";
    });

    return () => {
      map.removeLayer(layer);
      addedRef.current = false;
    };
  }, [map]);

  return null;
}

/** Re-centres the map when userPos changes */
function MapAutoCenter({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, DEFAULT_ZOOM, { animate: true });
  }, [map, position]);
  return null;
}

type Panel =
  | { type: "historic"; data: HistoricalCase }
  | { type: "recent"; data: RecentAreaCount }
  | { type: "thenandnow" }
  | null;

export function SherlockMap() {
  const [historicalOn, setHistoricalOn] = useState(true);
  const [recentOn, setRecentOn] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const watchRef = useRef<number | null>(null);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}, // silently ignore — user may deny
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => {
      if (watchRef.current != null)
        navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const panelOpen = panel !== null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Leaflet map */}
      <MapContainer
        center={DEFAULT_CENTRE}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={false}
      >
        {/* Stadia Alidade Smooth Dark vector tiles — no business POIs */}
        <StadiaVectorLayer />

        <MapAutoCenter position={userPos} />

        {/* User location marker */}
        {userPos && <Marker position={userPos} icon={userIcon} />}

        {/* Historical pins */}
        {historicalOn &&
          MOCK_HISTORICAL_CASES.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lon]}
              icon={getHistoricalIcon(c.offence_category)}
              eventHandlers={{
                click: () => setPanel({ type: "historic", data: c }),
              }}
            >
              <Popup>
                <strong>{c.offence_category}</strong> · {c.year}
              </Popup>
            </Marker>
          ))}

        {/* Recent markers — icon-based, sized by count */}
        {recentOn &&
          MOCK_RECENT_COUNTS.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lon]}
              icon={getRecentIcon(r.category)}
              eventHandlers={{
                click: () => setPanel({ type: "recent", data: r }),
              }}
            >
              <Popup>
                {r.category_label} ·{" "}
                {r.count !== null ? r.count : "a small number"}
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Layer controls — absolutely positioned over map */}
      <LayerControls
        historical={historicalOn}
        recent={recentOn}
        onToggleHistorical={() => setHistoricalOn((v) => !v)}
        onToggleRecent={() => setRecentOn((v) => !v)}
        onThenAndNow={() => setPanel({ type: "thenandnow" })}
      />


      {/* Side panel — slide up on mobile, right panel on desktop */}
      {panelOpen && (
        <>
          {/* Backdrop (mobile only) */}
          <div
            className="absolute inset-0 z-[1001] bg-black/40 md:hidden"
            onClick={() => setPanel(null)}
          />

          {/* Panel container */}
          <div
            className={[
              "absolute z-[1002] overflow-hidden",
              // Mobile: slide-up sheet from bottom
              "bottom-0 left-0 right-0 max-h-[75vh] rounded-t-2xl",
              // Desktop: right panel
              "md:bottom-0 md:right-0 md:top-0 md:left-auto md:w-96 md:max-h-full md:rounded-none md:rounded-l-none",
            ].join(" ")}
            style={{
              boxShadow: "-4px 0 32px rgba(0,0,0,.5)",
            }}
          >
            {panel?.type === "historic" && (
              <HistoricCasePanel
                caseRecord={panel.data}
                onClose={() => setPanel(null)}
              />
            )}
            {panel?.type === "recent" && (
              <RecentCasePanel
                count={panel.data}
                onClose={() => setPanel(null)}
              />
            )}
            {panel?.type === "thenandnow" && (
              <ThenAndNowPanel
                rows={MOCK_THEN_AND_NOW}
                onClose={() => setPanel(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
