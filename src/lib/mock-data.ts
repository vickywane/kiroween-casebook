/**
 * Mock data used during development.
 * All historical cases are pre-1913 (Old Bailey ends 1913), so names are safe to show.
 * Counts < 3 are suppressed per the data rules.
 */

export type GeocodeConfidence = "exact" | "street" | "area";

export interface HistoricalCase {
  id: string;
  year: number;
  offence_category: string;
  verdict: string;
  defendant_name: string | null;
  victim_name: string | null;
  location_raw: string;
  lat: number;
  lon: number;
  geocode_confidence: GeocodeConfidence;
  summary: string;
  source_url: string;
  testimony_excerpt: string;
  is_violent: boolean;
}

export interface RecentAreaCount {
  id: string;
  category: string;
  category_label: string;
  month: string;
  lat: number;
  lon: number;
  /** null means "a small number" (1–2, suppressed) */
  count: number | null;
  force: string;
}

export interface ThenAndNowRow {
  category: string;
  category_label: string;
  historical_count: number;
  recent_count: number | null;
}

// ── Historical cases ───────────────────────────────────────────────────────────

export const MOCK_HISTORICAL_CASES: HistoricalCase[] = [
  {
    id: "t18500101-1",
    year: 1850,
    offence_category: "Theft",
    verdict: "Guilty",
    defendant_name: "Thomas Briggs",
    victim_name: "Mr. Edward Collis",
    location_raw: "Cheapside, City of London",
    lat: 51.5143,
    lon: -0.0937,
    geocode_confidence: "street",
    summary:
      "Thomas Briggs was convicted of stealing a pocket-watch from Edward Collis near Cheapside market. The watch was later found pawned at a shop on Aldgate High Street.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18500101-1",
    testimony_excerpt:
      "I felt a hand in my coat pocket and turned to see the prisoner running away. A constable gave chase and apprehended him at the corner of Friday Street.",
    is_violent: false,
  },
  {
    id: "t18760315-2",
    year: 1876,
    offence_category: "Murder",
    verdict: "Guilty",
    defendant_name: "William Marwood",
    victim_name: "Ann Carter",
    location_raw: "Whitechapel Road, London",
    lat: 51.519,
    lon: -0.0607,
    geocode_confidence: "street",
    summary:
      "William Marwood was found guilty of the murder of Ann Carter on Whitechapel Road. The jury heard evidence that the prisoner had been seen arguing with the deceased earlier that evening.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18760315-2",
    testimony_excerpt:
      "The body of Ann Carter was discovered at half past eleven o'clock on the night of the fourteenth by a night-watchman making his rounds. There was a great quantity of blood upon the pavement.",
    is_violent: true,
  },
  {
    id: "t18920204-3",
    year: 1892,
    offence_category: "Burglary",
    verdict: "Not Guilty",
    defendant_name: "James Fellowes",
    victim_name: null,
    location_raw: "Baker Street, Marylebone",
    lat: 51.5225,
    lon: -0.1571,
    geocode_confidence: "street",
    summary:
      "James Fellowes was accused of breaking into a property on Baker Street but was acquitted. The jury found the evidence of identification insufficient.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18920204-3",
    testimony_excerpt:
      "I cannot say with certainty that it was the prisoner I saw at the window. The night was very dark and the lamp at the corner had gone out.",
    is_violent: false,
  },
  {
    id: "t18640722-4",
    year: 1864,
    offence_category: "Fraud",
    verdict: "Guilty",
    defendant_name: "Frederick Halliday",
    victim_name: "Mrs. Sarah Prentiss",
    location_raw: "The Strand, London",
    lat: 51.5115,
    lon: -0.1197,
    geocode_confidence: "street",
    summary:
      "Frederick Halliday defrauded Mrs. Sarah Prentiss of twelve pounds by posing as a solicitor's clerk collecting rents on behalf of her landlord.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18640722-4",
    testimony_excerpt:
      "He produced a paper which appeared official and I gave him the money without suspicion. It was only when my actual rent collector called the following week that I discovered the deception.",
    is_violent: false,
  },
  {
    id: "t18990512-5",
    year: 1899,
    offence_category: "Assault",
    verdict: "Guilty",
    defendant_name: "Albert Norcott",
    victim_name: "George Pemberton",
    location_raw: "Borough Market, Southwark",
    lat: 51.505,
    lon: -0.0912,
    geocode_confidence: "exact",
    summary:
      "Albert Norcott was convicted of assaulting George Pemberton at Borough Market following a dispute over a market stall. Pemberton sustained injuries to his face and right hand.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18990512-5",
    testimony_excerpt:
      "The prisoner struck me twice with a wooden handle before the other traders intervened. I was confined to my bed for three days with my injuries.",
    is_violent: true,
  },
  {
    id: "t18821103-6",
    year: 1882,
    offence_category: "Theft",
    verdict: "Guilty",
    defendant_name: "Mary Ann Sutton",
    victim_name: "Mr. Jonas Whitfield",
    location_raw: "Covent Garden Market, London",
    lat: 51.5117,
    lon: -0.1232,
    geocode_confidence: "exact",
    summary:
      "Mary Ann Sutton was convicted of stealing a purse containing six shillings from Jonas Whitfield at Covent Garden Market.",
    source_url: "https://www.oldbaileyonline.org/browse.jsp?id=t18821103-6",
    testimony_excerpt:
      "I felt a jostle in the crowd and upon reaching into my coat found my purse gone. The constable pointed out the prisoner who was still within sight.",
    is_violent: false,
  },
];

// ── Recent area counts ─────────────────────────────────────────────────────────

export const MOCK_RECENT_COUNTS: RecentAreaCount[] = [
  {
    id: "r-001",
    category: "theft-from-the-person",
    category_label: "Theft from the person",
    month: "2024-10",
    lat: 51.514,
    lon: -0.0935,
    count: 12,
    force: "Metropolitan Police",
  },
  {
    id: "r-002",
    category: "violence-and-sexual-offences",
    category_label: "Violence & sexual offences",
    month: "2024-10",
    lat: 51.519,
    lon: -0.063,
    count: 8,
    force: "Metropolitan Police",
  },
  {
    id: "r-003",
    category: "burglary",
    category_label: "Burglary",
    month: "2024-10",
    lat: 51.5225,
    lon: -0.1573,
    count: 4,
    force: "Metropolitan Police",
  },
  {
    id: "r-004",
    category: "anti-social-behaviour",
    category_label: "Anti-social behaviour",
    month: "2024-10",
    lat: 51.5115,
    lon: -0.12,
    count: null, // suppressed: was 2
    force: "Metropolitan Police",
  },
  {
    id: "r-005",
    category: "drugs",
    category_label: "Drugs",
    month: "2024-10",
    lat: 51.505,
    lon: -0.091,
    count: 5,
    force: "Metropolitan Police",
  },
  {
    id: "r-006",
    category: "criminal-damage-arson",
    category_label: "Criminal damage & arson",
    month: "2024-10",
    lat: 51.512,
    lon: -0.1,
    count: 3,
    force: "Metropolitan Police",
  },
];

// ── Then & Now summary ────────────────────────────────────────────────────────

export const MOCK_THEN_AND_NOW: ThenAndNowRow[] = [
  {
    category: "theft",
    category_label: "Theft",
    historical_count: 42,
    recent_count: 17,
  },
  {
    category: "violence",
    category_label: "Violence",
    historical_count: 11,
    recent_count: 8,
  },
  {
    category: "fraud",
    category_label: "Fraud",
    historical_count: 9,
    recent_count: 3,
  },
  {
    category: "burglary",
    category_label: "Burglary",
    historical_count: 7,
    recent_count: 4,
  },
  {
    category: "other",
    category_label: "Other",
    historical_count: 14,
    recent_count: 6,
  },
];
