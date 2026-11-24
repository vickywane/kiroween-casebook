/**
 * Load the published SQLite build into a fresh DynamoDB table.
 *
 *   yarn load:dynamo --dry-run                 # build + validate items, no AWS calls
 *   yarn load:dynamo --create                  # create casebook-<version>, then load
 *   yarn load:dynamo --table casebook-abc123   # load into an existing table
 *
 * One table per build: load a new table, check it, then point the app at it
 * with CASEBOOK_TABLE. Users never read a half-loaded table, and rolling back
 * is switching the variable back.
 *
 * Key layout (single table):
 *   street count         PK CELL#<geohash6>            SK CRIME#<month>#<category>#<id>
 *   neighbourhood total  PK NBHD#<force>#<code>         SK <month>#<category>
 *   Old Bailey charge    PK CELL#<geohash6>            SK CASE#<year>#<charge id>
 *   Compare figures      PK STREET#<street key>        SK COMPARE#STREET | COMPARE#MILE
 *   build info           PK META                        SK BUILD
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import Database from "better-sqlite3";
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { encodeGeohash } from "../src/lib/geohash";
import { buildCompare, type PoliceRow } from "./build-compare";

const { values: args } = parseArgs({
  options: {
    db: { type: "string", default: "data/sherlock.db" },
    table: { type: "string" },
    region: { type: "string", default: process.env.AWS_REGION ?? "us-east-1" },
    create: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

interface Row {
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
  licence: string;
  attribution_text: string;
  transform_version: string;
}

type Item = Record<string, string | number>;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// ── Read + validate ───────────────────────────────────────────────────────────
const dbSha = createHash("sha256").update(readFileSync(args.db!)).digest("hex");
const db = new Database(args.db!, { readonly: true, fileMustExist: true });
const rows = db
  .prepare(
    `SELECT id, level, category, month, lat, lon, location_name, count, force,
            neighbourhood, source, source_url, licence, attribution_text, transform_version
     FROM recent_area_counts`,
  )
  .all() as Row[];

interface CaseDbRow {
  id: string;
  trial_id: string;
  year: number;
  date: string;
  offence_category: string;
  offence_group: string;
  offence_sub: string;
  verdict: string;
  verdict_category: string;
  punishment: string | null;
  defendant_name: string | null;
  victim_name: string | null;
  location_raw: string;
  location_label: string;
  street_key: string;
  lat: number;
  lon: number;
  geocode_confidence: string;
  geocode_source: string;
  summary: string;
  testimony_excerpt: string;
  is_violent: number;
  source_url: string;
  licence: string;
  attribution_text: string;
}
const hasCases = !!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'historical_cases'").get();
const caseRows = (hasCases ? db.prepare("SELECT * FROM historical_cases").all() : []) as CaseDbRow[];
const policeForCompare = db
  .prepare("SELECT category, lat, lon, location_name, count, month FROM recent_area_counts WHERE level = 'street'")
  .all() as PoliceRow[];
db.close();

const versions = new Set(rows.map((r) => r.transform_version));
if (versions.size !== 1) fail(`rows come from ${versions.size} transform versions; rebuild the db first`);
const transformVersion = [...versions][0];

function toItem(r: Row): Item {
  if (!Number.isInteger(r.count) || r.count < 1) fail(`${r.id}: invalid count ${r.count}`);
  if (!r.source_url || !r.licence) fail(`${r.id}: missing source or licence`);

  const base: Item = {
    level: r.level,
    category: r.category,
    month: r.month,
    lat: r.lat,
    lon: r.lon,
    force: r.force,
    source: r.source,
    source_url: r.source_url,
    licence: r.licence,
    count: r.count,
  };
  if (r.location_name) base.location_name = r.location_name;
  if (r.neighbourhood) base.neighbourhood = r.neighbourhood;

  if (r.level === "street") {
    return { PK: `CELL#${encodeGeohash(r.lat, r.lon)}`, SK: `CRIME#${r.month}#${r.category}#${r.id}`, ...base };
  }
  if (!r.neighbourhood) fail(`${r.id}: neighbourhood row has no neighbourhood code`);
  return { PK: `NBHD#${r.force}#${r.neighbourhood}`, SK: `${r.month}#${r.category}`, ...base };
}

const items = rows.map(toItem);
const keys = new Set(items.map((i) => `${i.PK}|${i.SK}`));
if (keys.size !== items.length) fail(`${items.length - keys.size} duplicate keys`);

// ── Old Bailey cases ──────────────────────────────────────────────────────────
// Same rules as .kiro/hooks/validate-case-record.md. A violation stops the load.
const NAMES_BEFORE_YEAR = new Date().getFullYear() - 100;
function toCaseItem(c: CaseDbRow): Item {
  if (!c.verdict) fail(`${c.id}: verdict is empty`);
  if (!c.source_url) fail(`${c.id}: source_url is empty`);
  if (c.year >= NAMES_BEFORE_YEAR && (c.defendant_name || c.victim_name)) fail(`${c.id}: a name on a case under 100 years old`);
  if (c.verdict_category !== "guilty" && c.defendant_name) fail(`${c.id}: a defendant name without a guilty verdict`);
  const item: Item = {
    PK: `CELL#${encodeGeohash(c.lat, c.lon)}`,
    SK: `CASE#${String(c.year).padStart(4, "0")}#${c.id}`,
    id: c.id,
    trial_id: c.trial_id,
    year: c.year,
    date: c.date,
    offence_category: c.offence_category,
    offence_group: c.offence_group,
    offence_sub: c.offence_sub,
    verdict: c.verdict,
    verdict_category: c.verdict_category,
    location_raw: c.location_raw,
    location_label: c.location_label,
    street_key: c.street_key,
    lat: c.lat,
    lon: c.lon,
    geocode_confidence: c.geocode_confidence,
    geocode_source: c.geocode_source,
    summary: c.summary,
    testimony_excerpt: c.testimony_excerpt,
    is_violent: c.is_violent,
    source_url: c.source_url,
    licence: c.licence,
  };
  if (c.punishment) item.punishment = c.punishment;
  if (c.defendant_name) item.defendant_name = c.defendant_name;
  if (c.victim_name) item.victim_name = c.victim_name;
  return item;
}
const caseItems = caseRows.map(toCaseItem);
items.push(...caseItems);
const caseAttribution = [...new Set(caseRows.map((c) => c.attribution_text))].join(" | ");

// ── Compare (one item per street and scope) ───────────────────────────────────
const compare = buildCompare(caseRows, policeForCompare);
for (const s of compare) {
  for (const scope of ["street", "mile"] as const) {
    items.push({
      PK: `STREET#${s.key}`,
      SK: `COMPARE#${scope.toUpperCase()}`,
      key: s.key,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      months: s.months.join(","),
      figures: JSON.stringify(s[scope]),
    });
  }
}
console.log(`✓ ${caseItems.length} Old Bailey cases, ${compare.length} streets with Compare figures`);

const attribution = [...new Set(rows.map((r) => r.attribution_text))];
const months = [...new Set(rows.map((r) => r.month))].sort();
items.push({
  PK: "META",
  SK: "BUILD",
  db_sha256: dbSha,
  transform_version: transformVersion,
  items: items.length,
  cases: caseItems.length,
  months: months.join(","),
  attribution: attribution.join(" | "),
  attribution_cases: caseAttribution,
  loaded_at: new Date().toISOString(),
});

const cells = new Set(items.filter((i) => String(i.PK).startsWith("CELL#")).map((i) => i.PK));
console.log(
  `✓ ${rows.length} rows → ${items.length} items (${cells.size} cells, months ${months[0]}..${months.at(-1)}), transform ${transformVersion}`,
);

if (args["dry-run"]) {
  console.log(JSON.stringify(items.slice(0, 2), null, 2));
  console.log("dry run: nothing written");
  process.exit(0);
}

// ── Write ─────────────────────────────────────────────────────────────────────
const tableName = args.table ?? `casebook-${transformVersion.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;
const raw = new DynamoDBClient({ region: args.region });
const doc = DynamoDBDocumentClient.from(raw);

async function ensureTable() {
  try {
    await raw.send(new DescribeTableCommand({ TableName: tableName }));
    if (args.create) fail(`table ${tableName} already exists; pick a new --table or drop --create`);
    return;
  } catch (e) {
    if (!(e instanceof ResourceNotFoundException)) throw e;
    if (!args.create) fail(`table ${tableName} not found; pass --create`);
  }
  await raw.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      Tags: [{ Key: "project", Value: "sherlock" }],
    }),
  );
  console.log(`… creating ${tableName}`);
  await waitUntilTableExists({ client: raw, maxWaitTime: 120 }, { TableName: tableName });
}

async function writeAll() {
  let done = 0;
  for (let i = 0; i < items.length; i += 25) {
    let batch = items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
    for (let attempt = 0; batch.length; attempt++) {
      if (attempt > 8) fail(`gave up on ${batch.length} unprocessed items`);
      if (attempt) await new Promise((r) => setTimeout(r, 2 ** attempt * 50));
      const res = await doc.send(new BatchWriteCommand({ RequestItems: { [tableName]: batch } }));
      batch = (res.UnprocessedItems?.[tableName] ?? []) as typeof batch;
    }
    done = Math.min(items.length, i + 25);
    if (done % 1000 < 25) console.log(`  ${done}/${items.length}`);
  }
}

async function verify() {
  // Spot-check one cell and the META item read back as written.
  const sample = items.find((i) => String(i.PK).startsWith("CELL#"))!;
  let count = 0;
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": sample.PK },
        Select: "COUNT",
        ExclusiveStartKey,
      }),
    );
    count += res.Count ?? 0;
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  const expected = items.filter((i) => i.PK === sample.PK).length;
  if (count !== expected) fail(`cell ${sample.PK}: read ${count}, expected ${expected}`);
  console.log(`✓ verified ${sample.PK}: ${count} items`);
}

async function main() {
  await ensureTable();
  await writeAll();
  await verify();
  console.log(`✓ loaded ${items.length} items into ${tableName}`);
  console.log(`  point the app at it: CASEBOOK_TABLE=${tableName}`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
