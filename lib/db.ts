import type { PaymentRequest } from "./payment-request";
import { isSupabaseEnabled } from "./supabase";
import * as sqlite from "./db-sqlite";
import * as cloud from "./db-supabase";
import type { Role, Standard } from "./types";
import type { QuoteDraft, QuoteStatus } from "./quotes";
import { mergeQuoteTemplateRows, type QuoteTemplateDef, type QuoteTemplateKey } from "./quote-templates";

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
  /** Customer portal login - internal only, never part of the public/QR payload. */
  portal_user?: string;
  portal_pass?: string;
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
    /** Customer portal login - internal only, never part of the public/QR payload. */
    portal_user?: string;
    portal_pass?: string;
    scope: string;
    registered_at: string;
    validity_years?: number;
  },
  expectedUpdatedAt?: string
) {
  return isSupabaseEnabled() ? cloud.updateCertificate(id, input, expectedUpdatedAt) : sqlite.updateCertificate(id, input, expectedUpdatedAt);
}

export async function confirmValidity(id: number) {
  return isSupabaseEnabled() ? cloud.confirmValidity(id) : sqlite.confirmValidity(id);
}

export async function publishCertificate(id: number, expectedUpdatedAt?: string) {
  return isSupabaseEnabled() ? cloud.publishCertificate(id, expectedUpdatedAt) : sqlite.publishCertificate(id, expectedUpdatedAt);
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

/* --------------------- Hợp đồng dịch vụ + Kế toán --------------------- */

export async function listServiceContracts(filter: { service_type?: string; status?: string; q?: string } = {}) {
  return isSupabaseEnabled() ? cloud.listServiceContracts(filter) : sqlite.listServiceContracts(filter);
}

export async function getServiceContract(id: number) {
  return isSupabaseEnabled() ? cloud.getServiceContract(id) : sqlite.getServiceContract(id);
}

export async function createServiceContract(
  input: {
    service_type: "SALE_EXPORT" | "AMAZON_OPS";
    company_name: string;
    company_email?: string;
    contact_name?: string;
    contact_phone?: string;
    scope?: string;
    cycle_months?: number;
    started_at: string;
    contract_value?: number;
    opportunity_id?: number | null;
  },
  createdBy: number
) {
  return isSupabaseEnabled() ? cloud.createServiceContract(input, createdBy) : sqlite.createServiceContract(input, createdBy);
}

export async function updateServiceContract(
  id: number,
  input: {
    company_name?: string;
    company_email?: string;
    contact_name?: string;
    contact_phone?: string;
    scope?: string;
    cycle_months?: number;
    started_at?: string;
    contract_value?: number;
  }
) {
  return isSupabaseEnabled() ? cloud.updateServiceContract(id, input) : sqlite.updateServiceContract(id, input);
}

export async function setServiceContractStatus(id: number, status: "active" | "terminated") {
  return isSupabaseEnabled() ? cloud.setServiceContractStatus(id, status) : sqlite.setServiceContractStatus(id, status);
}

export async function renewServiceContract(id: number, cycleMonths?: number) {
  return isSupabaseEnabled() ? cloud.renewServiceContract(id, cycleMonths) : sqlite.renewServiceContract(id, cycleMonths);
}

export async function deleteServiceContract(id: number) {
  return isSupabaseEnabled() ? cloud.deleteServiceContract(id) : sqlite.deleteServiceContract(id);
}

export async function listInvoices(filter: { ref_type?: string; ref_id?: number; state?: string; q?: string } = {}) {
  return isSupabaseEnabled() ? cloud.listInvoices(filter) : sqlite.listInvoices(filter);
}

export async function getInvoice(id: number) {
  return isSupabaseEnabled() ? cloud.getInvoice(id) : sqlite.getInvoice(id);
}

export async function createInvoice(
  input: {
    ref_type: "certificate" | "service_contract";
    ref_id: number;
    installment_no?: number;
    title?: string;
    contract_no?: string;
    payment_request?: PaymentRequest | null;
    subtotal: number;
    vat_rate?: number;
    issue_date?: string;
    due_date?: string | null;
    notes?: string;
  },
  createdBy: number
) {
  return isSupabaseEnabled() ? cloud.createInvoice(input, createdBy) : sqlite.createInvoice(input, createdBy);
}

export async function updateInvoice(
  id: number,
  input: { title?: string; contract_no?: string; payment_request?: PaymentRequest | null; due_date?: string | null; notes?: string; subtotal?: number; vat_rate?: number }
) {
  return isSupabaseEnabled() ? cloud.updateInvoice(id, input) : sqlite.updateInvoice(id, input);
}

export async function cancelInvoice(id: number) {
  return isSupabaseEnabled() ? cloud.cancelInvoice(id) : sqlite.cancelInvoice(id);
}

export async function deleteInvoice(id: number) {
  return isSupabaseEnabled() ? cloud.deleteInvoice(id) : sqlite.deleteInvoice(id);
}

export async function listPayments(invoice_id: number) {
  return isSupabaseEnabled() ? cloud.listPayments(invoice_id) : sqlite.listPayments(invoice_id);
}

export async function createPayment(
  invoice_id: number,
  input: { amount: number; paid_at?: string; method?: string; reference?: string; note?: string },
  createdBy: number
) {
  return isSupabaseEnabled() ? cloud.createPayment(invoice_id, input, createdBy) : sqlite.createPayment(invoice_id, input, createdBy);
}

export async function deletePayment(id: number) {
  return isSupabaseEnabled() ? cloud.deletePayment(id) : sqlite.deletePayment(id);
}

export async function refSummary(ref_type: string, ref_id: number) {
  return isSupabaseEnabled() ? cloud.refSummary(ref_type, ref_id) : sqlite.refSummary(ref_type, ref_id);
}

export async function accountingSummary() {
  return isSupabaseEnabled() ? cloud.accountingSummary() : sqlite.accountingSummary();
}

/* --------------------------- Báo giá dịch vụ --------------------------- */

export async function listQuotes(filter: { template_key?: string; status?: string; q?: string } = {}) {
  return isSupabaseEnabled() ? cloud.listQuotes(filter) : sqlite.listQuotes(filter);
}

export async function getQuote(id: number) {
  return isSupabaseEnabled() ? cloud.getQuote(id) : sqlite.getQuote(id);
}

export async function createQuote(input: QuoteDraft, createdBy: number) {
  return isSupabaseEnabled() ? cloud.createQuote(input, createdBy) : sqlite.createQuote(input, createdBy);
}

export async function updateQuote(id: number, input: QuoteDraft) {
  return isSupabaseEnabled() ? cloud.updateQuote(id, input) : sqlite.updateQuote(id, input);
}

export async function setQuoteStatus(id: number, status: QuoteStatus) {
  return isSupabaseEnabled() ? cloud.setQuoteStatus(id, status) : sqlite.setQuoteStatus(id, status);
}

export async function deleteQuote(id: number) {
  return isSupabaseEnabled() ? cloud.deleteQuote(id) : sqlite.deleteQuote(id);
}

export async function duplicateQuote(id: number, createdBy: number) {
  return isSupabaseEnabled() ? cloud.duplicateQuote(id, createdBy) : sqlite.duplicateQuote(id, createdBy);
}

/* --------------------------- Bảng giá dịch vụ --------------------------- */

/** Bảng giá đã ghép: giá trong DB (nếu có) đè lên giá mặc định của hệ thống. */
export async function listQuoteTemplates(): Promise<QuoteTemplateDef[]> {
  const rows = isSupabaseEnabled() ? await cloud.listQuoteTemplateRows() : sqlite.listQuoteTemplateRows();
  return mergeQuoteTemplateRows(rows);
}

export async function loadQuoteTemplate(key: string): Promise<QuoteTemplateDef | undefined> {
  const templates = await listQuoteTemplates();
  return templates.find((t) => t.key === key);
}

export async function saveQuoteTemplate(key: QuoteTemplateKey, payload: QuoteTemplateDef, updatedBy: number | null) {
  return isSupabaseEnabled()
    ? cloud.saveQuoteTemplateRow(key, payload, updatedBy)
    : sqlite.saveQuoteTemplateRow(key, payload, updatedBy);
}

export async function resetQuoteTemplate(key: QuoteTemplateKey) {
  return isSupabaseEnabled() ? cloud.deleteQuoteTemplateRow(key) : sqlite.deleteQuoteTemplateRow(key);
}

export async function listQuoteTemplateRows() {
  return isSupabaseEnabled() ? cloud.listQuoteTemplateRows() : sqlite.listQuoteTemplateRows();
}
