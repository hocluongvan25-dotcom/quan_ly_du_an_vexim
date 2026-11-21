import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revenueStats } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json(await revenueStats());
  } catch (e) {
    return handleApiError(e);
  }
}
