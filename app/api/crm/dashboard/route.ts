import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmListFollowUps, crmStatsFor } from "@/lib/db";
import { can, scopeFilter } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dashboard CRM. Founder thấy toàn công ty, AE thấy team mình,
 * SR/LR thấy phần việc của chính mình.
 */
export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "crm.log_activity") && !can(user.role, "crm.view_dashboard")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const f = scopeFilter(user);
  const [stats, followUps] = await Promise.all([crmStatsFor(f), crmListFollowUps(f)]);
  return NextResponse.json({ stats, followUps, scope: f.scope, teamId: f.teamId });
}
