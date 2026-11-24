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

const LS_PREFIX = "casebook.area.";
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

function loadCell(cellKey: string): Promise<AreaResponse | null> {
  // cellKey is "<cell>@<month|latest>"
  const [cell, month] = cellKey.split("@");
  const hit = memory.get(cellKey) ?? readStored(cellKey);
  if (hit) {
    memory.set(cellKey, hit);
    return Promise.resolve(hit);
  }
  const pending = inflight.get(cellKey);
  if (pending) return pending;
  const url = month && month !== "latest" ? `/api/area/${cell}?month=${month}` : `/api/area/${cell}`;
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

export function useAreaData(pos: [number, number] | null, month: string | null = null): AreaData {
  const m = month ?? "latest";
  const cells = useMemo(
    () => (pos ? cellsAround(pos[0], pos[1]).sort().map((c) => `${c}@${m}`) : []),
    [pos, m],
  );
  const key = cells.join(",");
  const [state, setState] = useState<{ key: string; areas: AreaResponse[]; failed: boolean } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void Promise.all(key.split(",").map(loadCell)).then((res) => {
      if (cancelled) return;
      const areas = res.filter((r): r is AreaResponse => r !== null);
      setState({ key, areas, failed: areas.length < res.length });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Show whatever is already cached immediately while the rest loads.
  const cached = useMemo(
    () => (key ? key.split(",").map((c) => memory.get(c) ?? null).filter((r): r is AreaResponse => r !== null) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, state],
  );
  const done = state?.key === key;
  return {
    areas: done ? state.areas : cached,
    loading: !!key && !done,
    failed: done ? state.failed : false,
  };
}
