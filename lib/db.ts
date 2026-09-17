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
}) {
  return isSupabaseEnabled() ? cloud.createUser(input) : Number(sqlite.createUser(input));
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
  duns_code?: string;
  us_agent?: string;
  service_price: number;
  company_name: string;
  company_email?: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
  created_by: number;
}) {
  return isSupabaseEnabled() ? cloud.createCertificate(input as any) : sqlite.createCertificate(input as any);
}

export async function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    duns_code?: string;
    us_agent?: string;
    service_price: number;
    company_name: string;
    company_email?: string;
    scope: string;
    registered_at: string;
    validity_years?: number;
  }
) {
  return isSupabaseEnabled() ? cloud.updateCertificate(id, input as any) : sqlite.updateCertificate(id, input as any);
}

export async function confirmValidity(id: number) {
  return isSupabaseEnabled() ? cloud.confirmValidity(id) : sqlite.confirmValidity(id);
}

export async function publishCertificate(id: number) {
  return isSupabaseEnabled() ? cloud.publishCertificate(id) : sqlite.publishCertificate(id);
}

export async function renewCertificate(id: number, extraFee = 0, renewalYears?: number) {
  return isSupabaseEnabled()
    ? cloud.renewCertificate(id, extraFee, renewalYears)
    : sqlite.renewCertificate(id, extraFee, renewalYears);
}

export async function deleteCertificate(id: number) {
  return isSupabaseEnabled() ? cloud.deleteCertificate(id) : sqlite.deleteCertificate(id);
}

export async function revenueStats() {
  return isSupabaseEnabled() ? cloud.revenueStats() : sqlite.revenueStats();
}

export type ConsultationLead = sqlite.ConsultationLead;
export type Company = sqlite.Company;
export type ExpiryNotification = sqlite.ExpiryNotification;

export async function createLead(input: {
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  email?: string;
  company_name?: string;
  certificate_no?: string;
  public_code?: string;
  message?: string;
  source_url?: string;
  ip?: string;
}) {
  return isSupabaseEnabled() ? cloud.createLead(input) : sqlite.createLead(input);
}

export async function listLeads() {
  return isSupabaseEnabled() ? cloud.listLeads() : sqlite.listLeads();
}

export async function getLead(id: number) {
  return isSupabaseEnabled() ? cloud.getLead(id) : sqlite.getLead(id);
}

export async function updateLeadStatus(id: number, status: ConsultationLead["status"]) {
  return isSupabaseEnabled() ? cloud.updateLeadStatus(id, status) : sqlite.updateLeadStatus(id, status);
}

export async function deleteLead(id: number) {
  return isSupabaseEnabled() ? cloud.deleteLead(id) : sqlite.deleteLead(id);
}

export async function listCompanies() {
  return isSupabaseEnabled() ? cloud.listCompanies() : sqlite.listCompanies();
}

export async function getCompany(id: number) {
  return isSupabaseEnabled() ? cloud.getCompany(id) : sqlite.getCompany(id);
}

export async function getCompanyByName(name: string) {
  return isSupabaseEnabled() ? cloud.getCompanyByName(name) : sqlite.getCompanyByName(name);
}

export async function createCompany(input: {
  company_name: string;
  email?: string;
  phone?: string;
  tax_code?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
}) {
  return isSupabaseEnabled() ? cloud.createCompany(input) : sqlite.createCompany(input);
}

export async function updateCompany(
  id: number,
  input: {
    company_name: string;
    email?: string;
    phone?: string;
    tax_code?: string;
    address?: string;
    contact_person?: string;
    notes?: string;
  }
) {
  return isSupabaseEnabled() ? cloud.updateCompany(id, input) : sqlite.updateCompany(id, input);
}

export async function deleteCompany(id: number) {
  return isSupabaseEnabled() ? cloud.deleteCompany(id) : sqlite.deleteCompany(id);
}

export async function getCompanyStats(companyName: string) {
  return isSupabaseEnabled() ? cloud.getCompanyStats(companyName) : sqlite.getCompanyStats(companyName);
}

export async function listExpiryNotifications(limit = 100) {
  return isSupabaseEnabled() ? cloud.listExpiryNotifications(limit) : sqlite.listExpiryNotifications(limit);
}

export async function getExpiryNotificationsForCertificate(certId: number) {
  return isSupabaseEnabled() ? cloud.getExpiryNotificationsForCertificate(certId) : sqlite.getExpiryNotificationsForCertificate(certId);
}

export async function hasNotificationBeenSent(certId: number, type: string) {
  return isSupabaseEnabled() ? cloud.hasNotificationBeenSent(certId, type) : sqlite.hasNotificationBeenSent(certId, type);
}

export async function createExpiryNotification(input: {
  certificate_id: number;
  company_name: string;
  notification_type: ExpiryNotification["notification_type"];
  recipient_email: string;
  status?: "sent" | "failed";
}) {
  return isSupabaseEnabled() ? cloud.createExpiryNotification(input) : sqlite.createExpiryNotification(input);
}

/* ------------------------------ CRM Vận hành ----------------------------- */

export type CrmOppFilter = {
  pipeline_key?: string;
  owner_id?: number | null;
  q?: string;
  stage_filter?: "open" | "won" | "lost" | "all";
};

export async function listCrmPipelines() {
  return isSupabaseEnabled() ? cloud.listCrmPipelines() : sqlite.listCrmPipelines();
}

export async function getCrmStageById(id: number) {
  return isSupabaseEnabled() ? cloud.getCrmStageById(id) : sqlite.getCrmStageById(id);
}

export async function getCrmPipelineByKey(key: string) {
  return isSupabaseEnabled() ? cloud.getCrmPipelineByKey(key) : sqlite.getCrmPipelineByKey(key);
}

export async function listCrmOpportunities(filter: CrmOppFilter = {}) {
  return isSupabaseEnabled() ? cloud.listCrmOpportunities(filter) : sqlite.listCrmOpportunities(filter);
}

export async function getCrmOpportunity(id: number) {
  return isSupabaseEnabled() ? cloud.getCrmOpportunity(id) : sqlite.getCrmOpportunity(id);
}

export async function createCrmOpportunity(
  input: {
    pipeline_key: string;
    title?: string;
    company_name: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    industry?: string;
    source?: string;
    estimated_value?: number;
    owner_id?: number | null;
    next_action?: string;
    next_action_date?: string | null;
    expected_close_date?: string | null;
    notes?: string;
  },
  createdBy: number
) {
  return isSupabaseEnabled() ? cloud.createCrmOpportunity(input, createdBy) : sqlite.createCrmOpportunity(input, createdBy);
}

export async function updateCrmOpportunity(
  id: number,
  input: {
    title?: string;
    company_name?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    industry?: string;
    source?: string;
    estimated_value?: number;
    owner_id?: number | null;
    next_action?: string;
    next_action_date?: string | null;
    expected_close_date?: string | null;
    notes?: string;
  }
) {
  return isSupabaseEnabled() ? cloud.updateCrmOpportunity(id, input) : sqlite.updateCrmOpportunity(id, input);
}

export async function deleteCrmOpportunity(id: number) {
  return isSupabaseEnabled() ? cloud.deleteCrmOpportunity(id) : sqlite.deleteCrmOpportunity(id);
}

export async function moveCrmOpportunity(
  id: number,
  toStageId: number,
  checklist: Record<string, boolean>,
  note: string,
  lostReason: string,
  changedBy: number
) {
  return isSupabaseEnabled()
    ? cloud.moveCrmOpportunity(id, toStageId, checklist, note, lostReason, changedBy)
    : sqlite.moveCrmOpportunity(id, toStageId, checklist, note, lostReason, changedBy);
}

export async function listCrmHistory(opportunityId: number) {
  return isSupabaseEnabled() ? cloud.listCrmHistory(opportunityId) : sqlite.listCrmHistory(opportunityId);
}

export async function listCrmActivities(opportunityId: number) {
  return isSupabaseEnabled() ? cloud.listCrmActivities(opportunityId) : sqlite.listCrmActivities(opportunityId);
}

export async function createCrmActivity(
  opportunityId: number,
  input: { type?: string; title?: string; content?: string; outcome?: string; next_action?: string; next_action_date?: string | null },
  createdBy: number
) {
  return isSupabaseEnabled()
    ? cloud.createCrmActivity(opportunityId, input, createdBy)
    : sqlite.createCrmActivity(opportunityId, input, createdBy);
}

export async function listCrmChecklists(opportunityId: number) {
  return isSupabaseEnabled() ? cloud.listCrmChecklists(opportunityId) : sqlite.listCrmChecklists(opportunityId);
}

export async function crmDashboard(filter: { pipeline_key?: string; scope_user_id?: number | null } = {}) {
  return isSupabaseEnabled() ? cloud.crmDashboard(filter) : sqlite.crmDashboard(filter);
}

export function isCrmSchemaError(e: any): boolean {
  if (isSupabaseEnabled()) return cloud.isCrmSchemaError(e);
  return false;
}

/* --------------------------- Toàn cảnh (Admin) --------------------------- */

export async function overviewStats() {
  return isSupabaseEnabled() ? cloud.overviewStats() : sqlite.overviewStats();
}
