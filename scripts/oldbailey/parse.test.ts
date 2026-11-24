import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSession, plain } from "./parse";

const trial = (verdictCat: string, verdictText: string, extra = "") => `
<div1 type="trialAccount" id="t17800628-1">
  <interp inst="t17800628-1" type="date" value="17800628"/>
  <join result="criminalCharge" id="c1" targOrder="Y" targets="t17800628-1-defend1 t17800628-1-off1 t17800628-1-verdict1"/>
  <p>1. <persName id="t17800628-1-defend1" type="defendantName">JOHN <interp inst="t17800628-1-defend1" type="surname" value="SMITH"/><interp inst="t17800628-1-defend1" type="given" value="JOHN"/></persName>
  was indicted for <rs id="t17800628-1-off1" type="offenceDescription"><interp inst="t17800628-1-off1" type="offenceCategory" value="theft"/><interp inst="t17800628-1-off1" type="offenceSubcategory" value="highwayRobbery"/>
  robbing <rs id="o" type="occupation">Sir</rs> Jane Doe on the highway</rs>.</p>
  <p>I was in <placeName id="t17800628-1-crimeloc1">Fleet-street</placeName><interp inst="t17800628-1-crimeloc1" type="placeName" value="Fleet-street"/><interp inst="t17800628-1-crimeloc1" type="type" value="crimeLocation"/>
  <join result="offencePlace" targOrder="Y" targets="t17800628-1-off1 t17800628-1-crimeloc1"/> when he took my watch.</p>
  <p><rs id="t17800628-1-verdict1" type="verdictDescription"><interp inst="t17800628-1-verdict1" type="verdictCategory" value="${verdictCat}"/>${verdictText}</rs>.</p>
  ${extra}
</div1>`;

test("plain strips tags and entities", () => {
  assert.equal(plain("<p>Tom &amp;  Jerry <b>ran</b> .</p>"), "Tom & Jerry ran.");
});

test("a guilty verdict keeps the defendant name, with place and offence mapped", () => {
  const { charges } = parseSession(trial("guilty", "GUILTY"));
  assert.equal(charges.length, 1);
  const c = charges[0];
  assert.equal(c.verdict, "Guilty");
  assert.equal(c.defendant_name, "John Smith");
  assert.equal(c.offence_category, "Robbery");
  assert.equal(c.place_raw, "Fleet-street");
  assert.equal(c.date, "1780-06-28");
  assert.ok(c.offence_text.includes("robbing Sir Jane Doe on the highway"));
});

test("a not-guilty person never appears as a perpetrator", () => {
  const { charges } = parseSession(trial("notGuilty", "NOT GUILTY"));
  assert.equal(charges[0].verdict, "Not guilty");
  assert.equal(charges[0].defendant_name, null);
});

test("a charge without a verdict is skipped, never published", () => {
  const xml = trial("guilty", "GUILTY").replace("t17800628-1-verdict1\"/>", "t17800628-1-missing\"/>");
  const { charges, skipped } = parseSession(xml);
  assert.equal(charges.length, 0);
  assert.equal(skipped["charge without offence or verdict"], 1);
});

test("sexual offences are left out", () => {
  const xml = trial("guilty", "GUILTY").replace('value="theft"', 'value="sexual"');
  const { charges, skipped } = parseSession(xml);
  assert.equal(charges.length, 0);
  assert.equal(skipped["sensitive offence left out"], 1);
});
