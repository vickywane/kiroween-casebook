"use client";

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import * as maplibregl from "maplibre-gl";
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

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Per-category icon cache ───────────────────────────────────────────────────
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

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_CENTRE: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 16;

// ── Landmark labels ───────────────────────────────────────────────────────────
// Alidade Smooth Dark ships with no business POIs (shops, cafés, etc.) — only
// parks, universities and hospitals. This adds landmark-type POIs on top,
// using a *subclass* allow-list so businesses stay hidden. (Filtering by class
// isn't enough: OpenMapTiles puts bookshops under class "library" and
// commercial galleries under class "art_gallery".)
const LANDMARK_SUBCLASSES = [
  "attraction",
  "museum",
  "gallery",      // public galleries (not "art" = commercial dealers)
  "arts_centre",
  "monument",
  "memorial",
  "castle",
  "theatre",
  "stadium",
  "town_hall",
  "library",      // public libraries (not "books" = bookshops)
];

function addLandmarkLabels(map: maplibregl.Map) {
  if (map.getLayer("landmark_labels")) return;
  map.addLayer({
    id: "landmark_labels",
    type: "symbol",
    source: "openmaptiles",
    "source-layer": "poi",
    minzoom: 14,
    filter: [
      "all",
      ["==", ["geometry-type"], "Point"],
      [
        "any",
        // place_of_worship subclasses are religions (christian, muslim, …)
        ["==", ["get", "class"], "place_of_worship"],
        ["in", ["get", "subclass"], ["literal", LANDMARK_SUBCLASSES]],
      ],
    ],
    layout: {
      "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]],
      "text-font": ["Stadia Italic"],
      "text-size": 12,
      "text-max-width": 8,
      "symbol-avoid-edges": true,
    },
    paint: {
      "text-color": "#c9b98f",
      "text-halo-color": "#333",
      "text-halo-width": 1,
      "text-halo-blur": 1,
    },
  });
}

// MapLibre zoom is 1 less than Leaflet zoom (tile convention difference)
const toLibreZoom = (leafletZoom: number) => leafletZoom - 1;
const toLeafletZoom = (libreZoom: number) => libreZoom + 1;

// ── Case extent ───────────────────────────────────────────────────────────────
// Initial view frames every case so markers are visible on load.
const CASE_POINTS: [number, number][] = [
  ...MOCK_HISTORICAL_CASES.map((c): [number, number] => [c.lon, c.lat]),
  ...MOCK_RECENT_COUNTS.map((r): [number, number] => [r.lon, r.lat]),
];
const CASE_BOUNDS = CASE_POINTS.reduce(
  (b, p) => b.extend(p),
  new maplibregl.LngLatBounds(CASE_POINTS[0], CASE_POINTS[0]),
);
// Only jump to the user's location if there are cases near them; otherwise
// (e.g. outside London) keep the case overview instead of an empty map.
const NEARBY_KM = 5;

function kmBetween([lat1, lon1]: [number, number], [lon2, lat2]: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(a));
}

const isNearCases = (pos: [number, number]) =>
  CASE_POINTS.some((p) => kmBetween(pos, p) <= NEARBY_KM);

// ── Leaflet sync component ────────────────────────────────────────────────────
/**
 * MapLibre owns all interaction; the Leaflet marker layer just follows it.
 */
function LeafletSyncBridge({
  libreMap,
  userPos,
}: {
  libreMap: maplibregl.Map | null;
  userPos: [number, number] | null;
}) {
  const leafletMap = useMap();
  const centredRef = useRef(false);

  // Centre on the user's first position fix only. watchPosition keeps
  // firing, and re-centring on every update snaps the map back mid-pan.
  useEffect(() => {
    if (!userPos || !libreMap || centredRef.current) return;
    centredRef.current = true;
    if (!isNearCases(userPos)) return;
    libreMap.jumpTo({
      center: [userPos[1], userPos[0]],
      zoom: toLibreZoom(DEFAULT_ZOOM),
    });
  }, [userPos, libreMap]);

  // MapLibre → Leaflet
  useEffect(() => {
    if (!libreMap) return;
    const onLibreMove = () => {
      const c = libreMap.getCenter();
      leafletMap.setView(
        [c.lat, c.lng],
        toLeafletZoom(libreMap.getZoom()),
        { animate: false, noMoveStart: true },
      );
    };
    onLibreMove(); // initial sync — MapLibre may have fitted bounds already
    libreMap.on("move", onLibreMove);
    return () => { libreMap.off("move", onLibreMove); };
  }, [leafletMap, libreMap]);

  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Panel =
  | { type: "historic"; data: HistoricalCase }
  | { type: "recent"; data: RecentAreaCount }
  | { type: "thenandnow" }
  | null;

// ── Main component ────────────────────────────────────────────────────────────
export function SherlockMap() {
  const [historicalOn, setHistoricalOn] = useState(true);
  const [recentOn, setRecentOn] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [libreMap, setLibreMap] = useState<maplibregl.Map | null>(null);

  const libreContainerRef = useRef<HTMLDivElement>(null);
  const libreMapRef = useRef<maplibregl.Map | null>(null);
  const watchRef = useRef<number | null>(null);

  // ── Boot MapLibre GL ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!libreContainerRef.current || libreMapRef.current) return;

    // Point MapLibre at the worker file we copied to /public.
    // Without this, Turbopack can't resolve the relative worker URL and the
    // map initialises with no tiles (blank grey canvas).
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

    const map = new maplibregl.Map({
      container: libreContainerRef.current,
      style: "https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json",
      bounds: CASE_BOUNDS,
      fitBoundsOptions: { padding: 60, maxZoom: toLibreZoom(DEFAULT_ZOOM) },
      attributionControl: false,
      interactive: true,
    });

    // Add attribution manually so it doesn't overlap controls
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );

    libreMapRef.current = map;
    map.on("load", () => {
      addLandmarkLabels(map);
      setLibreMap(map);
    });
    map.on("error", (e) => console.error("[MapLibre]", e.error));

    return () => {
      map.remove();
      libreMapRef.current = null;
      setLibreMap(null);
    };
  }, []);

  // ── Geolocation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
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

      {/* ── Layer 1: MapLibre GL canvas (base map) ── */}
      {/*
        Positioning is inline on purpose: maplibre-gl.css sets
        `.maplibregl-map { position: relative }`, which beats Tailwind's
        layered `absolute` class and collapses this div to 0px height
        (blank map).
      */}
      <div
        ref={libreContainerRef}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* ── Layer 2: Leaflet (markers only, transparent background) ── */}
      {/*
        The Leaflet map sits on top of the MapLibre canvas.
        It has no tile layer — only markers and popups.
        The whole layer is pointer-events:none so drag/scroll/pinch reach
        MapLibre; markers and popups opt back in (see <style> below).
      */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 1, pointerEvents: "none" }}
      >
        <MapContainer
          center={DEFAULT_CENTRE}
          zoom={DEFAULT_ZOOM}
          zoomSnap={0}              // follow MapLibre's fractional zoom exactly
          scrollWheelZoom={false}   // MapLibre handles scroll
          dragging={false}           // MapLibre handles drag
          touchZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          // Make the Leaflet canvas transparent so MapLibre shows through
          style={{ background: "transparent" }}
        >
          <LeafletSyncBridge libreMap={libreMap} userPos={userPos} />

          {userPos && (
            <Marker position={userPos} icon={userIcon} interactive={false} />
          )}

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
      </div>

      {/* Transparent click-through overlay so MapLibre gets mouse events */}
      <style>{`
        .leaflet-container {
          background: transparent !important;
          pointer-events: none;
        }
        /* Only markers and popups catch clicks; everything else falls
           through to MapLibre for pan/zoom. */
        .leaflet-marker-icon.leaflet-interactive,
        .leaflet-popup {
          pointer-events: auto;
        }
      `}</style>

      {/* ── Layer controls ── */}
      <LayerControls
        historical={historicalOn}
        recent={recentOn}
        onToggleHistorical={() => setHistoricalOn((v) => !v)}
        onToggleRecent={() => setRecentOn((v) => !v)}
        onThenAndNow={() => setPanel({ type: "thenandnow" })}
      />

      {/* ── Side panel ── */}
      {panelOpen && (
        <>
          <div
            className="absolute inset-0 z-[1001] bg-black/40 md:hidden"
            onClick={() => setPanel(null)}
          />
          <div
            className={[
              "absolute z-[1002] overflow-hidden",
              "bottom-0 left-0 right-0 max-h-[75vh] rounded-t-2xl",
              "md:bottom-0 md:right-0 md:top-0 md:left-auto md:w-96 md:max-h-full md:rounded-none",
            ].join(" ")}
            style={{ boxShadow: "-4px 0 32px rgba(0,0,0,.5)" }}
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
