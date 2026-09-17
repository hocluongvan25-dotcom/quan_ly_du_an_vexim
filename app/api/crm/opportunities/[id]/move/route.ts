import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createServiceContract,
  getCrmOpportunity,
  getCrmStageById,
  listCrmPipelines,
  listServiceContracts,
  moveCrmOpportunity,
} from "@/lib/db";
import { canMutateOpportunity } from "@/lib/crm-types";
import { normCompany, todayUtcIso } from "@/lib/utils";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/crm/opportunities/[id]/move — chuyển giai đoạn (kèm kiểm tra exit criteria)
// Body: { to_stage_id | to_stage_key, checklist: {key: bool}, note, lost_reason }
// Chốt deal Sale/Amazon → tự sinh hợp đồng (ngày bắt đầu = hôm nay, chu kỳ mặc định 6 tháng,
// sale xác nhận/chỉnh trong popup ăn mừng). Không bao giờ làm fail việc chuyển giai đoạn.
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

    // Tự sinh hợp đồng khi chốt deal dịch vụ
    let autoContract: { id: number; contract_no: string; started_at: string; cycle_months: number } | null = null;
    const pipeKey = (updated as any).pipeline_key || "";
    if (toStage.is_won && (pipeKey === "SALE_EXPORT" || pipeKey === "AMAZON_OPS")) {
      try {
        const existing = await listServiceContracts({ service_type: pipeKey });
        const same = existing.find(
          (c) => normCompany(c.company_name || "") === normCompany(updated.company_name || "")
        );
        if (same) {
          autoContract = {
            id: same.id,
            contract_no: same.contract_no,
            started_at: String(same.started_at).slice(0, 10),
            cycle_months: same.cycle_months,
          };
        } else {
          const cid = await createServiceContract(
            {
              service_type: pipeKey,
              company_name: updated.company_name || "",
              company_email: (updated as any).contact_email || "",
              contact_name: (updated as any).contact_name || "",
              contact_phone: (updated as any).contact_phone || "",
              scope: String((updated as any).notes || ""),
              cycle_months: 6,
              started_at: todayUtcIso(),
              contract_value: Number((updated as any).estimated_value || 0),
              opportunity_id: updated.id,
            },
            user.id
          );
          // Lấy mã HĐ vừa sinh
          const created = (await listServiceContracts({ service_type: pipeKey })).find((c) => c.id === cid);
          autoContract = {
            id: cid,
            contract_no: created?.contract_no || "",
            started_at: todayUtcIso(),
            cycle_months: 6,
          };
        }
      } catch (e) {
        console.error("[Move] auto-create contract failed:", (e as any)?.message || e);
      }
    }

    return NextResponse.json({ success: true, opp: updated, autoContract });
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
