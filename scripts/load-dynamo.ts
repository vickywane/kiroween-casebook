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

const attribution = [...new Set(rows.map((r) => r.attribution_text))];
const months = [...new Set(rows.map((r) => r.month))].sort();
items.push({
  PK: "META",
  SK: "BUILD",
  db_sha256: dbSha,
  transform_version: transformVersion,
  items: items.length,
  months: months.join(","),
  attribution: attribution.join(" | "),
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
  const res = await doc.send(
    new QueryCommand({ TableName: tableName, KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": sample.PK } }),
  );
  const expected = items.filter((i) => i.PK === sample.PK).length;
  if (res.Count !== expected) fail(`cell ${sample.PK}: read ${res.Count}, expected ${expected}`);
  console.log(`✓ verified ${sample.PK}: ${res.Count} items`);
}

async function main() {
  await ensureTable();
  await writeAll();
  await verify();
  console.log(`✓ loaded ${items.length} items into ${tableName}`);
  console.log(`  point the app at it: CASEBOOK_TABLE=${tableName}`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
