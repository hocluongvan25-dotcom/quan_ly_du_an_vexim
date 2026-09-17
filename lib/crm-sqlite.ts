/**
 * VEXIM CRM — tầng dữ liệu SQLite (dùng khi chưa cấu hình Supabase).
 *
 * Luồng vận hành: LR tạo nguồn lead → SR research & qualification →
 * AE phân công cho owner → owner tạo opportunity → opportunity đi qua pipeline
 * → won (thành customer, gắn với hồ sơ FDA/GACC) hoặc lost (có lý do).
 */

import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./auth";
import {
  STAGE_PROBABILITY,
  type ActivityType,
  type CrmActivity,
  type CrmCustomer,
  type CrmLead,
  type CrmOpportunity,
  type CrmStageEvent,
  type LeadSource,
  type LeadStatus,
  type OpportunityStage,
  type Role,
  type Standard,
} from "./types";
import { buildFollowUps, computeCrmStats, computePerformance, hydrateOpp, type OppRow } from "./crm-core";
import type { CrmScopeFilter } from "./permissions";
import { db } from "./db-sqlite";

/* ------------------------------------------------------------------ *
 * Bảng CRM (được tạo từ migrate() của db-sqlite)
 * ------------------------------------------------------------------ */

function nowSql() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function plain<T>(row: T): T {
  if (row == null) return row;
  return JSON.parse(JSON.stringify(row));
}

/* ------------------------------------------------------------------ *
 * Scope
 * ------------------------------------------------------------------ */

function scopeSql(f: CrmScopeFilter, ownerCol: string, createdByCol: string, teamCol: string) {
  if (f.scope === "all") return { sql: "1=1", args: [] as Array<string | number | null> };
  if (f.scope === "team" && f.teamId != null) {
    return {
      sql: `(${teamCol} = ? OR ${ownerCol} = ? OR ${createdByCol} = ?)`,
      args: [f.teamId, f.userId, f.userId],
    };
  }
  return {
    sql: `(${ownerCol} IS NULL OR ${ownerCol} = ? OR ${createdByCol} = ?)`,
    args: [f.userId, f.userId],
  };
}

const LEAD_SELECT = `
  SELECT l.*, cu.name AS created_by_name, ou.name AS owner_name,
         o.code AS opportunity_code, o.certificate_id AS opportunity_certificate_id
  FROM crm_leads l
  LEFT JOIN users cu ON cu.id = l.created_by
  LEFT JOIN users ou ON ou.id = l.owner_id
  LEFT JOIN crm_opportunities o ON o.id = l.converted_opportunity_id
`;

// Lưu ý: o.* đã chứa o.certificate_id, nên cột của lead phải đặt tên khác,
// nếu không bản ghi trả về sẽ mang certificate_id của lead thay vì của cơ hội.
const OPP_SELECT = `
  SELECT o.*, ou.name AS owner_name, nua.name AS next_action_owner_name,
         l.code AS lead_code, l.company_name AS lead_company,
         l.certificate_id AS lead_certificate_id
  FROM crm_opportunities o
  LEFT JOIN users ou ON ou.id = o.owner_id
  LEFT JOIN users nua ON nua.id = o.next_action_owner_id
  LEFT JOIN crm_leads l ON l.id = o.lead_id
`;

/* ------------------------------------------------------------------ *
 * Teams
 * ------------------------------------------------------------------ */

export function listTeams() {
  return db()
    .prepare(
      `SELECT t.*, ae.name AS ae_name,
              (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) AS member_count
       FROM crm_teams t
       LEFT JOIN users ae ON ae.id = t.ae_id
       ORDER BY t.id`
    )
    .all();
}

export function getTeam(id: number) {
  return db()
    .prepare(
      `SELECT t.*, ae.name AS ae_name FROM crm_teams t LEFT JOIN users ae ON ae.id = t.ae_id WHERE t.id = ?`
    )
    .get(id);
}

export function createTeam(input: { name: string; ae_id: number | null }) {
  const info = db()
    .prepare("INSERT INTO crm_teams (name, ae_id) VALUES (?, ?)")
    .run(input.name.trim(), input.ae_id);
  if (input.ae_id) {
    db().prepare("UPDATE users SET team_id = ? WHERE id = ?").run(Number(info.lastInsertRowid), input.ae_id);
  }
  return Number(info.lastInsertRowid);
}

export function setTeamLeader(teamId: number, aeId: number | null) {
  db().prepare("UPDATE crm_teams SET ae_id = ? WHERE id = ?").run(aeId, teamId);
  if (aeId) db().prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, aeId);
}

/* ------------------------------------------------------------------ *
 * Leads
 * ------------------------------------------------------------------ */

export function nextLeadCode() {
  const year = new Date().getFullYear();
  const prefix = `VXM-L-${year}-`;
  const row = db()
    .prepare("SELECT code FROM crm_leads WHERE code LIKE ? ORDER BY code DESC LIMIT 1")
    .get(`${prefix}%`) as { code: string } | undefined;
  let seq = 1;
  if (row?.code) {
    const n = Number(row.code.split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
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

export function createLead(input: LeadInput & { created_by: number }) {
  const s = (v: unknown) => String(v ?? "").trim();
  const info = db()
    .prepare(
      `INSERT INTO crm_leads (
        code, company_name, contact_name, contact_title, email, phone, website, address,
        country, industry, employee_size, annual_revenue, main_products, target_market,
        current_standards, pain_points, notes, source, source_detail, status, quality_score,
        owner_id, team_id, assigned_at, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      nextLeadCode(),
      s(input.company_name),
      s(input.contact_name),
      s(input.contact_title),
      s(input.email).toLowerCase(),
      s(input.phone),
      s(input.website),
      s(input.address),
      s(input.country) || "Việt Nam",
      s(input.industry),
      s(input.employee_size),
      s(input.annual_revenue),
      s(input.main_products),
      s(input.target_market),
      s(input.current_standards),
      s(input.pain_points),
      s(input.notes),
      s(input.source) || "other",
      s(input.source_detail),
      s(input.status) || "new",
      Math.max(0, Math.min(5, Math.round(Number(input.quality_score) || 0))),
      input.owner_id ?? null,
      input.team_id ?? null,
      input.owner_id ? nowSql() : null,
      input.created_by
    );
  return Number(info.lastInsertRowid);
}

export function listLeads(f: CrmScopeFilter) {
  const scope = scopeSql(f, "l.owner_id", "l.created_by", "l.team_id");
  const rows = db()
    .prepare(`${LEAD_SELECT} WHERE ${scope.sql} ORDER BY l.updated_at DESC, l.id DESC`)
    .all(...scope.args) as CrmLead[];
  return rows.map(plain);
}

export function getLead(id: number) {
  const row = db().prepare(`${LEAD_SELECT} WHERE l.id = ?`).get(id) as CrmLead | undefined;
  return row ? plain(row) : undefined;
}

export function updateLead(id: number, input: LeadInput) {
  const current = getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "converted") throw new Error("CONVERTED");
  const s = (v: unknown, fallback = "") => String(v ?? fallback).trim();
  db()
    .prepare(
      `UPDATE crm_leads SET
        company_name = ?, contact_name = ?, contact_title = ?, email = ?, phone = ?,
        website = ?, address = ?, country = ?, industry = ?, employee_size = ?,
        annual_revenue = ?, main_products = ?, target_market = ?, current_standards = ?,
        pain_points = ?, notes = ?, source = ?, source_detail = ?, status = ?,
        quality_score = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      s(input.company_name, current.company_name),
      s(input.contact_name, current.contact_name),
      s(input.contact_title, current.contact_title),
      s(input.email, current.email).toLowerCase(),
      s(input.phone, current.phone),
      s(input.website, current.website),
      s(input.address, current.address),
      s(input.country, current.country),
      s(input.industry, current.industry),
      s(input.employee_size, current.employee_size),
      s(input.annual_revenue, current.annual_revenue),
      s(input.main_products, current.main_products),
      s(input.target_market, current.target_market),
      s(input.current_standards, current.current_standards),
      s(input.pain_points, current.pain_points),
      s(input.notes, current.notes),
      s(input.source, current.source),
      s(input.source_detail, current.source_detail),
      s(input.status, current.status),
      Math.max(0, Math.min(5, Math.round(Number(input.quality_score ?? current.quality_score) || 0))),
      id
    );
  return getLead(id)!;
}

export function setLeadStatus(id: number, status: LeadStatus) {
  const current = getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "converted") throw new Error("CONVERTED");
  db()
    .prepare("UPDATE crm_leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, id);
  return getLead(id)!;
}

/** AE phân công lead cho SR/LR hoặc chính mình. */
export function assignLead(id: number, ownerId: number | null, actorId: number) {
  const current = getLead(id);
  if (!current) throw new Error("NOT_FOUND");
  const owner = ownerId
    ? (db()
        .prepare("SELECT id, name, role, team_id FROM users WHERE id = ?")
        .get(ownerId) as { id: number; name: string; role: Role; team_id: number | null } | undefined)
    : null;
  if (ownerId && !owner) throw new Error("OWNER_NOT_FOUND");
  db()
    .prepare(
      `UPDATE crm_leads SET owner_id = ?, team_id = ?, assigned_at = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(ownerId, owner?.team_id ?? current.team_id, ownerId ? nowSql() : null, id);
  db()
    .prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
       VALUES (?, NULL, 'note', ?, ?, datetime('now'), ?)`
    )
    .run(
      id,
      owner ? "Phân công lead" : "Bỏ phân công lead",
      owner
        ? `AE phân công lead cho ${owner.name} (${owner.role.toUpperCase()}).`
        : `Lead được đưa về trạng thái chưa phân công bởi user #${actorId}.`,
      actorId
    );
  return getLead(id)!;
}

export function nextOpportunityCode() {
  const year = new Date().getFullYear();
  const prefix = `VXM-O-${year}-`;
  const row = db()
    .prepare("SELECT code FROM crm_opportunities WHERE code LIKE ? ORDER BY code DESC LIMIT 1")
    .get(`${prefix}%`) as { code: string } | undefined;
  let seq = 1;
  if (row?.code) {
    const n = Number(row.code.split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ *
 * Opportunities
 * ------------------------------------------------------------------ */

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

export function createOpportunity(input: OpportunityInput & { created_by: number; lead_id?: number | null }) {
  const company = String(input.company_name ?? "").trim();
  if (!company) throw new Error("NO_COMPANY");
  const ownerId = input.owner_id ?? input.created_by;
  const teamId = input.team_id ?? null;
  const info = db()
    .prepare(
      `INSERT INTO crm_opportunities (
        code, title, lead_id, company_name, standard, stage, stage_entered_at,
        value, probability, owner_id, team_id, expected_close_date,
        next_action, next_action_due, next_action_owner_id, last_activity_at, created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      nextOpportunityCode(),
      String(input.title ?? "").trim() || `${company} — đăng ký hồ sơ xuất khẩu`,
      input.lead_id ?? null,
      company,
      input.standard ?? null,
      "contacted",
      nowSql(),
      Math.max(0, Math.round(Number(input.value) || 0)),
      STAGE_PROBABILITY.contacted,
      ownerId,
      teamId,
      input.expected_close_date ?? null,
      String(input.next_action ?? "").trim(),
      input.next_action_due ?? null,
      input.next_action_owner_id ?? ownerId,
      nowSql(),
      input.created_by
    );
  const oppId = Number(info.lastInsertRowid);
  db()
    .prepare(
      `INSERT INTO crm_stage_events (opportunity_id, from_stage, to_stage, changed_by, note)
       VALUES (?, NULL, 'contacted', ?, ?)`
    )
    .run(oppId, input.created_by, "Tạo opportunity từ lead.");
  db()
    .prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
       VALUES (?, ?, 'note', 'Tạo cơ hội', ?, datetime('now'), ?)`
    )
    .run(
      input.lead_id ?? null,
      oppId,
      `Opportunity ${String(input.title ?? company).trim()} được tạo, giá trị ${Math.round(Number(input.value) || 0)} VND.`,
      input.created_by
    );
  if (input.lead_id) {
    db()
      .prepare(
        `UPDATE crm_leads SET status = 'converted', converted_opportunity_id = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(oppId, input.lead_id);
  }
  return getOpportunity(oppId)!;
}

export function listOpportunities(f: CrmScopeFilter) {
  const scope = scopeSql(f, "o.owner_id", "o.created_by", "o.team_id");
  const rows = db()
    .prepare(
      `${OPP_SELECT} WHERE ${scope.sql}
       ORDER BY CASE WHEN o.stage IN ('won','lost') THEN 1 ELSE 0 END,
                o.expected_close_date IS NULL, o.expected_close_date, o.id DESC`
    )
    .all(...scope.args) as CrmOpportunity[];
  return rows.map(hydrateOpp) as OppRow[];
}

export function getOpportunity(id: number) {
  const row = db().prepare(`${OPP_SELECT} WHERE o.id = ?`).get(id) as CrmOpportunity | undefined;
  return row ? hydrateOpp(row) : undefined;
}

export function updateOpportunity(
  id: number,
  input: OpportunityInput
) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const closed = current.stage === "won" || current.stage === "lost";
  const value = Math.max(0, Math.round(Number(input.value ?? current.value) || 0));
  const standard = input.standard === undefined ? current.standard : input.standard;
  db()
    .prepare(
      `UPDATE crm_opportunities SET
        title = ?, company_name = ?, standard = ?, value = ?,
        owner_id = ?, team_id = ?, expected_close_date = ?,
        next_action = ?, next_action_due = ?, next_action_owner_id = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      String(input.title ?? current.title).trim(),
      String(input.company_name ?? current.company_name).trim(),
      standard,
      value,
      input.owner_id === undefined ? current.owner_id : input.owner_id,
      input.team_id === undefined ? current.team_id : input.team_id,
      input.expected_close_date === undefined ? current.expected_close_date : input.expected_close_date,
      closed ? current.next_action : String(input.next_action ?? current.next_action).trim(),
      closed ? current.next_action_due : input.next_action_due ?? current.next_action_due,
      input.next_action_owner_id === undefined
        ? current.next_action_owner_id
        : input.next_action_owner_id,
      id
    );
  return getOpportunity(id)!;
}

/** AE/Founder đổi owner của opportunity. Nguyên tắc: mọi opportunity phải có owner. */
export function assignOpportunity(id: number, ownerId: number, actorId: number) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const owner = db()
    .prepare("SELECT id, name, role, team_id FROM users WHERE id = ?")
    .get(ownerId) as { id: number; name: string; role: Role; team_id: number | null } | undefined;
  if (!owner) throw new Error("OWNER_NOT_FOUND");
  db()
    .prepare(
      `UPDATE crm_opportunities SET owner_id = ?, team_id = ?, next_action_owner_id = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(ownerId, owner.team_id ?? current.team_id, ownerId, id);
  db()
    .prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
       VALUES (?, ?, 'note', ?, ?, datetime('now'), ?)`
    )
    .run(
      current.lead_id,
      id,
      "Đổi chủ cơ hội",
      `Owner chuyển sang ${owner.name} (${owner.role.toUpperCase()}).`,
      actorId
    );
  return getOpportunity(id)!;
}

export function changeStage(
  id: number,
  toStage: OpportunityStage,
  actorId: number,
  note = "",
  extra: { lost_reason?: string; certificate_id?: number } = {}
) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.stage === toStage) return current;
  const from = current.stage;
  const closedNow = toStage === "won" || toStage === "lost";
  if (toStage === "lost" && !String(extra.lost_reason || "").trim()) throw new Error("LOST_REASON");
  if (from === "won" && toStage !== "lost") throw new Error("ALREADY_WON");

  db()
    .prepare(
      `UPDATE crm_opportunities SET
        stage = ?, probability = ?, stage_entered_at = datetime('now'), stage_changed_by = ?,
        closed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE closed_at END,
        lost_reason = ?,
        next_action = CASE WHEN ? = 1 THEN '' ELSE next_action END,
        next_action_due = CASE WHEN ? = 1 THEN NULL ELSE next_action_due END,
        certificate_id = COALESCE(?, certificate_id),
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      toStage,
      STAGE_PROBABILITY[toStage],
      actorId,
      closedNow ? 1 : 0,
      String(extra.lost_reason || "").trim(),
      closedNow ? 1 : 0,
      closedNow ? 1 : 0,
      extra.certificate_id ?? null,
      id
    );
  if (extra.certificate_id && current.lead_id) {
    db()
      .prepare("UPDATE crm_leads SET certificate_id = ? WHERE id = ?")
      .run(extra.certificate_id, current.lead_id);
  }
  db()
    .prepare(
      `INSERT INTO crm_stage_events (opportunity_id, from_stage, to_stage, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id, from, toStage, actorId, String(note || "").trim());
  db()
    .prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
       VALUES (?, ?, 'note', ?, ?, datetime('now'), ?)`
    )
    .run(
      current.lead_id,
      id,
      "Cập nhật stage",
      `${from} → ${toStage}${extra.lost_reason ? ` · Lý do: ${extra.lost_reason}` : ""}${note ? ` · ${note}` : ""}`,
      actorId
    );
  return getOpportunity(id)!;
}

export function setNextAction(
  id: number,
  input: { next_action: string; next_action_due?: string | null; next_action_owner_id?: number | null }
) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const action = String(input.next_action ?? "").trim();
  if (!action) throw new Error("NO_ACTION");
  db()
    .prepare(
      `UPDATE crm_opportunities SET next_action = ?, next_action_due = ?, next_action_owner_id = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(
      action,
      input.next_action_due ?? null,
      input.next_action_owner_id ?? current.next_action_owner_id ?? current.owner_id,
      id
    );
  return getOpportunity(id)!;
}

export function linkCertificate(opportunityId: number, certificateId: number, actorId: number) {
  const opp = getOpportunity(opportunityId);
  if (!opp) throw new Error("NOT_FOUND");
  db()
    .prepare("UPDATE crm_opportunities SET certificate_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(certificateId, opportunityId);
  const cert = db()
    .prepare("SELECT id, company_name, certificate_no, service_price FROM certificates WHERE id = ?")
    .get(certificateId) as
    | { id: number; company_name: string; certificate_no: string; service_price: number }
    | undefined;
  if (cert) {
    db()
      .prepare("UPDATE crm_leads SET certificate_id = ? WHERE converted_opportunity_id = ?")
      .run(certificateId, opportunityId);
    db()
      .prepare(
        `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
         VALUES (?, ?, 'note', 'Gắn hồ sơ', ?, datetime('now'), ?)`
      )
      .run(
        opp.lead_id,
        opportunityId,
        `Gắn hồ sơ ${cert.certificate_no} (${cert.company_name}) vào cơ hội.`,
        actorId
      );
  }
  return getOpportunity(opportunityId)!;
}

export function deleteOpportunity(id: number) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.stage === "won") throw new Error("WON_LOCKED");
  db().prepare("DELETE FROM crm_activities WHERE opportunity_id = ?").run(id);
  db().prepare("DELETE FROM crm_stage_events WHERE opportunity_id = ?").run(id);
  db().prepare("DELETE FROM crm_opportunities WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ *
 * Activities (log hoạt động + follow-up)
 * ------------------------------------------------------------------ */

export function addActivity(input: {
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
  const info = db()
    .prepare(
      `INSERT INTO crm_activities (
        lead_id, opportunity_id, type, subject, content, performed_at, created_by, is_follow_up, due_at
      ) VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      input.lead_id ?? null,
      input.opportunity_id ?? null,
      input.type || "note",
      subject,
      String(input.content ?? "").trim(),
      input.performed_at ? String(input.performed_at).slice(0, 19).replace("T", " ") : nowSql(),
      input.created_by,
      input.is_follow_up ? 1 : 0,
      input.due_at ?? null
    );
  const activityId = Number(info.lastInsertRowid);
  // Mọi hoạt động đều "làm mới" bản ghi → đồng hồ stale reset lại.
  if (input.opportunity_id) {
    db()
      .prepare(
        `UPDATE crm_opportunities SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .run(input.opportunity_id);
  }
  if (input.lead_id) {
    db()
      .prepare(
        `UPDATE crm_leads SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .run(input.lead_id);
    if (!input.opportunity_id) {
      const lead = getLead(input.lead_id);
      if (lead && lead.status === "new" && input.type !== "research_note") {
        db().prepare("UPDATE crm_leads SET status = 'contacted' WHERE id = ?").run(input.lead_id);
      }
    }
  }
  return getActivity(activityId)!;
}

export function listActivities(f: CrmScopeFilter, limit = 60) {
  const scope = scopeSql(
    f,
    "COALESCE(o.owner_id, l.owner_id)",
    "a.created_by",
    "COALESCE(o.team_id, l.team_id)"
  );
  return db()
    .prepare(
      `SELECT a.*, u.name AS created_by_name,
              COALESCE(o.company_name, l.company_name) AS company_name,
              ou.name AS owner_name
       FROM crm_activities a
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN crm_opportunities o ON o.id = a.opportunity_id
       LEFT JOIN crm_leads l ON l.id = a.lead_id
       LEFT JOIN users ou ON ou.id = COALESCE(o.owner_id, l.owner_id)
       WHERE ${scope.sql}
       ORDER BY a.performed_at DESC, a.id DESC
       LIMIT ?`
    )
    .all(...scope.args, limit) as CrmActivity[];
}

export function listOpportunityTimeline(opportunityId: number) {
  const activities = db()
    .prepare(
      `SELECT a.*, u.name AS created_by_name FROM crm_activities a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.opportunity_id = ?
       ORDER BY a.performed_at DESC, a.id DESC`
    )
    .all(opportunityId) as CrmActivity[];
  const events = db()
    .prepare(
      `SELECT e.*, u.name AS changed_by_name FROM crm_stage_events e
       LEFT JOIN users u ON u.id = e.changed_by
       WHERE e.opportunity_id = ?
       ORDER BY e.changed_at DESC, e.id DESC`
    )
    .all(opportunityId) as CrmStageEvent[];
  return { activities, events };
}

export function getActivity(id: number) {
  const row = db()
    .prepare(
      `SELECT a.*, u.name AS created_by_name,
              COALESCE(o.company_name, l.company_name) AS company_name
       FROM crm_activities a
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN crm_opportunities o ON o.id = a.opportunity_id
       LEFT JOIN crm_leads l ON l.id = a.lead_id
       WHERE a.id = ?`
    )
    .get(id) as CrmActivity | undefined;
  return row ? plain(row) : undefined;
}

export function completeActivity(id: number, actorId: number) {
  const current = getActivity(id);
  if (!current) throw new Error("NOT_FOUND");
  db()
    .prepare("UPDATE crm_activities SET completed_at = datetime('now') WHERE id = ?")
    .run(id);
  if (current.opportunity_id) {
    db()
      .prepare(
        `UPDATE crm_opportunities SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      )
      .run(current.opportunity_id);
    db()
      .prepare(
        `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
         VALUES (?, ?, 'task', ?, ?, datetime('now'), ?)`
      )
      .run(
        current.lead_id,
        current.opportunity_id,
        "Hoàn thành follow-up",
        `Đã xong: ${current.subject}`,
        actorId
      );
  }
  return getActivity(id)!;
}

/**
 * Checklist follow-up: next action của cơ hội đang mở + follow-up hẹn hạn chưa xong.
 * Trả về hàng đã chuẩn hoá (`kind` + `id`) để UI gọi đúng API khi bấm "Xong".
 */
export function listFollowUps(f: CrmScopeFilter) {
  const scope = scopeSql(f, "o.owner_id", "o.created_by", "o.team_id");
  const opps = db()
    .prepare(
      `${OPP_SELECT}
       WHERE ${scope.sql}
         AND o.stage NOT IN ('won','lost')
         AND o.next_action IS NOT NULL AND o.next_action <> ''
       ORDER BY o.next_action_due IS NULL, o.next_action_due, o.id`
    )
    .all(...scope.args)
    .map((r) => hydrateOpp(r as CrmOpportunity)) as OppRow[];

  const pending = listActivities(f, 500).filter((a) => a.is_follow_up && !a.completed_at);
  return buildFollowUps(opps, pending);
}

/**
 * Đóng next action của cơ hội ("Xong" trên checklist): xoá việc cũ, ghi log và
 * làm mới đồng hồ stale — nếu không, cơ hội vẫn mãi nằm trong checklist.
 */
export function clearNextAction(id: number, actorId: number) {
  const current = getOpportunity(id);
  if (!current) throw new Error("NOT_FOUND");
  const action = String(current.next_action || "").trim();
  db()
    .prepare(
      `UPDATE crm_opportunities SET
        next_action = '', next_action_due = NULL, next_action_owner_id = NULL,
        last_activity_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(id);
  db()
    .prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by, is_follow_up)
       VALUES (?, ?, 'task', 'Hoàn thành next action', ?, datetime('now'), ?, 0)`
    )
    .run(current.lead_id, id, action ? `Đã xong: ${action}` : "Đã xong next action.", actorId);
  return getOpportunity(id)!;
}

/* ------------------------------------------------------------------ *
 * Khách hàng (opportunity won)
 * ------------------------------------------------------------------ */

export function listCustomers(f: CrmScopeFilter): CrmCustomer[] {
  const scope = scopeSql(f, "o.owner_id", "o.created_by", "o.team_id");
  const rows = db()
    .prepare(
      `SELECT o.id, o.code AS opportunity_code, o.company_name, o.value, o.standard,
              o.closed_at AS won_at, o.certificate_id, ou.name AS owner_name,
              c.certificate_no AS certificate_no
       FROM crm_opportunities o
       LEFT JOIN users ou ON ou.id = o.owner_id
       LEFT JOIN certificates c ON c.id = o.certificate_id
       WHERE o.stage = 'won' AND ${scope.sql}
       ORDER BY o.closed_at DESC, o.id DESC`
    )
    .all(...scope.args) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    company_name: String(r.company_name || ""),
    opportunity_id: Number(r.id),
    opportunity_code: String(r.opportunity_code || ""),
    value: Number(r.value || 0),
    standard: (r.standard as Standard) || null,
    won_at: String(r.won_at || ""),
    owner_name: r.owner_name ? String(r.owner_name) : undefined,
    certificate_id: r.certificate_id == null ? null : Number(r.certificate_id),
    certificate_no: r.certificate_no ? String(r.certificate_no) : undefined,
  }));
}

/* ------------------------------------------------------------------ *
 * Thống kê CRM (dashboard Founder + AE)
 * ------------------------------------------------------------------ */

export function crmStats(f: CrmScopeFilter) {
  return computeCrmStats(listOpportunities(f), listLeads(f));
}

export function crmPerformance(f: CrmScopeFilter) {
  const people = db()
    .prepare(
      "SELECT id, name, email, role, team_id FROM users WHERE role IN ('ae','sr','lr') ORDER BY id"
    )
    .all() as Array<{ id: number; name: string; email: string; role: string; team_id: number | null }>;
  const visible = f.scope === "all" ? people : people.filter((u) => u.team_id === f.teamId);
  const members = computePerformance(
    visible,
    listOpportunities(f),
    listLeads(f),
    listActivities(f, 1000)
  );

  const teams = listTeams().map((t) => {
    const teamId = Number(t.id);
    if (f.scope !== "all" && f.teamId !== teamId) return null;
    const scoped: CrmScopeFilter =
      f.scope === "all"
        ? { scope: "team", userId: Number(t.ae_id) || 0, teamId }
        : { scope: "team", userId: f.userId, teamId: f.teamId };
    const s = computeCrmStats(listOpportunities(scoped), listLeads(scoped));
    return {
      id: teamId,
      name: String(t.name),
      ae_name: t.ae_name ? String(t.ae_name) : "Chưa có AE",
      member_count: Number(t.member_count || 0),
      ...s.totals,
      rates: s.rates,
      stale: s.health.staleCount,
    };
  });

  return { members, teams: teams.filter(Boolean) };
}

/* ------------------------------------------------------------------ *
 * Seed dữ liệu CRM demo (chạy khi crm_teams còn trống)
 * ------------------------------------------------------------------ */

export function seedCrm(handle?: DatabaseSync) {
  const conn = handle ?? db();
  // Vá dữ liệu cũ: lead đã ở trạng thái "converted" nhưng chưa trỏ về cơ hội nào
  // (bản seed trước đây bỏ sót bước này). Chạy lại nhiều lần không ảnh hưởng gì.
  try {
    conn.exec(`
      UPDATE crm_leads
         SET converted_opportunity_id = (
               SELECT o.id FROM crm_opportunities o WHERE o.lead_id = crm_leads.id ORDER BY o.id LIMIT 1
             ),
             updated_at = datetime('now')
       WHERE status = 'converted'
         AND converted_opportunity_id IS NULL
         AND EXISTS (SELECT 1 FROM crm_opportunities o WHERE o.lead_id = crm_leads.id);
    `);
  } catch (e) {
    console.warn("[vexim] không vá được liên kết lead → cơ hội:", e);
  }
  // Xem VEXIM_DISABLE_DEMO_SEED trong .env.example
  if (process.env.VEXIM_DISABLE_DEMO_SEED === "1") return;
  const count = conn.prepare("SELECT COUNT(*) AS c FROM crm_teams").get() as { c: number };
  if (count.c > 0) return;

  const findUser = (email: string) =>
    conn.prepare("SELECT id, name, team_id FROM users WHERE email = ?").get(email) as
      | { id: number; name: string; team_id: number | null }
      | undefined;

  conn.exec("BEGIN");
  try {
    // Tài khoản demo theo 4 role của spec.
    const ensure = (email: string, name: string, password: string, role: Role) => {
      const existing = findUser(email);
      if (existing) return existing.id;
      const info = conn
        .prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)")
        .run(email.toLowerCase(), name, hashPassword(password), role);
      return Number(info.lastInsertRowid);
    };

    // Đảm bảo tài khoản Founder/Admin tồn tại (kể cả khi DB đã có sẵn từ bản cũ).
    findUser("admin@veximglobal.com") ?? ensure("admin@veximglobal.com", "Quản trị viên", "Vexim@Admin2026", "admin");
    const aeId = ensure("ae@veximglobal.com", "Lương Văn Học", "Vexim@AE2026", "ae");
    const srId = ensure("sr@veximglobal.com", "Nguyễn Thảo Nguyên", "Vexim@SR2026", "sr");
    const lrId = ensure("lr@veximglobal.com", "Trần Minh Khôi", "Vexim@LR2026", "lr");

    const teamInfo = conn
      .prepare("INSERT INTO crm_teams (name, ae_id) VALUES (?, ?)")
      .run("Team Sales Xuất khẩu", aeId);
    const teamId = Number(teamInfo.lastInsertRowid);
    conn.prepare("UPDATE users SET team_id = ? WHERE id IN (?, ?, ?)").run(teamId, aeId, srId, lrId);

    const at = (daysAgo: number, time = "09:15:00") => {
      const d = new Date(Date.now() - daysAgo * 86400000);
      return `${d.toISOString().slice(0, 10)} ${time}`;
    };
    const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

    const insertLead = conn.prepare(
      `INSERT INTO crm_leads (
        code, company_name, contact_name, contact_title, email, phone, website, country,
        industry, employee_size, annual_revenue, main_products, target_market,
        current_standards, pain_points, notes, source, source_detail, status, quality_score,
        owner_id, team_id, assigned_at, last_activity_at, created_by, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    type SeedLead = {
      company: string;
      contact: string;
      title: string;
      email: string;
      phone: string;
      website: string;
      source: LeadSource;
      sourceDetail: string;
      status: LeadStatus;
      score: number;
      owner: number | null;
      age: number;
      lastActivity: string | null;
      createdBy: number;
    };

    const leads: SeedLead[] = [
      { company: "Công ty CP Thực phẩm An Phát", contact: "Lê Văn An", title: "Giám đốc", email: "an@anphatfood.vn", phone: "0912345671", website: "anphatfood.vn", source: "outbound", sourceDetail: "LinkedIn ngành thuỷ sản", status: "converted", score: 4, owner: aeId, age: 12, lastActivity: at(11), createdBy: lrId },
      { company: "Công ty TNHH Nông sản Mekong", contact: "Phạm Thu Hà", title: "Trưởng phòng XNK", email: "ha.pham@mekongagri.com", phone: "0912345672", website: "mekongagri.com", source: "referral", sourceDetail: "Khách cũ giới thiệu", status: "converted", score: 5, owner: aeId, age: 20, lastActivity: at(19), createdBy: srId },
      { company: "Green Leaf Cosmetics JSC", contact: "Ngô Thanh Bình", title: "Founder", email: "binh@greenleaf.vn", phone: "0912345673", website: "greenleaf.vn", source: "website", sourceDetail: "Form đăng ký trên website", status: "converted", score: 4, owner: aeId, age: 30, lastActivity: at(28), createdBy: lrId },
      { company: "Công ty CP Gạo Việt Phát", contact: "Đỗ Quang Vinh", title: "Phó giám đốc", email: "vinh@gaovietphat.vn", phone: "0912345674", website: "gaovietphat.vn", source: "outbound", sourceDetail: "Danh sách DN xuất khẩu gạo", status: "converted", score: 4, owner: aeId, age: 45, lastActivity: at(40), createdBy: srId },
      { company: "Công ty TNHH Hải sản Bình Minh", contact: "Hoàng Minh Đức", title: "Giám đốc điều hành", email: "duc@haisanbinhminh.vn", phone: "0912345675", website: "", source: "referral", sourceDetail: "Đối tác logistics giới thiệu", status: "converted", score: 3, owner: aeId, age: 60, lastActivity: at(55), createdBy: lrId },
      { company: "Công ty CP Cà phê Tây Nguyên Xanh", contact: "Bùi Khánh Ly", title: "Sales Manager", email: "ly@caphetaynguyen.vn", phone: "0912345676", website: "", source: "outbound", sourceDetail: "Hội chợ Vietfood 2026", status: "qualified", score: 4, owner: srId, age: 4, lastActivity: at(3), createdBy: srId },
      { company: "Công ty TNHH May mặc Hồng Ngọc", contact: "Vũ Hồng Ngọc", title: "Giám đốc", email: "ngoc@hongngocgarment.vn", phone: "0912345677", website: "hongngocgarment.vn", source: "list_import", sourceDetail: "Import danh sách VCCI", status: "new", score: 2, owner: null, age: 2, lastActivity: null, createdBy: lrId },
      { company: "Công ty CP Đồ gỗ Mỹ nghệ An Cường", contact: "Trịnh Quốc Bảo", title: "Trưởng phòng KD", email: "bao@ancuongwood.vn", phone: "0912345678", website: "", source: "outbound", sourceDetail: "Tìm kiếm Google Maps", status: "new", score: 0, owner: null, age: 9, lastActivity: null, createdBy: lrId },
    ];

    const leadIds: number[] = [];
    let seq = 1;
    for (const l of leads) {
      const info = insertLead.run(
        `VXM-L-2026-${String(seq).padStart(4, "0")}`,
        l.company, l.contact, l.title, l.email, l.phone, l.website, "Việt Nam",
        industryOf(l.company), "50–200", "", productsOf(l.company), marketOf(l.company),
        "", "", "", l.source, l.sourceDetail, l.status, l.score,
        l.owner, teamId, l.owner ? at(l.age + 1) : null, l.lastActivity, l.createdBy,
        at(l.age), at(l.lastActivity ? Math.min(l.age, 1) : l.age)
      );
      leadIds.push(Number(info.lastInsertRowid));
      seq += 1;
    }

    const [lAnPhat, lMekong, lGreenLeaf, lVietPhat, lBinhMinh, lCaphe] = leadIds;

    const insertOpp = conn.prepare(
      `INSERT INTO crm_opportunities (
        code, title, lead_id, company_name, standard, stage, stage_entered_at, value, probability,
        owner_id, team_id, expected_close_date, closed_at, lost_reason,
        next_action, next_action_due, next_action_owner_id, last_activity_at, created_by, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );

    const opps: Array<{
      title: string; lead: number | null; company: string; standard: Standard; stage: OpportunityStage;
      value: number; owner: number; close: string | null; closedAt: string | null; lostReason: string;
      action: string; actionDue: string | null; lastActivity: string; createdDays: number;
    }> = [
      {
        title: "Đăng ký FDA — thuỷ sản đông lạnh xuất Mỹ",
        lead: lAnPhat, company: "Công ty CP Thực phẩm An Phát", standard: "FDA", stage: "proposal",
        value: 22000000, owner: aeId, close: day(21), closedAt: null, lostReason: "",
        action: "Gửi lại báo giá FDA kèm timeline 45 ngày", actionDue: day(-2), lastActivity: at(10), createdDays: 12,
      },
      {
        title: "GACC Decree 248 — nông sản sấy",
        lead: lMekong, company: "Công ty TNHH Nông sản Mekong", standard: "GACC", stage: "negotiation",
        value: 45000000, owner: aeId, close: day(10), closedAt: null, lostReason: "",
        action: "Chốt hợp đồng và đặt lịch nộp hồ sơ", actionDue: day(2), lastActivity: at(2), createdDays: 20,
      },
      {
        title: "MoCRA facility registration — mỹ phẩm",
        lead: lGreenLeaf, company: "Green Leaf Cosmetics JSC", standard: "FDA", stage: "qualified",
        value: 26000000, owner: srId, close: day(35), closedAt: null, lostReason: "",
        action: "", actionDue: null, lastActivity: at(6), createdDays: 30,
      },
      {
        title: "GACC — gạo xuất khẩu chính ngạch",
        lead: lVietPhat, company: "Công ty CP Gạo Việt Phát", standard: "GACC", stage: "contacted",
        value: 38000000, owner: aeId, close: day(45), closedAt: null, lostReason: "",
        action: "Gọi xác nhận nhu cầu và năng lực nhà máy", actionDue: day(4), lastActivity: at(15), createdDays: 45,
      },
      {
        title: "FDA — hải sản tươi sống",
        lead: lBinhMinh, company: "Công ty TNHH Hải sản Bình Minh", standard: "FDA", stage: "won",
        value: 20000000, owner: aeId, close: day(-20), closedAt: at(52), lostReason: "",
        action: "", actionDue: null, lastActivity: at(52), createdDays: 60,
      },
      {
        title: "FDA — cà phê rang xay",
        lead: lCaphe, company: "Công ty CP Cà phê Tây Nguyên Xanh", standard: "FDA", stage: "lost",
        value: 18000000, owner: srId, close: day(-8), closedAt: at(8),
        lostReason: "Khách chọn đơn vị khác do giá thấp hơn 15%",
        action: "", actionDue: null, lastActivity: at(8), createdDays: 14,
      },
    ];

    let oppSeq = 1;
    for (const o of opps) {
      const closed = o.stage === "won" || o.stage === "lost";
      const info = insertOpp.run(
        `VXM-O-2026-${String(oppSeq).padStart(4, "0")}`,
        o.title, o.lead, o.company, o.standard, o.stage,
        closed ? o.closedAt : at(2),
        o.value, STAGE_PROBABILITY[o.stage], o.owner, teamId, o.close, o.closedAt, o.lostReason,
        o.action, o.actionDue, closed ? null : o.owner, o.lastActivity, aeId,
        at(o.createdDays), at(closed ? 0 : 1)
      );
      const oppId = Number(info.lastInsertRowid);
      conn
        .prepare(
          `INSERT INTO crm_stage_events (opportunity_id, from_stage, to_stage, changed_by, note, changed_at)
           VALUES (?, NULL, 'contacted', ?, 'Tạo opportunity từ lead.', ?)`
        )
        .run(oppId, aeId, at(o.createdDays));
      conn
        .prepare(
          `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by)
           VALUES (?, ?, 'note', 'Tạo cơ hội', ?, ?, ?)`
        )
        .run(o.lead, oppId, `Opportunity ${o.title} được tạo.`, at(o.createdDays), aeId);
      if (o.stage !== "contacted") {
        conn
          .prepare(
            `INSERT INTO crm_stage_events (opportunity_id, from_stage, to_stage, changed_by, note, changed_at)
             VALUES (?, 'contacted', ?, ?, ?, ?)`
          )
          .run(oppId, o.stage === "lost" ? "proposal" : o.stage, aeId, "Cập nhật từ buổi làm việc.", at(Math.max(1, o.createdDays - 6)));
      }
      // Lead nguồn phải trỏ ngược về cơ hội vừa tạo — giống createOpportunity() làm khi
      // chuyển lead thật. Thiếu bước này thì danh sách lead không hiện mã cơ hội đã chuyển đổi
      // và luồng "CRM → hồ sơ FDA/GACC" mất dấu.
      conn
        .prepare(
          `UPDATE crm_leads SET converted_opportunity_id = ?, updated_at = datetime('now')
            WHERE id = ? AND status = 'converted' AND converted_opportunity_id IS NULL`
        )
        .run(oppId, o.lead as number);
      // Deal thắng thì nối thẳng với hồ sơ FDA/GACC đã xuất bản → Founder thấy lead → hồ sơ.
      if (o.stage === "won") {
        const cert = conn
          .prepare("SELECT id FROM certificates WHERE company_name = ? LIMIT 1")
          .get(o.company) as { id: number } | undefined;
        if (cert) {
          conn
            .prepare("UPDATE crm_opportunities SET certificate_id = ? WHERE id = ?")
            .run(cert.id, oppId);
          conn
            .prepare("UPDATE crm_leads SET certificate_id = ? WHERE id = ?")
            .run(cert.id, o.lead as number);
        }
      }
      oppSeq += 1;
    }

    const insertActivity = conn.prepare(
      `INSERT INTO crm_activities (lead_id, opportunity_id, type, subject, content, performed_at, created_by, is_follow_up, due_at, completed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    );

    const acts: Array<[number | null, number | null, ActivityType, string, string, number, number, number, string | null, string | null]> = [
      [lAnPhat, 1, "research_note", "Research Công ty CP Thực phẩm An Phát", "Nhà máy 12.000 m² tại Hải Phòng, công suất 400 tấn/tháng, đã có HACCP, ISO 22000. Chưa từng đăng ký FDA. Người quyết định: ông Lê Văn An.", 11, srId, 0, null, null],
      [lAnPhat, 1, "qualification", "Qualification lead An Phát", "BANT đạt 4/5: nhu cầu rõ, ngân sách duyệt Q4, timeline quý 1/2027. Thiếu: xác nhận ngân sách bằng văn bản.", 10, srId, 0, null, null],
      [lMekong, 2, "research_note", "Research Nông sản Mekong", "Đã có mã GACC cho 2 dòng sản phẩm, cần bổ sung dòng trái cây sấy. Đối thủ đang chào giá 41 triệu.", 19, srId, 0, null, null],
      [lGreenLeaf, 3, "research_note", "Research Green Leaf Cosmetics", "17 SKU mỹ phẩm, đang bán qua Amazon US. Bắt buộc MoCRA từ 2024. Đang dùng dịch vụ trung gian, không nắm được tài khoản FDA.", 28, srId, 0, null, null],
      [lVietPhat, 4, "qualification", "Qualification Gạo Việt Phát", "Doanh nghiệp có giấy phép xuất khẩu gạo, cần GACC cho cơ sở xay xát. Chưa rõ số cơ sở cần đăng ký → SR cần bổ sung dữ liệu.", 40, srId, 0, null, null],
      [lBinhMinh, 5, "meeting", "Họp chốt hợp đồng FDA", "Khách đồng ý gói FDA 20 triệu, thanh toán 50% trước. Đã ký hợp đồng.", 52, aeId, 0, null, null],
      [lCaphe, 6, "call", "Gọi follow-up báo giá", "Khách so sánh với 2 đơn vị khác, yêu cầu giảm 15%. Không đạt thoả thuận.", 9, srId, 0, null, null],
      [lCaphe, 6, "note", "Đóng cơ hội — Lost", "Khách chọn đơn vị khác do giá thấp hơn. Ghi nhận để điều chỉnh bảng giá gói FDA cà phê.", 8, aeId, 0, null, null],
      [lAnPhat, 1, "task", "Gọi lại xác nhận báo giá", "", 3, aeId, 1, day(-2), null],
      [lMekong, 2, "task", "Gửi hợp đồng GACC bản sửa đổi", "", 2, aeId, 1, day(2), null],
      [lGreenLeaf, 3, "task", "Bổ sung danh sách 17 SKU và nhãn sản phẩm", "", 4, srId, 1, day(3), null],
      [lCaphe, null, "research_note", "Nghiên cứu nguồn lead cà phê Tây Nguyên", "Thu thập 24 doanh nghiệp cà phê từ danh sách VCF. Đã lọc còn 6 doanh nghiệp có năng lực xuất khẩu.", 5, lrId, 0, null, null],
    ];

    for (const [lead, oppIndex, type, subject, content, daysAgo, by, isFollow, due, completed] of acts) {
      const oppId = oppIndex ? oppIndex : null;
      insertActivity.run(lead, oppId, type, subject, content, at(daysAgo, "10:20:00"), by, isFollow, due, completed);
    }

    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }
}

function industryOf(company: string) {
  if (company.includes("Cà phê")) return "Nông sản — cà phê";
  if (company.includes("Gạo")) return "Nông sản — gạo";
  if (company.includes("Hải sản") || company.includes("Thực phẩm")) return "Thực phẩm — thuỷ sản";
  if (company.includes("Cosmetics")) return "Mỹ phẩm";
  if (company.includes("May mặc")) return "Dệt may";
  if (company.includes("Đồ gỗ")) return "Đồ gỗ — thủ công mỹ nghệ";
  return "Nông sản";
}

function productsOf(company: string) {
  if (company.includes("Cà phê")) return "Cà phê rang xay, cà phê nhân";
  if (company.includes("Gạo")) return "Gạo trắng, gạo thơm đóng gói";
  if (company.includes("Hải sản")) return "Tôm, cá đông lạnh";
  if (company.includes("Cosmetics")) return "Serum, kem dưỡng da";
  if (company.includes("May mặc")) return "Hàng may mặc gia công";
  if (company.includes("Đồ gỗ")) return "Đồ gỗ nội thất, mỹ nghệ";
  return "Nông sản chế biến";
}

function marketOf(company: string) {
  if (company.includes("Gạo") || company.includes("Nông sản")) return "Trung Quốc";
  if (company.includes("Cosmetics")) return "Hoa Kỳ (Amazon)";
  return "Hoa Kỳ";
}
