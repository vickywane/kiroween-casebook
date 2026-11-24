/**
 * Old Bailey ETL: XML dump → data/sherlock.db table historical_cases.
 *
 *   yarn ingest:oldbailey                    # parse, place on the map, write
 *   yarn ingest:oldbailey --max-queries 300  # fewer Nominatim lookups
 *   yarn ingest:oldbailey --offline          # use the cached lookups only, no network
 *
 * Input:  data/raw/oldbailey/sessionsPapers/*.xml  (OBO_XML_7-2.zip, figshare 4775434)
 * Cache:  scripts/oldbailey/geocode-cache.json     (Nominatim answers, committed)
 * Output: historical_cases rows, plus data/reports/oldbailey-<time>.json
 *
 * Licence: CC BY-NC 4.0. The app credits the source and is non-commercial.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { openDb } from "./lib/db";
import { getTransformVersion } from "./lib/provenance";
import { ATTRIBUTION, LICENCE, parseSession, type ParsedCharge } from "./oldbailey/parse";
import {
  buildGazetteer,
  candidates,
  geocodeLocal,
  geocodeRemote,
  loadCache,
  nominatimQuery,
  saveCache,
  type Place,
} from "./oldbailey/geocode";
import { groupOfHistoric } from "../src/lib/offence-groups";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string", default: "data/raw/oldbailey/sessionsPapers" },
    db: { type: "string", default: "data/sherlock.db" },
    cache: { type: "string", default: "scripts/oldbailey/geocode-cache.json" },
    "max-queries": { type: "string", default: "900" },
    offline: { type: "boolean", default: false },
  },
});

const started = new Date().toISOString();
const transformVersion = getTransformVersion();
const files = readdirSync(args.dir!).filter((f) => f.endsWith(".xml")).sort();
if (files.length === 0) {
  console.error(`✗ no XML in ${args.dir}. Download OBO_XML_7-2.zip (figshare 4775434) and unzip it into data/raw/oldbailey/`);
  process.exit(1);
}

// 1. Parse
const charges: (ParsedCharge & { file: string })[] = [];
const skipped: Record<string, number> = {};
for (const f of files) {
  const r = parseSession(readFileSync(join(args.dir!, f), "utf8"));
  for (const c of r.charges) charges.push({ ...c, file: f });
  for (const [k, v] of Object.entries(r.skipped)) skipped[k] = (skipped[k] ?? 0) + v;
}
console.log(`parsed ${charges.length} charges from ${files.length} sessions`);

// 2. Place names → coordinates
const db = openDb(args.db!);
const gaz = buildGazetteer(
  db
    .prepare("SELECT location_name, lat, lon FROM recent_area_counts WHERE level = 'street'")
    .all() as { location_name: string | null; lat: number; lon: number }[],
);
console.log(`police.uk gazetteer: ${gaz.size} streets`);

const freq = new Map<string, number>();
for (const c of charges) if (c.place_raw) freq.set(c.place_raw, (freq.get(c.place_raw) ?? 0) + 1);

const placed = new Map<string, Place>();
const needRemote: string[] = [];
for (const raw of freq.keys()) {
  const local = geocodeLocal(candidates(raw), gaz);
  if (local) placed.set(raw, local);
  else needRemote.push(raw);
}
console.log(`placed from police.uk streets: ${placed.size} of ${freq.size} names`);

const cache = loadCache(args.cache!);
needRemote.sort((a, b) => (freq.get(b)! - freq.get(a)!));
let queries = 0;
const maxQueries = Number(args["max-queries"]);
async function lookups() {
  for (const raw of needRemote) {
    const cands = candidates(raw);
    if (cands.length === 0) continue;
    const q = nominatimQuery(cands);
    if (!(q in cache)) {
      if (args.offline || queries >= maxQueries) continue;
      queries++;
      if (queries % 50 === 0) {
        saveCache(args.cache!, cache);
        console.log(`  …${queries} lookups`);
      }
    }
    const p = await geocodeRemote(cands, cache);
    if (p) placed.set(raw, p);
  }
  saveCache(args.cache!, cache);
}

async function main() {
await lookups();
console.log(`placed in total: ${placed.size} names (${queries} new Nominatim lookups)`);

// 3. Write
const SOURCE = "https://www.oldbaileyonline.org/record/";
const retrievedAt = statSync(join(args.dir!, files[0])).mtime.toISOString();
const label = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

const insert = db.prepare(`INSERT INTO historical_cases (
  id, trial_id, year, date, offence_category, offence_group, offence_sub, verdict, verdict_category,
  punishment, defendant_name, victim_name, location_raw, location_label, street_key, lat, lon,
  geocode_confidence, geocode_source, summary, testimony_excerpt, is_violent, source_url, licence,
  attribution_text, retrieved_at, upstream_version, transform_version
) VALUES (
  @id, @trial_id, @year, @date, @offence_category, @offence_group, @offence_sub, @verdict, @verdict_category,
  @punishment, @defendant_name, @victim_name, @location_raw, @location_label, @street_key, @lat, @lon,
  @geocode_confidence, @geocode_source, @summary, @testimony_excerpt, @is_violent, @source_url, @licence,
  @attribution_text, @retrieved_at, @upstream_version, @transform_version
)`);

const byCategory: Record<string, number> = {};
let written = 0;
let rejected = 0;
db.transaction(() => {
  db.exec("DELETE FROM historical_cases");
  for (const c of charges) {
    const p = c.place_raw ? placed.get(c.place_raw) : undefined;
    if (!p || !c.place_raw) continue;
    const text = c.offence_text.replace(/^that\s+/i, "");
    try {
      insert.run({
        id: c.id,
        trial_id: c.trial_id,
        year: c.year,
        date: c.date,
        offence_category: c.offence_category,
        offence_group: groupOfHistoric(c.offence_category),
        offence_sub: label(c.offence_sub),
        verdict: c.verdict,
        verdict_category: c.verdict_category,
        punishment: c.punishment,
        defendant_name: c.defendant_name,
        victim_name: c.victim_name,
        location_raw: c.place_raw,
        location_label: p.label,
        street_key: p.key,
        lat: p.lat,
        lon: p.lon,
        geocode_confidence: p.confidence,
        geocode_source: p.source,
        summary: `Indicted for ${text.charAt(0).toLowerCase()}${text.slice(1)}`.slice(0, 400),
        testimony_excerpt: c.excerpt,
        is_violent: c.is_violent ? 1 : 0,
        source_url: `${SOURCE}${c.trial_id}`,
        licence: LICENCE,
        attribution_text: ATTRIBUTION,
        retrieved_at: retrievedAt,
        upstream_version: `OBO_XML_7-2:${c.file}`,
        transform_version: transformVersion,
      });
      written++;
      byCategory[c.offence_category] = (byCategory[c.offence_category] ?? 0) + 1;
    } catch (e) {
      rejected++;
      skipped["row rejected by database rule"] = (skipped["row rejected by database rule"] ?? 0) + 1;
      if (rejected <= 3) console.error("  rejected:", c.id, (e as Error).message);
    }
  }
})();

const unplaced = charges.filter((c) => !c.place_raw).length;
const report = {
  started,
  finished: new Date().toISOString(),
  transform_version: transformVersion,
  sessions: files.length,
  charges_parsed: charges.length,
  charges_without_place_in_text: unplaced,
  charges_placed_and_written: written,
  place_names: freq.size,
  place_names_placed: placed.size,
  by_confidence: db.prepare("SELECT geocode_confidence AS k, COUNT(*) AS n FROM historical_cases GROUP BY 1").all(),
  by_source: db.prepare("SELECT geocode_source AS k, COUNT(*) AS n FROM historical_cases GROUP BY 1").all(),
  by_category: byCategory,
  skipped,
};
db.prepare("INSERT INTO ingest_runs (source, started_at, finished_at, transform_version, stats_json) VALUES (?, ?, ?, ?, ?)").run(
  "oldbailey",
  started,
  report.finished,
  transformVersion,
  JSON.stringify(report),
);
db.close();
mkdirSync("data/reports", { recursive: true });
const out = `data/reports/oldbailey-${started.replace(/[:.]/g, "-")}.json`;
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`✓ wrote ${written} cases (report: ${out})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
