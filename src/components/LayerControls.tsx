"use client";

interface Props {
  historical: boolean;
  recent: boolean;
  onToggleHistorical: () => void;
  onToggleRecent: () => void;
  onThenAndNow: () => void;
}

/**
 * LayerControls — top-right floating controls over the map.
 * Historical toggle, Recent toggle, Then & Now button.
 */
export function LayerControls({
  historical,
  recent,
  onToggleHistorical,
  onToggleRecent,
  onThenAndNow,
}: Props) {
  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      {/* Layer toggles */}
      <div
        className="flex flex-col gap-1 rounded-xl border px-3 py-2 shadow-lg backdrop-blur-sm"
        style={{
          background: "rgba(26,26,26,0.92)",
          borderColor: "var(--hist-card-border)",
        }}
      >
        <p
          className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--hist-muted)" }}
        >
          Layers
        </p>

        <label className="flex cursor-pointer items-center gap-2">
          <Toggle checked={historical} onChange={onToggleHistorical} amber />
          <span
            className="text-xs"
            style={{ color: "var(--hist-sepia)" }}
          >
            Historical
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2">
          <Toggle checked={recent} onChange={onToggleRecent} />
          <span className="text-xs text-gray-300">Recent</span>
        </label>
      </div>

      {/* Then & Now button */}
      <button
        onClick={onThenAndNow}
        className="rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-sm transition-colors"
        style={{
          background: "rgba(26,26,26,0.92)",
          borderColor: "var(--hist-card-border)",
          color: "var(--hist-amber)",
        }}
      >
        Then &amp; Now
      </button>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  amber,
}: {
  checked: boolean;
  onChange: () => void;
  amber?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        background: checked
          ? amber
            ? "var(--hist-amber)"
            : "#6b7280"
          : "#3f3f46",
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ left: checked ? "calc(100% - 18px)" : "2px" }}
      />
    </button>
  );
}
