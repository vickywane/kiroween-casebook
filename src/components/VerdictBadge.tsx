"use client";

/**
 * VerdictBadge — always visible on case cards.
 * Guilty: amber/gold. Not Guilty: slate. Other: neutral.
 */
export function VerdictBadge({ verdict }: { verdict: string }) {
  const lower = verdict.toLowerCase();
  const isGuilty = lower === "guilty";
  const isNotGuilty = lower === "not guilty";

  return (
    <span
      className={[
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        isGuilty
          ? "bg-[#c9922a]/20 text-[#e8b84b] ring-1 ring-[#c9922a]/40"
          : isNotGuilty
            ? "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600"
            : "bg-zinc-700/40 text-zinc-400 ring-1 ring-zinc-600",
      ].join(" ")}
    >
      {verdict}
    </span>
  );
}
