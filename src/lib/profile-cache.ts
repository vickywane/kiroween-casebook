import { useSyncExternalStore } from "react";
import { metresBetween } from "./geo";

/**
 * On-device cache of what the user told us during onboarding: that they
 * finished it, the city they picked, the city we detected, and their last
 * known position. Stored only in this browser's localStorage, never sent
 * anywhere.
 */
export interface Profile {
  v: 1;
  /** Onboarding finished: skip the splash/onboarding on later visits. */
  onboarded: boolean;
  /** City the user chose (or accepted). */
  cityId: string | null;
  /** City matched from the last position fix. */
  detectedCityId: string | null;
  /** Last position, rounded to ~100 m. */
  lastPos: [number, number] | null;
  /** When lastPos was taken (ms since epoch). */
  posAt: number | null;
  location: "granted" | "denied" | "skipped" | "unknown";
}

const KEY = "casebook.profile";
const LEGACY_CITY_KEY = "casebook.city";
const CHANGE_EVENT = "casebook:profile";

const EMPTY: Profile = {
  v: 1,
  onboarded: false,
  cityId: null,
  detectedCityId: null,
  lastPos: null,
  posAt: null,
  location: "unknown",
};

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Profile {
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<Profile>;
      if (p && p.v === 1) return { ...EMPTY, ...p };
    } catch {
      /* corrupt entry: start fresh */
    }
  }
  // Carry over the city saved by the older "casebook.city" key.
  let cityId: string | null = null;
  try {
    cityId = localStorage.getItem(LEGACY_CITY_KEY);
  } catch {
    /* storage unavailable */
  }
  return { ...EMPTY, cityId };
}

export function loadProfile(): Profile {
  return parse(readRaw());
}

/** Merge a change into the cached profile and notify listeners. */
export function updateProfile(patch: Partial<Omit<Profile, "v">>): Profile {
  const next: Profile = { ...loadProfile(), ...patch, v: 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    if (next.cityId) localStorage.setItem(LEGACY_CITY_KEY, next.cityId);
  } catch {
    /* storage full or blocked: the app still works for this visit */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return next;
}

/** Forget everything from onboarding: the next visit starts at the welcome screen. */
export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_CITY_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Save a new position fix, rounded to ~100 m. Skips the write unless the
 * user moved more than 50 m or the cached fix is over 5 minutes old, so a
 * live GPS watch doesn't hammer storage.
 */
export function savePosition(
  pos: [number, number],
  detectedCityId: string | null,
): void {
  const p = loadProfile();
  const rounded: [number, number] = [round(pos[0]), round(pos[1])];
  const moved = !p.lastPos || metresBetween(p.lastPos, rounded) > 50;
  const stale = !p.posAt || Date.now() - p.posAt > 5 * 60_000;
  if (!moved && !stale && p.detectedCityId === detectedCityId) return;
  updateProfile({
    lastPos: rounded,
    posAt: Date.now(),
    detectedCityId,
    location: "granted",
  });
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", onStorage); // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

let lastRaw: string | null | undefined;
let lastProfile: Profile = EMPTY;

function snapshot(): Profile {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastProfile = parse(raw);
  }
  return lastProfile;
}

/**
 * Read the cached profile in a component. Returns null during server render
 * and hydration, when storage can't be read yet.
 */
export function useProfile(): Profile | null {
  return useSyncExternalStore<Profile | null>(subscribe, snapshot, () => null);
}
