/**
 * Pure transform for police.uk street-level crimes: raw API batches in,
 * area counts out. No I/O here, so it can be unit tested.
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
  /** The neighbourhood boundary used as the query polygon, as [lat, lon] pairs. */
  boundary: [number, number][];
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
  count: number;
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

/** Ray-casting point-in-polygon test on [lat, lon] pairs. */
export function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** BTP crimes inside a force's area are recorded by British Transport Police. */
export function forceFor(crime: PoliceCrime, batchForce: string): string {
  return crime.location_type === "BTP" ? "btp" : batchForce;
}

/**
 * Aggregates neighbourhood batches for one force and month.
 *
 * Each crime belongs to the neighbourhood whose boundary contains its point,
 * not to whichever polygon query happened to return it. police.uk also returns
 * crimes just outside a polygon, so a border street can come back from two
 * queries. Owning by point means a neighbourhood's rows depend only on its own
 * boundary and crimes, so re-running a subset of neighbourhoods gives the same
 * rows as a full run. Crimes outside their batch's boundary are counted in
 * `outside` and left to the neighbour that owns them.
 *
 * Crimes are also de-duplicated by police.uk crime ID, in case two boundaries
 * overlap; batches are processed in neighbourhood-ID order so the owner is stable.
 */
export function aggregateMonth(
  batches: CrimeBatch[],
  transformVersion: string,
): { rows: AreaCountRow[]; rejects: Reject[]; crimesSeen: number; duplicates: number; outside: number; unowned: number } {
  if (batches.length === 0) return { rows: [], rejects: [], crimesSeen: 0, duplicates: 0, outside: 0, unowned: 0 };
  const month = batches[0].month;
  if (batches.some((b) => b.month !== month)) throw new Error("aggregateMonth expects batches from one month");
  batches = [...batches].sort((a, b) => (a.neighbourhood < b.neighbourhood ? -1 : a.neighbourhood > b.neighbourhood ? 1 : 0));

  const seen = new Set<number>();
  const outsideIds = new Set<number>();
  const rejects: Reject[] = [];
  let crimesSeen = 0;
  let duplicates = 0;
  let outside = 0;

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

      const lat = Number(crime.location?.latitude);
      const lon = Number(crime.location?.longitude);
      const streetId = crime.location?.street?.id;
      if (!crime.location || !Number.isFinite(lat) || !Number.isFinite(lon) || streetId === undefined) {
        seen.add(crime.id);
        rejects.push({ crimeId: crime.id, reason: "missing or invalid location" });
        continue;
      }
      if (!pointInPolygon(lat, lon, batch.boundary)) {
        outside++;
        outsideIds.add(crime.id);
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

      const force = forceFor(crime, batch.force);

      const sKey = `${force}:${streetId}:${crime.category}`;
      const s = street.get(sKey);
      if (s) s.count++;
      else
        street.set(sKey, {
          count: 1, lat, lon, name: crime.location!.street.name ?? null, batch, force,
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

  // Crimes no loaded boundary contains. In a run over a subset of
  // neighbourhoods these belong to neighbours; in a full run they are lost.
  const unowned = [...outsideIds].filter((id) => !seen.has(id)).length;

  // Street rows of a neighbourhood must add up to its total.
  const streetSums = new Map<string, number>();
  for (const g of street.values()) {
    const key = `${g.force}:${g.batch.neighbourhood}:${g.category}`;
    streetSums.set(key, (streetSums.get(key) ?? 0) + g.count);
  }
  for (const g of nbhd.values()) {
    if (streetSums.get(`${g.force}:${g.batch.neighbourhood}:${g.category}`) !== g.count) {
      throw new Error(`Street rows don't add up to the total for ${g.key}:${g.category}`);
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
    count: g.count,
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
  return { rows, rejects, crimesSeen, duplicates, outside, unowned };
}

/** Converts a police.uk boundary into the "lat,lng:lat,lng" poly format and its centroid. */
export function boundaryToPoly(points: { latitude: string; longitude: string }[]): {
  poly: string;
  boundary: [number, number][];
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
    boundary: points.map((p) => [Number(p.latitude), Number(p.longitude)]),
    centroid: { lat: lat / points.length, lon: lon / points.length },
  };
}
