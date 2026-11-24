import { NextResponse } from "next/server";
import { getBuildId } from "@/lib/server/area";

/**
 * GET /api/build
 * The id of the data build currently in DynamoDB. The map checks it once per
 * page load so squares cached from an older ingest are dropped, and puts it
 * in /api/area URLs so browser and CDN caches never serve an older build.
 */
export async function GET() {
  try {
    const build = await getBuildId();
    return NextResponse.json({ build }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    console.error("[api/build]", e);
    return NextResponse.json({ error: "data unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
