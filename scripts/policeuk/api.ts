/**
 * Minimal client for the police.uk API (https://data.police.uk/docs/).
 * Requests are throttled well under the documented rate limit and retried on
 * 429 and transient gateway errors.
 */

const BASE = "https://data.police.uk/api";
const USER_AGENT = "sherlock-etl/0.1 (hackathon research project)";
const MIN_INTERVAL_MS = 250; // ~4 requests per second
const MAX_RETRIES = 4;

let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/** police.uk returns 503 when a crimes query would exceed 10,000 results. */
export class TooManyResultsError extends Error {}

export interface ApiResponse {
  /** Exact response body, kept unchanged for the raw stage. */
  body: string;
  /** Human-readable description of the request, stored as provenance. */
  request: string;
}

async function send(method: "GET" | "POST", path: string, form?: Record<string, string>): Promise<ApiResponse> {
  const url = `${BASE}${path}`;
  const request = form
    ? `${method} ${url} ${Object.entries(form)
        .filter(([k]) => k !== "poly")
        .map(([k, v]) => `${k}=${v}`)
        .join("&")}`
    : `${method} ${url}`;

  for (let attempt = 0; ; attempt++) {
    await throttle();
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
        ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });

    if (res.ok) return { body: await res.text(), request };

    if (res.status === 503 && path.startsWith("/crimes-street")) {
      throw new TooManyResultsError(`${request} returned more than 10,000 crimes; split the area`);
    }
    const retryable = res.status === 429 || res.status === 502 || res.status === 504;
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new Error(`${request} failed with HTTP ${res.status}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
  }
}

export const policeApi = {
  crimeDates: () => send("GET", "/crimes-street-dates"),
  neighbourhoods: (force: string) => send("GET", `/${force}/neighbourhoods`),
  boundary: (force: string, neighbourhood: string) => send("GET", `/${force}/${neighbourhood}/boundary`),
  /** All street-level crimes inside a polygon for one month. */
  crimesInPolygon: (poly: string, month: string) =>
    send("POST", "/crimes-street/all-crime", { poly, date: month }),
};
