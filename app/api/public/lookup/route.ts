import { NextResponse } from "next/server";
import { MIN_QUERY_LENGTH, normalizedStandard } from "@/lib/site/lookup";
import { searchPublicRecords } from "@/lib/site/records";

export const runtime = "nodejs";
// Kết quả tra cứu phải phản ánh dữ liệu mới nhất, không dùng cache của route handler.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const standard = normalizedStandard(url.searchParams.get("type"));

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "QUERY_TOO_SHORT", items: [] },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const items = await searchPublicRecords(query, standard);
    return NextResponse.json({ query, standard: standard || null, items }, { headers: NO_STORE });
  } catch (error) {
    console.error("[public-lookup]", error);
    return NextResponse.json(
      { error: "LOOKUP_UNAVAILABLE", items: [] },
      { status: 500, headers: NO_STORE }
    );
  }
}
