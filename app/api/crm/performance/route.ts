import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmListActivities, crmPerformanceFor } from "@/lib/db";
import { can, scopeFilter } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hiệu suất từng member / team — Founder và AE dùng để review, không dùng để "báo cáo". */
export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "crm.review_activity")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const f = scopeFilter(user);
  const [perf, activities] = await Promise.all([
    crmPerformanceFor(f),
    crmListActivities(f, 40),
  ]);
  return NextResponse.json({ ...perf, activities });
}
