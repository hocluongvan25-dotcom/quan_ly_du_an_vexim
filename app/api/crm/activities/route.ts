import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  crmAddActivity,
  crmGetLead,
  crmGetOpportunity,
  crmListActivities,
} from "@/lib/db";
import { can, canSeeRecord, scopeFilter } from "@/lib/permissions";
import { ACTIVITY_TYPE_LABEL, type ActivityType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = Object.keys(ACTIVITY_TYPE_LABEL) as ActivityType[];

export async function GET(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 60);
  return NextResponse.json({ items: await crmListActivities(scopeFilter(user), limit || 60) });
}

/**
 * Ghi nhận hoạt động: research note (SR), thu thập thông tin (LR),
 * cuộc gọi / email / gặp mặt (owner), follow-up có hạn.
 */
export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "crm.log_activity")) {
    return NextResponse.json(
      { error: "Vai trò của bạn không được ghi hoạt động CRM." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const leadId = body.lead_id ? Number(body.lead_id) : null;
  const oppId = body.opportunity_id ? Number(body.opportunity_id) : null;
  if (!leadId && !oppId) {
    return NextResponse.json({ error: "Phải gắn hoạt động vào một lead hoặc cơ hội." }, { status: 400 });
  }
  const type = (TYPES.includes(body.type) ? body.type : "note") as ActivityType;
  // SR chỉ được viết research note / qualification trên lead; LR ghi chú thu thập thông tin.
  if (user.role === "sr" && !["research_note", "qualification", "call", "email", "meeting", "whatsapp", "note", "task"].includes(type)) {
    return NextResponse.json({ error: "Loại hoạt động không hợp lệ." }, { status: 400 });
  }

  if (leadId) {
    const lead = await crmGetLead(leadId);
    if (!lead) return NextResponse.json({ error: "Không tìm thấy lead." }, { status: 404 });
    if (!canSeeRecord(user, lead)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }
  if (oppId) {
    const opp = await crmGetOpportunity(oppId);
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    if (!canSeeRecord(user, opp)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const activity = await crmAddActivity({
    lead_id: leadId,
    opportunity_id: oppId,
    type,
    subject: String(body.subject || ""),
    content: String(body.content || ""),
    created_by: user.id,
    is_follow_up: Boolean(body.is_follow_up),
    due_at: body.due_at ? String(body.due_at).slice(0, 10) : null,
  });
  return NextResponse.json({ item: activity });
}
