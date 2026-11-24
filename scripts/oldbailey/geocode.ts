/**
 * Place names from Old Bailey transcripts → coordinates.
 *
 * Two tiers, both honest about how sure they are:
 *   1. police.uk street gazetteer (built from our own data). A name such as
 *      "Fleet-street" matches "On or near Fleet Street".  → confidence "street"
 *   2. Nominatim (OpenStreetMap), limited to London, cached on disk, 1 request
 *      per second as its usage policy requires.            → "exact" for a named
 *      building or landmark, "street" for a road, "area" for a district or parish.
 *
 * A name that neither tier can place is left out. We never guess.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { streetKey } from "../../src/lib/offence-groups";

export type Confidence = "exact" | "street" | "area";

export interface Place {
  lat: number;
  lon: number;
  confidence: Confidence;
  /** What produced the match, shown to the user as the "basis". */
  source: "policeuk" | "nominatim";
  /** Street key used for Compare, when the match is a street. */
  key: string;
  /** Name of the matched place as the geocoder knows it. */
  label: string;
}

/**
 * Splits "No. 17, in George-street, Grosvenor-square" into candidate names,
 * most specific first, and drops house numbers.
 */
export function candidates(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^(in|at|near|on|of)\s+(the\s+)?/i, "").replace(/^no\.?\s*\d+[a-z]?\s*,?\s*/i, "").trim())
    .filter((s) => s.length > 2 && !/^\d+$/.test(s));
}

// ── Tier 1: police.uk streets ─────────────────────────────────────────────────

export type Gazetteer = Map<string, { lat: number; lon: number; label: string }>;

export function buildGazetteer(rows: { location_name: string | null; lat: number; lon: number }[]): Gazetteer {
  const acc = new Map<string, { lat: number; lon: number; n: number; label: string }>();
  for (const r of rows) {
    if (!r.location_name) continue;
    const key = streetKey(r.location_name);
    const e = acc.get(key) ?? { lat: 0, lon: 0, n: 0, label: r.location_name.replace(/^On or near\s+/i, "") };
    e.lat += r.lat;
    e.lon += r.lon;
    e.n += 1;
    acc.set(key, e);
  }
  return new Map([...acc].map(([k, v]) => [k, { lat: v.lat / v.n, lon: v.lon / v.n, label: v.label }]));
}

// ── Tier 2: Nominatim with an on-disk cache ───────────────────────────────────

interface CacheEntry {
  lat: number;
  lon: number;
  confidence: Confidence;
  label: string;
  kind: string;
}
type Cache = Record<string, CacheEntry | null>;

export function loadCache(path: string): Cache {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Cache) : {};
}
export function saveCache(path: string, cache: Cache) {
  writeFileSync(path, JSON.stringify(cache, null, 1));
}

const LONDON_VIEWBOX = "-0.55,51.72,0.35,51.25"; // left,top,right,bottom
const STREET_CLASSES = new Set(["highway"]);
const AREA_TYPES = new Set(["suburb", "neighbourhood", "quarter", "city_block", "administrative", "locality", "village", "town", "hamlet", "borough", "city", "county", "civil_parish", "ward"]);

function confidenceOf(cls: string, type: string): Confidence {
  if (STREET_CLASSES.has(cls)) return "street";
  if (AREA_TYPES.has(type) || cls === "boundary" || cls === "place") return "area";
  return "exact"; // a named building, church, bridge, tavern…
}

let lastCall = 0;
async function nominatim(query: string): Promise<CacheEntry | null> {
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q: query, format: "jsonv2", limit: "1", viewbox: LONDON_VIEWBOX, bounded: "1", countrycodes: "gb" });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "casebook-sherlock-hackathon/0.1 (kiroween 2026 project)" } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Nominatim ${res.status} for ${query}`);
    const hits = (await res.json()) as { lat: string; lon: string; category?: string; class?: string; type: string; display_name: string; name?: string }[];
    const h = hits[0];
    if (!h) return null;
    const cls = h.category ?? h.class ?? "";
    return {
      lat: Number(h.lat),
      lon: Number(h.lon),
      confidence: confidenceOf(cls, h.type),
      label: h.name || h.display_name.split(",")[0],
      kind: `${cls}/${h.type}`,
    };
  }
  throw new Error(`Nominatim kept failing for ${query}`);
}

export function nominatimQuery(cands: string[]): string {
  return `${cands.slice(0, 2).map((c) => c.replace(/-/g, " ")).join(", ")}, London`;
}

export async function geocodeRemote(cands: string[], cache: Cache): Promise<Place | null> {
  const q = nominatimQuery(cands);
  if (!(q in cache)) cache[q] = await nominatim(q);
  const e = cache[q];
  if (!e) return null;
  // A building came back for a street name ("Bishopsgate Street" → a club on it).
  // The point is close, but it is not the thing named, so call it "area".
  const named = streetKey(e.label);
  const nameMatches = cands.some((c) => {
    const k = streetKey(c);
    return named.includes(k) || k.includes(named);
  });
  const confidence: Confidence = e.confidence === "exact" && !nameMatches ? "area" : e.confidence;
  return {
    lat: e.lat,
    lon: e.lon,
    confidence,
    source: "nominatim",
    key: streetKey(cands[0]),
    label: e.label,
  };
}

/**
 * Our police.uk streets are all in and around the City of London. A name such
 * as "Queen-street, Westminster" must not be pinned to the City's Queen Street,
 * so a multi-part name only matches locally when another part is a City word.
 */
const CITY_WORDS = [
  "city", "london", "temple", "cheapside", "cornhill", "smithfield", "newgate", "ludgate", "aldgate", "bishopsgate",
  "cripplegate", "aldersgate", "moorgate", "holborn", "fleet", "blackfriars", "barbican", "guildhall", "pauls",
  "threadneedle", "lombard", "cannon", "poultry", "cateaton", "milk", "wood", "bread", "old jewry", "jewry", "bank",
  "royal exchange", "st bride", "bridewell", "farringdon", "snow hill", "bartholomew", "tower", "billingsgate", "thames",
  "queenhithe", "watling", "fenchurch", "gracechurch", "leadenhall", "houndsditch", "minories", "moorfields",
];

const isCityWord = (s: string) => CITY_WORDS.some((w) => streetKey(s).includes(w));

/** Tier 1 only. Tries every candidate segment. */
export function geocodeLocal(cands: string[], gaz: Gazetteer): Place | null {
  if (cands.length > 1 && !cands.slice(1).some(isCityWord) && !isCityWord(cands[0])) return null;
  for (const c of cands) {
    const key = streetKey(c);
    const g = gaz.get(key);
    if (g) return { lat: g.lat, lon: g.lon, confidence: "street", source: "policeuk", key, label: g.label };
  }
  return null;
}
