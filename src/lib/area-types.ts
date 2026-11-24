/** Shapes returned by /api/area/{cell}. Shared by server and client. */

export interface AreaStreet {
  category: string;
  lat: number;
  lon: number;
  /** police.uk anonymised location, e.g. "On or near Fleet Street". */
  name: string;
  /** Crimes recorded on this street point. */
  count: number;
  neighbourhood: string | null;
  force: string;
}

export interface AreaTotal {
  neighbourhood: string;
  name: string;
  category: string;
  count: number;
}

export interface AreaResponse {
  cell: string;
  month: string;
  /** Every month in the current build, oldest first. */
  months: string[];
  /** Changes whenever a new build is loaded; used to drop stale client caches. */
  build: string;
  attribution: string;
  streets: AreaStreet[];
  totals: AreaTotal[];
}
