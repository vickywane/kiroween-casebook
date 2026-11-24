import "server-only";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AreaCase, AreaResponse, AreaStreet, AreaTotal, CompareResponse } from "@/lib/area-types";

/**
 * Server-side DynamoDB access. Credentials come from CASEBOOK_AWS_* on
 * Netlify (Netlify reserves the AWS_* names), or the local AWS profile in
 * development. Never import this from a Client Component.
 */
const TABLE = process.env.CASEBOOK_TABLE ?? "casebook-v3";
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
  attribution_cases: string;
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
    attribution_cases: String(res.Item.attribution_cases ?? ""),
    build: String(res.Item.db_sha256).slice(0, 12),
  };
  buildCache = { value, at: Date.now() };
  return value;
}

/** Current data build id. Clients compare it with their cached squares. */
export async function getBuildId(): Promise<string> {
  return (await getBuild()).build;
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

/** Most cases one map square sends. Busy squares hold over a thousand. */
const CASE_CAP = 120;
const CONFIDENCE_RANK: Record<string, number> = { exact: 0, street: 1, area: 2 };

function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "));
  return end > max * 0.4 ? slice.slice(0, end + 1) : `${slice.replace(/\s+\S*$/, "")}…`;
}

function toCase(i: Record<string, unknown>): AreaCase {
  return {
    id: String(i.id),
    trial_id: String(i.trial_id),
    year: Number(i.year),
    date: String(i.date),
    offence_category: String(i.offence_category),
    offence_group: String(i.offence_group),
    offence_sub: String(i.offence_sub),
    verdict: String(i.verdict),
    verdict_category: String(i.verdict_category),
    punishment: i.punishment ? String(i.punishment) : null,
    defendant_name: i.defendant_name ? String(i.defendant_name) : null,
    victim_name: i.victim_name ? String(i.victim_name) : null,
    location_raw: String(i.location_raw),
    location_label: String(i.location_label),
    street_key: String(i.street_key),
    lat: Number(i.lat),
    lon: Number(i.lon),
    geocode_confidence: String(i.geocode_confidence) as AreaCase["geocode_confidence"],
    geocode_source: String(i.geocode_source) as AreaCase["geocode_source"],
    summary: cut(String(i.summary), 280),
    testimony_excerpt: cut(String(i.testimony_excerpt ?? ""), 400),
    is_violent: Number(i.is_violent) === 1,
    source_url: String(i.source_url),
    licence: String(i.licence),
  };
}

/** Old Bailey cases in one square. Most serious and best-placed first. */
async function getCases(cell: string): Promise<{ cases: AreaCase[]; total: number }> {
  const raw = await queryAll({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `CELL#${cell}`, ":sk": "CASE#" },
  });
  const all = raw.map(toCase).sort(
    (a, b) =>
      Number(b.is_violent) - Number(a.is_violent) ||
      CONFIDENCE_RANK[a.geocode_confidence] - CONFIDENCE_RANK[b.geocode_confidence] ||
      a.id.localeCompare(b.id),
  );
  return { cases: all.slice(0, CASE_CAP), total: all.length };
}

/** Compare figures for one street: trials by decade beside police.uk counts. */
export async function getCompare(key: string): Promise<CompareResponse | null> {
  const build = await getBuild();
  const res = await Promise.all(
    (["STREET", "MILE"] as const).map((scope) =>
      doc.send(new GetCommand({ TableName: TABLE, Key: { PK: `STREET#${key}`, SK: `COMPARE#${scope}` } })),
    ),
  );
  const [street, mile] = res.map((r) => r.Item);
  if (!street || !mile) return null;
  return {
    key,
    name: String(street.name),
    lat: Number(street.lat),
    lon: Number(street.lon),
    months: String(street.months).split(",").filter(Boolean),
    street: JSON.parse(String(street.figures)),
    mile: JSON.parse(String(mile.figures)),
    attribution: build.attribution,
    attribution_cases: build.attribution_cases,
  };
}

/** Street counts in one map square for one month, plus its neighbourhood totals. */
export async function getArea(cell: string, month?: string): Promise<AreaResponse> {
  const build = await getBuild();
  const m = month && build.months.includes(month) ? month : build.latestMonth;

  const [raw, caseList] = await Promise.all([
    queryAll({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `CELL#${cell}`, ":sk": `CRIME#${m}#` },
    }),
    getCases(cell),
  ]);

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

  return {
    cell,
    month: m,
    months: build.months,
    build: build.build,
    attribution: build.attribution,
    attribution_cases: build.attribution_cases,
    streets,
    totals,
    cases: caseList.cases,
    cases_total: caseList.total,
  };
}
