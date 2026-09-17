import { isSupabaseEnabled } from "./supabase";
import * as sqlite from "./db-sqlite";
import * as cloud from "./db-supabase";
import type { Role, Standard } from "./types";

export function usingSupabase() {
  return isSupabaseEnabled();
}

export async function findUserByEmail(email: string) {
  return isSupabaseEnabled() ? cloud.findUserByEmail(email) : sqlite.findUserByEmail(email);
}

export async function listUsers() {
  return isSupabaseEnabled() ? cloud.listUsers() : sqlite.listUsers();
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  team_id?: number | null;
}) {
  return isSupabaseEnabled() ? cloud.createUser(input) : Number(sqlite.createUser(input));
}

export async function setUserTeam(userId: number, teamId: number | null) {
  return isSupabaseEnabled()
    ? cloud.updateUserTeam(userId, teamId)
    : sqlite.updateUserTeam(userId, teamId);
}

export async function setUserRole(userId: number, role: Role) {
  return isSupabaseEnabled()
    ? cloud.updateUserRole(userId, role)
    : sqlite.updateUserRole(userId, role);
}

export async function listCertificates() {
  return isSupabaseEnabled() ? cloud.listCertificates() : sqlite.listCertificates();
}

export async function getCertificate(id: number) {
  return isSupabaseEnabled() ? cloud.getCertificate(id) : sqlite.getCertificate(id);
}

export async function getCertificateByPublicCode(code: string) {
  return isSupabaseEnabled()
    ? cloud.getCertificateByPublicCode(code)
    : sqlite.getCertificateByPublicCode(code);
}

export async function createCertificate(input: {
  standard: Standard;
  registration_code: string;
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  created_by: number;
}) {
  return isSupabaseEnabled() ? cloud.createCertificate(input) : sqlite.createCertificate(input);
}

export async function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    service_price: number;
    company_name: string;
    scope: string;
    registered_at: string;
  }
) {
  return isSupabaseEnabled() ? cloud.updateCertificate(id, input) : sqlite.updateCertificate(id, input);
}

export async function confirmValidity(id: number) {
  return isSupabaseEnabled() ? cloud.confirmValidity(id) : sqlite.confirmValidity(id);
}

export async function publishCertificate(id: number) {
  return isSupabaseEnabled() ? cloud.publishCertificate(id) : sqlite.publishCertificate(id);
}

export async function renewCertificate(id: number, extraFee = 0) {
  return isSupabaseEnabled() ? cloud.renewCertificate(id, extraFee) : sqlite.renewCertificate(id, extraFee);
}

export async function deleteCertificate(id: number) {
  return isSupabaseEnabled() ? cloud.deleteCertificate(id) : sqlite.deleteCertificate(id);
}

export async function revenueStats() {
  return isSupabaseEnabled() ? cloud.revenueStats() : sqlite.revenueStats();
}

/* ================================================================== *
 * VEXIM CRM — Sales Operation Management
 * ================================================================== */

import * as sqliteCrm from "./crm-sqlite";
import * as cloudCrm from "./crm-supabase";
import type {
  ActivityType,
  CrmLead,
  LeadSource,
  LeadStatus,
  OpportunityStage,
  Standard as CrmStandard,
} from "./types";
import type { CrmScopeFilter } from "./permissions";

export type CrmLeadInput = {
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

export type CrmOpportunityInput = {
  title?: string;
  company_name?: string;
  standard?: CrmStandard | null;
  value?: number;
  owner_id?: number | null;
  team_id?: number | null;
  expected_close_date?: string | null;
  next_action?: string;
  next_action_due?: string | null;
  next_action_owner_id?: number | null;
};

async function ensureCrm() {
  if (isSupabaseEnabled()) await cloudCrm.ensureCrmSeed();
}

/* ---- Teams ---- */

export async function crmListTeams() {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listTeams() : sqliteCrm.listTeams();
}

export async function crmCreateTeam(input: { name: string; ae_id: number | null }) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.createTeam(input) : sqliteCrm.createTeam(input);
}

/** Gán AE phụ trách (Pipeline Owner) cho team — trước đây hàm này có sẵn nhưng không ai gọi. */
export async function crmSetTeamLeader(teamId: number, aeId: number | null) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.setTeamLeader(teamId, aeId)
    : sqliteCrm.setTeamLeader(teamId, aeId);
}

/* ---- Leads ---- */

export async function crmListLeads(f: CrmScopeFilter): Promise<CrmLead[]> {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listLeads(f) : sqliteCrm.listLeads(f);
}

export async function crmGetLead(id: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.getLead(id) : sqliteCrm.getLead(id);
}

export async function crmCreateLead(input: CrmLeadInput & { created_by: number }) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.createLead(input) : sqliteCrm.createLead(input);
}

export async function crmUpdateLead(id: number, input: CrmLeadInput) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.updateLead(id, input) : sqliteCrm.updateLead(id, input);
}

export async function crmSetLeadStatus(id: number, status: LeadStatus) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.setLeadStatus(id, status) : sqliteCrm.setLeadStatus(id, status);
}

export async function crmAssignLead(id: number, ownerId: number | null, actorId: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.assignLead(id, ownerId, actorId) : sqliteCrm.assignLead(id, ownerId, actorId);
}

/* ---- Opportunities ---- */

export async function crmListOpportunities(f: CrmScopeFilter) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listOpportunities(f) : sqliteCrm.listOpportunities(f);
}

export async function crmGetOpportunity(id: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.getOpportunity(id) : sqliteCrm.getOpportunity(id);
}

export async function crmCreateOpportunity(
  input: CrmOpportunityInput & { created_by: number; lead_id?: number | null }
) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.createOpportunity(input) : sqliteCrm.createOpportunity(input);
}

export async function crmUpdateOpportunity(id: number, input: CrmOpportunityInput) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.updateOpportunity(id, input) : sqliteCrm.updateOpportunity(id, input);
}

export async function crmAssignOpportunity(id: number, ownerId: number, actorId: number) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.assignOpportunity(id, ownerId, actorId)
    : sqliteCrm.assignOpportunity(id, ownerId, actorId);
}

export async function crmChangeStage(
  id: number,
  stage: OpportunityStage,
  actorId: number,
  note = "",
  extra: { lost_reason?: string; certificate_id?: number } = {}
) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.changeStage(id, stage, actorId, note, extra)
    : sqliteCrm.changeStage(id, stage, actorId, note, extra);
}

export async function crmSetNextAction(
  id: number,
  input: { next_action: string; next_action_due?: string | null; next_action_owner_id?: number | null }
) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.setNextAction(id, input) : sqliteCrm.setNextAction(id, input);
}

export async function crmLinkCertificate(
  opportunityId: number,
  certificateId: number,
  actorId: number
) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.linkCertificate(opportunityId, certificateId, actorId)
    : sqliteCrm.linkCertificate(opportunityId, certificateId, actorId);
}

export async function crmClearNextAction(id: number, actorId: number) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.clearNextAction(id, actorId)
    : sqliteCrm.clearNextAction(id, actorId);
}

export async function crmDeleteOpportunity(id: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.deleteOpportunity(id) : sqliteCrm.deleteOpportunity(id);
}

/* ---- Activities / follow-up ---- */

export async function crmAddActivity(input: {
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
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.addActivity(input) : sqliteCrm.addActivity(input);
}

export async function crmListActivities(f: CrmScopeFilter, limit = 60) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listActivities(f, limit) : sqliteCrm.listActivities(f, limit);
}

export async function crmTimeline(opportunityId: number) {
  await ensureCrm();
  return isSupabaseEnabled()
    ? cloudCrm.listOpportunityTimeline(opportunityId)
    : sqliteCrm.listOpportunityTimeline(opportunityId);
}

export async function crmGetActivity(id: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.getActivity(id) : sqliteCrm.getActivity(id);
}

export async function crmCompleteActivity(id: number, actorId: number) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.completeActivity(id, actorId) : sqliteCrm.completeActivity(id, actorId);
}

export async function crmListFollowUps(f: CrmScopeFilter) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listFollowUps(f) : sqliteCrm.listFollowUps(f);
}

/* ---- Customers & analytics ---- */

export async function crmListCustomers(f: CrmScopeFilter) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.listCustomers(f) : sqliteCrm.listCustomers(f);
}

export async function crmStatsFor(f: CrmScopeFilter) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.crmStats(f) : sqliteCrm.crmStats(f);
}

export async function crmPerformanceFor(f: CrmScopeFilter) {
  await ensureCrm();
  return isSupabaseEnabled() ? cloudCrm.crmPerformance(f) : sqliteCrm.crmPerformance(f);
}
