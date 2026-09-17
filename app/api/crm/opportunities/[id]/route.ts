import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  crmAssignOpportunity,
  crmChangeStage,
  crmDeleteOpportunity,
  crmGetOpportunity,
  crmLinkCertificate,
  crmSetNextAction,
  crmTimeline,
  crmUpdateOpportunity,
} from "@/lib/db";
import { can, canSeeRecord } from "@/lib/permissions";
import { CRM_STAGES, type OpportunityStage, type Standard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "Không tìm thấy cơ hội.",
  LOST_REASON: "Phải ghi rõ lý do mất deal để đội sales học được từ thất bại.",
  ALREADY_WON: "Cơ hội đã thắng, không mở lại được (chỉ có thể đánh dấu Lost).",
  NO_ACTION: "Next action không được để trống.",
  OWNER_NOT_FOUND: "Không tìm thấy owner.",
  WON_LOCKED: "Không xoá được cơ hội đã thắng — đó là khách hàng của Vexim.",
  NO_COMPANY: "Thiếu tên doanh nghiệp.",
};

export async function GET(_: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = Number(ctx.params.id);
  const item = await crmGetOpportunity(id);
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!canSeeRecord(user, item)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const timeline = await crmTimeline(id);
  return NextResponse.json({ item, ...timeline });
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = Number(ctx.params.id);
  const item = await crmGetOpportunity(id);
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (!canSeeRecord(user, item)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "stage") {
      if (!can(user.role, "crm.change_stage")) {
        return NextResponse.json(
          { error: "Chỉ owner / AE / Founder được đổi stage." },
          { status: 403 }
        );
      }
      const stage = String(body.stage) as OpportunityStage;
      if (!CRM_STAGES.some((s) => s.key === stage)) {
        return NextResponse.json({ error: "Stage không hợp lệ." }, { status: 400 });
      }
      const updated = await crmChangeStage(id, stage, user.id, String(body.note || ""), {
        lost_reason: String(body.lost_reason || ""),
        certificate_id: body.certificate_id ? Number(body.certificate_id) : undefined,
      });
      return NextResponse.json({ item: updated });
    }

    if (action === "next_action") {
      const updated = await crmSetNextAction(id, {
        next_action: String(body.next_action || ""),
        next_action_due: body.next_action_due ? String(body.next_action_due).slice(0, 10) : null,
        next_action_owner_id: body.next_action_owner_id
          ? Number(body.next_action_owner_id)
          : undefined,
      });
      return NextResponse.json({ item: updated });
    }

    if (action === "assign") {
      if (!can(user.role, "crm.reassign")) {
        return NextResponse.json(
          { error: "Chỉ AE / Founder được đổi chủ cơ hội." },
          { status: 403 }
        );
      }
      const ownerId = Number(body.owner_id);
      if (!ownerId) return NextResponse.json({ error: "Thiếu owner." }, { status: 400 });
      return NextResponse.json({ item: await crmAssignOpportunity(id, ownerId, user.id) });
    }

    if (action === "link_certificate") {
      const certificateId = Number(body.certificate_id);
      if (!certificateId) {
        return NextResponse.json({ error: "Thiếu hồ sơ." }, { status: 400 });
      }
      return NextResponse.json({ item: await crmLinkCertificate(id, certificateId) });
    }

    const updated = await crmUpdateOpportunity(id, {
      title: body.title === undefined ? undefined : String(body.title),
      company_name: body.company_name === undefined ? undefined : String(body.company_name),
      standard:
        body.standard === undefined
          ? undefined
          : body.standard === "FDA" || body.standard === "GACC"
            ? (body.standard as Standard)
            : null,
      value: body.value === undefined ? undefined : Number(body.value || 0),
      owner_id: body.owner_id === undefined ? undefined : body.owner_id ? Number(body.owner_id) : null,
      expected_close_date:
        body.expected_close_date === undefined
          ? undefined
          : body.expected_close_date
            ? String(body.expected_close_date).slice(0, 10)
            : null,
      next_action: body.next_action === undefined ? undefined : String(body.next_action),
      next_action_due:
        body.next_action_due === undefined
          ? undefined
          : body.next_action_due
            ? String(body.next_action_due).slice(0, 10)
            : null,
      next_action_owner_id:
        body.next_action_owner_id === undefined
          ? undefined
          : body.next_action_owner_id
            ? Number(body.next_action_owner_id)
            : null,
    });
    return NextResponse.json({ item: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    return NextResponse.json({ error: ERROR_MAP[msg] || msg }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "crm.reassign")) {
    return NextResponse.json({ error: "Chỉ AE / Founder được xoá cơ hội." }, { status: 403 });
  }
  try {
    await crmDeleteOpportunity(Number(ctx.params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    return NextResponse.json({ error: ERROR_MAP[msg] || msg }, { status: 400 });
  }
}
