/**
 * Pure parser for Old Bailey Online TEI-XML (one session file in, one record
 * per criminal charge out). No I/O, so it can be unit tested.
 *
 * A "charge" is one defendant + one offence + one verdict, taken from the
 * `criminalCharge` joins in the XML. One record per charge keeps the verdict
 * rule honest: a trial where one defendant was acquitted and another convicted
 * yields two records with two different verdicts.
 */

export const LICENCE = "CC BY-NC 4.0";
export const ATTRIBUTION =
  "Old Bailey Proceedings Online (oldbaileyonline.org), Digital Humanities Institute, University of Sheffield. Licensed CC BY-NC 4.0, non-commercial use only.";

export interface ParsedCharge {
  /** Charge id, unique across all sessions, e.g. t17800628-1-off1-c58. */
  id: string;
  trial_id: string;
  /** YYYY-MM-DD */
  date: string;
  year: number;
  /** Display category that matches the map icons: Theft, Robbery, Murder… */
  offence_category: string;
  offence_sub: string;
  verdict: string;
  verdict_category: string;
  /** Plain text sentence, or null when none is recorded. */
  punishment: string | null;
  defendant_name: string | null;
  victim_name: string | null;
  /** The crime location as written in the transcript, or null. */
  place_raw: string | null;
  /** The offence as the indictment words it, plain text. */
  offence_text: string;
  /** Start of the trial testimony, plain text. */
  excerpt: string;
  is_violent: boolean;
}

export interface ParseResult {
  charges: ParsedCharge[];
  /** Why records were left out, with counts. */
  skipped: Record<string, number>;
}

// ── Small XML helpers (the TEI here is regular but mixed-content) ─────────────

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function plain(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

interface Rs {
  id: string;
  type: string;
  inner: string;
}

/** All <rs> elements, with nesting handled (an offence can contain occupation <rs>). */
function extractRs(xml: string): Rs[] {
  const out: Rs[] = [];
  const stack: { id: string; type: string; start: number }[] = [];
  for (const m of xml.matchAll(/<rs\b[^>]*>|<\/rs>/g)) {
    if (m[0] === "</rs>") {
      const open = stack.pop();
      if (open) out.push({ id: open.id, type: open.type, inner: xml.slice(open.start, m.index) });
    } else {
      const a = attrs(m[0]);
      stack.push({ id: a.id ?? "", type: a.type ?? "", start: (m.index ?? 0) + m[0].length });
    }
  }
  return out;
}

// ── Category mapping ──────────────────────────────────────────────────────────

const VIOLENT = new Set(["Murder", "Homicide", "Assault", "Robbery"]);

/** Offences left out on purpose: see the content decisions in docs/architecture.md. */
const EXCLUDED_CATEGORY = new Set(["sexual"]);
const EXCLUDED_SUB = new Set(["infanticide", "concealingABirth", "illegalAbortion"]);

export function displayCategory(category: string, sub: string): string {
  switch (sub) {
    case "burglary":
    case "housebreaking":
      return "Burglary";
    case "robbery":
    case "highwayRobbery":
    case "extortion":
      return "Robbery";
    case "murder":
      return "Murder";
    case "manslaughter":
      return "Homicide";
    case "wounding":
    case "assault":
    case "assaultWithIntent":
      return "Assault";
    case "riot":
      return "Riot";
    case "arson":
      return "Arson";
    case "forgery":
    case "fraud":
    case "embezzlement":
    case "bankrupcy":
      return "Fraud";
    case "receiving":
      return "Receiving";
    case "coiningOffences":
      return "Coining";
  }
  if (category === "theft") return "Theft";
  if (category === "violentTheft") return "Robbery";
  if (category === "deception") return "Fraud";
  return "Other";
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

function verdictLabel(category: string, text: string): string {
  if (category === "guilty") return "Guilty";
  if (category === "notGuilty") return "Not guilty";
  const t = plain(text).replace(/[.,]+$/, "");
  return t ? cut(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(), 90) : "Special verdict";
}

function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "));
  return end > max * 0.5 ? slice.slice(0, end + 1) : `${slice.replace(/\s+\S*$/, "")}…`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

const TRIAL_RE = /<div1 type="trialAccount" id="([^"]+)">([\s\S]*?)<\/div1>/g;

export function parseSession(xml: string): ParseResult {
  const charges: ParsedCharge[] = [];
  const skipped: Record<string, number> = {};
  const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);

  for (const t of xml.matchAll(TRIAL_RE)) {
    const trialId = t[1];
    const body = t[2];

    const dateRaw = /type="date" value="(\d{8})"/.exec(body)?.[1];
    if (!dateRaw) {
      skip("no date");
      continue;
    }
    const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;

    // interp values by element id
    const interp = new Map<string, Record<string, string>>();
    for (const m of body.matchAll(/<interp\b[^>]*\/>/g)) {
      const a = attrs(m[0]);
      if (!a.inst || !a.type) continue;
      const rec = interp.get(a.inst) ?? {};
      rec[a.type] = a.value ?? "";
      interp.set(a.inst, rec);
    }

    // persons
    const persons = new Map<string, string>();
    for (const m of body.matchAll(/<persName\b([^>]*)>/g)) {
      const a = attrs(m[1]);
      if (!a.id) continue;
      const i = interp.get(a.id);
      if (!i) continue;
      const name = [i.given, i.surname].filter(Boolean).join(" ").trim();
      if (name) persons.set(a.id, titleCase(name));
    }

    // joins
    const joins: { result: string; targets: string[] }[] = [];
    for (const m of body.matchAll(/<join\b[^>]*\/>/g)) {
      const a = attrs(m[0]);
      if (a.result && a.targets) joins.push({ result: a.result, targets: a.targets.split(/\s+/) });
    }

    const rs = extractRs(body);
    const offences = new Map(rs.filter((r) => r.type === "offenceDescription").map((r) => [r.id, r]));
    const verdicts = new Map(rs.filter((r) => r.type === "verdictDescription").map((r) => [r.id, r]));
    const punishments = new Map(rs.filter((r) => r.type === "punishmentDescription").map((r) => [r.id, r]));

    // crime locations by place id
    const places = new Map<string, string>();
    for (const m of body.matchAll(/<placeName\b([^>]*)>/g)) {
      const a = attrs(m[1]);
      const i = a.id ? interp.get(a.id) : undefined;
      if (i?.type === "crimeLocation" && i.placeName) places.set(a.id, i.placeName);
    }
    const anyPlace = [...places.values()][0] ?? null;

    // The text after the indictment paragraph, as an excerpt.
    const paras = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((p) => plain(p[1]));
    const excerpt = cut(paras.slice(1).filter(Boolean).join(" "), 1200);

    const chargeJoins = joins.filter((j) => j.result === "criminalCharge");
    if (chargeJoins.length === 0) {
      skip("no criminalCharge join");
      continue;
    }

    for (const [n, cj] of chargeJoins.entries()) {
      const defId = cj.targets.find((x) => /-defend\d+$/.test(x));
      const offId = cj.targets.find((x) => offences.has(x));
      const verId = cj.targets.find((x) => verdicts.has(x));
      if (!offId || !verId) {
        skip("charge without offence or verdict");
        continue;
      }
      const off = offences.get(offId)!;
      const offI = interp.get(offId) ?? {};
      const cat = offI.offenceCategory ?? "miscellaneous";
      const sub = offI.offenceSubcategory ?? "other";
      if (EXCLUDED_CATEGORY.has(cat) || EXCLUDED_SUB.has(sub)) {
        skip("sensitive offence left out");
        continue;
      }

      const ver = verdicts.get(verId)!;
      const verCat = interp.get(verId)?.verdictCategory ?? "miscVerdict";
      const verdict = verdictLabel(verCat, ver.inner.replace(/<interp[^>]*\/>/g, ""));
      if (!verdict) {
        skip("no verdict");
        continue;
      }

      const display = displayCategory(cat, sub);

      // punishment joined to this defendant
      let punishment: string | null = null;
      if (defId) {
        const pj = joins.find((j) => j.result === "defendantPunishment" && j.targets[0] === defId);
        const pr = pj ? punishments.get(pj.targets[1]) : undefined;
        if (pr) punishment = cut(plain(pr.inner.replace(/<interp[^>]*\/>/g, "")).replace(/[.,]+$/, ""), 160) || null;
      }

      // location joined to this offence, else any crime location in the trial
      const pl = joins.find((j) => j.result === "offencePlace" && j.targets[0] === offId);
      const place = (pl && places.get(pl.targets[1])) || anyPlace;

      const vj = joins.find((j) => j.result === "offenceVictim" && j.targets[0] === offId);
      const victim = vj ? persons.get(vj.targets[1]) ?? null : null;

      // Names only for a conviction. An acquitted person never appears as a perpetrator.
      const defendant = verCat === "guilty" && defId ? persons.get(defId) ?? null : null;

      const offText = cut(plain(off.inner.replace(/<interp[^>]*\/>/g, "")), 400);
      charges.push({
        id: `${trialId}-ch${n + 1}`,
        trial_id: trialId,
        date,
        year: Number(dateRaw.slice(0, 4)),
        offence_category: display,
        offence_sub: sub,
        verdict,
        verdict_category: verCat,
        punishment,
        defendant_name: defendant,
        victim_name: victim,
        place_raw: place,
        offence_text: offText,
        excerpt,
        is_violent: VIOLENT.has(display),
      });
    }
  }
  return { charges, skipped };
}
