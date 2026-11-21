import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompanyStats } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim();
    if (!name) return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
    const stats = await getCompanyStats(name);
    return NextResponse.json({ stats });
  } catch (e) {
    return handleApiError(e);
  }
}
