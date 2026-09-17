import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import {
  crmAssignLead,
  crmCreateOpportunity,
  crmGetLead,
  crmSetLeadStatus,
  crmUpdateLead,
} from "@/lib/db";
import { can, canSeeRecord, scopeFilter, hasCrmAccess } from "@/lib/permissions";
import type { LeadSource, LeadStatus, Standard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy lead.",
  CONVERTED: "Lead đã chuyển thành cơ hội, không sửa trực tiếp được nữa.",
  OWNER_NOT_FOUND: "Không tìm thấy người được phân công.",
  NO_COMPANY: "Thiếu tên doanh nghiệp.",
};

function fail(e: unknown) {
  // Lỗi schema (thiếu bảng/cột, vi phạm ràng buộc) → 503 kèm hướng dẫn, không nuốt thành "ERROR".
  if (!(e instanceof Error)) return dbFailure(e);
  const msg = e.message;
  return NextResponse.json({ error: ERROR_MAP[msg] || msg }, { status: 400 });
}

async function load(user: ReturnType<typeof getSession>, id: number) {
  const lead = await crmGetLead(id);
  if (!lead) return { error: NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }) };
  if (!canSeeRecord(user, lead)) {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { lead };
}

export async function GET(_: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  try {
    const res = await load(user, Number(ctx.params.id));
    if (res.error) return res.error;
    return NextResponse.json({ item: res.lead });
  } catch (e) {
    return dbFailure(e);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  if (!can(user.role, "crm.edit_lead")) {
    return NextResponse.json({ error: "Vai trò của bạn không được sửa lead." }, { status: 403 });
  }
  const id = Number(ctx.params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  let lead;
  try {
    const res = await load(user, id);
    if (res.error) return res.error;
    lead = res.lead!;
  } catch (e) {
    return dbFailure(e);
  }

  try {
    if (action === "status") {
      const status = String(body.status) as LeadStatus;
      if (
        !["new", "contacted", "qualified", "unqualified"].includes(status) ||
        (status === "qualified" && !can(user.role, "crm.qualify_lead"))
      ) {
        return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
      }
      return NextResponse.json({ item: await crmSetLeadStatus(id, status) });
    }

    if (action === "assign") {
      if (!can(user.role, "crm.assign_lead")) {
        return NextResponse.json(
          { error: "Chỉ AE / Founder được phân công lead." },
          { status: 403 }
        );
      }
      const ownerId = body.owner_id ? Number(body.owner_id) : null;
      return NextResponse.json({ item: await crmAssignLead(id, ownerId, user.id) });
    }

    if (action === "convert") {
      if (!can(user.role, "crm.convert_lead")) {
        return NextResponse.json(
          { error: "Chỉ AE / Founder được chuyển lead thành cơ hội." },
          { status: 403 }
        );
      }
      const ownerId = body.owner_id ? Number(body.owner_id) : lead.owner_id ?? user.id;
      const opp = await crmCreateOpportunity({
        lead_id: id,
        company_name: String(body.company_name || lead.company_name),
        title: String(body.title || ""),
        standard: (body.standard === "FDA" || body.standard === "GACC"
          ? body.standard
          : null) as Standard | null,
        value: Number(body.value || 0),
        owner_id: ownerId,
        team_id: lead.team_id ?? user.team_id,
        expected_close_date: body.expected_close_date
          ? String(body.expected_close_date).slice(0, 10)
          : null,
        next_action: String(body.next_action || ""),
        next_action_due: body.next_action_due ? String(body.next_action_due).slice(0, 10) : null,
        next_action_owner_id: ownerId,
        created_by: user.id,
      });
      return NextResponse.json({ item: await crmGetLead(id), opportunity: opp });
    }

    const cur = lead;
    const pick = (key: string, fallback: unknown) =>
      body[key] === undefined ? fallback : body[key];
    const updated = await crmUpdateLead(id, {
      company_name: String(pick("company_name", cur.company_name)),
      contact_name: String(pick("contact_name", cur.contact_name)),
      contact_title: String(pick("contact_title", cur.contact_title)),
      email: String(pick("email", cur.email)),
      phone: String(pick("phone", cur.phone)),
      website: String(pick("website", cur.website)),
      address: String(pick("address", cur.address)),
      country: String(pick("country", cur.country)),
      industry: String(pick("industry", cur.industry)),
      employee_size: String(pick("employee_size", cur.employee_size)),
      annual_revenue: String(pick("annual_revenue", cur.annual_revenue)),
      main_products: String(pick("main_products", cur.main_products)),
      target_market: String(pick("target_market", cur.target_market)),
      current_standards: String(pick("current_standards", cur.current_standards)),
      pain_points: String(pick("pain_points", cur.pain_points)),
      notes: String(pick("notes", cur.notes)),
      source: String(pick("source", cur.source)) as LeadSource,
      source_detail: String(pick("source_detail", cur.source_detail)),
      status: String(pick("status", cur.status)) as LeadStatus,
      quality_score: Number(pick("quality_score", cur.quality_score)),
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    return fail(e);
  }
}
