/**
 * Precompute the Compare screen: for each street, Old Bailey trials by decade
 * and by group, beside the last year of police.uk counts, within the street
 * and within one mile of it. Pure functions, no I/O.
 *
 * "Street" scope matches on the street name (Old Bailey "Fleet-street" and
 * police.uk "On or near Fleet Street" share the key "fleet street").
 * "Mile" scope counts everything within 1609 m of the street's centre.
 */
import { GROUPS, groupOfPolice, streetKey, type OffenceGroup } from "../src/lib/offence-groups";
import { metresBetween } from "../src/lib/geo";

export interface CaseRow {
  street_key: string;
  location_label: string;
  geocode_confidence: string;
  year: number;
  offence_group: string;
  lat: number;
  lon: number;
}

export interface PoliceRow {
  category: string;
  lat: number;
  lon: number;
  location_name: string | null;
  count: number;
  month: string;
}

export type GroupCounts = Partial<Record<OffenceGroup, number>>;

export interface ScopeFigures {
  /** decade (e.g. 1780) → trials by group */
  decades: Record<string, GroupCounts>;
  old_total: number;
  new_groups: GroupCounts;
  new_total: number;
}

export interface StreetCompare {
  key: string;
  name: string;
  lat: number;
  lon: number;
  months: string[];
  street: ScopeFigures;
  mile: ScopeFigures;
}

const MILE = 1609.344;
/** A street needs this many street-level trials before it gets a Compare page. */
export const MIN_STREET_TRIALS = 5;

function add(g: GroupCounts, k: OffenceGroup, n: number) {
  g[k] = (g[k] ?? 0) + n;
}

function emptyScope(): ScopeFigures {
  return { decades: {}, old_total: 0, new_groups: {}, new_total: 0 };
}

export function buildCompare(cases: CaseRow[], police: PoliceRow[]): StreetCompare[] {
  const months = [...new Set(police.map((p) => p.month))].sort();

  // Police streets by key, for the name and the centre.
  const policeByKey = new Map<string, PoliceRow[]>();
  for (const p of police) {
    if (!p.location_name) continue;
    const k = streetKey(p.location_name);
    (policeByKey.get(k) ?? policeByKey.set(k, []).get(k)!).push(p);
  }

  // Candidate streets: enough street-level trials, or any police street.
  const casesByKey = new Map<string, CaseRow[]>();
  for (const c of cases) {
    (casesByKey.get(c.street_key) ?? casesByKey.set(c.street_key, []).get(c.street_key)!).push(c);
  }
  const keys = new Set<string>(policeByKey.keys());
  for (const [k, list] of casesByKey) {
    if (list.filter((c) => c.geocode_confidence === "street").length >= MIN_STREET_TRIALS) keys.add(k);
  }

  const out: StreetCompare[] = [];
  for (const key of keys) {
    const own = casesByKey.get(key) ?? [];
    const pol = policeByKey.get(key) ?? [];
    const pts = pol.length ? pol : own;
    if (pts.length === 0) continue;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
    const name = own[0]?.location_label ?? pol[0]?.location_name?.replace(/^On or near\s+/i, "") ?? key;

    const street = emptyScope();
    const mile = emptyScope();

    for (const c of cases) {
      const g = c.offence_group as OffenceGroup;
      const decade = String(Math.floor(c.year / 10) * 10);
      if (c.street_key === key) {
        add((street.decades[decade] ??= {}), g, 1);
        street.old_total++;
      }
      if (metresBetween([lat, lon], [c.lat, c.lon]) <= MILE) {
        add((mile.decades[decade] ??= {}), g, 1);
        mile.old_total++;
      }
    }
    for (const p of police) {
      const g = groupOfPolice(p.category);
      if (p.location_name && streetKey(p.location_name) === key) {
        add(street.new_groups, g, p.count);
        street.new_total += p.count;
      }
      if (metresBetween([lat, lon], [p.lat, p.lon]) <= MILE) {
        add(mile.new_groups, g, p.count);
        mile.new_total += p.count;
      }
    }
    out.push({ key, name, lat, lon, months, street, mile });
  }
  return out;
}

export { GROUPS };
