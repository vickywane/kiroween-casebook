/**
 * Pure transform for police.uk street-level crimes: raw API batches in,
 * suppressed area counts out. No I/O here, so it can be unit tested.
 */

export const LICENCE = "Open Government Licence v3.0";
export const ATTRIBUTION =
  "Contains public sector information licensed under the Open Government Licence v3.0. Source: data.police.uk";
export const SOURCE_URL = "https://data.police.uk/data/";

export interface PoliceCrime {
  id: number;
  persistent_id: string;
  category: string;
  month: string;
  location_type: string | null;
  location: {
    latitude: string;
    longitude: string;
    street: { id: number; name: string };
  } | null;
  outcome_status: { category: string; date: string } | null;
}

export interface CrimeBatch {
  force: string;
  neighbourhood: string;
  neighbourhoodName: string;
  month: string;
  centroid: { lat: number; lon: number };
  crimes: PoliceCrime[];
  retrievedAt: string;
  sha256: string;
  request: string;
}

export interface AreaCountRow {
  id: string;
  level: "street" | "neighbourhood";
  category: string;
  month: string;
  lat: number;
  lon: number;
  location_name: string | null;
  count: number | null;
  force: string;
  neighbourhood: string | null;
  source: string;
  source_url: string;
  source_query: string;
  licence: string;
  attribution_text: string;
  retrieved_at: string;
  upstream_version: string;
  transform_version: string;
}

export interface Reject {
  crimeId: number;
  reason: string;
}

/**
 * Small-count suppression (steering rule): never show a count of 1 or 2.
 * Applied at every level, which is stricter than the steering rule requires
 * for wider areas but matches the data-ingestion spec.
 */
export function suppressCount(n: number): number | null {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid count: ${n}`);
  return n <= 2 ? null : n;
}

/** BTP crimes inside a force's area are recorded by British Transport Police. */
export function forceFor(crime: PoliceCrime, batchForce: string): string {
  return crime.location_type === "BTP" ? "btp" : batchForce;
}

/**
 * Aggregates all neighbourhood batches for one force and month.
 * Crimes are de-duplicated by police.uk crime ID first, because a street on a
 * neighbourhood border can be returned by two neighbourhood polygons.
 */
export function aggregateMonth(
  batches: CrimeBatch[],
  transformVersion: string,
): { rows: AreaCountRow[]; rejects: Reject[]; crimesSeen: number; duplicates: number } {
  if (batches.length === 0) return { rows: [], rejects: [], crimesSeen: 0, duplicates: 0 };
  const month = batches[0].month;
  if (batches.some((b) => b.month !== month)) throw new Error("aggregateMonth expects batches from one month");

  const seen = new Set<number>();
  const rejects: Reject[] = [];
  let crimesSeen = 0;
  let duplicates = 0;

  type Group = { count: number; lat: number; lon: number; name: string | null; batch: CrimeBatch; force: string; category: string; key: string };
  const street = new Map<string, Group>();
  const nbhd = new Map<string, Group>();

  for (const batch of batches) {
    for (const crime of batch.crimes) {
      crimesSeen++;
      if (seen.has(crime.id)) {
        duplicates++;
        continue;
      }
      seen.add(crime.id);

      if (crime.month !== month) {
        rejects.push({ crimeId: crime.id, reason: `month ${crime.month} does not match request ${month}` });
        continue;
      }
      if (!crime.category) {
        rejects.push({ crimeId: crime.id, reason: "missing category" });
        continue;
      }
      const lat = Number(crime.location?.latitude);
      const lon = Number(crime.location?.longitude);
      const streetId = crime.location?.street?.id;
      if (!crime.location || !Number.isFinite(lat) || !Number.isFinite(lon) || streetId === undefined) {
        rejects.push({ crimeId: crime.id, reason: "missing or invalid location" });
        continue;
      }

      const force = forceFor(crime, batch.force);

      const sKey = `${force}:${streetId}:${crime.category}`;
      const s = street.get(sKey);
      if (s) s.count++;
      else
        street.set(sKey, {
          count: 1, lat, lon, name: crime.location.street.name ?? null, batch, force,
          category: crime.category, key: `${force}:${streetId}`,
        });

      const nKey = `${force}:${batch.neighbourhood}:${crime.category}`;
      const n = nbhd.get(nKey);
      if (n) n.count++;
      else
        nbhd.set(nKey, {
          count: 1, lat: batch.centroid.lat, lon: batch.centroid.lon, name: batch.neighbourhoodName, batch, force,
          category: crime.category, key: `${force}:${batch.neighbourhood}`,
        });
    }
  }

  const toRow = (level: AreaCountRow["level"], g: Group): AreaCountRow => ({
    id: `policeuk:${level}:${month}:${g.key}:${g.category}`,
    level,
    category: g.category,
    month,
    lat: g.lat,
    lon: g.lon,
    location_name: g.name,
    count: suppressCount(g.count),
    force: g.force,
    neighbourhood: g.batch.neighbourhood,
    source: "policeuk",
    source_url: SOURCE_URL,
    source_query: `${g.batch.request} (polygon: ${g.batch.force}/${g.batch.neighbourhood} boundary)`,
    licence: LICENCE,
    attribution_text: ATTRIBUTION,
    retrieved_at: g.batch.retrievedAt,
    upstream_version: `sha256:${g.batch.sha256}`,
    transform_version: transformVersion,
  });

  const rows = [
    ...[...street.values()].map((g) => toRow("street", g)),
    ...[...nbhd.values()].map((g) => toRow("neighbourhood", g)),
  ];
  return { rows, rejects, crimesSeen, duplicates };
}

/** Converts a police.uk boundary into the "lat,lng:lat,lng" poly format and its centroid. */
export function boundaryToPoly(points: { latitude: string; longitude: string }[]): {
  poly: string;
  centroid: { lat: number; lon: number };
} {
  if (points.length < 3) throw new Error("Boundary needs at least 3 points");
  let lat = 0;
  let lon = 0;
  for (const p of points) {
    lat += Number(p.latitude);
    lon += Number(p.longitude);
  }
  return {
    poly: points.map((p) => `${p.latitude},${p.longitude}`).join(":"),
    centroid: { lat: lat / points.length, lon: lon / points.length },
  };
}
