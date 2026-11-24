import { NextResponse } from "next/server";
import { getArea } from "@/lib/server/area";
import { CELL_PRECISION } from "@/lib/geohash";

const CELL_RE = new RegExp(`^[0-9b-hjkmnp-z]{${CELL_PRECISION}}$`);
const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * GET /api/area/{cell}?month=YYYY-MM
 * One map square's police.uk counts. Keyed by square (not lat/lon) so every
 * user in a square shares one CDN-cached response. Data changes monthly.
 */
export async function GET(req: Request, ctx: { params: Promise<{ cell: string }> }) {
  const { cell } = await ctx.params;
  if (!CELL_RE.test(cell)) {
    return NextResponse.json({ error: "bad cell" }, { status: 400 });
  }
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  if (month && !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "bad month" }, { status: 400 });
  }

  try {
    const body = await getArea(cell, month);
    return NextResponse.json(body, {
      headers: {
        // Browser: 1 hour. Netlify CDN: 1 day, then serve stale while refreshing.
        "Cache-Control": "public, max-age=3600",
        "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.error("[api/area]", cell, e);
    return NextResponse.json({ error: "data unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
