/**
 * Write every criminal case we hold to one JSON file for local review.
 *
 *   yarn export:cases            # → data/exports/cases.json
 *
 * Sections:
 *   policeuk   every raw police.uk crime in data/raw, de-duplicated by crime id
 *   historic   Old Bailey cases (mock data until that ETL exists)
 *   recent     recent concluded court cases (mock data)
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MOCK_HISTORICAL_CASES, MOCK_RECENT_CASES } from "../src/lib/mock-data";

const RAW = "data/raw/policeuk/crimes";
const OUT = "data/exports/cases.json";

interface RawCrime {
  id: number;
  category: string;
  month: string;
  location?: { latitude: string; longitude: string; street?: { id: number; name: string } } | null;
  outcome_status?: { category: string; date: string } | null;
  [k: string]: unknown;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".json") && !p.endsWith(".meta.json") ? [p] : [];
  });
}

const byId = new Map<number, Record<string, unknown>>();
let seen = 0;
for (const file of walk(RAW).sort()) {
  // data/raw/policeuk/crimes/<month>/<force>/<neighbourhood>.json
  const [, , , , month, force, nbhdFile] = file.split("/");
  const meta = JSON.parse(readFileSync(`${file}.meta.json`, "utf8")) as { request: string; retrieved_at: string };
  for (const c of JSON.parse(readFileSync(file, "utf8")) as RawCrime[]) {
    seen++;
    if (byId.has(c.id)) continue;
    byId.set(c.id, {
      id: c.id,
      month: c.month ?? month,
      category: c.category,
      street: c.location?.street?.name ?? null,
      lat: c.location ? Number(c.location.latitude) : null,
      lon: c.location ? Number(c.location.longitude) : null,
      outcome: c.outcome_status?.category ?? null,
      outcome_date: c.outcome_status?.date ?? null,
      force,
      neighbourhood: nbhdFile.replace(/\.json$/, ""),
      source: "data.police.uk",
      source_request: meta.request,
      retrieved_at: meta.retrieved_at,
      raw: c,
    });
  }
}

const policeuk = [...byId.values()].sort(
  (a, b) => String(a.month).localeCompare(String(b.month)) || Number(a.id) - Number(b.id),
);

const out = {
  generated_at: new Date().toISOString(),
  licence: {
    policeuk: "Open Government Licence v3.0. Source: data.police.uk",
    historic: "Mock data (Old Bailey ETL not built yet)",
    recent: "Mock data",
  },
  counts: {
    policeuk: policeuk.length,
    policeuk_raw_records_seen: seen,
    historic: MOCK_HISTORICAL_CASES.length,
    recent: MOCK_RECENT_CASES.length,
  },
  policeuk,
  historic: MOCK_HISTORICAL_CASES,
  recent: MOCK_RECENT_CASES,
};

mkdirSync("data/exports", { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`✓ ${OUT}: ${policeuk.length} police.uk crimes (${seen - policeuk.length} duplicates dropped), ${MOCK_HISTORICAL_CASES.length} historic, ${MOCK_RECENT_CASES.length} recent`);
