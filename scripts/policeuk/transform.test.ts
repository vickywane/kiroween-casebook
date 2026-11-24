import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateMonth, boundaryToPoly, pointInPolygon,
  type AreaCountRow, type CrimeBatch, type PoliceCrime,
} from "./transform";

let nextId = 1;
function crime(category: string, streetId: number, overrides: Partial<PoliceCrime> = {}): PoliceCrime {
  return {
    id: nextId++,
    persistent_id: "",
    category,
    month: "2026-09",
    location_type: "Force",
    location: { latitude: "51.5150", longitude: "-0.1050", street: { id: streetId, name: `On or near Street ${streetId}` } },
    outcome_status: null,
    ...overrides,
  };
}

/** A box around the default crime point (51.515, -0.105). */
const BOX: [number, number][] = [[51.51, -0.11], [51.51, -0.10], [51.52, -0.10], [51.52, -0.11]];
/** A box that doesn't contain the default crime point. */
const FAR_BOX: [number, number][] = [[51.50, -0.09], [51.50, -0.08], [51.51, -0.08], [51.51, -0.09]];

function at(lat: number, lon: number, streetId: number): Partial<PoliceCrime> {
  return { location: { latitude: String(lat), longitude: String(lon), street: { id: streetId, name: `On or near Street ${streetId}` } } };
}

function batch(neighbourhood: string, crimes: PoliceCrime[], boundary: [number, number][] = BOX): CrimeBatch {
  return {
    force: "city-of-london",
    neighbourhood,
    neighbourhoodName: neighbourhood.toUpperCase(),
    month: "2026-09",
    centroid: { lat: 51.514, lon: -0.1 },
    boundary,
    crimes,
    retrievedAt: "2026-11-23T00:00:00.000Z",
    sha256: "abc",
    request: "POST https://data.police.uk/api/crimes-street/all-crime date=2026-09",
  };
}

describe("aggregateMonth", () => {
  it("counts per street and per neighbourhood, including counts of 1 and 2", () => {
    const { rows } = aggregateMonth(
      [batch("fle", [crime("burglary", 1), crime("burglary", 1), crime("burglary", 1), crime("robbery", 2)])],
      "test",
    );
    const street1 = rows.find((r) => r.level === "street" && r.category === "burglary");
    const street2 = rows.find((r) => r.level === "street" && r.category === "robbery");
    const nbhdBurglary = rows.find((r) => r.level === "neighbourhood" && r.category === "burglary");
    const nbhdRobbery = rows.find((r) => r.level === "neighbourhood" && r.category === "robbery");
    assert.equal(street1?.count, 3);
    assert.equal(street2?.count, 1, "a single robbery on a street is shown as 1");
    assert.equal(nbhdBurglary?.count, 3);
    assert.equal(nbhdRobbery?.count, 1);
  });

  it("street rows add up to the neighbourhood total", () => {
    const crimes = Array.from({ length: 50 }, (_, i) => crime(i % 2 ? "shoplifting" : "other-theft", i % 7));
    const { rows } = aggregateMonth([batch("fle", crimes)], "test");
    for (const cat of ["shoplifting", "other-theft"]) {
      const streets = rows.filter((r) => r.level === "street" && r.category === cat).reduce((a, r) => a + r.count, 0);
      assert.equal(rows.find((r) => r.level === "neighbourhood" && r.category === cat)?.count, streets);
    }
  });

  it("de-duplicates crimes returned by two overlapping neighbourhood polygons", () => {
    const shared = [crime("burglary", 9), crime("burglary", 9), crime("burglary", 9)];
    const { rows, duplicates } = aggregateMonth([batch("fle", shared), batch("ban", shared)], "test");
    assert.equal(duplicates, 3);
    const street = rows.filter((r) => r.level === "street");
    assert.equal(street.length, 1);
    assert.equal(street[0].count, 3, "border crimes must not be double counted");
    assert.equal(street[0].neighbourhood, "ban", "overlaps go to the lowest neighbourhood id, whatever the batch order");
  });

  it("counts a border crime only in the neighbourhood whose boundary contains it", () => {
    const border = [1, 2, 3].map(() => crime("burglary", 9));
    // "aaa" is processed first but its boundary doesn't contain the point.
    const { rows, outside, unowned } = aggregateMonth([batch("aaa", border, FAR_BOX), batch("zzz", border)], "test");
    assert.equal(outside, 3);
    assert.equal(unowned, 0);
    assert.ok(rows.every((r) => r.neighbourhood === "zzz"));
    assert.equal(rows.find((r) => r.level === "street")?.count, 3);
  });

  it("gives the same rows for a neighbourhood whether it is ingested alone or with its neighbours", () => {
    const border = [1, 2, 3].map(() => crime("burglary", 9));
    const inner = [1, 2, 3].map(() => crime("robbery", 10, at(51.505, -0.085, 10)));
    const full = aggregateMonth([batch("aaa", [...border, ...inner], FAR_BOX), batch("zzz", border)], "test");
    const zzzOnly = aggregateMonth([batch("zzz", border)], "test");
    const aaaOnly = aggregateMonth([batch("aaa", [...border, ...inner], FAR_BOX)], "test");
    const ids = (rows: AreaCountRow[], n: string) => rows.filter((r) => r.neighbourhood === n).map((r) => `${r.id}=${r.count}`).sort();
    assert.deepEqual(ids(zzzOnly.rows, "zzz"), ids(full.rows, "zzz"));
    assert.deepEqual(ids(aaaOnly.rows, "aaa"), ids(full.rows, "aaa"));
    assert.equal(aaaOnly.unowned, 3, "a subset run reports crimes it leaves to neighbours");
  });

  it("attributes BTP crimes to British Transport Police", () => {
    const btp = [1, 2, 3].map(() => crime("violent-crime", 4, { location_type: "BTP" }));
    const { rows } = aggregateMonth([batch("liv", btp)], "test");
    assert.ok(rows.every((r) => r.force === "btp"));
  });

  it("rejects crimes with no location or the wrong month, with a reason", () => {
    const { rows, rejects } = aggregateMonth(
      [batch("fle", [crime("burglary", 1, { location: null }), crime("burglary", 1, { month: "2026-08" })])],
      "test",
    );
    assert.equal(rows.length, 0);
    assert.deepEqual(rejects.map((r) => r.reason).sort(), ["missing or invalid location", "month 2026-08 does not match request 2026-09"]);
  });

  it("puts provenance on every row", () => {
    const { rows } = aggregateMonth([batch("fle", [crime("burglary", 1)])], "abc1234");
    for (const r of rows) {
      assert.equal(r.source, "policeuk");
      assert.ok(r.source_url.startsWith("https://data.police.uk/"));
      assert.match(r.licence, /Open Government Licence v3\.0/);
      assert.match(r.attribution_text, /Open Government Licence v3\.0/);
      assert.equal(r.upstream_version, "sha256:abc");
      assert.equal(r.transform_version, "abc1234");
      assert.ok(r.retrieved_at);
    }
  });
});

describe("pointInPolygon", () => {
  it("tells inside from outside", () => {
    assert.equal(pointInPolygon(51.515, -0.105, BOX), true);
    assert.equal(pointInPolygon(51.515, -0.105, FAR_BOX), false);
  });
});

describe("boundaryToPoly", () => {
  it("formats lat,lng pairs and computes a centroid", () => {
    const { poly, centroid } = boundaryToPoly([
      { latitude: "0", longitude: "0" },
      { latitude: "0", longitude: "2" },
      { latitude: "2", longitude: "2" },
      { latitude: "2", longitude: "0" },
    ]);
    assert.equal(poly, "0,0:0,2:2,2:2,0");
    assert.deepEqual(centroid, { lat: 1, lon: 1 });
  });
});
