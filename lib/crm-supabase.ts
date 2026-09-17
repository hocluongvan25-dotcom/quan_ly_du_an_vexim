/**
 * VEXIM CRM — tầng dữ liệu Supabase (dùng khi đã cấu hình biến môi trường Supabase).
 * Cùng chữ ký hàm với crm-sqlite để lib/db.ts chuyển đổi trong suốt.
 */

import { hashPassword } from "./auth";
import {
  STAGE_PROBABILITY,
  type ActivityType,
  type CrmActivity,
  type CrmLead,
  type CrmOpportunity,
  type CrmStageEvent,
  type LeadSource,
  type LeadStatus,
  type OpportunityStage,
  type Role,
  type Standard,
} from "./types";
import { buildFollowUps, computeCrmStats, computePerformance, hydrateOpp, scopeMatch } from "./crm-core";
import type { CrmScopeFilter } from "./permissions";
import { supabaseAdmin } from "./supabase";
import { ensureSeed } from "./db-supabase";

/**
 * Cột embed của PostgREST.
 *
 * Lưu ý về crm_leads → crm_opportunities: quan hệ này KHÔNG được embed bằng cú pháp
 * `bảng!tên_khoá_ngoại`, vì nếu database chưa có khoá ngoại (hoặc PostgREST chưa nạp lại
 * schema cache) thì PostgREST trả lỗi và **mọi truy vấn lead đều chết**:
 *
 *   PGRST200 · Could not find a relationship between 'crm_leads' and 'crm_opportunities'
 *              in the schema cache
 *
 * Vì vậy `converted_opportunity` được nạp riêng trong `attachOpportunityCodes()` — thiếu
 * khoá ngoại thì chỉ mất cột mã cơ hội, không làm hỏng trang lead. Khoá ngoại vẫn nên có,
 * xem `supabase/schema-crm.sql` mục 7.
 */
const LEAD_COLS = `*, created_by_user:staff_users!crm_leads_created_by_fkey(name),
  owner_user:staff_users!crm_leads_owner_id_fkey(name)`;

const OPP_COLS = `*, owner_user:staff_users!crm_opportunities_owner_id_fkey(name),
  next_action_owner_user:staff_users!crm_opportunities_next_action_owner_id_fkey(name),
  lead:crm_leads!crm_opportunities_lead_id_fkey(code, company_name)`;

const ACTIVITY_COLS = `*, created_by_user:staff_users!crm_activities_created_by_fkey(name),
  opportunity:crm_opportunities(company_name), lead:crm_leads(company_name)`;

function str(v: unknown) {
  return v == null ? "" : String(v);
}
function num(v: unknown) {
  return Number(v || 0);
}
function idOrNull(v: unknown) {
  return v == null ? null : Number(v);
}
function first(v: unknown): Record<string, unknown> | null {
  if (Array.isArray(v)) return (v[0] as Record<string, unknown>) || null;
  return (v as Record<string, unknown>) || null;
}

/**
 * Điền `opportunity_code` cho các lead đã chuyển đổi — truy vấn riêng thay cho embed
 * quan hệ, để thiếu khoá ngoại không làm hỏng trang.
 */
async function attachOpportunityCodes(leads: CrmLead[]): Promise<CrmLead[]> {
  const ids = Array.from(
    new Set(leads.map((l) => l.converted_opportunity_id).filter((id): id is number => id != null))
  );
  if (!ids.length) return leads;
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .select("id, code")
    .in("id", ids);
  if (error) return leads;
  const byId = new Map((data || []).map((r) => [Number(r.id), str(r.code)]));
  for (const lead of leads) {
    if (lead.converted_opportunity_id != null) {
      lead.opportunity_code = byId.get(lead.converted_opportunity_id) || undefined;
    }
  }
  return leads;
}

function mapLead(row: Record<string, unknown>): CrmLead {
  const createdBy = first(row.created_by_user);
  const owner = first(row.owner_user);
  const opp = first(row.converted_opportunity);
  return {
    id: num(row.id),
    code: str(row.code),
    company_name: str(row.company_name),
    contact_name: str(row.contact_name),
    contact_title: str(row.contact_title),
    email: str(row.email),
    phone: str(row.phone),
    website: str(row.website),
    address: str(row.address),
    country: str(row.country),
    industry: str(row.industry),
    employee_size: str(row.employee_size),
    annual_revenue: str(row.annual_revenue),
    main_products: str(row.main_products),
    target_market: str(row.target_market),
    current_standards: str(row.current_standards),
    pain_points: str(row.pain_points),
    notes: str(row.notes),
    source: (str(row.source) || "other") as LeadSource,
    source_detail: str(row.source_detail),
    status: (str(row.status) || "new") as LeadStatus,
    quality_score: num(row.quality_score),
    created_by: num(row.created_by),
    owner_id: idOrNull(row.owner_id),
    team_id: idOrNull(row.team_id),
    assigned_at: row.assigned_at ? str(row.assigned_at) : null,
    last_activity_at: row.last_activity_at ? str(row.last_activity_at) : null,
    converted_opportunity_id: idOrNull(row.converted_opportunity_id),
    certificate_id: idOrNull(row.certificate_id),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    created_by_name: createdBy ? str(createdBy.name) : undefined,
    owner_name: owner ? str(owner.name) : undefined,
    opportunity_code: opp ? str(opp.code) : undefined,
  };
}

function mapOpp(row: Record<string, unknown>): CrmOpportunity {
  const owner = first(row.owner_user);
  const nextOwner = first(row.next_action_owner_user);
  const lead = first(row.lead);
  return {
    id: num(row.id),
    code: str(row.code),
    title: str(row.title),
    lead_id: idOrNull(row.lead_id),
    company_name: str(row.company_name),
    standard: row.standard ? (str(row.standard) as Standard) : null,
    stage: (str(row.stage) || "contacted") as OpportunityStage,
    stage_entered_at: str(row.stage_entered_at),
    stage_changed_by: idOrNull(row.stage_changed_by),
    value: num(row.value),
    probability: num(row.probability),
    currency: str(row.currency) || "VND",
    owner_id: idOrNull(row.owner_id),
    team_id: idOrNull(row.team_id),
    expected_close_date: row.expected_close_date ? str(row.expected_close_date).slice(0, 10) : null,
    closed_at: row.closed_at ? str(row.closed_at) : null,
    lost_reason: str(row.lost_reason),
    next_action: str(row.next_action),
    next_action_due: row.next_action_due ? str(row.next_action_due).slice(0, 10) : null,
    next_action_owner_id: idOrNull(row.next_action_owner_id),
    last_activity_at: row.last_activity_at ? str(row.last_activity_at) : null,
    certificate_id: idOrNull(row.certificate_id),
    created_by: num(row.created_by),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    owner_name: owner ? str(owner.name) : undefined,
    next_action_owner_name: nextOwner ? str(nextOwner.name) : undefined,
    lead_code: lead ? str(lead.code) : undefined,
    lead_company: lead ? str(lead.company_name) : undefined,
  };
}

function mapActivity(row: Record<string, unknown>): CrmActivity {
  const by = first(row.created_by_user);
  const opp = first(row.opportunity);
  const lead = first(row.lead);
  return {
    id: num(row.id),
    lead_id: idOrNull(row.lead_id),
    opportunity_id: idOrNull(row.opportunity_id),
    type: (str(row.type) || "note") as ActivityType,
    subject: str(row.subject),
    content: str(row.content),
    performed_at: str(row.performed_at),
    created_by: num(row.created_by),
    is_follow_up: row.is_follow_up ? 1 : 0,
    due_at: row.due_at ? str(row.due_at).slice(0, 10) : null,
    completed_at: row.completed_at ? str(row.completed_at) : null,
    created_by_name: by ? str(by.name) : undefined,
    company_name: opp ? str(opp.company_name) : lead ? str(lead.company_name) : undefined,
  };
}

/* ---------------- Teams ---------------- */

export async function listTeams() {
  const { data, error } = await supabaseAdmin()
    .from("crm_teams")
    .select("*, ae:staff_users!crm_teams_ae_id_fkey(name)")
    .order("id");
  if (error) throw error;
  const { data: members } = await supabaseAdmin()
    .from("staff_users")
    .select("id, team_id");
  return (data || []).map((t) => {
    const ae = first(t.ae);
    return {
      id: Number(t.id),
      name: str(t.name),
      ae_id: idOrNull(t.ae_id),
      created_at: str(t.created_at),
      ae_name: ae ? str(ae.name) : undefined,
      member_count: (members || []).filter((m) => Number(m.team_id) === Number(t.id)).length,
    };
  });
}

export async function getTeam(id: number) {
  const teams = await listTeams();
  return teams.find((t) => t.id === id);
}

export async function createTeam(input: { name: string; ae_id: number | null }) {
  const { data, error } = await supabaseAdmin()
    .from("crm_teams")
    .insert({ name: input.name.trim(), ae_id: input.ae_id })
    .select("id")
    .single();
  if (error) throw error;
  if (input.ae_id) {
    await supabaseAdmin().from("staff_users").update({ team_id: Number(data.id) }).eq("id", input.ae_id);
  }
  return Number(data.id);
}

export async function setTeamLeader(teamId: number, aeId: number | null) {
  const { error } = await supabaseAdmin().from("crm_teams").update({ ae_id: aeId }).eq("id", teamId);
  if (error) throw error;
  if (aeId) await supabaseAdmin().from("staff_users").update({ team_id: teamId }).eq("id", aeId);
}

/* ---------------- Leads ---------------- */

async function nextCode(table: "crm_leads" | "crm_opportunities", prefix: string) {
  const year = new Date().getFullYear();
  const p = `${prefix}-${year}-`;
  const { data } = await supabaseAdmin()
    .from(table)
    .select("code")
    .like("code", `${p}%`)
    .order("code", { ascending: false })
    .limit(1);
  let seq = 1;
  const last = data?.[0]?.code;
  if (last) {
    const n = Number(String(last).split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${p}${String(seq).padStart(4, "0")}`;
}

export type LeadInput = {
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  country?: string;
  industry?: string;
  employee_size?: string;
  annual_revenue?: string;
  main_products?: string;
  target_market?: string;
  current_standards?: string;
  pain_points?: string;
  notes?: string;
  source?: LeadSource;
  source_detail?: string;
  status?: LeadStatus;
  quality_score?: number;
  owner_id?: number | null;
  team_id?: number | null;
};

function leadPayload(input: LeadInput) {
  const s = (v: unknown) => String(v ?? "").trim();
  return {
    company_name: s(input.company_name),
    contact_name: s(input.contact_name),
    contact_title: s(input.contact_title),
    email: s(input.email).toLowerCase(),
    phone: s(input.phone),
    website: s(input.website),
    address: s(input.address),
    country: s(input.country) || "Việt Nam",
    industry: s(input.industry),
    employee_size: s(input.employee_size),
    annual_revenue: s(input.annual_revenue),
    main_products: s(input.main_products),
    target_market: s(input.target_market),
    current_standards: s(input.current_standards),
    pain_points: s(input.pain_points),
    notes: s(input.notes),
    source: s(input.source) || "other",
    source_detail: s(input.source_detail),
    status: s(input.status) || "new",
    quality_score: Math.max(0, Math.min(5, Math.round(Number(input.quality_score) || 0))),
    owner_id: input.owner_id ?? null,
    team_id: input.team_id ?? null,
  };
}

export async function createLead(input: LeadInput & { created_by: number }) {
  const code = await nextCode("crm_leads", "VXM-L");
  const payload = leadPayload(input);
  const { data, error } = await supabaseAdmin()
    .from("crm_leads")
    .insert({
      ...payload,
      code,
      assigned_at: payload.owner_id ? new Date().toISOString() : null,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  return Number(data.id);
}

export async function listLeads(f: CrmScopeFilter): Promise<CrmLead[]> {
  const { data, error } = await supabaseAdmin()
    .from("crm_leads")
    .select(LEAD_COLS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const leads = (data || [])
    .map(mapLead)
    .filter((l) => scopeMatch(f, { owner_id: l.owner_id, created_by: l.created_by, team_id: l.team_id }));
  return attachOpportunityCodes(leads);
}

export async function getLead(id: number) {
  const { data, error } = await supabaseAdmin()
    .from("crm_leads")
    .select(LEAD_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const [lead] = await attachOpportunityCodes([mapLead(data)]);
  return lead;
}

export async function updateLead(id: number, input: LeadInput) {
  const current = await getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "converted") throw new Error("CONVERTED");
  const payload = leadPayload({ ...current, ...input } as LeadInput);
  const { error } = await supabaseAdmin()
    .from("crm_leads")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return (await getLead(id))!;
}

export async function setLeadStatus(id: number, status: LeadStatus) {
  const current = await getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "converted") throw new Error("CONVERTED");
  const { error } = await supabaseAdmin()
    .from("crm_leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return (await getLead(id))!;
}

export async function assignLead(id: number, ownerId: number | null, actorId: number) {
  const current = await getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  let owner: { id: number; name: string; role: Role; team_id: number | null } | null = null;
  if (ownerId) {
    const { data } = await supabaseAdmin()
      .from("staff_users")
      .select("id, name, role, team_id")
      .eq("id", ownerId)
      .maybeSingle();
    if (!data) throw new Error("OWNER_NOT_FOUND");
    owner = { id: Number(data.id), name: str(data.name), role: data.role as Role, team_id: idOrNull(data.team_id) };
  }
  const { error } = await supabaseAdmin()
    .from("crm_leads")
    .update({
      owner_id: ownerId,
      team_id: owner?.team_id ?? current.team_id,
      assigned_at: ownerId ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await supabaseAdmin().from("crm_activities").insert({
    lead_id: id,
    type: "note",
    subject: owner ? "Phân công lead" : "Bỏ phân công lead",
    content: owner
      ? `AE phân công lead cho ${owner.name} (${owner.role.toUpperCase()}).`
      : `Lead được đưa về trạng thái chưa phân công bởi user #${actorId}.`,
    created_by: actorId,
  });
  return (await getLead(id))!;
}

/* ---------------- Opportunities ---------------- */

export type OpportunityInput = {
  title?: string;
  company_name?: string;
  standard?: Standard | null;
  value?: number;
  owner_id?: number | null;
  team_id?: number | null;
  expected_close_date?: string | null;
  next_action?: string;
  next_action_due?: string | null;
  next_action_owner_id?: number | null;
};

export async function createOpportunity(
  input: OpportunityInput & { created_by: number; lead_id?: number | null }
) {
  const company = String(input.company_name ?? "").trim();
  if (!company) throw new Error("NO_COMPANY");
  const ownerId = input.owner_id ?? input.created_by;
  const code = await nextCode("crm_opportunities", "VXM-O");
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .insert({
      code,
      title: String(input.title ?? "").trim() || `${company} — đăng ký hồ sơ xuất khẩu`,
      lead_id: input.lead_id ?? null,
      company_name: company,
      standard: input.standard ?? null,
      stage: "contacted",
      stage_entered_at: now,
      value: Math.max(0, Math.round(Number(input.value) || 0)),
      probability: STAGE_PROBABILITY.contacted,
      owner_id: ownerId,
      team_id: input.team_id ?? null,
      expected_close_date: input.expected_close_date ?? null,
      next_action: String(input.next_action ?? "").trim(),
      next_action_due: input.next_action_due ?? null,
      next_action_owner_id: input.next_action_owner_id ?? ownerId,
      last_activity_at: now,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  const oppId = Number(data.id);
  await supabaseAdmin().from("crm_stage_events").insert({
    opportunity_id: oppId,
    from_stage: null,
    to_stage: "contacted",
    changed_by: input.created_by,
    note: "Tạo opportunity từ lead.",
  });
  await supabaseAdmin().from("crm_activities").insert({
    lead_id: input.lead_id ?? null,
    opportunity_id: oppId,
    type: "note",
    subject: "Tạo cơ hội",
    content: `Opportunity ${String(input.title ?? company).trim()} được tạo.`,
    created_by: input.created_by,
  });
  if (input.lead_id) {
    await supabaseAdmin()
      .from("crm_leads")
      .update({
        status: "converted",
        converted_opportunity_id: oppId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.lead_id);
  }
  return (await getOpportunity(oppId))!;
}

export async function listOpportunities(f: CrmScopeFilter) {
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .select(OPP_COLS)
    .order("expected_close_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data || [])
    .map(mapOpp)
    .filter((o) => scopeMatch(f, { owner_id: o.owner_id, created_by: o.created_by, team_id: o.team_id }))
    .map(hydrateOpp);
}

export async function getOpportunity(id: number) {
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .select(OPP_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateOpp(mapOpp(data)) : undefined;
}

export async function updateOpportunity(id: number, input: OpportunityInput) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const closed = current.stage === "won" || current.stage === "lost";
  const { error } = await supabaseAdmin()
    .from("crm_opportunities")
    .update({
      title: String(input.title ?? current.title).trim(),
      company_name: String(input.company_name ?? current.company_name).trim(),
      standard: input.standard === undefined ? current.standard : input.standard,
      value: Math.max(0, Math.round(Number(input.value ?? current.value) || 0)),
      owner_id: input.owner_id === undefined ? current.owner_id : input.owner_id,
      team_id: input.team_id === undefined ? current.team_id : input.team_id,
      expected_close_date:
        input.expected_close_date === undefined ? current.expected_close_date : input.expected_close_date,
      next_action: closed
        ? current.next_action
        : String(input.next_action ?? current.next_action).trim(),
      next_action_due: closed
        ? current.next_action_due
        : input.next_action_due === undefined
          ? current.next_action_due
          : input.next_action_due,
      next_action_owner_id:
        input.next_action_owner_id === undefined ? current.next_action_owner_id : input.next_action_owner_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  return (await getOpportunity(id))!;
}

export async function assignOpportunity(id: number, ownerId: number, actorId: number) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const { data: owner } = await supabaseAdmin()
    .from("staff_users")
    .select("id, name, role, team_id")
    .eq("id", ownerId)
    .maybeSingle();
  if (!owner) throw new Error("OWNER_NOT_FOUND");
  const { error } = await supabaseAdmin()
    .from("crm_opportunities")
    .update({
      owner_id: ownerId,
      team_id: idOrNull(owner.team_id) ?? current.team_id,
      next_action_owner_id: ownerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  await supabaseAdmin().from("crm_activities").insert({
    lead_id: current.lead_id,
    opportunity_id: id,
    type: "note",
    subject: "Đổi chủ cơ hội",
    content: `Owner chuyển sang ${str(owner.name)} (${String(owner.role).toUpperCase()}).`,
    created_by: actorId,
  });
  return (await getOpportunity(id))!;
}

export async function changeStage(
  id: number,
  toStage: OpportunityStage,
  actorId: number,
  note = "",
  extra: { lost_reason?: string; certificate_id?: number } = {}
) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.stage === toStage) return current;
  const closedNow = toStage === "won" || toStage === "lost";
  if (toStage === "lost" && !String(extra.lost_reason || "").trim()) throw new Error("LOST_REASON");
  if (current.stage === "won" && toStage !== "lost") throw new Error("ALREADY_WON");
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("crm_opportunities")
    .update({
      stage: toStage,
      probability: STAGE_PROBABILITY[toStage],
      stage_entered_at: now,
      stage_changed_by: actorId,
      closed_at: closedNow ? now : current.closed_at,
      lost_reason: String(extra.lost_reason || "").trim(),
      next_action: closedNow ? "" : current.next_action,
      next_action_due: closedNow ? null : current.next_action_due,
      certificate_id: extra.certificate_id ?? current.certificate_id,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw error;
  await supabaseAdmin().from("crm_stage_events").insert({
    opportunity_id: id,
    from_stage: current.stage,
    to_stage: toStage,
    changed_by: actorId,
    note: String(note || "").trim(),
  });
  await supabaseAdmin().from("crm_activities").insert({
    lead_id: current.lead_id,
    opportunity_id: id,
    type: "note",
    subject: "Cập nhật stage",
    content: `${current.stage} → ${toStage}${extra.lost_reason ? ` · Lý do: ${extra.lost_reason}` : ""}${note ? ` · ${note}` : ""}`,
    created_by: actorId,
  });
  return (await getOpportunity(id))!;
}

export async function setNextAction(
  id: number,
  input: { next_action: string; next_action_due?: string | null; next_action_owner_id?: number | null }
) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const action = String(input.next_action ?? "").trim();
  if (!action) throw new Error("NO_ACTION");
  const { error } = await supabaseAdmin()
    .from("crm_opportunities")
    .update({
      next_action: action,
      next_action_due: input.next_action_due ?? null,
      next_action_owner_id:
        input.next_action_owner_id ?? current.next_action_owner_id ?? current.owner_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  return (await getOpportunity(id))!;
}

export async function linkCertificate(opportunityId: number, certificateId: number, actorId: number) {
  const opp = await getOpportunity(opportunityId);
  if (!opp) throw new Error("NOT_FOUND");
  await supabaseAdmin()
    .from("crm_opportunities")
    .update({ certificate_id: certificateId, updated_at: new Date().toISOString() })
    .eq("id", opportunityId);
  const { data: cert } = await supabaseAdmin()
    .from("certificates")
    .select("id, company_name, certificate_no")
    .eq("id", certificateId)
    .maybeSingle();
  if (cert) {
    if (opp.lead_id) {
      await supabaseAdmin().from("crm_leads").update({ certificate_id: certificateId }).eq("id", opp.lead_id);
    }
    await supabaseAdmin().from("crm_activities").insert({
      lead_id: opp.lead_id,
      opportunity_id: opportunityId,
      type: "note",
      subject: "Gắn hồ sơ",
      content: `Gắn hồ sơ ${str(cert.certificate_no)} (${str(cert.company_name)}) vào cơ hội.`,
      created_by: actorId,
    });
  }
  return (await getOpportunity(opportunityId))!;
}

export async function deleteOpportunity(id: number) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.stage === "won") throw new Error("WON_LOCKED");
  const { error } = await supabaseAdmin().from("crm_opportunities").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Activities ---------------- */

export async function addActivity(input: {
  lead_id?: number | null;
  opportunity_id?: number | null;
  type: ActivityType;
  subject: string;
  content?: string;
  performed_at?: string;
  created_by: number;
  is_follow_up?: boolean;
  due_at?: string | null;
}) {
  const subject = String(input.subject ?? "").trim();
  if (!subject) throw new Error("NO_SUBJECT");
  if (!input.lead_id && !input.opportunity_id) throw new Error("NO_TARGET");
  const { data, error } = await supabaseAdmin()
    .from("crm_activities")
    .insert({
      lead_id: input.lead_id ?? null,
      opportunity_id: input.opportunity_id ?? null,
      type: input.type || "note",
      subject,
      content: String(input.content ?? "").trim(),
      performed_at: input.performed_at || new Date().toISOString(),
      created_by: input.created_by,
      is_follow_up: Boolean(input.is_follow_up),
      due_at: input.due_at ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const now = new Date().toISOString();
  if (input.opportunity_id) {
    await supabaseAdmin()
      .from("crm_opportunities")
      .update({ last_activity_at: now, updated_at: now })
      .eq("id", input.opportunity_id);
  }
  if (input.lead_id) {
    await supabaseAdmin().from("crm_leads").update({ last_activity_at: now, updated_at: now }).eq("id", input.lead_id);
    if (!input.opportunity_id && input.type !== "research_note") {
      const lead = await getLead(input.lead_id);
      if (lead && lead.status === "new") {
        await supabaseAdmin().from("crm_leads").update({ status: "contacted" }).eq("id", input.lead_id);
      }
    }
  }
  return (await getActivity(Number(data.id)))!;
}

export async function listActivities(f: CrmScopeFilter, limit = 60): Promise<CrmActivity[]> {
  const opps = await listOpportunities(f);
  const leads = await listLeads(f);
  const oppIds = new Set(opps.map((o) => o.id));
  const leadIds = new Set(leads.map((l) => l.id));
  const { data, error } = await supabaseAdmin()
    .from("crm_activities")
    .select(ACTIVITY_COLS)
    .order("performed_at", { ascending: false })
    .limit(Math.max(limit * 4, 200));
  if (error) throw error;
  const rows = (data || [])
    .map(mapActivity)
    .filter(
      (a) =>
        (a.opportunity_id != null && oppIds.has(a.opportunity_id)) ||
        (a.lead_id != null && leadIds.has(a.lead_id)) ||
        (a.opportunity_id == null && a.lead_id == null)
    )
  ;
  return rows.slice(0, limit);
}

export async function listOpportunityTimeline(opportunityId: number) {
  const [acts, evts] = await Promise.all([
    supabaseAdmin()
      .from("crm_activities")
      .select(ACTIVITY_COLS)
      .eq("opportunity_id", opportunityId)
      .order("performed_at", { ascending: false }),
    supabaseAdmin()
      .from("crm_stage_events")
      .select("*, changed_by_user:staff_users!crm_stage_events_changed_by_fkey(name)")
      .eq("opportunity_id", opportunityId)
      .order("changed_at", { ascending: false }),
  ]);
  if (acts.error) throw acts.error;
  if (evts.error) throw evts.error;
  const activities = (acts.data || []).map(mapActivity);
  const events = (evts.data || []).map((e) => {
    const by = first(e.changed_by_user);
    return {
      id: Number(e.id),
      opportunity_id: Number(e.opportunity_id),
      from_stage: e.from_stage ? (String(e.from_stage) as OpportunityStage) : null,
      to_stage: String(e.to_stage) as OpportunityStage,
      changed_by: idOrNull(e.changed_by),
      note: str(e.note),
      changed_at: str(e.changed_at),
      changed_by_name: by ? str(by.name) : undefined,
    } as CrmStageEvent;
  });
  return { activities, events };
}

export async function getActivity(id: number) {
  const { data, error } = await supabaseAdmin()
    .from("crm_activities")
    .select(ACTIVITY_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapActivity(data) : undefined;
}

export async function completeActivity(id: number, actorId: number) {
  const current = await getActivity(id);
  if (!current) throw new Error("NOT_FOUND");
  await supabaseAdmin()
    .from("crm_activities")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);
  if (current.opportunity_id) {
    await supabaseAdmin()
      .from("crm_opportunities")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", current.opportunity_id);
    await supabaseAdmin().from("crm_activities").insert({
      lead_id: current.lead_id,
      opportunity_id: current.opportunity_id,
      type: "task",
      subject: "Hoàn thành follow-up",
      content: `Đã xong: ${current.subject}`,
      created_by: actorId,
    });
  }
  return (await getActivity(id))!;
}

/**
 * Checklist follow-up: next action của cơ hội đang mở + follow-up hẹn hạn chưa xong.
 * Trả về hàng đã chuẩn hoá (`kind` + `id`) để UI gọi đúng API khi bấm "Xong".
 */
export async function listFollowUps(f: CrmScopeFilter) {
  const [opps, leads] = await Promise.all([listOpportunities(f), listLeads(f)]);
  const oppIds = new Set(opps.map((o) => o.id));
  const leadIds = new Set(leads.map((l) => l.id));
  const { data, error } = await supabaseAdmin()
    .from("crm_activities")
    .select(ACTIVITY_COLS)
    .eq("is_follow_up", true)
    .is("completed_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  const pending = (data || [])
    .map(mapActivity)
    .filter(
      (a) =>
        (a.opportunity_id != null && oppIds.has(a.opportunity_id)) ||
        (a.lead_id != null && leadIds.has(a.lead_id))
    );
  return buildFollowUps(opps, pending);
}

/**
 * Đóng next action của cơ hội ("Xong" trên checklist): xoá việc cũ, ghi log và
 * làm mới đồng hồ stale — nếu không, cơ hội vẫn mãi nằm trong checklist.
 */
export async function clearNextAction(id: number, actorId: number) {
  const current = await getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  const action = String(current.next_action || "").trim();
  const { error } = await supabaseAdmin()
    .from("crm_opportunities")
    .update({
      next_action: "",
      next_action_due: null,
      next_action_owner_id: null,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw error;
  await supabaseAdmin().from("crm_activities").insert({
    lead_id: current.lead_id,
    opportunity_id: id,
    type: "task",
    subject: "Hoàn thành next action",
    content: action ? `Đã xong: ${action}` : "Đã xong next action.",
    performed_at: now,
    created_by: actorId,
    is_follow_up: false,
  });
  return (await getOpportunity(id))!;
}

/* ---------------- Customers ---------------- */

export async function listCustomers(f: CrmScopeFilter) {
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .select(
      `id, code, company_name, value, standard, closed_at, certificate_id,
       owner_user:staff_users!crm_opportunities_owner_id_fkey(name),
       certificate:certificates(certificate_no)`
    )
    .eq("stage", "won")
    .order("closed_at", { ascending: false });
  if (error) throw error;
  const opps = await listOpportunities(f);
  const visible = new Set(opps.map((o) => o.id));
  return (data || [])
    .filter((o) => visible.has(Number(o.id)))
    .map((o) => {
      const owner = first(o.owner_user);
      const cert = first(o.certificate);
      return {
        id: Number(o.id),
        company_name: str(o.company_name),
        opportunity_id: Number(o.id),
        opportunity_code: str(o.code),
        value: num(o.value),
        standard: o.standard ? (str(o.standard) as Standard) : null,
        won_at: str(o.closed_at),
        owner_name: owner ? str(owner.name) : undefined,
        certificate_id: idOrNull(o.certificate_id),
        certificate_no: cert ? str(cert.certificate_no) : undefined,
      };
    });
}

/* ---------------- Stats ---------------- */

export async function crmStats(f: CrmScopeFilter) {
  return computeCrmStats(await listOpportunities(f), await listLeads(f));
}

export async function crmPerformance(f: CrmScopeFilter) {
  const { data: users } = await supabaseAdmin()
    .from("staff_users")
    .select("id, name, email, role, team_id")
    .in("role", ["ae", "sr", "lr"])
    .order("id");
  const people = (users || [])
    .map((u) => ({
      id: Number(u.id),
      name: str(u.name),
      email: str(u.email),
      role: str(u.role),
      team_id: idOrNull(u.team_id),
    }))
    .filter((u) => f.scope === "all" || u.team_id === f.teamId);

  const [opps, leads, acts] = await Promise.all([
    listOpportunities(f),
    listLeads(f),
    listActivities(f, 1000),
  ]);
  const members = computePerformance(people, opps, leads, acts);

  const allTeams = await listTeams();
  const teams = [];
  for (const t of allTeams) {
    if (f.scope !== "all" && f.teamId !== t.id) continue;
    const scoped: CrmScopeFilter =
      f.scope === "all"
        ? { scope: "team", userId: Number(t.ae_id) || 0, teamId: t.id }
        : { scope: "team", userId: f.userId, teamId: f.teamId };
    const s = computeCrmStats(await listOpportunities(scoped), await listLeads(scoped));
    teams.push({
      id: t.id,
      name: t.name,
      ae_name: t.ae_name || "Chưa có AE",
      member_count: t.member_count || 0,
      ...s.totals,
      rates: s.rates,
      stale: s.health.staleCount,
    });
  }
  return { members, teams };
}

/* ---------------- Seed ---------------- */

let crmSeeded = false;

export async function ensureCrmSeed() {
  if (crmSeeded || process.env.VEXIM_DISABLE_DEMO_SEED === "1") return;
  await ensureSeed();
  const sb = supabaseAdmin();
  const { count, error } = await sb.from("crm_teams").select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count || 0) > 0) {
    crmSeeded = true;
    await backfillConvertedLeads();
    return;
  }
  await seedCrmSupabase();
  crmSeeded = true;
}

let backfilled = false;

/**
 * Vá dữ liệu cũ: lead đang ở trạng thái "converted" nhưng chưa trỏ về cơ hội nào
 * (bản seed trước đây bỏ sót `converted_opportunity_id`). Nhờ vậy danh sách lead và luồng
 * "CRM → hồ sơ FDA/GACC" hiện lại mã cơ hội mà không cần xoá database làm lại.
 * Lỗi ở đây không bao giờ được làm hỏng CRM nên chỉ ghi log.
 */
async function backfillConvertedLeads() {
  if (backfilled) return;
  backfilled = true;
  try {
    const sb = supabaseAdmin();
    const { data: leads, error } = await sb
      .from("crm_leads")
      .select("id")
      .eq("status", "converted")
      .is("converted_opportunity_id", null);
    if (error || !leads?.length) return;
    const leadIds = leads.map((l) => Number(l.id));
    const { data: opps, error: oppErr } = await sb
      .from("crm_opportunities")
      .select("id, lead_id")
      .in("lead_id", leadIds)
      .order("id");
    if (oppErr || !opps?.length) return;
    const firstOppByLead = new Map<number, number>();
    for (const o of opps) {
      const leadId = Number(o.lead_id);
      if (!firstOppByLead.has(leadId)) firstOppByLead.set(leadId, Number(o.id));
    }
    for (const [leadId, oppId] of Array.from(firstOppByLead.entries())) {
      await sb
        .from("crm_leads")
        .update({ converted_opportunity_id: oppId })
        .eq("id", leadId)
        .is("converted_opportunity_id", null);
    }
  } catch (e) {
    console.warn("[vexim] không vá được liên kết lead → cơ hội:", e);
  }
}

async function seedCrmSupabase() {
  const sb = supabaseAdmin();
  const ensureUser = async (email: string, name: string, password: string, role: Role) => {
    const { data: found } = await sb
      .from("staff_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (found) return Number(found.id);
    const { data, error } = await sb
      .from("staff_users")
      .insert({ email, name, password_hash: hashPassword(password), role })
      .select("id")
      .single();
    if (error) throw error;
    return Number(data.id);
  };

  const admin = await ensureUser("admin@veximglobal.com", "Quản trị viên", "Vexim@Admin2026", "admin");
  const aeId = await ensureUser("ae@veximglobal.com", "Lương Văn Học", "Vexim@AE2026", "ae");
  const srId = await ensureUser("sr@veximglobal.com", "Nguyễn Thảo Nguyên", "Vexim@SR2026", "sr");
  const lrId = await ensureUser("lr@veximglobal.com", "Trần Minh Khôi", "Vexim@LR2026", "lr");

  const { data: team, error: teamErr } = await sb
    .from("crm_teams")
    .insert({ name: "Team Sales Xuất khẩu", ae_id: aeId })
    .select("id")
    .single();
  if (teamErr) throw teamErr;
  const teamId = Number(team.id);
  await sb.from("staff_users").update({ team_id: teamId }).in("id", [admin, aeId, srId, lrId]);

  const at = (daysAgo: number, time = "09:15:00") => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return `${d.toISOString().slice(0, 10)}T${time}Z`;
  };
  const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  const leadRows = [
    { company: "Công ty CP Thực phẩm An Phát", contact: "Lê Văn An", title: "Giám đốc", email: "an@anphatfood.vn", phone: "0912345671", website: "anphatfood.vn", industry: "Thực phẩm — thuỷ sản", products: "Tôm, cá đông lạnh", market: "Hoa Kỳ", source: "outbound", detail: "LinkedIn ngành thuỷ sản", status: "converted", score: 4, owner: aeId, age: 12, last: at(11), by: lrId },
    { company: "Công ty TNHH Nông sản Mekong", contact: "Phạm Thu Hà", title: "Trưởng phòng XNK", email: "ha.pham@mekongagri.com", phone: "0912345672", website: "mekongagri.com", industry: "Nông sản", products: "Nông sản chế biến", market: "Trung Quốc", source: "referral", detail: "Khách cũ giới thiệu", status: "converted", score: 5, owner: aeId, age: 20, last: at(19), by: srId },
    { company: "Green Leaf Cosmetics JSC", contact: "Ngô Thanh Bình", title: "Founder", email: "binh@greenleaf.vn", phone: "0912345673", website: "greenleaf.vn", industry: "Mỹ phẩm", products: "Serum, kem dưỡng da", market: "Hoa Kỳ (Amazon)", source: "website", detail: "Form đăng ký trên website", status: "converted", score: 4, owner: aeId, age: 30, last: at(28), by: lrId },
    { company: "Công ty CP Gạo Việt Phát", contact: "Đỗ Quang Vinh", title: "Phó giám đốc", email: "vinh@gaovietphat.vn", phone: "0912345674", website: "gaovietphat.vn", industry: "Nông sản — gạo", products: "Gạo trắng, gạo thơm đóng gói", market: "Trung Quốc", source: "outbound", detail: "Danh sách DN xuất khẩu gạo", status: "converted", score: 4, owner: aeId, age: 45, last: at(40), by: srId },
    { company: "Công ty TNHH Hải sản Bình Minh", contact: "Hoàng Minh Đức", title: "Giám đốc điều hành", email: "duc@haisanbinhminh.vn", phone: "0912345675", website: "", industry: "Thực phẩm — thuỷ sản", products: "Tôm, cá đông lạnh", market: "Hoa Kỳ", source: "referral", detail: "Đối tác logistics giới thiệu", status: "converted", score: 3, owner: aeId, age: 60, last: at(55), by: lrId },
    { company: "Công ty CP Cà phê Tây Nguyên Xanh", contact: "Bùi Khánh Ly", title: "Sales Manager", email: "ly@caphetaynguyen.vn", phone: "0912345676", website: "", industry: "Nông sản — cà phê", products: "Cà phê rang xay, cà phê nhân", market: "Hoa Kỳ", source: "outbound", detail: "Hội chợ Vietfood 2026", status: "qualified", score: 4, owner: srId, age: 4, last: at(3), by: srId },
    { company: "Công ty TNHH May mặc Hồng Ngọc", contact: "Vũ Hồng Ngọc", title: "Giám đốc", email: "ngoc@hongngocgarment.vn", phone: "0912345677", website: "hongngocgarment.vn", industry: "Dệt may", products: "Hàng may mặc gia công", market: "Hoa Kỳ", source: "list_import", detail: "Import danh sách VCCI", status: "new", score: 2, owner: null, age: 2, last: null, by: lrId },
    { company: "Công ty CP Đồ gỗ Mỹ nghệ An Cường", contact: "Trịnh Quốc Bảo", title: "Trưởng phòng KD", email: "bao@ancuongwood.vn", phone: "0912345678", website: "", industry: "Đồ gỗ — thủ công mỹ nghệ", products: "Đồ gỗ nội thất, mỹ nghệ", market: "Hoa Kỳ", source: "outbound", detail: "Tìm kiếm Google Maps", status: "new", score: 0, owner: null, age: 9, last: null, by: lrId },
  ];

  const leadIds: number[] = [];
  let seq = 1;
  for (const l of leadRows) {
    const { data, error } = await sb
      .from("crm_leads")
      .insert({
        code: `VXM-L-2026-${String(seq).padStart(4, "0")}`,
        company_name: l.company,
        contact_name: l.contact,
        contact_title: l.title,
        email: l.email,
        phone: l.phone,
        website: l.website,
        country: "Việt Nam",
        industry: l.industry,
        employee_size: "50–200",
        main_products: l.products,
        target_market: l.market,
        source: l.source,
        source_detail: l.detail,
        status: l.status,
        quality_score: l.score,
        owner_id: l.owner,
        team_id: teamId,
        assigned_at: l.owner ? at(l.age + 1) : null,
        last_activity_at: l.last,
        created_by: l.by,
        created_at: at(l.age),
        updated_at: l.last || at(l.age),
      })
      .select("id")
      .single();
    if (error) throw error;
    leadIds.push(Number(data.id));
    seq += 1;
  }

  const oppRows = [
    { title: "Đăng ký FDA — thuỷ sản đông lạnh xuất Mỹ", lead: leadIds[0], company: leadRows[0].company, standard: "FDA" as Standard, stage: "proposal" as OpportunityStage, value: 22000000, owner: aeId, close: day(21), closedAt: null, lost: "", action: "Gửi lại báo giá FDA kèm timeline 45 ngày", due: day(-2), last: at(10), age: 12 },
    { title: "GACC Decree 248 — nông sản sấy", lead: leadIds[1], company: leadRows[1].company, standard: "GACC" as Standard, stage: "negotiation" as OpportunityStage, value: 45000000, owner: aeId, close: day(10), closedAt: null, lost: "", action: "Chốt hợp đồng và đặt lịch nộp hồ sơ", due: day(2), last: at(2), age: 20 },
    { title: "MoCRA facility registration — mỹ phẩm", lead: leadIds[2], company: leadRows[2].company, standard: "FDA" as Standard, stage: "qualified" as OpportunityStage, value: 26000000, owner: srId, close: day(35), closedAt: null, lost: "", action: "", due: null, last: at(6), age: 30 },
    { title: "GACC — gạo xuất khẩu chính ngạch", lead: leadIds[3], company: leadRows[3].company, standard: "GACC" as Standard, stage: "contacted" as OpportunityStage, value: 38000000, owner: aeId, close: day(45), closedAt: null, lost: "", action: "Gọi xác nhận nhu cầu và năng lực nhà máy", due: day(4), last: at(15), age: 45 },
    { title: "FDA — hải sản tươi sống", lead: leadIds[4], company: leadRows[4].company, standard: "FDA" as Standard, stage: "won" as OpportunityStage, value: 20000000, owner: aeId, close: day(-20), closedAt: at(52), lost: "", action: "", due: null, last: at(52), age: 60 },
    { title: "FDA — cà phê rang xay", lead: leadIds[5], company: leadRows[5].company, standard: "FDA" as Standard, stage: "lost" as OpportunityStage, value: 18000000, owner: srId, close: day(-8), closedAt: at(8), lost: "Khách chọn đơn vị khác do giá thấp hơn 15%", action: "", due: null, last: at(8), age: 14 },
  ];

  let oppSeq = 1;
  for (const o of oppRows) {
    const closed = o.stage === "won" || o.stage === "lost";
    const { data, error } = await sb
      .from("crm_opportunities")
      .insert({
        code: `VXM-O-2026-${String(oppSeq).padStart(4, "0")}`,
        title: o.title,
        lead_id: o.lead,
        company_name: o.company,
        standard: o.standard,
        stage: o.stage,
        stage_entered_at: closed ? o.closedAt : at(2),
        value: o.value,
        probability: STAGE_PROBABILITY[o.stage],
        owner_id: o.owner,
        team_id: teamId,
        expected_close_date: o.close,
        closed_at: o.closedAt,
        lost_reason: o.lost,
        next_action: o.action,
        next_action_due: o.due,
        next_action_owner_id: closed ? null : o.owner,
        last_activity_at: o.last,
        created_by: aeId,
        created_at: at(o.age),
        updated_at: closed ? o.closedAt : at(1),
      })
      .select("id")
      .single();
    if (error) throw error;
    const oppId = Number(data.id);
    // Lead nguồn phải trỏ ngược về cơ hội vừa tạo — giống createOpportunity() làm khi
    // chuyển lead thật. Thiếu bước này thì danh sách lead không hiện mã cơ hội đã chuyển đổi.
    await sb
      .from("crm_leads")
      .update({ converted_opportunity_id: oppId })
      .eq("id", o.lead)
      .eq("status", "converted")
      .is("converted_opportunity_id", null);
    await sb.from("crm_stage_events").insert({
      opportunity_id: oppId,
      from_stage: null,
      to_stage: "contacted",
      changed_by: aeId,
      note: "Tạo opportunity từ lead.",
      changed_at: at(o.age),
    });
    await sb.from("crm_activities").insert({
      lead_id: o.lead,
      opportunity_id: oppId,
      type: "note",
      subject: "Tạo cơ hội",
      content: `Opportunity ${o.title} được tạo.`,
      performed_at: at(o.age),
      created_by: aeId,
    });
    if (o.stage === "won") {
      const { data: cert } = await sb
        .from("certificates")
        .select("id")
        .eq("company_name", o.company)
        .limit(1)
        .maybeSingle();
      if (cert) {
        await sb.from("crm_opportunities").update({ certificate_id: Number(cert.id) }).eq("id", oppId);
        await sb.from("crm_leads").update({ certificate_id: Number(cert.id) }).eq("id", o.lead);
      }
    }
    oppSeq += 1;
  }

  const activityRows: Array<[number, number | null, ActivityType, string, string, number, number, boolean, string | null]> = [
    [leadIds[0], 1, "research_note", "Research Công ty CP Thực phẩm An Phát", "Nhà máy 12.000 m² tại Hải Phòng, công suất 400 tấn/tháng, đã có HACCP, ISO 22000. Chưa từng đăng ký FDA.", 11, srId, false, null],
    [leadIds[0], 1, "qualification", "Qualification lead An Phát", "BANT đạt 4/5: nhu cầu rõ, ngân sách duyệt Q4, timeline quý 1/2027.", 10, srId, false, null],
    [leadIds[1], 2, "research_note", "Research Nông sản Mekong", "Đã có mã GACC cho 2 dòng sản phẩm, cần bổ sung dòng trái cây sấy.", 19, srId, false, null],
    [leadIds[2], 3, "research_note", "Research Green Leaf Cosmetics", "17 SKU mỹ phẩm, đang bán qua Amazon US. Bắt buộc MoCRA từ 2024.", 28, srId, false, null],
    [leadIds[3], 4, "qualification", "Qualification Gạo Việt Phát", "Có giấy phép xuất khẩu gạo, cần GACC cho cơ sở xay xát. SR cần bổ sung số cơ sở.", 40, srId, false, null],
    [leadIds[4], 5, "meeting", "Họp chốt hợp đồng FDA", "Khách đồng ý gói FDA 20 triệu, thanh toán 50% trước.", 52, aeId, false, null],
    [leadIds[5], 6, "call", "Gọi follow-up báo giá", "Khách so sánh với 2 đơn vị khác, yêu cầu giảm 15%.", 9, srId, false, null],
    [leadIds[5], 6, "note", "Đóng cơ hội — Lost", "Khách chọn đơn vị khác do giá thấp hơn.", 8, aeId, false, null],
    [leadIds[0], 1, "task", "Gọi lại xác nhận báo giá", "", 3, aeId, true, day(-2)],
    [leadIds[1], 2, "task", "Gửi hợp đồng GACC bản sửa đổi", "", 2, aeId, true, day(2)],
    [leadIds[2], 3, "task", "Bổ sung danh sách 17 SKU và nhãn sản phẩm", "", 4, srId, true, day(3)],
    [leadIds[5], null, "research_note", "Nghiên cứu nguồn lead cà phê Tây Nguyên", "Thu thập 24 doanh nghiệp cà phê từ danh sách VCF.", 5, lrId, false, null],
  ];

  await sb.from("crm_activities").insert(
    activityRows.map(([lead, oppIdx, type, subject, content, daysAgo, by, follow, due]) => ({
      lead_id: lead,
      opportunity_id: oppIdx,
      type,
      subject,
      content,
      performed_at: at(daysAgo, "10:20:00"),
      created_by: by,
      is_follow_up: follow,
      due_at: due,
    }))
  );
}
