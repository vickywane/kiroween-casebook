/**
 * police.uk ETL: download → transform → load.
 *
 *   yarn ingest:police                      # latest 12 months, City of London Police
 *   yarn ingest:police --months 3
 *   yarn ingest:police --month 2026-09
 *   yarn ingest:police --force metropolitan --neighbourhoods <id>,<id>   # ids from /api/metropolitan/neighbourhoods
 *   yarn ingest:police --offline            # rebuild from data/raw only, no network
 *   yarn ingest:police --refresh            # re-download even if raw files exist
 *
 * Stages (see docs/architecture.md):
 *   raw:       data/raw/policeuk/...  exact API responses + .meta.json sidecars
 *   published: data/sherlock.db       table recent_area_counts
 *   report:    data/reports/policeuk-<timestamp>.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { openDb } from "./lib/db";
import { getTransformVersion, sha256 } from "./lib/provenance";
import { policeApi, type ApiResponse } from "./policeuk/api";
import { aggregateMonth, boundaryToPoly, type AreaCountRow, type CrimeBatch, type PoliceCrime } from "./policeuk/transform";

const { values: args } = parseArgs({
  options: {
    months: { type: "string", default: "12" },
    month: { type: "string" },
    force: { type: "string", default: "city-of-london" },
    neighbourhoods: { type: "string" },
    offline: { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
    db: { type: "string", default: "data/sherlock.db" },
    raw: { type: "string", default: "data/raw/policeuk" },
  },
});

interface RawMeta {
  request: string;
  retrieved_at: string;
  sha256: string;
}

/** Returns the raw body for a request, downloading it unless a cached copy exists. */
async function rawFetch(path: string, fetcher: () => Promise<ApiResponse>): Promise<{ body: string; meta: RawMeta }> {
  const file = join(args.raw!, path);
  const metaFile = `${file}.meta.json`;
  const cached = existsSync(file) && existsSync(metaFile);

  if (cached && (!args.refresh || args.offline)) {
    return { body: readFileSync(file, "utf8"), meta: JSON.parse(readFileSync(metaFile, "utf8")) };
  }
  if (args.offline) throw new Error(`--offline: no raw file at ${file}`);

  const res = await fetcher();
  const meta: RawMeta = { request: res.request, retrieved_at: new Date().toISOString(), sha256: sha256(res.body) };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, res.body);
  writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return { body: res.body, meta };
}

async function main() {
  const startedAt = new Date().toISOString();
  const transformVersion = getTransformVersion();
  const force = args.force!;
  const log = (msg: string) => console.log(`[policeuk] ${msg}`);

  // 1. Which months are published?
  let months: string[];
  if (args.month) {
    months = [args.month];
  } else {
    const dates = await rawFetch("crimes-street-dates.json", () => policeApi.crimeDates());
    const available = (JSON.parse(dates.body) as { date: string }[]).map((d) => d.date).sort().reverse();
    months = available.slice(0, Number(args.months));
  }
  log(`force=${force} months=${months.join(", ")} transform=${transformVersion}`);

  // 2. Neighbourhood boundaries are the query areas.
  const nbhdList = JSON.parse(
    (await rawFetch(`neighbourhoods/${force}.json`, () => policeApi.neighbourhoods(force))).body,
  ) as { id: string; name: string }[];
  const wanted = args.neighbourhoods?.split(",").map((s) => s.trim());
  const neighbourhoods = wanted ? nbhdList.filter((n) => wanted.includes(n.id)) : nbhdList;
  if (wanted && neighbourhoods.length !== wanted.length) {
    const missing = wanted.filter((w) => !nbhdList.some((n) => n.id === w));
    throw new Error(`Unknown neighbourhoods for ${force}: ${missing.join(", ")}`);
  }

  const areas: { id: string; name: string; poly: string; boundary: [number, number][]; centroid: { lat: number; lon: number } }[] = [];
  for (const n of neighbourhoods) {
    const b = await rawFetch(`boundaries/${force}/${n.id}.json`, () => policeApi.boundary(force, n.id));
    areas.push({ id: n.id, name: n.name, ...boundaryToPoly(JSON.parse(b.body)) });
  }
  log(`${areas.length} neighbourhoods`);

  // 3–5. Per month: download crimes, aggregate, replace that month's rows.
  const db = openDb(args.db!);
  const insert = db.prepare(`
    INSERT INTO recent_area_counts (
      id, level, category, month, lat, lon, location_name, count, force, neighbourhood,
      source, source_url, source_query, licence, attribution_text, retrieved_at, upstream_version, transform_version
    ) VALUES (
      @id, @level, @category, @month, @lat, @lon, @location_name, @count, @force, @neighbourhood,
      @source, @source_url, @source_query, @licence, @attribution_text, @retrieved_at, @upstream_version, @transform_version
    )`);
  // Replacing a whole month means records removed upstream disappear here too.
  const clearMonth = db.prepare(
    `DELETE FROM recent_area_counts WHERE source = 'policeuk' AND month = ? AND (force = ? OR force = 'btp') AND neighbourhood IN (SELECT value FROM json_each(?))`,
  );
  const replaceMonth = db.transaction((month: string, rows: AreaCountRow[]) => {
    clearMonth.run(month, force, JSON.stringify(areas.map((a) => a.id)));
    for (const r of rows) {
      try {
        insert.run(r);
      } catch (err) {
        // Rows are owned by the neighbourhood containing their point, so this
        // only happens if a boundary changed since another neighbourhood was ingested.
        if ((err as { code?: string }).code !== "SQLITE_CONSTRAINT_PRIMARYKEY") throw err;
        throw new Error(`${r.id} already exists under another neighbourhood (boundaries changed?). Re-run without --neighbourhoods.`);
      }
    }
  });

  const report = {
    source: "policeuk",
    force,
    started_at: startedAt,
    transform_version: transformVersion,
    months: [] as Record<string, unknown>[],
  };

  for (const month of months) {
    const batches: CrimeBatch[] = [];
    for (const a of areas) {
      const res = await rawFetch(`crimes/${month}/${force}/${a.id}.json`, () => policeApi.crimesInPolygon(a.poly, month));
      batches.push({
        force,
        neighbourhood: a.id,
        neighbourhoodName: a.name,
        month,
        centroid: a.centroid,
        boundary: a.boundary,
        crimes: JSON.parse(res.body) as PoliceCrime[],
        retrievedAt: res.meta.retrieved_at,
        sha256: res.meta.sha256,
        request: res.meta.request,
      });
    }

    const { rows, rejects, crimesSeen, duplicates, outside, unowned } = aggregateMonth(batches, transformVersion);
    replaceMonth(month, rows);

    report.months.push({
      month, crimes_seen: crimesSeen, duplicates, outside_boundary: outside, unowned, rejects: rejects.length,
      rows: rows.length, reject_samples: rejects.slice(0, 20),
    });
    log(
      `${month}: ${crimesSeen} crimes (${outside} outside their query boundary, ${duplicates} duplicate, ${rejects.length} rejected)` +
        ` → ${rows.length} rows`,
    );
    if (unowned > 0 && !wanted) {
      log(`WARNING ${month}: ${unowned} crimes fall inside no ${force} neighbourhood boundary and were not counted`);
    }
  }

  const finishedAt = new Date().toISOString();
  db.prepare(`INSERT INTO ingest_runs (source, started_at, finished_at, transform_version, stats_json) VALUES (?, ?, ?, ?, ?)`)
    .run("policeuk", startedAt, finishedAt, transformVersion, JSON.stringify(report.months));
  db.close();

  const reportPath = join("data/reports", `policeuk-${finishedAt.replace(/[:.]/g, "-")}.json`);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify({ ...report, finished_at: finishedAt }, null, 2));
  log(`done → ${args.db} (report: ${reportPath})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
