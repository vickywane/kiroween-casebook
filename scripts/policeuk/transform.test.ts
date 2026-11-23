import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateMonth, boundaryToPoly, suppressCount, type CrimeBatch, type PoliceCrime } from "./transform";

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

function batch(neighbourhood: string, crimes: PoliceCrime[]): CrimeBatch {
  return {
    force: "city-of-london",
    neighbourhood,
    neighbourhoodName: neighbourhood.toUpperCase(),
    month: "2026-09",
    centroid: { lat: 51.514, lon: -0.1 },
    crimes,
    retrievedAt: "2026-11-23T00:00:00.000Z",
    sha256: "abc",
    request: "POST https://data.police.uk/api/crimes-street/all-crime date=2026-09",
  };
}

describe("suppressCount", () => {
  it("hides counts of 1 and 2", () => {
    assert.equal(suppressCount(1), null);
    assert.equal(suppressCount(2), null);
  });
  it("keeps counts of 3 and above", () => {
    assert.equal(suppressCount(3), 3);
    assert.equal(suppressCount(147), 147);
  });
  it("rejects zero, negatives and fractions", () => {
    assert.throws(() => suppressCount(0));
    assert.throws(() => suppressCount(-1));
    assert.throws(() => suppressCount(2.5));
  });
});

describe("aggregateMonth", () => {
  it("counts per street and per neighbourhood, suppressing small counts", () => {
    const { rows } = aggregateMonth(
      [batch("fle", [crime("burglary", 1), crime("burglary", 1), crime("burglary", 1), crime("robbery", 2)])],
      "test",
    );
    const street1 = rows.find((r) => r.level === "street" && r.category === "burglary");
    const street2 = rows.find((r) => r.level === "street" && r.category === "robbery");
    const nbhdBurglary = rows.find((r) => r.level === "neighbourhood" && r.category === "burglary");
    const nbhdRobbery = rows.find((r) => r.level === "neighbourhood" && r.category === "robbery");
    assert.equal(street1?.count, 3);
    assert.equal(street2?.count, null, "a single robbery on a street must be suppressed");
    assert.equal(nbhdBurglary?.count, 3);
    assert.equal(nbhdRobbery?.count, null, "suppression also applies at neighbourhood level");
  });

  it("never emits a count below 3", () => {
    const crimes = Array.from({ length: 50 }, (_, i) => crime(i % 2 ? "shoplifting" : "other-theft", i % 7));
    const { rows } = aggregateMonth([batch("fle", crimes)], "test");
    for (const r of rows) assert.ok(r.count === null || r.count >= 3, `${r.id} has count ${r.count}`);
  });

  it("de-duplicates crimes returned by two neighbourhood polygons", () => {
    const shared = [crime("burglary", 9), crime("burglary", 9), crime("burglary", 9)];
    const { rows, duplicates } = aggregateMonth([batch("fle", shared), batch("ban", shared)], "test");
    assert.equal(duplicates, 3);
    const street = rows.filter((r) => r.level === "street");
    assert.equal(street.length, 1);
    assert.equal(street[0].count, 3, "border crimes must not be double counted");
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
