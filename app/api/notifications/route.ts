import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCrmOpportunities, listCertificates, isCrmSchemaError } from "@/lib/db";
import type { CrmOpportunityEnriched } from "@/lib/crm-types";
import { daysBetween, normCompany, todayUtcIso } from "@/lib/utils";

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

// Hẹn đến hạn, hồ sơ cần tạo và cơ hội cần theo dõi.
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const scope = sp.get("scope") || (user.role === "admin" ? "all" : "mine");

    let openOpps: CrmOpportunityEnriched[] = [];
    try {
      openOpps = await listCrmOpportunities({
        stage_filter: "open",
        owner_id: scope === "mine" ? user.id : undefined,
      });
    } catch (error) {
      if (!isCrmSchemaError(error)) throw error;
    }

    const followups = openOpps
      .filter((opp) => opp.next_action_date && opp.days_to_followup !== null && opp.days_to_followup <= 0)
      .sort((a, b) => (a.days_to_followup ?? 0) - (b.days_to_followup ?? 0));

    const alerts = openOpps
      .filter((opp) => opp.alerts.length > 0)
      .sort((a, b) => {
        const rank = (opp: CrmOpportunityEnriched) => (opp.health === "danger" ? 0 : 1);
        return rank(a) - rank(b) || b.days_in_stage - a.days_in_stage;
      });

    let missingRecords: Array<ReturnType<typeof slimOpp> & { waiting_days: number }> = [];
    try {
      const wonOpps = await listCrmOpportunities({ stage_filter: "won" });
      const targets = wonOpps.filter((opp) =>
        (scope !== "mine" || opp.owner_id === user.id) && ["FDA", "GACC"].includes(opp.pipeline_key)
      );
      if (targets.length) {
        const certificates = await listCertificates().catch(() => [] as Awaited<ReturnType<typeof listCertificates>>);
        const haveCert = new Set(certificates.map((cert) => `${cert.standard}|${normCompany(cert.company_name || "")}`));
        const today = todayUtcIso();
        missingRecords = targets
          .filter((opp) => !haveCert.has(`${opp.pipeline_key}|${normCompany(opp.company_name || "")}`))
          .map((opp) => ({
            ...slimOpp(opp),
            waiting_days: Math.max(0, daysBetween(String(opp.updated_at).slice(0, 10), today)),
          }))
          .sort((a, b) => b.waiting_days - a.waiting_days);
      }
    } catch (error) {
      if (!isCrmSchemaError(error)) throw error;
    }

    return NextResponse.json({
      scope,
      followups: followups.slice(0, PAGE).map(slimOpp),
      missingRecords: missingRecords.slice(0, PAGE),
      alerts: alerts.slice(0, PAGE).map(slimOpp),
      counts: {
        followups: followups.length,
        missingRecords: missingRecords.length,
        alerts: alerts.length,
      },
    });
  } catch (error: any) {
    console.error("[Notifications] error:", error?.message || error);
    return NextResponse.json({
      scope: "mine",
      followups: [],
      missingRecords: [],
      alerts: [],
      counts: { followups: 0, missingRecords: 0, alerts: 0 },
    });
  }
}
