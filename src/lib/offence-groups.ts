/**
 * Shared offence groups for the Compare screen. Old Bailey offences and
 * police.uk categories are both folded into the same short list, so a bar
 * for "Robbery then" and "Robbery now" mean the same kind of thing.
 *
 * Used by the ETL scripts and by the client, so it has no imports.
 */

export const GROUPS = ["Theft", "Robbery", "Burglary", "Violence", "Fraud", "Damage", "Other"] as const;
export type OffenceGroup = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<OffenceGroup, string> = {
  Theft: "Theft",
  Robbery: "Robbery",
  Burglary: "Burglary",
  Violence: "Violence",
  Fraud: "Fraud & forgery",
  Damage: "Criminal damage & arson",
  Other: "Other",
};

/** The display category used on Old Bailey case cards and map icons. */
export function groupOfHistoric(displayCategory: string): OffenceGroup {
  switch (displayCategory) {
    case "Theft":
    case "Receiving":
      return "Theft";
    case "Robbery":
      return "Robbery";
    case "Burglary":
      return "Burglary";
    case "Murder":
    case "Homicide":
    case "Assault":
      return "Violence";
    case "Fraud":
      return "Fraud";
    case "Arson":
      return "Damage";
    default:
      return "Other";
  }
}

/** police.uk category slug. police.uk street data has no fraud category. */
export function groupOfPolice(slug: string): OffenceGroup {
  switch (slug) {
    case "shoplifting":
    case "other-theft":
    case "theft-from-the-person":
    case "bicycle-theft":
    case "vehicle-crime":
      return "Theft";
    case "robbery":
      return "Robbery";
    case "burglary":
      return "Burglary";
    case "violent-crime":
    case "violence-and-sexual-offences":
      return "Violence";
    case "criminal-damage-arson":
      return "Damage";
    default:
      return "Other";
  }
}

/**
 * A street name reduced to a comparison key. Old Bailey writes "Fleet-street",
 * police.uk writes "On or near Fleet Street"; both become "fleet street".
 */
export function streetKey(name: string): string {
  let s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^on or near\s+/, "")
    .replace(/^(in|at|near|on)\s+(the\s+)?/, "")
    .replace(/^no\.?\s*\d+[a-z]?,?\s*/, "")
    .replace(/[-_]/g, " ")
    .replace(/[.'’"]/g, "")
    .replace(/\bst$/, "street")
    .replace(/\brd$/, "road")
    .replace(/\bsq$/, "square")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^(the)\s+/, "");
  return s;
}
