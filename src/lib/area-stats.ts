import type { AreaResponse, AreaStreet } from "./area-types";
import type { RecentAreaCount } from "./mock-data";
import { metresBetween } from "./geo";

export const CATEGORY_LABELS: Record<string, string> = {
  "anti-social-behaviour": "Anti-social behaviour",
  "bicycle-theft": "Bicycle theft",
  burglary: "Burglary",
  "criminal-damage-arson": "Criminal damage & arson",
  drugs: "Drugs",
  "other-crime": "Other crime",
  "other-theft": "Other theft",
  "possession-of-weapons": "Possession of weapons",
  "public-order": "Public order",
  robbery: "Robbery",
  shoplifting: "Shoplifting",
  "theft-from-the-person": "Theft from the person",
  "vehicle-crime": "Vehicle crime",
  "violent-crime": "Violence & sexual offences",
};

export const labelFor = (c: string) => CATEGORY_LABELS[c] ?? c.replace(/-/g, " ");

const MILE = 1609.344;

/** Every street row in the loaded squares (a square is never loaded twice). */
export function allStreets(areas: AreaResponse[]): AreaStreet[] {
  return areas.flatMap((a) => a.streets);
}

export function monthOf(areas: AreaResponse[]): string | null {
  return areas[0]?.month ?? null;
}

/** "Sep 2026" from "2026-09". */
export function monthLabel(m: string | null): string {
  if (!m) return "";
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Total of one category within a radius, or null when none was recorded. */
export function countWithin(
  streets: AreaStreet[],
  ref: [number, number],
  category: string,
  radiusM = MILE,
): number | null {
  let total = 0;
  for (const s of streets) {
    if (s.category !== category) continue;
    if (metresBetween(ref, [s.lat, s.lon]) > radiusM) continue;
    total += s.count;
  }
  return total || null;
}

/** One category on the street nearest the user. */
export function onNearestStreet(
  streets: AreaStreet[],
  ref: [number, number],
  category: string,
): { street: string; value: string } | null {
  let nearest: AreaStreet | null = null;
  let best = Infinity;
  for (const s of streets) {
    const m = metresBetween(ref, [s.lat, s.lon]);
    if (m < best) {
      best = m;
      nearest = s;
    }
  }
  if (!nearest || best > 400) return null;
  const hit = streets.find(
    (s) => s.category === category && s.lat === nearest!.lat && s.lon === nearest!.lon,
  );
  return {
    street: nearest.name.replace(/^On or near /, ""),
    value: hit ? String(hit.count) : "None recorded",
  };
}

/**
 * Map markers: one per police.uk point, so every recorded crime is findable.
 * The pin uses the point's largest category; the panel lists every category.
 */
export function toMarkers(streets: AreaStreet[], month: string | null): RecentAreaCount[] {
  const byPoint = new Map<string, AreaStreet[]>();
  for (const s of streets) {
    const k = `${s.lat},${s.lon}`;
    byPoint.set(k, [...(byPoint.get(k) ?? []), s]);
  }
  const out: RecentAreaCount[] = [];
  for (const [k, list] of byPoint) {
    const sorted = [...list].sort((a, b) => b.count - a.count);
    const top = sorted[0];
    const place = top.name.replace(/^On or near /, "");
    out.push({
      id: `pu:${k}`,
      category: top.category,
      category_label:
        list.length > 1 ? `${labelFor(top.category)} and ${list.length - 1} more · ${place}` : `${labelFor(top.category)} · ${place}`,
      month: month ?? "",
      lat: top.lat,
      lon: top.lon,
      count: top.count,
      force: top.force === "city-of-london" ? "City of London Police" : top.force,
      place,
      breakdown: sorted.map((s) => ({ label: labelFor(s.category), count: s.count })),
    });
  }
  return out;
}
