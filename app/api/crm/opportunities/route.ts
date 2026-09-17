import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { crmCreateOpportunity, crmListOpportunities } from "@/lib/db";
import { can, scopeFilter, hasCrmAccess } from "@/lib/permissions";
import type { Standard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  try {
    return NextResponse.json({ items: await crmListOpportunities(scopeFilter(user)) });
  } catch (e) {
    return dbFailure(e);
  }
}

/**
 * Tạo opportunity. Nguyên tắc pipeline của VEXIM:
 * cơ hội sinh ra PHẢI có owner và được khuyến khích có next action ngay.
 */
export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  if (!can(user.role, "crm.create_opportunity")) {
    return NextResponse.json(
      { error: "Chỉ AE / Founder được tạo cơ hội. SR/LR hãy qualify lead trước." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const company = String(body.company_name || "").trim();
  if (!company) {
    return NextResponse.json({ error: "Thiếu tên doanh nghiệp." }, { status: 400 });
  }
  const ownerId = body.owner_id ? Number(body.owner_id) : user.id;
  try {
    const opp = await crmCreateOpportunity({
    lead_id: body.lead_id ? Number(body.lead_id) : null,
    company_name: company,
    title: String(body.title || ""),
    standard: (body.standard === "FDA" || body.standard === "GACC"
      ? body.standard
      : null) as Standard | null,
    value: Number(body.value || 0),
    owner_id: ownerId,
    team_id: body.team_id ? Number(body.team_id) : user.team_id,
    expected_close_date: body.expected_close_date
      ? String(body.expected_close_date).slice(0, 10)
      : null,
    next_action: String(body.next_action || ""),
    next_action_due: body.next_action_due ? String(body.next_action_due).slice(0, 10) : null,
      next_action_owner_id: body.next_action_owner_id ? Number(body.next_action_owner_id) : ownerId,
      created_by: user.id,
    });
    return NextResponse.json({ item: opp });
  } catch (e) {
    return dbFailure(e);
  }
}
