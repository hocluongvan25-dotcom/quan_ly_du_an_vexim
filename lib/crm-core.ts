/**
 * Logic thuần (không phụ thuộc DB) dùng chung cho backend SQLite và Supabase:
 * chuẩn hoá bản ghi, tính stale/overdue và tính toán dashboard CRM.
 */

import {
  STAGE_PROBABILITY,
  STALE_DAYS,
  type CrmActivity,
  type CrmLead,
  type CrmOpportunity,
  type LeadSource,
  type OpportunityStage,
} from "./types";
import type { CrmScopeFilter } from "./permissions";

export type OppRow = CrmOpportunity & { stale: number; action_overdue: number };

export function daysSince(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  const raw = String(value).trim().replace(" ", "T");
  const t = new Date(raw.endsWith("Z") ? raw : raw + "Z");
  if (Number.isNaN(t.getTime())) return null;
  return Math.floor((now.getTime() - t.getTime()) / 86400000);
}

/** Opportunity đang mở mà ≥ STALE_DAYS ngày không có hoạt động → "bị bỏ quên". */
export function isStaleOpp(o: { stage: OpportunityStage; last_activity_at: string | null }, now = new Date()) {
  if (o.stage === "won" || o.stage === "lost") return false;
  const d = daysSince(o.last_activity_at, now);
  if (d === null) return true;
  return d >= STALE_DAYS;
}

/** Next action đã quá hạn mà opportunity vẫn đang mở. */
export function isOverdueAction(o: { stage: OpportunityStage; next_action_due: string | null }, now = new Date()) {
  if (!o.next_action_due || o.stage === "won" || o.stage === "lost") return false;
  const due = new Date(String(o.next_action_due).slice(0, 10) + "T23:59:59Z");
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function hydrateOpp(row: CrmOpportunity): OppRow {
  return {
    ...row,
    value: Number(row.value || 0),
    probability: Number(row.probability ?? 0),
    stale: isStaleOpp(row) ? 1 : 0,
    action_overdue: isOverdueAction(row) ? 1 : 0,
  };
}

export function isOpen(o: { stage: OpportunityStage }) {
  return o.stage !== "won" && o.stage !== "lost";
}

/** Lọc bản ghi theo scope (all / team / owned) — giống hệt mệnh đề WHERE ở SQLite. */
export function scopeMatch(
  f: CrmScopeFilter,
  rec: { owner_id: number | null; created_by: number; team_id: number | null }
) {
  if (f.scope === "all") return true;
  if (f.scope === "team") {
    if (f.teamId != null && rec.team_id != null && rec.team_id === f.teamId) return true;
    return rec.owner_id === f.userId || rec.created_by === f.userId;
  }
  return rec.owner_id === null || rec.owner_id === f.userId || rec.created_by === f.userId;
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function withinDays(value: string | null | undefined, now: Date, days: number) {
  const d = daysSince(value, now);
  return d !== null && d <= days && d >= 0;
}

function sameMonth(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const d = new Date(String(value).replace(" ", "T") + (String(value).endsWith("Z") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

export function oppBrief(o: CrmOpportunity) {
  return {
    id: o.id,
    code: o.code,
    title: o.title,
    company_name: o.company_name,
    stage: o.stage,
    value: Number(o.value || 0),
    owner_name: o.owner_name || "Chưa có owner",
    next_action: o.next_action || "",
    next_action_due: o.next_action_due,
    last_activity_at: o.last_activity_at,
    expected_close_date: o.expected_close_date,
    stale: isStaleOpp(o) ? 1 : 0,
    action_overdue: isOverdueAction(o) ? 1 : 0,
  };
}

/**
 * Dashboard CRM theo spec của Founder:
 * Total Pipeline Value · New Leads · Opportunities by Stage ·
 * Stale Opportunities · Conversion Rate · Expected Revenue
 */
export function computeCrmStats(oppsRaw: CrmOpportunity[], leads: CrmLead[]) {
  const now = new Date();
  const opps = oppsRaw.map(hydrateOpp);
  const open = opps.filter(isOpen);
  const won = opps.filter((o) => o.stage === "won");
  const lost = opps.filter((o) => o.stage === "lost");

  const pipelineValue = open.reduce((s, o) => s + o.value, 0);
  const weighted = open.reduce((s, o) => s + (o.value * o.probability) / 100, 0);
  const wonValue = won.reduce((s, o) => s + o.value, 0);

  const byStage = (
    ["contacted", "qualified", "proposal", "negotiation", "won", "lost"] as OpportunityStage[]
  ).map((stage) => {
    const rows = opps.filter((o) => o.stage === stage);
    return { stage, count: rows.length, value: rows.reduce((s, o) => s + o.value, 0) };
  });

  const stale = opps.filter((o) => isStaleOpp(o, now));
  const noAction = open.filter((o) => !String(o.next_action || "").trim());
  const noOwner = opps.filter((o) => !o.owner_id);
  const overdue = opps.filter((o) => isOverdueAction(o, now));
  const untouchedLeads = leads.filter(
    (l) =>
      l.status !== "converted" &&
      l.status !== "unqualified" &&
      !withinDays(l.created_at, now, 7) &&
      !withinDays(l.last_activity_at, now, 7)
  );

  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const decided = won.length + lost.length;

  const bySource = Object.entries(
    leads.reduce<Record<string, { count: number; converted: number }>>((acc, l) => {
      const key: LeadSource = l.source || "other";
      const cur = acc[key] || { count: 0, converted: 0 };
      cur.count += 1;
      if (l.status === "converted") cur.converted += 1;
      acc[key] = cur;
      return acc;
    }, {})
  ).map(([source, v]) => ({
    source,
    count: v.count,
    converted: v.converted,
    rate: v.count ? round1((v.converted / v.count) * 100) : 0,
  }));

  return {
    now: now.toISOString(),
    totals: {
      leads: leads.length,
      newLeads30d: leads.filter((l) => withinDays(l.created_at, now, 30)).length,
      leadsThisMonth: leads.filter((l) => sameMonth(l.created_at, now)).length,
      opportunities: opps.length,
      openOpportunities: open.length,
      won: won.length,
      lost: lost.length,
      pipelineValue: Math.round(pipelineValue),
      weightedPipeline: Math.round(weighted),
      wonValue: Math.round(wonValue),
      lostValue: Math.round(lost.reduce((s, o) => s + o.value, 0)),
      expectedRevenue: Math.round(weighted + wonValue),
      avgDeal: Math.round(won.length ? wonValue / won.length : 0),
    },
    rates: {
      leadToOpp: round1(leads.length ? (convertedLeads / leads.length) * 100 : 0),
      winRate: round1(decided ? (won.length / decided) * 100 : 0),
      conversionRate: round1(opps.length ? (won.length / opps.length) * 100 : 0),
    },
    byStage,
    bySource,
    health: {
      staleCount: stale.length,
      stale: stale.map(oppBrief),
      noActionCount: noAction.length,
      noAction: noAction.map(oppBrief),
      noOwnerCount: noOwner.length,
      overdueCount: overdue.length,
      overdue: overdue.map(oppBrief),
      untouchedLeadsCount: untouchedLeads.length,
      untouchedLeads: untouchedLeads
        .map((l) => ({
          id: l.id,
          code: l.code,
          company_name: l.company_name,
          status: l.status,
          owner_name: l.owner_name || null,
          created_at: l.created_at,
          age_days: daysSince(l.last_activity_at || l.created_at, now),
        }))
        .slice(0, 10),
    },
    recent: opps
      .slice()
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 6)
      .map(oppBrief),
  };
}

export type CrmStats = ReturnType<typeof computeCrmStats>;

/** Bảng hiệu suất theo từng member — Founder/AE dùng để biết ai đang tắc ở đâu. */
export function computePerformance(
  people: Array<{ id: number; name: string; email: string; role: string; team_id: number | null }>,
  oppsRaw: CrmOpportunity[],
  leads: CrmLead[],
  activities: CrmActivity[]
) {
  const now = new Date();
  const opps = oppsRaw.map(hydrateOpp);
  return people.map((u) => {
    const own = opps.filter((o) => o.owner_id === u.id);
    const openOwn = own.filter(isOpen);
    const wonOwn = own.filter((o) => o.stage === "won");
    const lostOwn = own.filter((o) => o.stage === "lost");
    const acts = activities.filter((a) => a.created_by === u.id);
    const created = leads.filter((l) => l.created_by === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      team_id: u.team_id,
      leads_created: created.length,
      leads_converted: created.filter((l) => l.status === "converted").length,
      activities_30d: acts.filter((a) => withinDays(a.performed_at, now, 30)).length,
      opportunities: own.length,
      open_opportunities: openOwn.length,
      open_value: Math.round(openOwn.reduce((s, o) => s + o.value, 0)),
      weighted_value: Math.round(openOwn.reduce((s, o) => s + (o.value * o.probability) / 100, 0)),
      won: wonOwn.length,
      won_value: Math.round(wonOwn.reduce((s, o) => s + o.value, 0)),
      lost: lostOwn.length,
      win_rate: round1(
        wonOwn.length + lostOwn.length ? (wonOwn.length / (wonOwn.length + lostOwn.length)) * 100 : 0
      ),
      stale: openOwn.filter((o) => isStaleOpp(o, now)).length,
      overdue_actions: openOwn.filter((o) => isOverdueAction(o, now)).length,
    };
  });
}

export { STAGE_PROBABILITY, STALE_DAYS };
