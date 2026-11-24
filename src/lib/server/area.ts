import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AreaResponse, AreaStreet, AreaTotal } from "@/lib/area-types";

/**
 * Server-side DynamoDB access. Credentials come from CASEBOOK_AWS_* on
 * Netlify (Netlify reserves the AWS_* names), or the local AWS profile in
 * development. Never import this from a Client Component.
 */
const TABLE = process.env.CASEBOOK_TABLE ?? "casebook-v2";
const REGION = process.env.CASEBOOK_AWS_REGION ?? "us-east-1";

const credentials =
  process.env.CASEBOOK_AWS_KEY_ID && process.env.CASEBOOK_AWS_SECRET
    ? {
        accessKeyId: process.env.CASEBOOK_AWS_KEY_ID,
        secretAccessKey: process.env.CASEBOOK_AWS_SECRET,
      }
    : undefined;

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION, credentials }));

interface Build {
  latestMonth: string;
  months: string[];
  attribution: string;
  build: string;
}

let buildCache: { value: Build; at: number } | null = null;

/** META item, cached per function instance for 10 minutes. */
async function getBuild(): Promise<Build> {
  if (buildCache && Date.now() - buildCache.at < 10 * 60_000) return buildCache.value;
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: "META", SK: "BUILD" } }));
  if (!res.Item) throw new Error(`no META item in ${TABLE}`);
  const months = String(res.Item.months).split(",").sort();
  const value: Build = {
    latestMonth: months[months.length - 1],
    months,
    attribution: String(res.Item.attribution),
    build: String(res.Item.db_sha256).slice(0, 12),
  };
  buildCache = { value, at: Date.now() };
  return value;
}

async function queryAll(input: ConstructorParameters<typeof QueryCommand>[0]) {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await doc.send(new QueryCommand({ ...input, ExclusiveStartKey }));
    items.push(...((res.Items ?? []) as Record<string, unknown>[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Street counts in one map square for one month, plus its neighbourhood totals. */
export async function getArea(cell: string, month?: string): Promise<AreaResponse> {
  const build = await getBuild();
  const m = month && build.months.includes(month) ? month : build.latestMonth;

  const raw = await queryAll({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `CELL#${cell}`, ":sk": `CRIME#${m}#` },
  });

  const streets: AreaStreet[] = raw.map((i) => ({
    category: String(i.category),
    lat: Number(i.lat),
    lon: Number(i.lon),
    name: String(i.location_name ?? ""),
    count: Number(i.count ?? 0),
    neighbourhood: i.neighbourhood ? String(i.neighbourhood) : null,
    force: String(i.force),
  }));

  // Neighbourhood totals for every neighbourhood touching this square.
  const nbhds = [...new Set(streets.filter((s) => s.neighbourhood).map((s) => `${s.force}#${s.neighbourhood}`))];
  const totals: AreaTotal[] = (
    await Promise.all(
      nbhds.map((n) =>
        queryAll({
          TableName: TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: { ":pk": `NBHD#${n}`, ":sk": `${m}#` },
        }),
      ),
    )
  )
    .flat()
    .map((i) => ({
      neighbourhood: String(i.neighbourhood),
      name: String(i.location_name ?? i.neighbourhood),
      category: String(i.category),
      count: Number(i.count ?? 0),
    }));

  return { cell, month: m, months: build.months, build: build.build, attribution: build.attribution, streets, totals };
}
