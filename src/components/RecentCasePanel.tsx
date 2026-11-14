"use client";

import { X, ExternalLink } from "lucide-react";
import type { RecentAreaCount } from "@/lib/mock-data";
import { CrimeIcon } from "@/lib/crime-icons";

interface Props {
  count: RecentAreaCount;
  onClose: () => void;
}

/**
 * RecentCasePanel — recent layer, plain factual tone.
 * No atmospheric styling, no Halloween aesthetic.
 * White card, sans-serif, neutral grey.
 */
export function RecentCasePanel({ count, onClose }: Props) {
  return (
    <div className="flex flex-col overflow-y-auto bg-white text-gray-900">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Recent Crime Data
        </span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded p-1 transition-colors hover:bg-gray-100"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {/* Category & date */}
        <div className="flex items-start gap-4">
          {/* Category icon — panel size, plain grey */}
          <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
            <CrimeIcon
              category={count.category}
              size="panel"
              color="#374151"
            />
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {count.category_label}
            </h2>
            <p className="text-sm text-gray-500">
              {count.month} · {count.force}
            </p>
          </div>
        </div>

        {/* Count */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Recorded incidents
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {count.count !== null ? count.count : "A small number"}
          </p>
          {count.count === null && (
            <p className="mt-1 text-xs text-gray-400">
              Exact count suppressed to protect privacy (fewer than 3).
            </p>
          )}
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Approximate area
          </p>
          <p className="text-sm text-gray-700">
            {count.lat.toFixed(4)}°N, {Math.abs(count.lon).toFixed(4)}°W
          </p>
          <p className="text-xs text-gray-400">
            Coordinates are approximate — police.uk anonymises exact locations.
          </p>
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-gray-500">
            Source
          </p>
          <a
            href="https://data.police.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            data.police.uk — Open Government Licence
          </a>
        </div>
      </div>
    </div>
  );
}
