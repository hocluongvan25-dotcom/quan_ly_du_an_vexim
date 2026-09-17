import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCrmOpportunity,
  updateCrmOpportunity,
  deleteCrmOpportunity,
  listCrmHistory,
  listCrmActivities,
  listCrmChecklists,
  listCrmPipelines,
  isCrmSchemaError,
} from "@/lib/db";
import { canMutateOpportunity, canDeleteOpportunity, canReassignOwner } from "@/lib/crm-types";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/crm/opportunities/[id] — chi tiết + history + activities + checklist
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const opp = await getCrmOpportunity(Number(params.id));
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    const [history, activities, checklists, pipelines] = await Promise.all([
      listCrmHistory(opp.id),
      listCrmActivities(opp.id),
      listCrmChecklists(opp.id),
      listCrmPipelines(),
    ]);
    const pipeline = pipelines.find((p) => p.id === opp.pipeline_id);
    return NextResponse.json({
      opp,
      pipeline,
      history,
      activities,
      checklists,
      permissions: {
        canEdit: canMutateOpportunity(user, opp),
        canDelete: canDeleteOpportunity(user),
        canReassign: canReassignOwner(user),
      },
    });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: "CRM tables missing — hãy chạy migration." }, { status: 500 });
    return handleApiError(e);
  }
}

// PATCH /api/crm/opportunities/[id] — sửa thông tin (owner hoặc admin)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const opp = await getCrmOpportunity(Number(params.id));
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    if (!canMutateOpportunity(user, opp)) {
      return NextResponse.json({ error: "Chỉ Owner hoặc Admin mới được sửa cơ hội này." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    // Đổi owner: chỉ admin
    if (body.owner_id !== undefined && Number(body.owner_id) !== (opp.owner_id ?? null)) {
      if (!canReassignOwner(user)) {
        return NextResponse.json({ error: "Chỉ Admin mới được đổi Owner." }, { status: 403 });
      }
    }
    await updateCrmOpportunity(opp.id, {
      title: body.title !== undefined ? String(body.title) : undefined,
      company_name: body.company_name !== undefined ? String(body.company_name) : undefined,
      contact_name: body.contact_name !== undefined ? String(body.contact_name) : undefined,
      contact_phone: body.contact_phone !== undefined ? String(body.contact_phone) : undefined,
      contact_email: body.contact_email !== undefined ? String(body.contact_email) : undefined,
      industry: body.industry !== undefined ? String(body.industry) : undefined,
      source: body.source !== undefined ? String(body.source) : undefined,
      estimated_value: body.estimated_value !== undefined ? Number(body.estimated_value) : undefined,
      owner_id: body.owner_id !== undefined ? (body.owner_id === null || body.owner_id === "" ? null : Number(body.owner_id)) : undefined,
      next_action: body.next_action !== undefined ? String(body.next_action) : undefined,
      next_action_date: body.next_action_date !== undefined ? (body.next_action_date ? String(body.next_action_date).slice(0, 10) : null) : undefined,
      expected_close_date: body.expected_close_date !== undefined ? (body.expected_close_date ? String(body.expected_close_date).slice(0, 10) : null) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : undefined,
    });
    const updated = await getCrmOpportunity(opp.id);
    return NextResponse.json({ success: true, opp: updated });
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE /api/crm/opportunities/[id] — chỉ admin
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canDeleteOpportunity(user)) {
      return NextResponse.json({ error: "Chỉ Admin mới được xóa cơ hội." }, { status: 403 });
    }
    await deleteCrmOpportunity(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
