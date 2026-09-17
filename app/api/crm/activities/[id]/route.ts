import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasCrmAccess, canSeeRecord } from "@/lib/permissions";
import { crmCompleteActivity, crmGetActivity, crmGetLead, crmGetOpportunity } from "@/lib/db";
import { dbFailure } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * Đánh dấu hoàn thành một follow-up → đồng hồ "stale" của cơ hội được reset.
 *
 * Phải kiểm tra phạm vi: trước đây ai đăng nhập CRM cũng đóng được follow-up của
 * bất kỳ bản ghi nào (kể cả team khác) chỉ bằng cách đoán id.
 */
export async function PUT(_: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }

  const id = Number(ctx.params.id);
  try {
    const activity = await crmGetActivity(id);
    if (!activity) return NextResponse.json({ error: "Không tìm thấy hoạt động." }, { status: 404 });

    // Hoạt động thuộc về opportunity hoặc lead nào thì kiểm tra phạm vi bản ghi đó.
    if (activity.opportunity_id) {
      const opp = await crmGetOpportunity(activity.opportunity_id);
      if (!opp || !canSeeRecord(user, opp, "opportunity")) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    } else if (activity.lead_id) {
      const lead = await crmGetLead(activity.lead_id);
      if (!lead || !canSeeRecord(user, lead)) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    } else if (activity.created_by !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const item = await crmCompleteActivity(id, user.id);
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy hoạt động." }, { status: 404 });
    }
    return dbFailure(e);
  }
}
