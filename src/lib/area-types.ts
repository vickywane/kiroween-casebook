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

/** One Old Bailey charge (one defendant, one offence, one verdict). */
export interface AreaCase {
  id: string;
  trial_id: string;
  /** YYYY-MM-DD */
  date: string;
  year: number;
  offence_category: string;
  offence_group: string;
  offence_sub: string;
  verdict: string;
  verdict_category: string;
  punishment: string | null;
  /** Only for a guilty verdict, and only for cases over 100 years old. */
  defendant_name: string | null;
  victim_name: string | null;
  location_raw: string;
  location_label: string;
  street_key: string;
  lat: number;
  lon: number;
  geocode_confidence: "exact" | "street" | "area";
  geocode_source: "policeuk" | "nominatim";
  summary: string;
  /** Cut to about 400 characters. The full trial is at source_url. */
  testimony_excerpt: string;
  is_violent: boolean;
  source_url: string;
  licence: string;
}

export interface AreaResponse {
  cell: string;
  month: string;
  /** Every month in the current build, oldest first. */
  months: string[];
  /** Changes whenever a new build is loaded; used to drop stale client caches. */
  build: string;
  attribution: string;
  /** Credit line for the Old Bailey cases. */
  attribution_cases: string;
  streets: AreaStreet[];
  totals: AreaTotal[];
  /** Old Bailey cases in this square, most serious first, capped. */
  cases: AreaCase[];
  /** How many cases the square holds before the cap. */
  cases_total: number;
}

// ── Compare ──────────────────────────────────────────────────────────────────

export type GroupCounts = Partial<Record<string, number>>;

export interface CompareScope {
  /** decade (e.g. "1780") → trials by offence group */
  decades: Record<string, GroupCounts>;
  old_total: number;
  new_groups: GroupCounts;
  new_total: number;
}

/** Returned by /api/compare/{street}. */
export interface CompareResponse {
  key: string;
  name: string;
  lat: number;
  lon: number;
  /** Months of police.uk data counted as "now", oldest first. */
  months: string[];
  street: CompareScope;
  mile: CompareScope;
  attribution: string;
  attribution_cases: string;
}
