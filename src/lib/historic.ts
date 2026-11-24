import type { AreaCase, AreaResponse } from "./area-types";
import type { HistoricalCase } from "./mock-data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "1780-06-28" → "28 June 1780" */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function basis(c: AreaCase): string {
  if (c.geocode_source === "policeuk") {
    return `“${c.location_raw}” is named in the transcript and matched to the street of the same name in today’s City of London police records.`;
  }
  const how =
    c.geocode_confidence === "exact"
      ? "a named place"
      : c.geocode_confidence === "street"
        ? "a street"
        : "an area";
  return `“${c.location_raw}” is named in the transcript and matched to ${how} on OpenStreetMap (${c.location_label}). Streets can be renamed or moved since then.`;
}

function outcome(c: AreaCase): string {
  return c.punishment ? `${c.verdict}. ${cap(c.punishment)}.` : `${c.verdict}.`;
}

/** Map one API case onto the shape the case panels already use. */
export function toHistoricalCase(c: AreaCase, samePlace = 0): HistoricalCase {
  const date = dateLabel(c.date);
  const sub = cap(c.offence_sub);
  const timeline = [
    { date, title: "Tried at the Old Bailey" },
    { date, title: `Verdict: ${c.verdict.toLowerCase()}` },
    ...(c.punishment ? [{ date, title: "Sentence", detail: cap(c.punishment) }] : []),
  ];
  return {
    id: c.id,
    year: c.year,
    offence_category: c.offence_category,
    verdict: c.verdict,
    defendant_name: c.defendant_name,
    victim_name: c.victim_name,
    location_raw: c.location_raw,
    lat: c.lat,
    lon: c.lon,
    geocode_confidence: c.geocode_confidence,
    summary: samePlace > 0 ? `${c.summary} (${samePlace} other ${samePlace === 1 ? "trial was" : "trials were"} placed at this spot.)` : c.summary,
    source_url: c.source_url,
    testimony_excerpt: c.testimony_excerpt,
    is_violent: c.is_violent,
    ref: c.trial_id.toUpperCase(),
    title: `${sub} · ${c.location_label}`,
    date_label: date,
    outcome: outcome(c),
    match_basis: basis(c),
    timeline,
    street_key: c.street_key,
    location_label: c.location_label,
    testimonies: c.testimony_excerpt ? [{ speaker: "From the trial record", text: c.testimony_excerpt }] : [],
  };
}

/** Every case in the loaded squares, once each. */
export function allCases(areas: AreaResponse[]): AreaCase[] {
  const seen = new Set<string>();
  const out: AreaCase[] = [];
  for (const a of areas) {
    for (const c of a.cases ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/**
 * One marker per place. Trials at the same point would sit on top of each
 * other, so the map shows the most serious one and says how many more share
 * the spot. All of them stay in the Nearby list.
 */
export function markerCases(cases: AreaCase[]): HistoricalCase[] {
  const byPlace = new Map<string, AreaCase[]>();
  for (const c of cases) {
    const k = `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
    (byPlace.get(k) ?? byPlace.set(k, []).get(k)!).push(c);
  }
  return [...byPlace.values()].map((list) => {
    const best = [...list].sort((a, b) => Number(b.is_violent) - Number(a.is_violent) || a.year - b.year)[0];
    return toHistoricalCase(best, list.length - 1);
  });
}
