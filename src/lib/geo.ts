/** Great-circle distance in metres between two [lat, lon] points. */
export function metresBetween(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.asin(Math.sqrt(a));
}

export function formatMetres(m: number, units: "mi" | "km" = "km"): string {
  if (units === "mi") {
    const miles = m / 1609.344;
    return miles < 0.1 ? `${Math.round(m * 1.0936)} yd` : `${miles.toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Reference point (Fleet Street) used until a location fix arrives. */
export const FLEET_STREET: [number, number] = [51.5141, -0.1089];

/** Rough London bounding box used for the "outside London" notice. */
export function isInLondon([lat, lon]: [number, number]): boolean {
  return lat > 51.28 && lat < 51.7 && lon > -0.52 && lon < 0.33;
}
