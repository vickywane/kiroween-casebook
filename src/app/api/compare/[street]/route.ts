import { NextResponse } from "next/server";
import { getCompare } from "@/lib/server/area";
import { streetKey } from "@/lib/offence-groups";

/**
 * GET /api/compare/{street}
 * Old Bailey trials by decade beside police.uk counts for one street, for the
 * street itself and for one mile around it. Figures are built in the ETL.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ street: string }> }) {
  const { street } = await ctx.params;
  const key = streetKey(decodeURIComponent(street));
  if (!key || key.length > 80) return NextResponse.json({ error: "bad street" }, { status: 400 });

  try {
    const body = await getCompare(key);
    if (!body) return NextResponse.json({ error: "no figures for this street" }, { status: 404 });
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Netlify-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    console.error("[api/compare]", key, e);
    return NextResponse.json({ error: "data unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
