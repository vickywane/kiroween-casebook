import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCompare, type CaseRow, type PoliceRow } from "./build-compare";

const oc = (year: number, group: string, key = "fleet street", lat = 51.514, lon = -0.108): CaseRow => ({
  street_key: key,
  location_label: "Fleet Street",
  geocode_confidence: "street",
  year,
  offence_group: group,
  lat,
  lon,
});
const pol = (category: string, count: number, name = "On or near Fleet Street", lat = 51.514, lon = -0.108): PoliceRow => ({
  category,
  count,
  location_name: name,
  lat,
  lon,
  month: "2026-09",
});

test("old trials and police counts meet on the same street key", () => {
  const cases = [...Array(5)].map((_, i) => oc(1780 + i, "Theft")).concat([oc(1785, "Robbery")]);
  const out = buildCompare(cases, [pol("shoplifting", 3), pol("robbery", 2)]);
  const s = out.find((x) => x.key === "fleet street")!;
  assert.equal(s.street.old_total, 6);
  assert.equal(s.street.decades["1780"]?.Theft, 5);
  assert.equal(s.street.new_total, 5);
  assert.equal(s.street.new_groups.Theft, 3);
  assert.equal(s.street.new_groups.Robbery, 2);
});

test("the mile view counts nearby trials and crimes on other streets", () => {
  const cases = [...Array(5)].map(() => oc(1790, "Theft")).concat([oc(1790, "Theft", "shoe lane", 51.5142, -0.1085)]);
  const s = buildCompare(cases, [pol("burglary", 4, "On or near Shoe Lane", 51.5142, -0.1085), pol("burglary", 1)]).find(
    (x) => x.key === "fleet street",
  )!;
  assert.equal(s.street.old_total, 5);
  assert.equal(s.mile.old_total, 6);
  assert.equal(s.street.new_total, 1);
  assert.equal(s.mile.new_total, 5);
});

test("a street with too few street-level trials and no police data gets no page", () => {
  const out = buildCompare([oc(1700, "Theft", "quiet lane"), oc(1701, "Theft", "quiet lane")], []);
  assert.equal(out.length, 0);
});
