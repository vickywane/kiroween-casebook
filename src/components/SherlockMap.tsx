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
  MOCK_RECENT_CASES,
  type HistoricalCase,
  type RecentAreaCount,
  type RecentConcludedCase,
} from "@/lib/mock-data";
import { FLEET_STREET, formatMetres, isInLondon, metresBetween } from "@/lib/geo";
import { detectCity, type City } from "@/lib/cities";
import { CityMenu } from "./CityMenu";
import { buildMapIconHtml } from "@/lib/crime-icons";
import { LayerControls, type LayerFilter } from "./LayerControls";
import { HistoricCasePanel } from "./HistoricCasePanel";
import { RecentCasePanel } from "./RecentCasePanel";
import { ComparePanel } from "./ComparePanel";
import { SettingsPanel, type Settings } from "./SettingsPanel";
import { BottomNav, TopNav, type Tab } from "./AppNav";
import { NearbyList, StatsChip } from "./NearbyList";
import { OfflineScreen } from "./OfflineScreen";
import { HistoricCaseCard } from "./CaseCard";

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
  | { type: "recent-case"; data: RecentConcludedCase }
  | null;

const DEFAULT_SETTINGS: Settings = {
  historic: true,
  recent: true,
  stats: true,
  overlay: false,
  units: "mi",
};

// ── Main component ────────────────────────────────────────────────────────────
export function SherlockMap({
  city,
  detectedCity = null,
  onCityChange,
  initialCityMenuOpen = false,
}: {
  city: City;
  /** City matched during onboarding; refreshed below from live location. */
  detectedCity?: City | null;
  onCityChange: (c: City) => void;
  initialCityMenuOpen?: boolean;
}) {
  const [cityMenuOpen, setCityMenuOpen] = useState(initialCityMenuOpen);
  const [tab, setTab] = useState<Tab>("map");
  const [filter, setFilter] = useState<LayerFilter>("both");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [radius, setRadius] = useState(500);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [wide, setWide] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("casebook.saved") ?? "[]");
    } catch {
      return [];
    }
  });
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
      // Stadia only serves tiles without a key on localhost. A deployed site
      // needs NEXT_PUBLIC_STADIA_API_KEY (or its domain added in the Stadia
      // dashboard), otherwise the map renders blank.
      style: `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json${
        process.env.NEXT_PUBLIC_STADIA_API_KEY
          ? `?api_key=${process.env.NEXT_PUBLIC_STADIA_API_KEY}`
          : ""
      }`,
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

  // ── Casebook UI state (does not touch the map) ──────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const toggleSaved = (id: string) =>
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("casebook.saved", JSON.stringify(next));
      return next;
    });

  const showHistoric = settings.historic && filter !== "recent";
  const showRecentCases = settings.recent && filter !== "historic";
  // Map marker layers (consumed by the unchanged map JSX below)
  const historicalOn = showHistoric;
  const recentOn = settings.stats && filter !== "historic";

  const ref: [number, number] = userPos ?? FLEET_STREET;
  const outsideLondon = userPos !== null && !isInLondon(userPos);
  const fmt = (m: number) => formatMetres(m, settings.units);
  const detected = userPos ? detectCity(userPos) : detectedCity;

  const historicNearby = MOCK_HISTORICAL_CASES.map((c) => ({
    c,
    m: metresBetween(ref, [c.lat, c.lon]),
  })).sort((a, b) => a.m - b.m);
  const recentNearby = MOCK_RECENT_CASES.map((c) => ({
    c,
    m: metresBetween(ref, [c.lat, c.lon]),
  })).sort((a, b) => a.m - b.m);
  const nearestM = Math.min(
    ...historicNearby.map((x) => x.m),
    ...recentNearby.map((x) => x.m),
  );
  const listHistoric = showHistoric
    ? historicNearby.filter((x) => x.m <= radius).map((x) => ({ c: x.c, distance: fmt(x.m) }))
    : [];
  const listRecent = showRecentCases
    ? recentNearby.filter((x) => x.m <= radius).map((x) => ({ c: x.c, distance: fmt(x.m) }))
    : [];
  const savedCases = MOCK_HISTORICAL_CASES.filter((c) => savedIds.includes(c.id));
  const area = outsideLondon ? "Near you" : "Fleet Street, London EC4";
  const distanceOf = (lat: number, lon: number) => fmt(metresBetween(ref, [lat, lon]));

  const listProps = (variant: "row" | "card") => ({
    variant,
    historic: listHistoric,
    recent: listRecent,
    radiusLabel: fmt(radius),
    loading,
    outsideLondon,
    nearestLabel: Number.isFinite(nearestM) ? fmt(nearestM) : null,
    showStats: settings.stats,
    onWiden: () => setRadius(2000),
    onNearest: () => setRadius(Math.ceil(nearestM / 500) * 500 + 500),
    onOpenHistoric: (c: HistoricalCase) => {
      setTab("map");
      setPanel({ type: "historic", data: c });
    },
    onOpenRecent: (c: RecentConcludedCase) => {
      setTab("map");
      setPanel({ type: "recent-case", data: c });
    },
  });

  const pageOpen = tab === "compare" || tab === "settings" || tab === "saved" || tab === "nearby";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <TopNav
        city={city}
        onOpenCities={() => setCityMenuOpen(true)}
        tab={tab}
        onChange={(t) => {
          setPanel(null);
          setTab(t);
        }}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden">

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

      {/* ── Casebook overlays ── */}
      {tab === "map" && !panel && (
        <LayerControls
          value={filter}
          onChange={setFilter}
          area={area}
          onOpenSettings={() => setTab("settings")}
          onOpenCities={() => setCityMenuOpen(true)}
        />
      )}

      {tab === "map" && !panel && settings.stats && !outsideLondon && !loading && (
        <div className="pointer-events-none absolute left-1/2 top-[120px] z-[1000] hidden -translate-x-1/2 md:block lg:left-[calc(50%+220px)]">
          <StatsChip label="47 violent offences · 1 mi · police.uk" />
        </div>
      )}

      {/* Nearby list: bottom sheet (mobile), floating card (tablet), side column (desktop) */}
      {tab === "map" && !panel && (
        <div
          className={[
            "absolute z-[1050] overflow-y-auto bg-white px-4 pb-24 pt-3",
            "inset-x-0 bottom-0 max-h-[55%] rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,.14)]",
            "md:inset-x-auto md:left-4 md:top-4 md:bottom-24 md:max-h-none md:w-[380px] md:rounded-3xl md:pb-6 md:shadow-xl",
            "lg:left-0 lg:top-0 lg:bottom-0 lg:w-[440px] lg:rounded-none lg:px-6 lg:pb-6 lg:shadow-none lg:border-r",
          ].join(" ")}
          style={{ borderColor: "var(--cb-border)" }}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full md:hidden" style={{ background: "var(--cb-border)" }} />
          <div className="mb-4 hidden md:block">
            <LayerControls
              inline
              value={filter}
              onChange={setFilter}
              area={area}
              onOpenSettings={() => setTab("settings")}
              onOpenCities={() => setCityMenuOpen(true)}
            />
          </div>
          <NearbyList {...listProps("row")} variant="row" />
        </div>
      )}

      {/* Case panel: sheet (mobile/tablet), side column (desktop) */}
      {tab === "map" && panel && (
        <div
          className={[
            "absolute z-[1050] overflow-y-auto bg-white shadow-[0_-8px_30px_rgba(0,0,0,.14)]",
            "inset-x-0 bottom-0 top-[190px] rounded-t-3xl md:top-[260px]",
            "lg:inset-x-auto lg:left-0 lg:top-0 lg:w-[520px] lg:rounded-none lg:border-r lg:shadow-none",
          ].join(" ")}
          style={{ borderColor: "var(--cb-border)" }}
        >
          {panel.type === "historic" && (
            <HistoricCasePanel
              caseRecord={panel.data}
              distanceLabel={`${distanceOf(panel.data.lat, panel.data.lon)} from you`}
              saved={savedIds.includes(panel.data.id)}
              onToggleSave={() => toggleSaved(panel.data.id)}
              onClose={() => setPanel(null)}
              onCompare={() => {
                setPanel(null);
                setTab("compare");
              }}
            />
          )}
          {panel.type === "recent" && (
            <RecentCasePanel kind="count" data={panel.data} onClose={() => setPanel(null)} />
          )}
          {panel.type === "recent-case" && (
            <RecentCasePanel kind="case" data={panel.data} onClose={() => setPanel(null)} />
          )}
        </div>
      )}

      {/* Full-page tabs */}
      {pageOpen && (
        <div className="absolute inset-0 z-[1050] overflow-y-auto bg-white">
          {tab === "nearby" && (
            <div className="mx-auto max-w-[640px] px-5 pb-28 pt-8 md:px-6">
              <NearbyList {...listProps("card")} variant="card" />
            </div>
          )}
          {tab === "compare" && (
            <ComparePanel
              street="Fleet Street, London"
              wide={wide}
              onToggleWide={setWide}
              tooFew={!wide}
            />
          )}
          {tab === "settings" && <SettingsPanel value={settings} onChange={setSettings} />}
          {tab === "saved" && (
            <div className="mx-auto max-w-[640px] px-5 pb-28 pt-8 md:px-6">
              <h1 className="cb-serif text-[32px] font-bold">Saved</h1>
              <div className="mt-4 space-y-3">
                {savedCases.length === 0 && (
                  <p className="text-[15px]" style={{ color: "var(--cb-muted)" }}>
                    Nothing saved yet. Tap the bookmark on a case file to keep it here.
                  </p>
                )}
                {savedCases.map((c) => (
                  <HistoricCaseCard
                    key={c.id}
                    c={c}
                    distance={distanceOf(c.lat, c.lon)}
                    onOpen={() => {
                      setTab("map");
                      setPanel({ type: "historic", data: c });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!online && (
        <div className="absolute inset-0 z-[1200] overflow-y-auto bg-white">
          <OfflineScreen
            saved={savedCases}
            onRetry={() => setOnline(navigator.onLine)}
            onOpen={(c) => {
              setTab("map");
              setPanel({ type: "historic", data: c });
            }}
          />
        </div>
      )}

      <BottomNav
        tab={tab}
        onChange={(t) => {
          setPanel(null);
          setTab(t);
        }}
      />
      </div>
      <CityMenu
        open={cityMenuOpen}
        city={city}
        detected={detected}
        onSelect={(c) => {
          onCityChange(c);
          setCityMenuOpen(false);
        }}
        onClose={() => setCityMenuOpen(false)}
      />
    </div>
  );
}
