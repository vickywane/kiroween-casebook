/**
 * Minimal geohash encoder + neighbour lookup. Shared by the DynamoDB load
 * script (to file items under a map cell) and the API (to find the cells
 * around a point). Precision 6 ≈ 1.2 km × 0.6 km cells.
 */
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export const CELL_PRECISION = 6;

export function encodeGeohash(lat: number, lon: number, precision = CELL_PRECISION): string {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
  let hash = "";
  let bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonLo + lonHi) / 2;
      if (lon >= mid) { ch = (ch << 1) | 1; lonLo = mid; } else { ch <<= 1; lonHi = mid; }
    } else {
      const mid = (latLo + latHi) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latLo = mid; } else { ch <<= 1; latHi = mid; }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** Centre and size (degrees) of a geohash cell. */
export function decodeGeohash(hash: string): { lat: number; lon: number; dLat: number; dLon: number } {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
  let even = true;
  for (const c of hash) {
    const v = BASE32.indexOf(c);
    if (v < 0) throw new Error(`bad geohash: ${hash}`);
    for (let b = 4; b >= 0; b--) {
      const on = (v >> b) & 1;
      if (even) {
        const mid = (lonLo + lonHi) / 2;
        if (on) lonLo = mid; else lonHi = mid;
      } else {
        const mid = (latLo + latHi) / 2;
        if (on) latLo = mid; else latHi = mid;
      }
      even = !even;
    }
  }
  return { lat: (latLo + latHi) / 2, lon: (lonLo + lonHi) / 2, dLat: latHi - latLo, dLon: lonHi - lonLo };
}

/** The cell containing the point plus its 8 neighbours (deduplicated). */
export function cellsAround(lat: number, lon: number, precision = CELL_PRECISION): string[] {
  const { dLat, dLon } = decodeGeohash(encodeGeohash(lat, lon, precision));
  const out = new Set<string>();
  for (const dy of [-1, 0, 1])
    for (const dx of [-1, 0, 1])
      out.add(encodeGeohash(lat + dy * dLat, lon + dx * dLon, precision));
  return [...out];
}
