import { metresBetween } from "./geo";
import { loadProfile, updateProfile } from "./profile-cache";

export type CityId =
  | "london"
  | "manchester"
  | "birmingham"
  | "liverpool"
  | "edinburgh"
  | "glasgow"
  | "bristol"
  | "dublin"
  | "new-york"
  | "chicago";

export interface Country {
  id: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { id: "gb", name: "United Kingdom" },
  { id: "ie", name: "Ireland" },
  { id: "us", name: "United States" },
];

export interface City {
  id: CityId;
  name: string;
  /** Id of the country in COUNTRIES. */
  country: string;
  /** Map centre as [lat, lon]. */
  centre: [number, number];
  /** Rough radius (metres) used to decide whether a position is "in" the city. */
  radiusM: number;
  /** Only available cities can be selected; the rest show as "coming soon". */
  available: boolean;
  /** Short source line shown under the city name. */
  sources: string;
}

export const CITIES: City[] = [
  {
    id: "london",
    name: "London",
    country: "gb",
    centre: [51.5141, -0.1089],
    radiusM: 30_000,
    available: true,
    sources: "Old Bailey · police.uk",
  },
  { id: "manchester", country: "gb", name: "Manchester", centre: [53.4808, -2.2426], radiusM: 20_000, available: false, sources: "In preparation" },
  { id: "birmingham", country: "gb", name: "Birmingham", centre: [52.4862, -1.8904], radiusM: 20_000, available: false, sources: "In preparation" },
  { id: "liverpool", country: "gb", name: "Liverpool", centre: [53.4084, -2.9916], radiusM: 15_000, available: false, sources: "In preparation" },
  { id: "edinburgh", country: "gb", name: "Edinburgh", centre: [55.9533, -3.1883], radiusM: 15_000, available: false, sources: "In preparation" },
  { id: "glasgow", country: "gb", name: "Glasgow", centre: [55.8642, -4.2518], radiusM: 15_000, available: false, sources: "In preparation" },
  { id: "bristol", country: "gb", name: "Bristol", centre: [51.4545, -2.5879], radiusM: 12_000, available: false, sources: "In preparation" },
  { id: "dublin", country: "ie", name: "Dublin", centre: [53.3498, -6.2603], radiusM: 15_000, available: false, sources: "In preparation" },
  { id: "new-york", country: "us", name: "New York", centre: [40.7128, -74.006], radiusM: 30_000, available: false, sources: "In preparation" },
  { id: "chicago", country: "us", name: "Chicago", centre: [41.8781, -87.6298], radiusM: 25_000, available: false, sources: "In preparation" },
];

/** Cities grouped under their country, in COUNTRIES order. */
export function citiesByCountry(): { country: Country; cities: City[] }[] {
  return COUNTRIES.map((country) => ({
    country,
    cities: CITIES.filter((c) => c.country === country.id),
  }));
}

export const DEFAULT_CITY: City = CITIES[0];

export function getCity(id: string | null | undefined): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/**
 * Match a GPS fix to the nearest known city. Runs entirely on the device —
 * the position is never sent anywhere.
 */
export function detectCity(pos: [number, number]): City | null {
  let best: { city: City; m: number } | null = null;
  for (const city of CITIES) {
    const m = metresBetween(pos, city.centre);
    if (m <= city.radiusM && (!best || m < best.m)) best = { city, m };
  }
  return best?.city ?? null;
}

/** Last city the user chose (or was detected in). Falls back to London. */
export function loadCity(): City {
  const c = getCity(loadProfile().cityId);
  return c?.available ? c : DEFAULT_CITY;
}

export function saveCity(city: City) {
  updateProfile({ cityId: city.id });
}
