import { NextRequest, NextResponse } from "next/server";
import { listCertificates } from "@/lib/db";
import { LOOKUP_MIN_QUERY, searchPublicRecords } from "@/lib/public-lookup";
import type { Standard } from "@/lib/types";

export const runtime = "nodejs";
/**
 * Tra cứu phải thấy hồ sơ vừa cập nhật, không dùng cache của route handler.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(req: NextRequest) {
  const type = (req.nextUrl.searchParams.get("type") || "").toUpperCase();
  const query = (req.nextUrl.searchParams.get("q") || "").trim();

  if (type !== "FDA" && type !== "GACC") {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400, headers: NO_STORE });
  }
  if (query.length < LOOKUP_MIN_QUERY) {
    return NextResponse.json({ error: "QUERY_TOO_SHORT" }, { status: 400, headers: NO_STORE });
  }

  try {
    const certificates = await listCertificates();
    const items = searchPublicRecords(certificates, type as Standard, query);
    return NextResponse.json(
      { type, query, count: items.length, items },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[public-lookup] failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "LOOKUP_FAILED" }, { status: 500, headers: NO_STORE });
  }
}
