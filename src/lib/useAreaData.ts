"use client";

import { useEffect, useMemo, useState } from "react";
import { cellsAround } from "./geohash";
import type { AreaResponse } from "./area-types";

/**
 * Loads police.uk counts for the map square around a point plus its 8
 * neighbours. Each square is fetched once, then kept in memory and in
 * localStorage, so walking around inside loaded squares costs no requests.
 * A new request only happens when the user walks into an unloaded square.
 */

// v2: responses now carry Old Bailey cases. Squares cached under the old
// prefix have none and would hide every historic marker for up to 7 days.
const LS_PREFIX = "casebook.area2.";
if (typeof localStorage !== "undefined") {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("casebook.area.")) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

const memory = new Map<string, AreaResponse>();
const inflight = new Map<string, Promise<AreaResponse | null>>();

function readStored(cell: string): AreaResponse | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + cell);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: AreaResponse };
    if (Date.now() - at > MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function store(cell: string, data: AreaResponse) {
  memory.set(cell, data);
  try {
    localStorage.setItem(LS_PREFIX + cell, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage full: memory cache still works */
  }
}

/** If a fresh response comes from a newer build, cached squares are stale. */
function dropOtherBuilds(build: string) {
  for (const [cell, d] of memory) if (d.build !== build) memory.delete(cell);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k?.startsWith(LS_PREFIX)) continue;
      const d = JSON.parse(localStorage.getItem(k) ?? "{}")?.data as AreaResponse | undefined;
      if (d && d.build !== build) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/**
 * The data build on the server, asked once per page load. Without this, a
 * user whose 9 squares are all cached never makes a request, so squares from
 * an older ingest (e.g. with no Old Bailey cases yet) would stick for 7 days.
 * Resolves to null when offline, in which case cached squares are used as-is.
 */
let buildPromise: Promise<string | null> | null = null;
function currentBuild(): Promise<string | null> {
  buildPromise ??= fetch("/api/build", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const { build } = (await res.json()) as { build?: string };
      if (build) dropOtherBuilds(build);
      return build ?? null;
    })
    .catch(() => null)
    .then((b) => {
      if (b === null) buildPromise = null; // try again next time
      return b;
    });
  return buildPromise;
}

async function loadCell(cellKey: string): Promise<AreaResponse | null> {
  // cellKey is "<cell>@<month|latest>"
  const [cell, month] = cellKey.split("@");
  const build = await currentBuild();
  const hit = memory.get(cellKey) ?? readStored(cellKey);
  if (hit && (build === null || hit.build === build)) {
    memory.set(cellKey, hit);
    return hit;
  }
  const pending = inflight.get(cellKey);
  if (pending) return pending;
  // The build in the URL keys browser and CDN caches per ingest.
  const params = new URLSearchParams();
  if (month && month !== "latest") params.set("month", month);
  if (build) params.set("b", build);
  const qs = params.toString();
  const url = `/api/area/${cell}${qs ? `?${qs}` : ""}`;
  const p = fetch(url)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = (await res.json()) as AreaResponse;
      const known = [...memory.values()][0]?.build;
      if (known && known !== data.build) dropOtherBuilds(data.build);
      store(cellKey, data);
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(cellKey));
  inflight.set(cellKey, p);
  return p;
}

export interface AreaData {
  areas: AreaResponse[];
  loading: boolean;
  /** True when at least one square failed to load (offline, no credentials…). */
  failed: boolean;
}

/**
 * `view` is the squares the visible map covers. Without it, only squares
 * around `pos` load, and a user a few miles from the City (where the Old
 * Bailey data is) sees no cases even after panning there.
 */
export function useAreaData(
  pos: [number, number] | null,
  month: string | null = null,
  view: string[] = [],
): AreaData {
  const m = month ?? "latest";
  const viewKey = view.join(",");
  const cells = useMemo(() => {
    const all = new Set(viewKey ? viewKey.split(",") : []);
    if (pos) for (const c of cellsAround(pos[0], pos[1])) all.add(c);
    return [...all].sort().map((c) => `${c}@${m}`);
  }, [pos, m, viewKey]);
  const key = cells.join(",");
  const [state, setState] = useState<{ key: string; areas: AreaResponse[]; failed: boolean } | null>(null);

  // Bumped as each square lands, so squares show as they arrive instead of
  // all waiting for the slowest one.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const cellKeys = key.split(",");
    void Promise.all(
      cellKeys.map((c) =>
        loadCell(c).then((r) => {
          if (!cancelled) setTick((t) => t + 1);
          return r;
        }),
      ),
    ).then((res) => {
      if (cancelled) return;
      const areas = res.filter((r): r is AreaResponse => r !== null);
      setState({ key, areas, failed: areas.length < res.length });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Every square loaded this session for this month, not only the ones in
  // view: otherwise pins vanish on zoom/pan and come back when you return.
  // The map draws only the pins inside the visible area.
  const loaded = [...memory].filter(([k]) => k.endsWith(`@${m}`)).map(([, v]) => v);
  const done = state?.key === key;
  return {
    areas: loaded,
    loading: !!key && !done,
    failed: done ? state.failed : false,
  };
}
