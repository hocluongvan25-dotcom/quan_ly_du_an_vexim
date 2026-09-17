import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCrmOpportunities, listLeads, listCertificates, isCrmSchemaError } from "@/lib/db";
import type { CrmOpportunityEnriched } from "@/lib/crm-types";
import { daysBetween, todayUtcIso } from "@/lib/utils";

/** Chuẩn hóa tên công ty để khớp deal ↔ hồ sơ */
function normCompany(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 20;

function slimOpp(o: CrmOpportunityEnriched) {
  return {
    id: o.id,
    company_name: o.company_name,
    contact_name: o.contact_name,
    contact_phone: o.contact_phone,
    contact_email: o.contact_email,
    estimated_value: o.estimated_value,
    pipeline_key: o.pipeline_key,
    stage_name: o.stage_name,
    stage_color: o.stage_color,
    owner_id: o.owner_id,
    owner_name: o.owner_name || "Chưa gán",
    next_action: o.next_action,
    next_action_date: o.next_action_date,
    days_to_followup: o.days_to_followup,
    days_in_stage: o.days_in_stage,
    days_since_activity: o.days_since_activity,
    alerts: o.alerts,
    health: o.health,
  };
}

// GET /api/notifications?scope=mine|all — trung tâm thông báo cá nhân hóa
// - followups: hẹn follow-up đến hạn hôm nay + đã trễ
// - missingRecords: deal FDA/GACC đã chốt mà chưa có hồ sơ (quét trực tiếp, tạo xong tự hết)
// - alerts: cơ hội quá SLA / bị bỏ quên / thiếu next action
// - leads: leads tư vấn mới chưa xử lý
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const scope = sp.get("scope") || (user.role === "admin" ? "all" : "mine");

    let opps: CrmOpportunityEnriched[] = [];
    try {
      opps = await listCrmOpportunities({
        stage_filter: "open",
        owner_id: scope === "mine" ? user.id : undefined,
      });
    } catch (e) {
      if (!isCrmSchemaError(e)) throw e;
      // Chưa chạy migration CRM → trả rỗng, không làm vỡ chuông
    }

    // Hẹn đến hạn (<= hôm nay), trễ nhất lên trước
    const followups = opps
      .filter((o) => o.next_action_date && o.days_to_followup !== null && o.days_to_followup <= 0)
      .sort((a, b) => (a.days_to_followup ?? 0) - (b.days_to_followup ?? 0));

    // Cảnh báo: quá SLA / bỏ quên / thiếu next action — nguy hiểm trước
    const alerts = opps
      .filter((o) => o.alerts.length > 0)
      .sort((a, b) => {
        const rank = (o: CrmOpportunityEnriched) => (o.health === "danger" ? 0 : 1);
        return rank(a) - rank(b) || b.days_in_stage - a.days_in_stage;
      });

    // Deal FDA/GACC đã chốt nhưng chưa có hồ sơ cùng công ty + cùng chuẩn
    let missingRecords: any[] = [];
    try {
      const wonOpps = await listCrmOpportunities({ stage_filter: "won" });
      const mine = scope === "mine" ? wonOpps.filter((o) => o.owner_id === user.id) : wonOpps;
      const targets = mine.filter((o) => o.pipeline_key === "FDA" || o.pipeline_key === "GACC");
      if (targets.length > 0) {
        const certs = await listCertificates();
        const have = new Set(
          certs.map((c) => `${c.standard}|${normCompany(c.company_name || "")}`)
        );
        const today = todayUtcIso();
        missingRecords = targets
          .filter((o) => !have.has(`${o.pipeline_key}|${normCompany(o.company_name || "")}`))
          .map((o) => ({
            ...slimOpp(o),
            waiting_days: Math.max(0, daysBetween(String(o.updated_at).slice(0, 10), today)),
          }))
          .sort((a, b) => b.waiting_days - a.waiting_days);
      }
    } catch (e) {
      if (!isCrmSchemaError(e)) throw e;
    }

    let leads: any[] = [];
    try {
      const all = await listLeads();
      leads = all
        .filter((l) => l.status === "new")
        .sort((a, b) => (String(a.created_at) < String(b.created_at) ? 1 : -1));
    } catch {
      leads = [];
    }

    return NextResponse.json({
      scope,
      followups: followups.slice(0, PAGE).map(slimOpp),
      missingRecords: missingRecords.slice(0, PAGE),
      alerts: alerts.slice(0, PAGE).map(slimOpp),
      leads: leads.slice(0, 10).map((l) => ({
        id: l.id,
        service_type: l.service_type,
        name: l.name,
        phone: l.phone,
        company_name: l.company_name,
        status: l.status,
        created_at: l.created_at,
      })),
      counts: {
        followups: followups.length,
        missingRecords: missingRecords.length,
        alerts: alerts.length,
        leads: leads.length,
      },
    });
  } catch (e: any) {
    // Chuông nằm trên mọi trang → không bao giờ được 500
    console.error("[Notifications] error:", e?.message || e);
    return NextResponse.json({
      scope: "mine",
      followups: [],
      missingRecords: [],
      alerts: [],
      leads: [],
      counts: { followups: 0, missingRecords: 0, alerts: 0, leads: 0 },
    });
  }
}
