/**
 * Calls the same server functions the API routes call, against a real table.
 *
 *   CASEBOOK_TABLE=casebook-v3 node --conditions react-server --import tsx scripts/smoke-api.ts
 */
import { getArea, getCompare } from "../src/lib/server/area";

async function main() {
  const area = await getArea("gcpvjc");
  console.log("area:", area.cell, area.month, `streets ${area.streets.length}`, `cases ${area.cases.length}/${area.cases_total}`);
  const json = JSON.stringify(area);
  console.log("response bytes:", json.length);
  const c = area.cases[0];
  console.log("first case:", { id: c.id, year: c.year, verdict: c.verdict, defendant: c.defendant_name, place: c.location_label, conf: c.geocode_confidence, url: c.source_url });

  const cmp = await getCompare("fleet street");
  if (!cmp) throw new Error("no compare for fleet street");
  console.log("compare:", cmp.name, "street old", cmp.street.old_total, "new", cmp.street.new_total, "| mile old", cmp.mile.old_total, "new", cmp.mile.new_total);
  console.log("months:", cmp.months[0], "→", cmp.months.at(-1));
  console.log("decades:", Object.entries(cmp.street.decades).map(([d, g]) => `${d}:${Object.values(g).reduce<number>((a, b) => a + (b ?? 0), 0)}`).join(" "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
