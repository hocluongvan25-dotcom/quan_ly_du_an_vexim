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
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
  created_by: number;
}) {
  return isSupabaseEnabled() ? cloud.createCertificate(input) : sqlite.createCertificate(input);
}

export async function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    duns_code?: string;
    service_price: number;
    company_name: string;
    scope: string;
    registered_at: string;
    validity_years?: number;
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
