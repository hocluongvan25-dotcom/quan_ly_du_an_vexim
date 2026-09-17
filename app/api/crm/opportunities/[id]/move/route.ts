import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCrmOpportunity, getCrmStageById, listCrmPipelines, moveCrmOpportunity } from "@/lib/db";
import { canMutateOpportunity } from "@/lib/crm-types";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/crm/opportunities/[id]/move — chuyển giai đoạn (kèm kiểm tra exit criteria)
// Body: { to_stage_id | to_stage_key, checklist: {key: bool}, note, lost_reason }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const opp = await getCrmOpportunity(Number(params.id));
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    if (!canMutateOpportunity(user, opp)) {
      return NextResponse.json({ error: "Chỉ Owner hoặc Admin mới được chuyển giai đoạn." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    let toStageId = body.to_stage_id ? Number(body.to_stage_id) : 0;
    if (!toStageId && body.to_stage_key) {
      const pipelines = await listCrmPipelines();
      const pipe = pipelines.find((p) => p.id === opp.pipeline_id);
      const st = pipe?.stages?.find((s) => s.key === String(body.to_stage_key));
      if (st) toStageId = st.id;
    }
    if (!toStageId) return NextResponse.json({ error: "Thiếu giai đoạn đích." }, { status: 400 });
    const toStage = await getCrmStageById(toStageId);
    if (!toStage) return NextResponse.json({ error: "Giai đoạn không tồn tại." }, { status: 400 });

    const checklist: Record<string, boolean> = {};
    if (body.checklist && typeof body.checklist === "object") {
      for (const [k, v] of Object.entries(body.checklist)) checklist[k] = !!v;
    }

    const updated = await moveCrmOpportunity(
      opp.id,
      toStageId,
      checklist,
      String(body.note || ""),
      String(body.lost_reason || ""),
      user.id
    );
    return NextResponse.json({ success: true, opp: updated });
  } catch (e: any) {
    if (e?.code === "TRANSITION_BLOCKED") {
      return NextResponse.json(
        { error: e.message, missing: e.missing || [], code: "TRANSITION_BLOCKED" },
        { status: 400 }
      );
    }
    return handleApiError(e);
  }
}
