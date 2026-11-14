"use client";

/**
 * ContentNote — shown at the top of any panel displaying violent crime details.
 * Uses plain, non-atmospheric styling (applies to both layers).
 */
export function ContentNote({ message }: { message?: string }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50/10 px-3 py-2 text-xs text-amber-200"
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-amber-400">
        ⚠
      </span>
      <span>
        {message ??
          "Content note: this record describes a violent crime. Details may be distressing."}
      </span>
    </div>
  );
}
