import { certificateUpdatedAt, prepareCertificateChanges, sameCertificateFields, needsCertificateApproval, certificateFields, type CertificateInput } from "./certificate-workflow";
import { hashPassword } from "./auth";
import { supabaseAdmin } from "./supabase";
import { expiryFromStandard, randomCode, remainingDays, getValidityYears, todayUtcIso } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";
import { DEFAULT_VALIDITY, isValidValidityYears, GACC_FIXED_YEARS, isValidValidityYearsForStandard } from "./types";
import {
  PIPELINE_DEFS,
  enrichOpportunity,
  validateTransition,
  type CrmActivity,
  type CrmChecklistState,
  type CrmOpportunity,
  type CrmOpportunityEnriched,
  type CrmPipeline,
  type CrmStage,
  type CrmStageHistory,
} from "./crm-types";
import { buildOverview } from "./overview";
import { addMonths } from "./utils";
import {
  calcInvoiceTotals,
  invoiceState,
  overdueDays,
  normalizeCycleMonths,
  type Invoice,
  type InvoicePayment,
  type ServiceContract,
  type ServiceType,
} from "./accounting";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
    created_at: String(row.created_at),
  };
}

function mapCert(row: Record<string, unknown>): Certificate {
  const joined = row.staff_users as { name?: string } | { name?: string }[] | null;
  const name = Array.isArray(joined) ? joined[0]?.name : joined?.name;
  const validity = Number(row.validity_years || 0);
  const std = row.standard as Standard;
  const item: Certificate = {
    id: Number(row.id),
    public_code: String(row.public_code),
    certificate_no: String(row.certificate_no),
    standard: std,
    registration_code: String(row.registration_code || ""),
    duns_code: std === "GACC" ? "" : String(row.duns_code || ""),
    us_agent: std === "GACC" ? "" : String(row.us_agent || ""),
    service_price: Number(row.service_price || 0),
    company_name: String(row.company_name || ""),
    company_email: String(row.company_email || ""),
    scope: String(row.scope || ""),
    registered_at: String(row.registered_at).slice(0, 10),
    expires_at: String(row.expires_at).slice(0, 10),
    validity_years: isValidValidityYears(validity) ? validity : DEFAULT_VALIDITY[std] ?? 2,
    validity_confirmed: row.validity_confirmed ? 1 : 0,
    status: row.status as Certificate["status"],
    published_at: row.published_at ? String(row.published_at) : null,
    revenue_recorded: row.revenue_recorded ? 1 : 0,
    renewal_count: Number(row.renewal_count || 0),
    last_renewed_at: row.last_renewed_at ? String(row.last_renewed_at) : null,
    created_by: Number(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by_name: name,
    pending_changes: (row.pending_changes as Certificate["pending_changes"]) || null,
  };
  if (item.status === "published" && remainingDays(item.expires_at) < 0) {
    item.status = "expired";
  }
  return item;
}

function assertNoSupabaseError(error: any, context: string) {
  if (!error) return;
  if (error.code === "PGRST205" || String(error.message || "").includes("PGRST205") || String(error.message || "").includes("schema cache")) {
    console.error(`[Supabase] ${context} - PGRST205:`, error);
    if (context === "consultation_leads") {
      const e = new Error(
        `SUPABASE_SCHEMA_MISSING: Table '${context}' does not exist or is not exposed in Supabase. ` +
          `Please go to Supabase Dashboard > SQL Editor and run the entire supabase/schema.sql file, ` +
          `then run: NOTIFY pgrst, 'reload schema'; ` +
          `Original details: ${error.message}`
      );
      (e as any).code = "PGRST205";
      (e as any).isConsultationLeadsMissing = true;
      throw e;
    }
    throw new Error(
      `SUPABASE_SCHEMA_MISSING: Table '${context}' does not exist or is not exposed in Supabase. ` +
        `Please go to Supabase Dashboard > SQL Editor and run the entire supabase/schema.sql file, ` +
        `then run: NOTIFY pgrst, 'reload schema'; ` +
        `Original details: ${error.message}`
    );
  }
  throw error;
}

function isMissingConsultationTableError(e: any): boolean {
  if (!e) return false;
  if (e.isConsultationLeadsMissing) return true;
  const msg = String(e.message || "");
  if (msg.includes("SUPABASE_SCHEMA_MISSING") && msg.includes("consultation_leads")) return true;
  if (e.code === "PGRST205" && msg.includes("consultation_leads")) return true;
  return false;
}

function normalizeValidityYears(input: number | undefined, standard: Standard): number {
  if (standard === "GACC") return GACC_FIXED_YEARS;
  if (input && isValidValidityYears(input)) return Math.round(input);
  return DEFAULT_VALIDITY[standard] ?? 2;
}

const SAMPLE_CERTS: Array<{
  no: string;
  standard: Standard;
  code: string;
  duns: string;
  us_agent: string;
  price: number;
  company: string;
  scope: string;
  registered: string;
  published: string;
  validity: number;
}> = [
  {
    no: "VXM-FDA-2025-0001",
    standard: "FDA",
    code: "17823456789",
    duns: "123456789",
    us_agent: "Vexim Global LLC",
    price: 18500000,
    company: "An Phat Food JSC",
    scope: "Food Facility Registration — frozen seafood processing for export to USA",
    registered: "2025-01-15",
    published: "2025-01-16T09:30:00Z",
    validity: 2,
  },
  {
    no: "VXM-GACC-2024-0008",
    standard: "GACC",
    code: "VN-GACC-44012345678",
    duns: "",
    us_agent: "",
    price: 42000000,
    company: "Mekong Agri Products Co., Ltd",
    scope: "Food enterprise registration for export to China (GACC Decree 248)",
    registered: "2024-03-20",
    published: "2024-03-22T09:30:00Z",
    validity: 5,
  },
  {
    no: "VXM-FDA-2026-0004",
    standard: "FDA",
    code: "18900123456",
    duns: "112223333",
    us_agent: "Vexim Global LLC",
    price: 21000000,
    company: "Green Leaf Cosmetics JSC",
    scope: "MoCRA facility registration & cosmetic product listing",
    registered: "2026-02-10",
    published: "2026-02-12T09:30:00Z",
    validity: 3,
  },
  {
    no: "VXM-GACC-2026-0002",
    standard: "GACC",
    code: "VN-GACC-33098765432",
    duns: "",
    us_agent: "",
    price: 38500000,
    company: "Viet Phat Rice JSC",
    scope: "Rice milling and packaging facility for export to China market",
    registered: "2026-06-01",
    published: "2026-06-03T09:30:00Z",
    validity: 5,
  },
  {
    no: "VXM-FDA-2026-0012",
    standard: "FDA",
    code: "17200998877",
    duns: "778889999",
    us_agent: "Vexim Global LLC",
    price: 16500000,
    company: "Binh Minh Seafood Co., Ltd",
    scope: "FDA Food Facility Registration — fresh and frozen seafood",
    registered: "2026-08-18",
    published: "2026-08-20T09:30:00Z",
    validity: 2,
  },
];

let seeded = false;

export async function ensureSeed() {
  if (seeded) return;
  const sb = supabaseAdmin();
  try {
    const { count, error } = await sb.from("staff_users").select("id", { count: "exact", head: true });
    if (error) {
      assertNoSupabaseError(error, "staff_users");
    }
    if ((count || 0) > 0) {
      seeded = true;
      return;
    }

    const { data: users, error: userErr } = await sb
      .from("staff_users")
      .insert([
        {
          email: "admin@veximglobal.com",
          name: "Administrator",
          password_hash: hashPassword("Vexim@Admin2026"),
          role: "admin",
        },
        {
          email: "chuyenmon@veximglobal.com",
          name: "Documentation Specialist",
          password_hash: hashPassword("Vexim@CM2026"),
          role: "specialist",
        },
      ])
      .select("id, email");
    if (userErr) {
      assertNoSupabaseError(userErr, "staff_users");
    }
    const spec = users?.find((u) => u.email === "chuyenmon@veximglobal.com");
    const admin = users?.find((u) => u.email === "admin@veximglobal.com");

    const { error: certErr } = await sb.from("certificates").insert(
      SAMPLE_CERTS.map((s) => ({
        public_code: randomCode(12),
        certificate_no: s.no,
        standard: s.standard,
        registration_code: s.code,
        duns_code: s.standard === "GACC" ? "" : s.duns,
        us_agent: s.standard === "GACC" ? "" : s.us_agent,
        service_price: s.price,
        company_name: s.company,
        scope: s.scope,
        registered_at: s.registered,
        expires_at: expiryFromStandard(s.registered, s.standard, s.validity),
        validity_years: s.validity,
        validity_confirmed: true,
        status: "published",
        published_at: s.published,
        revenue_recorded: true,
        created_by: s.company.includes("Green") ? admin?.id : spec?.id || admin?.id,
      }))
    );
    if (certErr) {
      assertNoSupabaseError(certErr, "certificates");
    }
    seeded = true;
  } catch (e: any) {
    if (e?.message?.includes("SUPABASE_SCHEMA_MISSING")) throw e;
    if (e?.code === "PGRST205" || String(e?.message || "").includes("PGRST205")) {
      assertNoSupabaseError(e, "staff_users");
    }
    throw e;
  }
}

export async function findUserByEmail(email: string) {
  await ensureSeed();
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) assertNoSupabaseError(error, "staff_users");
  if (!data) return undefined;
  return { ...mapUser(data), password_hash: String(data.password_hash) };
}

export async function listUsers(): Promise<User[]> {
  await ensureSeed();
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .select("id, email, name, role, created_at")
    .order("id");
  if (error) assertNoSupabaseError(error, "staff_users");
  return (data || []).map(mapUser);
}

export async function createUser(input: { email: string; name: string; password: string; role: Role }) {
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      password_hash: hashPassword(input.password),
      role: input.role,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "staff_users");
  return Number((data as any)?.id ?? 0);
}

export async function nextCertificateNo(standard: Standard) {
  const year = new Date().getFullYear();
  const prefix = `VXM-${standard}-${year}-`;
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("certificate_no")
    .like("certificate_no", `${prefix}%`)
    .order("certificate_no", { ascending: false })
    .limit(1);
  if (error) assertNoSupabaseError(error, "certificates");
  let seq = 1;
  const no = data?.[0]?.certificate_no;
  if (no) {
    const n = Number(String(no).split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function listCertificates(): Promise<Certificate[]> {
  await ensureSeed();
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("*, staff_users(name)")
    .order("updated_at", { ascending: false });
  if (error) assertNoSupabaseError(error, "certificates");
  return (data || []).map(mapCert);
}

export async function getCertificate(id: number) {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("*, staff_users(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) assertNoSupabaseError(error, "certificates");
  return data ? mapCert(data) : undefined;
}

export async function getCertificateByPublicCode(code: string) {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("*")
    .eq("public_code", code.toUpperCase())
    .maybeSingle();
  if (error) assertNoSupabaseError(error, "certificates");
  return data ? mapCert(data) : undefined;
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
  const validity = normalizeValidityYears(input.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const no = await nextCertificateNo(input.standard);
  const isGacc = input.standard === "GACC";
  const duns = isGacc ? "" : (input.duns_code || "").replace(/\D/g, "").slice(0, 9);
  const usAgent = isGacc ? "" : (input.us_agent || "").trim().slice(0, 200);
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .insert({
      public_code: randomCode(12),
      certificate_no: no,
      standard: input.standard,
      registration_code: input.registration_code.trim(),
      duns_code: duns,
      us_agent: usAgent,
      service_price: Math.max(0, Math.round(input.service_price || 0)),
      company_name: input.company_name.trim(),
      company_email: (input.company_email || "").trim(),
      scope: input.scope.trim(),
      registered_at: input.registered_at,
      expires_at: expires,
      validity_years: validity,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "certificates");
  // Sync to companies
  try {
    const existing = await getCompanyByName(input.company_name.trim());
    if (!existing && input.company_name.trim()) {
      await createCompany({ company_name: input.company_name.trim(), email: (input.company_email || "").trim() });
    } else if (existing && input.company_email?.trim()) {
      await updateCompany(existing.id, {
        company_name: existing.company_name,
        email: input.company_email.trim() || existing.email,
        phone: existing.phone,
        tax_code: existing.tax_code,
        address: existing.address,
        contact_person: existing.contact_person,
        notes: existing.notes,
      });
    }
  } catch {}
  return Number((data as any)?.id ?? 0);
}

async function syncCertificateCompany(input: { company_name: string; company_email: string }) {
  try {
    const existing = await getCompanyByName(input.company_name.trim());
    if (!existing && input.company_name.trim()) {
      await createCompany({ company_name: input.company_name.trim(), email: input.company_email });
    } else if (existing && input.company_email) {
      await updateCompany(existing.id, {
        company_name: existing.company_name,
        email: input.company_email || existing.email,
        phone: existing.phone,
        tax_code: existing.tax_code,
        address: existing.address,
        contact_person: existing.contact_person,
        notes: existing.notes,
      });
    }
  } catch {}
}

export async function updateCertificate(id: number, input: CertificateInput, expectedUpdatedAt?: string) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) throw new Error("CONFLICT");
  const changes = prepareCertificateChanges(current, input);
  if (sameCertificateFields(changes, current.pending_changes || current)) return;
  const payload = current.status === "draft"
    ? { ...changes, validity_confirmed: false }
    : { pending_changes: sameCertificateFields(changes, current) ? null : changes };
  const { data, error } = await supabaseAdmin().from("certificates")
    .update({ ...payload, updated_at: certificateUpdatedAt(current) })
    .eq("id", id).eq("updated_at", current.updated_at).select("id").maybeSingle();
  if (error) assertNoSupabaseError(error, "certificates");
  if (!data) throw new Error("CONFLICT");
  if (current.status !== "draft") return;
  await syncCertificateCompany(changes);
}

export async function confirmValidity(id: number) {
  return publishCertificate(id);
}

export async function publishCertificate(id: number, expectedUpdatedAt?: string) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (expectedUpdatedAt && current.updated_at !== expectedUpdatedAt) throw new Error("CONFLICT");
  if (!needsCertificateApproval(current)) return current;
  const approved = { ...current, ...current.pending_changes };
  if (!approved.company_name || !approved.registration_code) throw new Error("INCOMPLETE");
  if (!approved.registered_at || !approved.expires_at) throw new Error("MISSING_DATES");
  const fields = Object.fromEntries(certificateFields.map((f) => [f, approved[f]]));
  const { data, error } = await supabaseAdmin().from("certificates")
    .update({ ...fields, pending_changes: null, status: "published", validity_confirmed: true,
      published_at: current.published_at || new Date().toISOString(), revenue_recorded: true,
      updated_at: certificateUpdatedAt(current) })
    .eq("id", id).eq("updated_at", current.updated_at).select("id").maybeSingle();
  if (error) assertNoSupabaseError(error, "certificates");
  if (!data) throw new Error("CONFLICT");
  await syncCertificateCompany(approved);
  return (await getCertificate(id))!;
}

export async function renewCertificate(id: number, extraFee = 0, renewalYears?: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (needsCertificateApproval(current)) throw new Error("APPROVAL_REQUIRED");
  // FDA fixed 2, GACC fixed 5
  let validity: number;
  if (current.standard === "GACC") {
    validity = GACC_FIXED_YEARS;
  } else if (renewalYears && isValidValidityYearsForStandard(renewalYears, current.standard)) {
    validity = Math.round(renewalYears);
  } else {
    validity = getValidityYears(current);
  }
  const baseDate =
    remainingDays(current.expires_at) >= 0
      ? current.expires_at
      : todayUtcIso();
  const nextExpiry = expiryFromStandard(baseDate, current.standard, validity);
  const extra = Math.max(0, Math.round(extraFee || 0));
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .update({
      expires_at: nextExpiry,
      validity_years: validity,
      renewal_count: current.renewal_count + 1,
      last_renewed_at: new Date().toISOString(),
      service_price: current.service_price + extra,
      status: "published",
      validity_confirmed: true,
      updated_at: certificateUpdatedAt(current),
    })
    .eq("id", id).eq("updated_at", current.updated_at).select("id").maybeSingle();
  if (error) assertNoSupabaseError(error, "certificates");
  if (!data) throw new Error("CONFLICT");
  return (await getCertificate(id))!;
}

export async function deleteCertificate(id: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "published" && current.revenue_recorded) {
    throw new Error("PUBLISHED");
  }
  const { error } = await supabaseAdmin().from("certificates").delete().eq("id", id);
  if (error) assertNoSupabaseError(error, "certificates");
}

export type ConsultationLead = {
  id: number;
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  email: string;
  company_name: string;
  certificate_no: string;
  public_code: string;
  message: string;
  source_url: string;
  ip: string;
  status: "new" | "contacted" | "converted" | "closed";
  created_at: string;
  updated_at: string;
};

function mapLead(row: Record<string, unknown>): ConsultationLead {
  return {
    id: Number(row.id),
    service_type: row.service_type as ConsultationLead["service_type"],
    name: String(row.name || ""),
    phone: String(row.phone || ""),
    email: String(row.email || ""),
    company_name: String(row.company_name || ""),
    certificate_no: String(row.certificate_no || ""),
    public_code: String(row.public_code || ""),
    message: String(row.message || ""),
    source_url: String(row.source_url || ""),
    ip: String(row.ip || ""),
    status: (row.status as ConsultationLead["status"]) || "new",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

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
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .insert({
        service_type: input.service_type,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: (input.email || "").trim(),
        company_name: (input.company_name || "").trim(),
        certificate_no: (input.certificate_no || "").trim(),
        public_code: (input.public_code || "").trim(),
        message: (input.message || "").trim(),
        source_url: (input.source_url || "").trim(),
        ip: (input.ip || "").trim(),
      })
      .select("id")
      .single();
    if (error) assertNoSupabaseError(error, "consultation_leads");
    return Number((data as any)?.id ?? 0);
  } catch (e: any) {
    if (isMissingConsultationTableError(e)) {
      console.warn("[Supabase] consultation_leads table missing - lead will be emailed only, not stored in DB. Please run supabase/schema.sql");
      return 0;
    }
    throw e;
  }
}

export async function listLeads(): Promise<ConsultationLead[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) assertNoSupabaseError(error, "consultation_leads");
    return (data || []).map(mapLead);
  } catch (e: any) {
    if (isMissingConsultationTableError(e)) {
      console.warn("[Supabase] consultation_leads table missing - returning empty list");
      return [];
    }
    throw e;
  }
}

export async function getLead(id: number) {
  try {
    const { data, error } = await supabaseAdmin()
      .from("consultation_leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) assertNoSupabaseError(error, "consultation_leads");
    return data ? mapLead(data) : undefined;
  } catch (e: any) {
    if (isMissingConsultationTableError(e)) return undefined;
    throw e;
  }
}

export async function updateLeadStatus(id: number, status: ConsultationLead["status"]) {
  try {
    const { error } = await supabaseAdmin()
      .from("consultation_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) assertNoSupabaseError(error, "consultation_leads");
  } catch (e: any) {
    if (isMissingConsultationTableError(e)) {
      console.warn("[Supabase] consultation_leads table missing - updateLeadStatus skipped");
      return;
    }
    throw e;
  }
}

export async function deleteLead(id: number) {
  try {
    const { error } = await supabaseAdmin().from("consultation_leads").delete().eq("id", id);
    if (error) assertNoSupabaseError(error, "consultation_leads");
  } catch (e: any) {
    if (isMissingConsultationTableError(e)) {
      console.warn("[Supabase] consultation_leads table missing - deleteLead skipped");
      return;
    }
    throw e;
  }
}

export type Company = {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  tax_code: string;
  address: string;
  contact_person: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: Number(row.id),
    company_name: String(row.company_name || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    tax_code: String(row.tax_code || ""),
    address: String(row.address || ""),
    contact_person: String(row.contact_person || ""),
    notes: String(row.notes || ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function isMissingCompaniesTableError(e: any): boolean {
  if (!e) return false;
  const msg = String(e.message || "");
  if (msg.includes("companies") && (msg.includes("PGRST205") || msg.includes("schema cache") || msg.includes("does not exist"))) return true;
  if (e.code === "PGRST205" && msg.includes("companies")) return true;
  return false;
}

export async function listCompanies(): Promise<Company[]> {
  try {
    const { data, error } = await supabaseAdmin().from("companies").select("*").order("updated_at", { ascending: false });
    if (error) assertNoSupabaseError(error, "companies");
    const companies = (data || []).map(mapCompany);

    // Merge with distinct company names from certificates (official DB)
    try {
      const { data: certData, error: certErr } = await supabaseAdmin()
        .from("certificates")
        .select("company_name")
        .neq("company_name", "");
      if (!certErr && certData) {
        const existing = new Set(companies.map((c) => c.company_name.toLowerCase()));
        const distinct = new Map<string, string>();
        certData.forEach((r: any) => {
          const name = String(r.company_name || "").trim();
          if (name && !existing.has(name.toLowerCase())) {
            distinct.set(name.toLowerCase(), name);
          }
        });
        let idx = 0;
        for (const name of Array.from(distinct.values())) {
          companies.push({
            id: -1000 - idx,
            company_name: name,
            email: "",
            phone: "",
            tax_code: "",
            address: "",
            contact_person: "",
            notes: "Tự động từ chứng nhận",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          idx++;
        }
      }
    } catch {}

    return companies;
  } catch (e: any) {
    if (isMissingCompaniesTableError(e)) {
      console.warn("[Supabase] companies table missing - returning empty, please run schema.sql");
      return [];
    }
    throw e;
  }
}

export async function getCompany(id: number): Promise<Company | undefined> {
  try {
    const { data, error } = await supabaseAdmin().from("companies").select("*").eq("id", id).maybeSingle();
    if (error) assertNoSupabaseError(error, "companies");
    return data ? mapCompany(data) : undefined;
  } catch (e: any) {
    if (isMissingCompaniesTableError(e)) return undefined;
    throw e;
  }
}

export async function getCompanyByName(name: string): Promise<Company | undefined> {
  try {
    const { data, error } = await supabaseAdmin().from("companies").select("*").eq("company_name", name.trim()).maybeSingle();
    if (error) assertNoSupabaseError(error, "companies");
    return data ? mapCompany(data) : undefined;
  } catch (e: any) {
    if (isMissingCompaniesTableError(e)) return undefined;
    throw e;
  }
}

export async function createCompany(input: {
  company_name: string;
  email?: string;
  phone?: string;
  tax_code?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
}): Promise<number> {
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  const { data, error } = await supabaseAdmin()
    .from("companies")
    .insert({
      company_name: input.company_name.trim(),
      email: (input.email || "").trim(),
      phone: (input.phone || "").trim(),
      tax_code: (input.tax_code || "").trim(),
      address: (input.address || "").trim(),
      contact_person: (input.contact_person || "").trim(),
      notes: (input.notes || "").trim(),
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "companies");
  return Number((data as any)?.id ?? 0);
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
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  const { error } = await supabaseAdmin()
    .from("companies")
    .update({
      company_name: input.company_name.trim(),
      email: (input.email || "").trim(),
      phone: (input.phone || "").trim(),
      tax_code: (input.tax_code || "").trim(),
      address: (input.address || "").trim(),
      contact_person: (input.contact_person || "").trim(),
      notes: (input.notes || "").trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "companies");
}

export async function deleteCompany(id: number) {
  const { error } = await supabaseAdmin().from("companies").delete().eq("id", id);
  if (error) assertNoSupabaseError(error, "companies");
}

export async function getCompanyStats(companyName: string) {
  const sb = supabaseAdmin();
  const { data: certsData, error: certErr } = await sb
    .from("certificates")
    .select("*")
    .eq("company_name", companyName)
    .order("updated_at", { ascending: false });
  if (certErr) assertNoSupabaseError(certErr, "certificates");

  let leadsData: any[] = [];
  try {
    const { data, error } = await sb
      .from("consultation_leads")
      .select("*")
      .eq("company_name", companyName)
      .order("created_at", { ascending: false });
    if (error) assertNoSupabaseError(error, "consultation_leads");
    leadsData = data || [];
  } catch (e: any) {
    if (!isMissingConsultationTableError(e)) throw e;
  }

  const certs = (certsData || []).map(mapCert);
  const leads = leadsData.map(mapLead);
  const services = new Set<string>();
  certs.forEach((c) => services.add(c.standard));
  leads.forEach((l) => services.add(l.service_type === "sales" ? "SALE_EXPORT" : "AMAZON_OPS"));

  return {
    certificates: certs,
    leads,
    services: Array.from(services),
    totalCertificates: certs.length,
    totalLeads: leads.length,
  };
}


export type ExpiryNotification = {
  id: number;
  certificate_id: number;
  company_name: string;
  notification_type: "90_days" | "60_days" | "30_days" | "14_days" | "7_days" | "3_days" | "1_day" | "expired" | "renewal_reminder";
  recipient_email: string;
  status: "sent" | "failed";
  sent_at: string;
  created_at: string;
};

function mapExpiryNotification(row: Record<string, unknown>): ExpiryNotification {
  return {
    id: Number(row.id),
    certificate_id: Number(row.certificate_id),
    company_name: String(row.company_name || ""),
    notification_type: row.notification_type as ExpiryNotification["notification_type"],
    recipient_email: String(row.recipient_email || ""),
    status: (row.status as ExpiryNotification["status"]) || "sent",
    sent_at: String(row.sent_at),
    created_at: String(row.created_at),
  };
}

export async function listExpiryNotifications(limit = 100): Promise<ExpiryNotification[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("expiry_notifications")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);
    if (error) assertNoSupabaseError(error, "expiry_notifications");
    return (data || []).map(mapExpiryNotification);
  } catch (e: any) {
    if (String(e.message || "").includes("expiry_notifications")) return [];
    throw e;
  }
}

export async function getExpiryNotificationsForCertificate(certId: number): Promise<ExpiryNotification[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("expiry_notifications")
      .select("*")
      .eq("certificate_id", certId)
      .order("sent_at", { ascending: false });
    if (error) assertNoSupabaseError(error, "expiry_notifications");
    return (data || []).map(mapExpiryNotification);
  } catch {
    return [];
  }
}

export async function hasNotificationBeenSent(certId: number, type: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("expiry_notifications")
      .select("id")
      .eq("certificate_id", certId)
      .eq("notification_type", type)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function createExpiryNotification(input: {
  certificate_id: number;
  company_name: string;
  notification_type: ExpiryNotification["notification_type"];
  recipient_email: string;
  status?: "sent" | "failed";
}): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("expiry_notifications")
    .insert({
      certificate_id: input.certificate_id,
      company_name: input.company_name,
      notification_type: input.notification_type,
      recipient_email: input.recipient_email,
      status: input.status || "sent",
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "expiry_notifications");
  return Number((data as any)?.id ?? 0);
}

export async function revenueStats() {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("id, standard, service_price, published_at, registered_at, company_name, certificate_no, status")
    .eq("revenue_recorded", true)
    .not("published_at", "is", null);
  if (error) assertNoSupabaseError(error, "certificates");
  const rows = data || [];

  const monthMap = new Map<string, { month: string; FDA: number; GACC: number; total: number }>();
  const quarterMap = new Map<string, { quarter: string; FDA: number; GACC: number; total: number }>();
  const yearMap = new Map<string, { year: string; FDA: number; GACC: number; total: number }>();
  let total = 0;
  let fda = 0;
  let gacc = 0;

  for (const r of rows) {
    const d = new Date(String(r.published_at).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const q = Math.floor((m - 1) / 3) + 1;
    const amt = Number(r.service_price || 0);
    total += amt;
    if (r.standard === "FDA") fda += amt;
    else gacc += amt;
    const bump = (map: Map<string, any>, key: string, labelKey: string) => {
      const cur = map.get(key) || { [labelKey]: key, FDA: 0, GACC: 0, total: 0 };
      cur[r.standard as Standard] = (cur[r.standard as Standard] || 0) + amt;
      cur.total = (cur.total || 0) + amt;
      map.set(key, cur);
    };
    bump(monthMap, `${y}-${String(m).padStart(2, "0")}`, "month");
    bump(quarterMap, `${y}-Q${q}`, "quarter");
    bump(yearMap, String(y), "year");
  }

  return {
    total,
    fda,
    gacc,
    count: rows.length,
    months: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    quarters: Array.from(quarterMap.values()).sort((a, b) => a.quarter.localeCompare(b.quarter)),
    years: Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year)),
    recent: rows
      .slice()
      .sort((a, b) => (String(a.published_at) < String(b.published_at) ? 1 : -1))
      .slice(0, 8),
  };
}

/* ============================ CRM VẬN HÀNH ============================ */

function isMissingCrmTableError(e: any): boolean {
  if (!e) return false;
  const msg = String(e.message || "");
  return (
    msg.includes("SUPABASE_SCHEMA_MISSING") ||
    e.code === "PGRST205" ||
    msg.includes("PGRST205") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table")
  );
}

function mapCrmStage(row: Record<string, any>): CrmStage {
  const raw = row.exit_criteria;
  const criteria = Array.isArray(raw) ? raw : [];
  return {
    id: Number(row.id),
    pipeline_id: Number(row.pipeline_id),
    key: String(row.key),
    name: String(row.name),
    sort_order: Number(row.sort_order || 0),
    color: String(row.color || "#64748b"),
    sla_days: Number(row.sla_days || 0),
    exit_criteria: criteria,
    is_won: !!row.is_won,
    is_lost: !!row.is_lost,
  };
}

function mapCrmOpp(row: Record<string, any>, ownerName?: string): CrmOpportunity {
  return {
    id: Number(row.id),
    pipeline_id: Number(row.pipeline_id),
    stage_id: Number(row.stage_id),
    title: String(row.title || ""),
    company_name: String(row.company_name || ""),
    contact_name: String(row.contact_name || ""),
    contact_phone: String(row.contact_phone || ""),
    contact_email: String(row.contact_email || ""),
    industry: String(row.industry || ""),
    source: String(row.source || ""),
    estimated_value: Number(row.estimated_value || 0),
    owner_id: row.owner_id === null || row.owner_id === undefined ? null : Number(row.owner_id),
    owner_name: ownerName,
    next_action: String(row.next_action || ""),
    next_action_date: row.next_action_date ? String(row.next_action_date).slice(0, 10) : null,
    stage_entered_at: String(row.stage_entered_at || ""),
    last_activity_at: row.last_activity_at ? String(row.last_activity_at) : null,
    expected_close_date: row.expected_close_date ? String(row.expected_close_date).slice(0, 10) : null,
    lost_reason: String(row.lost_reason || ""),
    notes: String(row.notes || ""),
    created_by: row.created_by === null || row.created_by === undefined ? null : Number(row.created_by),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

let crmSeeded = false;

/** Upsert pipelines/stages từ PIPELINE_DEFS — đồng bộ SLA/tên mới mỗi khi khởi động. */
export async function ensureCrmSeed() {
  if (crmSeeded) return;
  const sb = supabaseAdmin();
  for (const def of PIPELINE_DEFS) {
    const { data: pipe, error: pipeErr } = await sb
      .from("crm_pipelines")
      .upsert(
        { key: def.key, name: def.name, service: def.service, description: def.description, sort_order: def.sort_order, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .select("id")
      .single();
    if (pipeErr) assertNoSupabaseError(pipeErr, "crm_pipelines");
    const pipeId = Number((pipe as any)?.id || 0);
    if (!pipeId) continue;
    for (let idx = 0; idx < def.stages.length; idx++) {
      const s = def.stages[idx];
      const { error: stageErr } = await sb.from("crm_stages").upsert(
        {
          pipeline_id: pipeId, key: s.key, name: s.name, sort_order: idx,
          color: s.color, sla_days: s.sla_days, exit_criteria: s.exit_criteria,
          is_won: s.is_won, is_lost: s.is_lost,
        },
        { onConflict: "pipeline_id,key" }
      );
      if (stageErr) assertNoSupabaseError(stageErr, "crm_stages");
    }
  }
  crmSeeded = true;
}

async function crmUserNameMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const users = await listUsers();
    for (const u of users) map.set(u.id, u.name);
  } catch {}
  return map;
}

async function crmStageMaps() {
  await ensureCrmSeed();
  const sb = supabaseAdmin();
  const { data: pipes, error: pErr } = await sb.from("crm_pipelines").select("*").eq("is_active", true).order("sort_order");
  if (pErr) assertNoSupabaseError(pErr, "crm_pipelines");
  const { data: stages, error: sErr } = await sb.from("crm_stages").select("*").order("pipeline_id").order("sort_order");
  if (sErr) assertNoSupabaseError(sErr, "crm_stages");
  const pipeById = new Map<number, CrmPipeline>();
  const stageById = new Map<number, CrmStage>();
  for (const p of pipes || []) {
    pipeById.set(Number(p.id), {
      id: Number(p.id), key: String(p.key), name: String(p.name),
      service: String((p as any).service || ""), description: String((p as any).description || ""),
      is_active: !!(p as any).is_active, sort_order: Number((p as any).sort_order || 0),
    });
  }
  for (const s of stages || []) stageById.set(Number(s.id), mapCrmStage(s));
  return { pipeById, stageById };
}

export async function listCrmPipelines(): Promise<CrmPipeline[]> {
  const { pipeById, stageById } = await crmStageMaps();
  const pipes = Array.from(pipeById.values()).sort((a, b) => a.sort_order - b.sort_order);
  for (const p of pipes) {
    p.stages = Array.from(stageById.values())
      .filter((s) => s.pipeline_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  return pipes;
}

export async function getCrmStageById(id: number): Promise<CrmStage | undefined> {
  const { data, error } = await supabaseAdmin().from("crm_stages").select("*").eq("id", id).maybeSingle();
  if (error) assertNoSupabaseError(error, "crm_stages");
  return data ? mapCrmStage(data) : undefined;
}

export async function getCrmPipelineByKey(key: string): Promise<CrmPipeline | undefined> {
  const pipes = await listCrmPipelines();
  return pipes.find((p) => p.key === key);
}

export type CrmOppFilterCloud = {
  pipeline_key?: string;
  owner_id?: number | null;
  q?: string;
  stage_filter?: "open" | "won" | "lost" | "all";
};

export async function listCrmOpportunities(filter: CrmOppFilterCloud = {}): Promise<CrmOpportunityEnriched[]> {
  const { pipeById, stageById } = await crmStageMaps();
  let query = supabaseAdmin().from("crm_opportunities").select("*").order("updated_at", { ascending: false });
  if (filter.pipeline_key) {
    const pipe = Array.from(pipeById.values()).find((p) => p.key === filter.pipeline_key);
    if (!pipe) return [];
    query = query.eq("pipeline_id", pipe.id);
  }
  if (filter.owner_id !== undefined && filter.owner_id !== null) query = query.eq("owner_id", filter.owner_id);
  if (filter.q) {
    const q = filter.q.replace(/[%_]/g, "");
    query = query.or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%,contact_phone.ilike.%${q}%,title.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) assertNoSupabaseError(error, "crm_opportunities");
  const names = await crmUserNameMap();
  let items: CrmOpportunityEnriched[] = [];
  for (const row of data || []) {
    const pipe = pipeById.get(Number(row.pipeline_id));
    const stage = stageById.get(Number(row.stage_id));
    if (!pipe || !stage) continue;
    const ownerName = row.owner_id ? names.get(Number(row.owner_id)) : undefined;
    items.push(enrichOpportunity(mapCrmOpp(row, ownerName), pipe, stage));
  }
  if (filter.stage_filter === "open") items = items.filter((i) => i.is_open);
  else if (filter.stage_filter === "won") items = items.filter((i) => i.is_won);
  else if (filter.stage_filter === "lost") items = items.filter((i) => i.is_lost);
  return items;
}

export async function getCrmOpportunity(id: number): Promise<CrmOpportunityEnriched | undefined> {
  const { pipeById, stageById } = await crmStageMaps();
  const { data, error } = await supabaseAdmin().from("crm_opportunities").select("*").eq("id", id).maybeSingle();
  if (error) assertNoSupabaseError(error, "crm_opportunities");
  if (!data) return undefined;
  const pipe = pipeById.get(Number(data.pipeline_id));
  const stage = stageById.get(Number(data.stage_id));
  if (!pipe || !stage) return undefined;
  const names = await crmUserNameMap();
  const ownerName = (data as any).owner_id ? names.get(Number((data as any).owner_id)) : undefined;
  return enrichOpportunity(mapCrmOpp(data, ownerName), pipe, stage);
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
): Promise<number> {
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  const pipe = await getCrmPipelineByKey(input.pipeline_key);
  if (!pipe || !pipe.stages?.length) throw new Error("PIPELINE_NOT_FOUND");
  const first = pipe.stages[0];
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("crm_opportunities")
    .insert({
      pipeline_id: pipe.id,
      stage_id: first.id,
      title: (input.title || "").trim() || `${input.company_name.trim()} — ${pipe.key}`,
      company_name: input.company_name.trim(),
      contact_name: (input.contact_name || "").trim(),
      contact_phone: (input.contact_phone || "").trim(),
      contact_email: (input.contact_email || "").trim(),
      industry: (input.industry || "").trim(),
      source: (input.source || "").trim(),
      estimated_value: Math.max(0, Math.round(input.estimated_value || 0)),
      owner_id: input.owner_id ?? createdBy,
      next_action: (input.next_action || "").trim(),
      next_action_date: input.next_action_date || null,
      stage_entered_at: now,
      expected_close_date: input.expected_close_date || null,
      notes: (input.notes || "").trim(),
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "crm_opportunities");
  const id = Number((data as any)?.id ?? 0);
  const { error: hErr } = await supabaseAdmin().from("crm_stage_history").insert({
    opportunity_id: id, from_stage_id: null, to_stage_id: first.id,
    duration_days: 0, note: "Tạo cơ hội", changed_by: createdBy,
  });
  if (hErr) assertNoSupabaseError(hErr, "crm_stage_history");
  return id;
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
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.company_name !== undefined) {
    if (!input.company_name.trim()) throw new Error("COMPANY_NAME_REQUIRED");
    patch.company_name = input.company_name.trim();
  }
  if (input.contact_name !== undefined) patch.contact_name = input.contact_name.trim();
  if (input.contact_phone !== undefined) patch.contact_phone = input.contact_phone.trim();
  if (input.contact_email !== undefined) patch.contact_email = input.contact_email.trim();
  if (input.industry !== undefined) patch.industry = input.industry.trim();
  if (input.source !== undefined) patch.source = input.source.trim();
  if (input.estimated_value !== undefined) patch.estimated_value = Math.max(0, Math.round(input.estimated_value || 0));
  if (input.owner_id !== undefined) patch.owner_id = input.owner_id;
  if (input.next_action !== undefined) patch.next_action = input.next_action.trim();
  if (input.next_action_date !== undefined) patch.next_action_date = input.next_action_date || null;
  if (input.expected_close_date !== undefined) patch.expected_close_date = input.expected_close_date || null;
  if (input.notes !== undefined) patch.notes = input.notes.trim();
  const { data, error } = await supabaseAdmin().from("crm_opportunities").update(patch).eq("id", id).select("id");
  if (error) assertNoSupabaseError(error, "crm_opportunities");
  if (!data || data.length === 0) throw new Error("NOT_FOUND");
}

export async function deleteCrmOpportunity(id: number) {
  const { error } = await supabaseAdmin().from("crm_opportunities").delete().eq("id", id);
  if (error) assertNoSupabaseError(error, "crm_opportunities");
}

export async function moveCrmOpportunity(
  id: number,
  toStageId: number,
  checklist: Record<string, boolean>,
  note: string,
  lostReason: string,
  changedBy: number
): Promise<CrmOpportunityEnriched> {
  const sb = supabaseAdmin();
  const { data: cur, error: curErr } = await sb.from("crm_opportunities").select("*").eq("id", id).maybeSingle();
  if (curErr) assertNoSupabaseError(curErr, "crm_opportunities");
  if (!cur) throw new Error("NOT_FOUND");
  const fromStage = await getCrmStageById(Number((cur as any).stage_id));
  const toStage = await getCrmStageById(toStageId);
  if (!fromStage || !toStage) throw new Error("STAGE_NOT_FOUND");
  const check = validateTransition({ fromStage, toStage, checklist, lost_reason: lostReason });
  if (!check.ok) {
    const err = new Error(check.error || "TRANSITION_BLOCKED") as any;
    err.missing = check.missing;
    err.code = "TRANSITION_BLOCKED";
    throw err;
  }
  const now = new Date().toISOString();
  for (const [k, v] of Object.entries(checklist)) {
    const { error: cErr } = await sb.from("crm_checklists").upsert(
      {
        opportunity_id: id, stage_key: fromStage.key, criterion_key: k,
        is_checked: !!v, checked_by: v ? changedBy : null,
        checked_at: v ? now : null, updated_at: now,
      },
      { onConflict: "opportunity_id,stage_key,criterion_key" }
    );
    if (cErr) assertNoSupabaseError(cErr, "crm_checklists");
  }
  const entered = new Date(String((cur as any).stage_entered_at)).getTime();
  const durDays = Number.isFinite(entered) ? Math.max(0, (Date.now() - entered) / 86400000) : 0;
  const { error: hErr } = await sb.from("crm_stage_history").insert({
    opportunity_id: id, from_stage_id: fromStage.id, to_stage_id: toStage.id,
    duration_days: Math.round(durDays * 10) / 10,
    note: (note || "").trim(), changed_by: changedBy,
  });
  if (hErr) assertNoSupabaseError(hErr, "crm_stage_history");
  const { error: uErr } = await sb.from("crm_opportunities").update({
    stage_id: toStage.id, stage_entered_at: now,
    lost_reason: toStage.is_lost ? (lostReason || "").trim() : "",
    updated_at: now,
  }).eq("id", id);
  if (uErr) assertNoSupabaseError(uErr, "crm_opportunities");
  return (await getCrmOpportunity(id))!;
}

export async function listCrmHistory(opportunityId: number): Promise<CrmStageHistory[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("crm_stage_history").select("*").eq("opportunity_id", opportunityId).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (error) assertNoSupabaseError(error, "crm_stage_history");
  const { stageById } = await crmStageMaps();
  const names = await crmUserNameMap();
  return (data || []).map((r: any) => ({
    id: Number(r.id),
    opportunity_id: Number(r.opportunity_id),
    from_stage_id: r.from_stage_id === null ? null : Number(r.from_stage_id),
    from_stage_name: r.from_stage_id ? stageById.get(Number(r.from_stage_id))?.name : undefined,
    to_stage_id: Number(r.to_stage_id),
    to_stage_name: stageById.get(Number(r.to_stage_id))?.name,
    duration_days: Number(r.duration_days || 0),
    note: String(r.note || ""),
    changed_by: r.changed_by === null ? null : Number(r.changed_by),
    changed_by_name: r.changed_by ? names.get(Number(r.changed_by)) : undefined,
    created_at: String(r.created_at),
  }));
}

export async function listCrmActivities(opportunityId: number): Promise<CrmActivity[]> {
  const { data, error } = await supabaseAdmin().from("crm_activities").select("*").eq("opportunity_id", opportunityId).order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) assertNoSupabaseError(error, "crm_activities");
  const names = await crmUserNameMap();
  return (data || []).map((r: any) => ({
    id: Number(r.id),
    opportunity_id: Number(r.opportunity_id),
    type: String(r.type || "note") as CrmActivity["type"],
    title: String(r.title || ""),
    content: String(r.content || ""),
    outcome: String(r.outcome || ""),
    created_by: r.created_by === null ? null : Number(r.created_by),
    created_by_name: r.created_by ? names.get(Number(r.created_by)) : undefined,
    created_at: String(r.created_at),
  }));
}

export async function createCrmActivity(
  opportunityId: number,
  input: { type?: string; title?: string; content?: string; outcome?: string; next_action?: string; next_action_date?: string | null },
  createdBy: number
): Promise<number> {
  const sb = supabaseAdmin();
  const { data: cur, error: curErr } = await sb.from("crm_opportunities").select("id,next_action,next_action_date").eq("id", opportunityId).maybeSingle();
  if (curErr) assertNoSupabaseError(curErr, "crm_opportunities");
  if (!cur) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  const { data, error } = await sb.from("crm_activities").insert({
    opportunity_id: opportunityId,
    type: (input.type || "note").trim() || "note",
    title: (input.title || "").trim(),
    content: (input.content || "").trim(),
    outcome: (input.outcome || "").trim(),
    created_by: createdBy,
  }).select("id").single();
  if (error) assertNoSupabaseError(error, "crm_activities");
  const patch: Record<string, any> = {
    last_activity_at: now,
    next_action: input.next_action !== undefined ? input.next_action.trim() : (cur as any).next_action,
    next_action_date: input.next_action_date === undefined ? (cur as any).next_action_date : input.next_action_date || null,
    updated_at: now,
  };
  const { error: uErr } = await sb.from("crm_opportunities").update(patch).eq("id", opportunityId);
  if (uErr) assertNoSupabaseError(uErr, "crm_opportunities");
  return Number((data as any)?.id ?? 0);
}

export async function listCrmChecklists(opportunityId: number): Promise<CrmChecklistState[]> {
  const { data, error } = await supabaseAdmin().from("crm_checklists").select("*").eq("opportunity_id", opportunityId);
  if (error) assertNoSupabaseError(error, "crm_checklists");
  const names = await crmUserNameMap();
  return (data || []).map((r: any) => ({
    stage_key: String(r.stage_key),
    criterion_key: String(r.criterion_key),
    is_checked: !!r.is_checked,
    checked_by_name: r.checked_by ? names.get(Number(r.checked_by)) : undefined,
    checked_at: r.checked_at ? String(r.checked_at) : null,
  }));
}

export type CrmDashboardCloud = {
  openCount: number;
  openValue: number;
  wonMonth: number;
  wonMonthValue: number;
  lostMonth: number;
  followupToday: number;
  overdueSla: number;
  missingAction: number;
  stale: number;
  pipelineStats: Array<{
    key: string; name: string;
    stages: Array<{ key: string; name: string; color: string; count: number; value: number; is_won: boolean; is_lost: boolean }>;
    openCount: number; openValue: number;
  }>;
  alerts: CrmOpportunityEnriched[];
  myToday: CrmOpportunityEnriched[];
  avgStageDays: Array<{ pipeline_key: string; pipeline_name: string; stage_key: string; stage_name: string; avg_days: number; samples: number }>;
  ownerStats: Array<{ owner_id: number | null; owner_name: string; open: number; openValue: number; won: number; lost: number; conversion: number }>;
  dropoff: Array<{ pipeline_key: string; pipeline_name: string; from_stage: string; count: number }>;
  recentWon: CrmOpportunityEnriched[];
  recentLost: CrmOpportunityEnriched[];
  trend: Array<{ month: string; created: number; won: number; wonValue: number; lost: number }>;
};

export async function crmDashboard(filter: { pipeline_key?: string; scope_user_id?: number | null } = {}): Promise<CrmDashboardCloud> {
  const sb = supabaseAdmin();
  const items = await listCrmOpportunities({ pipeline_key: filter.pipeline_key });
  const pipes = (await listCrmPipelines()).filter((p) => !filter.pipeline_key || p.key === filter.pipeline_key);
  const monthPrefix = new Date().toISOString().slice(0, 7);

  const open = items.filter((o) => o.is_open);
  const wonMonth = items.filter((o) => o.is_won && String(o.updated_at).slice(0, 7) === monthPrefix);
  const lostMonth = items.filter((o) => o.is_lost && String(o.updated_at).slice(0, 7) === monthPrefix);

  const alerts = open
    .filter((o) => o.alerts.length > 0)
    .sort((a, b) => {
      const rank = (o: CrmOpportunityEnriched) => (o.health === "danger" ? 0 : 1);
      return rank(a) - rank(b) || b.days_in_stage - a.days_in_stage;
    })
    .slice(0, 30);

  const myToday = filter.scope_user_id
    ? open
        .filter((o) => o.owner_id === filter.scope_user_id && (o.days_to_followup === null || (o.days_to_followup !== null && o.days_to_followup <= 1)))
        .sort((a, b) => (a.days_to_followup ?? 99) - (b.days_to_followup ?? 99))
        .slice(0, 20)
    : [];

  const pipelineStats = pipes.map((p) => {
    const stages = (p.stages || []).map((s) => {
      const inStage = items.filter((o) => o.stage_id === s.id);
      return {
        key: s.key, name: s.name, color: s.color,
        count: inStage.length,
        value: inStage.reduce((t, o) => t + (o.estimated_value || 0), 0),
        is_won: s.is_won, is_lost: s.is_lost,
      };
    });
    const openItems = items.filter((o) => o.pipeline_id === p.id && o.is_open);
    return {
      key: p.key, name: p.name, stages,
      openCount: openItems.length,
      openValue: openItems.reduce((t, o) => t + (o.estimated_value || 0), 0),
    };
  });

  // History toàn cục để tính avg + dropoff + trend
  const { data: histRows, error: histErr } = await sb
    .from("crm_stage_history")
    .select("opportunity_id, duration_days, from_stage_id, to_stage_id, created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(5000);
  if (histErr) assertNoSupabaseError(histErr, "crm_stage_history");
  const { stageById, pipeById } = await crmStageMaps();
  const agg = new Map<string, { pipeline_key: string; pipeline_name: string; stage_key: string; stage_name: string; total: number; n: number }>();
  const drop = new Map<string, { pipeline_key: string; pipeline_name: string; from_stage: string; count: number }>();
  for (const r of histRows || []) {
    const from = (r as any).from_stage_id ? stageById.get(Number((r as any).from_stage_id)) : undefined;
    const to = stageById.get(Number((r as any).to_stage_id));
    if (!to) continue;
    const pipe = pipeById.get(to.pipeline_id);
    if (!pipe) continue;
    if (filter.pipeline_key && pipe.key !== filter.pipeline_key) continue;
    const dur = Number((r as any).duration_days || 0);
    if (from && dur > 0) {
      const k = `${pipe.key}:${from.key}`;
      const cur = agg.get(k) || { pipeline_key: pipe.key, pipeline_name: pipe.name, stage_key: from.key, stage_name: from.name, total: 0, n: 0 };
      cur.total += dur;
      cur.n += 1;
      agg.set(k, cur);
    }
    if (to.is_lost && from) {
      const k = `${pipe.key}:${from.key}`;
      const cur = drop.get(k) || { pipeline_key: pipe.key, pipeline_name: pipe.name, from_stage: from.name, count: 0 };
      cur.count += 1;
      drop.set(k, cur);
    }
  }
  const avgStageDays = Array.from(agg.values()).map((a) => ({
    pipeline_key: a.pipeline_key, pipeline_name: a.pipeline_name,
    stage_key: a.stage_key, stage_name: a.stage_name,
    avg_days: Math.round((a.total / a.n) * 10) / 10, samples: a.n,
  }));
  const dropoff = Array.from(drop.values()).sort((a, b) => b.count - a.count);

  // Xu hướng 12 tháng gần nhất — thời điểm chốt/mất lấy từ lịch sử chuyển giai đoạn
  const trend: CrmDashboardCloud["trend"] = [];
  const nowD = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1));
    trend.push({
      month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      created: 0, won: 0, wonValue: 0, lost: 0,
    });
  }
  const trendByMonth = new Map(trend.map((t) => [t.month, t]));
  const trendOppById = new Map(items.map((o) => [o.id, o]));
  for (const o of items) {
    const b = trendByMonth.get(String(o.created_at).slice(0, 7));
    if (b) b.created += 1;
  }
  const lastTerminal = new Map<number, { won: boolean; month: string }>();
  for (const r of histRows || []) {
    const o = trendOppById.get(Number((r as any).opportunity_id));
    if (!o) continue;
    const st = stageById.get(Number((r as any).to_stage_id));
    if (!st) continue;
    if (st.is_won || st.is_lost) {
      lastTerminal.set(o.id, { won: st.is_won, month: String((r as any).created_at).slice(0, 7) });
    } else {
      lastTerminal.delete(o.id);
    }
  }
  for (const [oppId, t] of Array.from(lastTerminal.entries())) {
    const b = trendByMonth.get(t.month);
    if (!b) continue;
    if (t.won) {
      b.won += 1;
      b.wonValue += trendOppById.get(oppId)?.estimated_value || 0;
    } else {
      b.lost += 1;
    }
  }

  const ownerMap = new Map<number | null, { owner_id: number | null; owner_name: string; open: number; openValue: number; won: number; lost: number }>();
  for (const o of items) {
    const k = o.owner_id ?? null;
    const cur = ownerMap.get(k) || { owner_id: k, owner_name: o.owner_name || "Chưa gán", open: 0, openValue: 0, won: 0, lost: 0 };
    if (o.is_open) { cur.open += 1; cur.openValue += o.estimated_value || 0; }
    if (o.is_won) cur.won += 1;
    if (o.is_lost) cur.lost += 1;
    ownerMap.set(k, cur);
  }
  const ownerStats = Array.from(ownerMap.values()).map((o) => ({
    ...o,
    conversion: o.won + o.lost > 0 ? Math.round((o.won / (o.won + o.lost)) * 100) : 0,
  })).sort((a, b) => b.won - a.won || b.open - a.open);

  return {
    openCount: open.length,
    openValue: open.reduce((t, o) => t + (o.estimated_value || 0), 0),
    wonMonth: wonMonth.length,
    wonMonthValue: wonMonth.reduce((t, o) => t + (o.estimated_value || 0), 0),
    lostMonth: lostMonth.length,
    followupToday: open.filter((o) => o.days_to_followup !== null && o.days_to_followup <= 0).length,
    overdueSla: open.filter((o) => o.alerts.some((a) => a.type === "sla")).length,
    missingAction: open.filter((o) => o.alerts.some((a) => a.type === "no_action")).length,
    stale: open.filter((o) => o.alerts.some((a) => a.type === "stale")).length,
    pipelineStats,
    alerts,
    myToday,
    avgStageDays,
    ownerStats,
    dropoff,
    recentWon: items.filter((o) => o.is_won).slice(0, 5),
    recentLost: items.filter((o) => o.is_lost).slice(0, 5),
    trend,
  };
}

export function isCrmSchemaError(e: any): boolean {
  return isMissingCrmTableError(e);
}

/* ========================= TOÀN CẢNH (Admin) ========================= */

export async function overviewStats() {
  const sb = supabaseAdmin();
  const [enriched, pipes, users, certs, leads] = await Promise.all([
    listCrmOpportunities(),
    listCrmPipelines(),
    listUsers(),
    listCertificates(),
    listLeads(),
  ]);
  const { data: histRows, error: histErr } = await sb
    .from("crm_stage_history")
    .select("opportunity_id, to_stage_id, created_at")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (histErr) assertNoSupabaseError(histErr, "crm_stage_history");
  const { data: actRows, error: actErr } = await sb
    .from("crm_activities")
    .select("created_by, created_at")
    .limit(5000);
  if (actErr) assertNoSupabaseError(actErr, "crm_activities");
  const open = enriched.filter((o) => o.is_open);
  return buildOverview(
    {
      users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
      opps: enriched.map((o) => ({
        id: o.id,
        owner_id: o.owner_id,
        created_at: o.created_at,
        estimated_value: o.estimated_value,
      })),
      histories: (histRows || []).map((h: any) => ({
        opportunity_id: Number(h.opportunity_id),
        to_stage_id: Number(h.to_stage_id),
        created_at: String(h.created_at),
      })),
      stages: pipes.flatMap((p) => p.stages || []).map((s) => ({ id: s.id, is_won: s.is_won, is_lost: s.is_lost })),
      activities: (actRows || []).map((a: any) => ({
        created_by: a.created_by === null ? null : Number(a.created_by),
        created_at: String(a.created_at),
      })),
      certs: certs.map((c) => ({
        created_by: c.created_by,
        service_price: c.service_price,
        published_at: c.published_at,
        revenue_recorded: c.revenue_recorded,
      })),
      leads: leads.map((l) => ({ created_at: l.created_at })),
    },
    open.length,
    open.reduce((t, o) => t + (o.estimated_value || 0), 0)
  );
}

/* ==================== HỢP ĐỒNG DỊCH VỤ + KẾ TOÁN ==================== */

function mapServiceContract(row: Record<string, any>): ServiceContract {
  const item: ServiceContract = {
    id: Number(row.id),
    contract_no: String(row.contract_no),
    service_type: row.service_type as ServiceType,
    company_name: String(row.company_name || ""),
    company_email: String(row.company_email || ""),
    contact_name: String(row.contact_name || ""),
    contact_phone: String(row.contact_phone || ""),
    scope: String(row.scope || ""),
    cycle_months: Number(row.cycle_months || 6),
    started_at: String(row.started_at).slice(0, 10),
    ends_at: String(row.ends_at).slice(0, 10),
    contract_value: Number(row.contract_value || 0),
    status: row.status as ServiceContract["status"],
    renewal_count: Number(row.renewal_count || 0),
    last_renewed_at: row.last_renewed_at ? String(row.last_renewed_at) : null,
    opportunity_id: row.opportunity_id === null ? null : Number(row.opportunity_id),
    created_by: row.created_by === null ? null : Number(row.created_by),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
  if (item.status === "active" && remainingDays(item.ends_at) < 0) item.status = "expired";
  return item;
}

function serviceContractPrefix(t: ServiceType): string {
  return t === "SALE_EXPORT" ? "VXM-SALE" : "VXM-AMZ";
}

export async function nextServiceContractNo(service_type: ServiceType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${serviceContractPrefix(service_type)}-${year}-`;
  const { data, error } = await supabaseAdmin()
    .from("service_contracts")
    .select("contract_no")
    .like("contract_no", `${prefix}%`)
    .order("contract_no", { ascending: false })
    .limit(1);
  if (error) assertNoSupabaseError(error, "service_contracts");
  let seq = 1;
  const no = (data as any)?.[0]?.contract_no;
  if (no) {
    const n = Number(String(no).split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function nextInvoiceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VXM-INV-${year}-`;
  const { data, error } = await supabaseAdmin()
    .from("invoices")
    .select("invoice_no")
    .like("invoice_no", `${prefix}%`)
    .order("invoice_no", { ascending: false })
    .limit(1);
  if (error) assertNoSupabaseError(error, "invoices");
  let seq = 1;
  const no = (data as any)?.[0]?.invoice_no;
  if (no) {
    const n = Number(String(no).split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function refInfoCloud(
  ref_type: string,
  ref_id: number
): Promise<{ company_name: string; ref_label: string }> {
  const sb = supabaseAdmin();
  if (ref_type === "certificate") {
    const { data, error } = await sb
      .from("certificates")
      .select("certificate_no, company_name, standard")
      .eq("id", ref_id)
      .maybeSingle();
    if (error) assertNoSupabaseError(error, "certificates");
    if (!data) return { company_name: "", ref_label: "" };
    return {
      company_name: String((data as any).company_name || ""),
      ref_label: `${(data as any).standard} · ${(data as any).certificate_no}`,
    };
  }
  const { data, error } = await sb
    .from("service_contracts")
    .select("contract_no, company_name, service_type")
    .eq("id", ref_id)
    .maybeSingle();
  if (error) assertNoSupabaseError(error, "service_contracts");
  if (!data) return { company_name: "", ref_label: "" };
  const svc = (data as any).service_type === "SALE_EXPORT" ? "Sale XK" : "Amazon";
  return {
    company_name: String((data as any).company_name || ""),
    ref_label: `${svc} · ${(data as any).contract_no}`,
  };
}

async function invoicePaidSumCloud(invoice_id: number): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoice_id);
  if (error) assertNoSupabaseError(error, "invoice_payments");
  return (data || []).reduce((t: number, r: any) => t + Number(r.amount || 0), 0);
}

function hydrateInvoice(
  row: Record<string, any>,
  paid: number,
  info: { company_name: string; ref_label: string },
  creatorName?: string
): Invoice {
  const base = {
    id: Number(row.id),
    invoice_no: String(row.invoice_no),
    ref_type: row.ref_type as Invoice["ref_type"],
    ref_id: Number(row.ref_id),
    installment_no: Number(row.installment_no || 1),
    title: String(row.title || ""),
    subtotal: Number(row.subtotal || 0),
    vat_rate: Number(row.vat_rate ?? 8),
    vat_amount: Number(row.vat_amount || 0),
    total: Number(row.total || 0),
    issue_date: String(row.issue_date).slice(0, 10),
    due_date: row.due_date ? String(row.due_date).slice(0, 10) : null,
    status: row.status as Invoice["status"],
    notes: String(row.notes || ""),
    created_by: row.created_by === null ? null : Number(row.created_by),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    created_by_name: creatorName,
    company_name: info.company_name,
    ref_label: info.ref_label,
  };
  return {
    ...base,
    paid_amount: paid,
    remaining: Math.max(0, base.total - paid),
    state: invoiceState({ status: base.status, total: base.total, paid_amount: paid, due_date: base.due_date }),
    days_overdue: overdueDays(base.due_date),
  };
}

function mapPaymentCloud(row: Record<string, any>, creatorName?: string): InvoicePayment {
  return {
    id: Number(row.id),
    invoice_id: Number(row.invoice_id),
    amount: Number(row.amount || 0),
    paid_at: String(row.paid_at).slice(0, 10),
    method: String(row.method || ""),
    reference: String(row.reference || ""),
    note: String(row.note || ""),
    created_by: row.created_by === null ? null : Number(row.created_by),
    created_by_name: creatorName,
    created_at: String(row.created_at || ""),
  };
}

export async function listServiceContracts(
  filter: { service_type?: string; status?: string; q?: string } = {}
): Promise<ServiceContract[]> {
  const sb = supabaseAdmin();
  let query = sb.from("service_contracts").select("*").order("updated_at", { ascending: false });
  if (filter.service_type) query = query.eq("service_type", filter.service_type);
  if (filter.q) {
    const q = filter.q.replace(/[%_]/g, "");
    query = query.or(`company_name.ilike.%${q}%,contract_no.ilike.%${q}%,contact_name.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) assertNoSupabaseError(error, "service_contracts");
  const names = await crmUserNameMap();
  let items = (data || []).map((r: any) => ({
    ...mapServiceContract(r),
    created_by_name: r.created_by ? names.get(Number(r.created_by)) : undefined,
  }));
  if (filter.status) items = items.filter((i) => i.status === filter.status);
  return items;
}

export async function getServiceContract(id: number): Promise<ServiceContract | undefined> {
  const { data, error } = await supabaseAdmin().from("service_contracts").select("*").eq("id", id).maybeSingle();
  if (error) assertNoSupabaseError(error, "service_contracts");
  if (!data) return undefined;
  const names = await crmUserNameMap();
  return {
    ...mapServiceContract(data),
    created_by_name: (data as any).created_by ? names.get(Number((data as any).created_by)) : undefined,
  };
}

export async function createServiceContract(
  input: {
    service_type: ServiceType;
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
): Promise<number> {
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  if (!input.started_at) throw new Error("START_DATE_REQUIRED");
  const cycle = normalizeCycleMonths(input.cycle_months, 6);
  const started = input.started_at.slice(0, 10);
  const { data, error } = await supabaseAdmin()
    .from("service_contracts")
    .insert({
      contract_no: await nextServiceContractNo(input.service_type),
      service_type: input.service_type,
      status: "active",
      company_name: input.company_name.trim(),
      company_email: (input.company_email || "").trim(),
      contact_name: (input.contact_name || "").trim(),
      contact_phone: (input.contact_phone || "").trim(),
      scope: (input.scope || "").trim(),
      cycle_months: cycle,
      started_at: started,
      ends_at: addMonths(started, cycle),
      contract_value: Math.max(0, Math.round(input.contract_value || 0)),
      opportunity_id: input.opportunity_id ?? null,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "service_contracts");
  return Number((data as any)?.id ?? 0);
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
  const cur = await getServiceContract(id);
  if (!cur) throw new Error("NOT_FOUND");
  const cycle =
    input.cycle_months !== undefined
      ? normalizeCycleMonths(input.cycle_months, cur.cycle_months)
      : cur.cycle_months;
  const started = (input.started_at !== undefined ? input.started_at : cur.started_at).slice(0, 10);
  const patch: Record<string, any> = {
    cycle_months: cycle,
    started_at: started,
    ends_at: addMonths(started, cycle),
    updated_at: new Date().toISOString(),
  };
  if (input.company_name !== undefined) patch.company_name = input.company_name.trim();
  if (input.company_email !== undefined) patch.company_email = input.company_email.trim();
  if (input.contact_name !== undefined) patch.contact_name = input.contact_name.trim();
  if (input.contact_phone !== undefined) patch.contact_phone = input.contact_phone.trim();
  if (input.scope !== undefined) patch.scope = input.scope.trim();
  if (input.contract_value !== undefined) patch.contract_value = Math.max(0, Math.round(input.contract_value || 0));
  const { error } = await supabaseAdmin().from("service_contracts").update(patch).eq("id", id);
  if (error) assertNoSupabaseError(error, "service_contracts");
}

export async function setServiceContractStatus(id: number, status: "active" | "terminated") {
  const cur = await getServiceContract(id);
  if (!cur) throw new Error("NOT_FOUND");
  const { error } = await supabaseAdmin()
    .from("service_contracts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "service_contracts");
}

export async function renewServiceContract(id: number, cycleMonths?: number) {
  const cur = await getServiceContract(id);
  if (!cur) throw new Error("NOT_FOUND");
  const cycle = cycleMonths ? normalizeCycleMonths(cycleMonths, cur.cycle_months) : cur.cycle_months;
  const base = remainingDays(cur.ends_at) >= 0 ? cur.ends_at : todayUtcIso();
  const { error } = await supabaseAdmin()
    .from("service_contracts")
    .update({
      ends_at: addMonths(base, cycle),
      cycle_months: cycle,
      renewal_count: cur.renewal_count + 1,
      last_renewed_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "service_contracts");
  return (await getServiceContract(id))!;
}

export async function deleteServiceContract(id: number) {
  const { count, error } = await supabaseAdmin()
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("ref_type", "service_contract")
    .eq("ref_id", id);
  if (error) assertNoSupabaseError(error, "invoices");
  if ((count || 0) > 0) throw new Error("HAS_INVOICES");
  const { error: delErr } = await supabaseAdmin().from("service_contracts").delete().eq("id", id);
  if (delErr) assertNoSupabaseError(delErr, "service_contracts");
}

export async function listInvoices(
  filter: { ref_type?: string; ref_id?: number; state?: string; q?: string } = {}
): Promise<Invoice[]> {
  let query = supabaseAdmin().from("invoices").select("*").order("issue_date", { ascending: false }).order("id", { ascending: false });
  if (filter.ref_type) query = query.eq("ref_type", filter.ref_type);
  if (filter.ref_id) query = query.eq("ref_id", filter.ref_id);
  const { data, error } = await query;
  if (error) assertNoSupabaseError(error, "invoices");
  const names = await crmUserNameMap();
  const items: Invoice[] = [];
  for (const row of data || []) {
    const paid = await invoicePaidSumCloud(Number((row as any).id));
    const info = await refInfoCloud(String((row as any).ref_type), Number((row as any).ref_id));
    items.push(hydrateInvoice(row, paid, info, (row as any).created_by ? names.get(Number((row as any).created_by)) : undefined));
  }
  let out = items;
  if (filter.state) out = out.filter((i) => i.state === filter.state);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    out = out.filter(
      (i) =>
        (i.company_name || "").toLowerCase().includes(q) ||
        i.invoice_no.toLowerCase().includes(q) ||
        (i.ref_label || "").toLowerCase().includes(q)
    );
  }
  return out;
}

export async function getInvoice(id: number): Promise<(Invoice & { payments: InvoicePayment[] }) | undefined> {
  const { data, error } = await supabaseAdmin().from("invoices").select("*").eq("id", id).maybeSingle();
  if (error) assertNoSupabaseError(error, "invoices");
  if (!data) return undefined;
  const paid = await invoicePaidSumCloud(id);
  const info = await refInfoCloud(String((data as any).ref_type), Number((data as any).ref_id));
  const names = await crmUserNameMap();
  const inv = hydrateInvoice(
    data,
    paid,
    info,
    (data as any).created_by ? names.get(Number((data as any).created_by)) : undefined
  );
  const { data: pays, error: pErr } = await supabaseAdmin()
    .from("invoice_payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: true })
    .order("id", { ascending: true });
  if (pErr) assertNoSupabaseError(pErr, "invoice_payments");
  return {
    ...inv,
    payments: (pays || []).map((r: any) =>
      mapPaymentCloud(r, r.created_by ? names.get(Number(r.created_by)) : undefined)
    ),
  };
}

export async function nextInstallmentNo(ref_type: string, ref_id: number): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from("invoices")
    .select("installment_no")
    .eq("ref_type", ref_type)
    .eq("ref_id", ref_id)
    .order("installment_no", { ascending: false })
    .limit(1);
  if (error) assertNoSupabaseError(error, "invoices");
  return Number((data as any)?.[0]?.installment_no || 0) + 1;
}

export async function createInvoice(
  input: {
    ref_type: "certificate" | "service_contract";
    ref_id: number;
    installment_no?: number;
    title?: string;
    subtotal: number;
    vat_rate?: number;
    issue_date?: string;
    due_date?: string | null;
    notes?: string;
  },
  createdBy: number
): Promise<number> {
  const info = await refInfoCloud(input.ref_type, input.ref_id);
  if (!info.ref_label) throw new Error("REF_NOT_FOUND");
  const t = calcInvoiceTotals(input.subtotal, input.vat_rate ?? 8);
  const { data, error } = await supabaseAdmin()
    .from("invoices")
    .insert({
      invoice_no: await nextInvoiceNo(),
      ref_type: input.ref_type,
      ref_id: input.ref_id,
      installment_no: input.installment_no || (await nextInstallmentNo(input.ref_type, input.ref_id)),
      title: (input.title || "").trim(),
      subtotal: t.subtotal,
      vat_rate: t.vat_rate,
      vat_amount: t.vat_amount,
      total: t.total,
      issue_date: (input.issue_date || todayUtcIso()).slice(0, 10),
      due_date: input.due_date ? input.due_date.slice(0, 10) : null,
      notes: (input.notes || "").trim(),
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "invoices");
  return Number((data as any)?.id ?? 0);
}

export async function updateInvoice(
  id: number,
  input: { title?: string; due_date?: string | null; notes?: string; subtotal?: number; vat_rate?: number }
) {
  const sb = supabaseAdmin();
  const { data: row, error: gErr } = await sb.from("invoices").select("*").eq("id", id).maybeSingle();
  if (gErr) assertNoSupabaseError(gErr, "invoices");
  if (!row) throw new Error("NOT_FOUND");
  if ((row as any).status === "cancelled") throw new Error("CANCELLED");
  const paid = await invoicePaidSumCloud(id);
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.due_date !== undefined) patch.due_date = input.due_date ? input.due_date.slice(0, 10) : null;
  if (input.notes !== undefined) patch.notes = input.notes.trim();
  if (input.subtotal !== undefined || input.vat_rate !== undefined) {
    if (paid > 0) throw new Error("HAS_PAYMENTS");
    const t = calcInvoiceTotals(
      input.subtotal !== undefined ? input.subtotal : Number((row as any).subtotal),
      input.vat_rate !== undefined ? input.vat_rate : Number((row as any).vat_rate)
    );
    patch.subtotal = t.subtotal;
    patch.vat_rate = t.vat_rate;
    patch.vat_amount = t.vat_amount;
    patch.total = t.total;
  }
  const { error } = await sb.from("invoices").update(patch).eq("id", id);
  if (error) assertNoSupabaseError(error, "invoices");
}

export async function cancelInvoice(id: number) {
  if ((await invoicePaidSumCloud(id)) > 0) throw new Error("HAS_PAYMENTS");
  const { error } = await supabaseAdmin()
    .from("invoices")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "invoices");
}

export async function deleteInvoice(id: number) {
  if ((await invoicePaidSumCloud(id)) > 0) throw new Error("HAS_PAYMENTS");
  const { error } = await supabaseAdmin().from("invoices").delete().eq("id", id);
  if (error) assertNoSupabaseError(error, "invoices");
}

export async function listPayments(invoice_id: number): Promise<InvoicePayment[]> {
  const { data, error } = await supabaseAdmin()
    .from("invoice_payments")
    .select("*")
    .eq("invoice_id", invoice_id)
    .order("paid_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) assertNoSupabaseError(error, "invoice_payments");
  const names = await crmUserNameMap();
  return (data || []).map((r: any) =>
    mapPaymentCloud(r, r.created_by ? names.get(Number(r.created_by)) : undefined)
  );
}

export async function createPayment(
  invoice_id: number,
  input: { amount: number; paid_at?: string; method?: string; reference?: string; note?: string },
  createdBy: number
): Promise<number> {
  const sb = supabaseAdmin();
  const { data: row, error: gErr } = await sb.from("invoices").select("id,status").eq("id", invoice_id).maybeSingle();
  if (gErr) assertNoSupabaseError(gErr, "invoices");
  if (!row) throw new Error("NOT_FOUND");
  if ((row as any).status === "cancelled") throw new Error("CANCELLED");
  const amt = Math.max(0, Math.round(input.amount || 0));
  if (amt <= 0) throw new Error("AMOUNT_REQUIRED");
  const { data, error } = await sb
    .from("invoice_payments")
    .insert({
      invoice_id,
      amount: amt,
      paid_at: (input.paid_at || todayUtcIso()).slice(0, 10),
      method: (input.method || "").trim(),
      reference: (input.reference || "").trim(),
      note: (input.note || "").trim(),
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "invoice_payments");
  await sb.from("invoices").update({ updated_at: new Date().toISOString() }).eq("id", invoice_id);
  return Number((data as any)?.id ?? 0);
}

export async function deletePayment(id: number) {
  const sb = supabaseAdmin();
  const { data: row, error: gErr } = await sb.from("invoice_payments").select("id,invoice_id").eq("id", id).maybeSingle();
  if (gErr) assertNoSupabaseError(gErr, "invoice_payments");
  if (!row) throw new Error("NOT_FOUND");
  const { error } = await sb.from("invoice_payments").delete().eq("id", id);
  if (error) assertNoSupabaseError(error, "invoice_payments");
  await sb.from("invoices").update({ updated_at: new Date().toISOString() }).eq("id", Number((row as any).invoice_id));
}

export async function refSummary(ref_type: string, ref_id: number) {
  const invs = (await listInvoices({ ref_type, ref_id })).filter((i) => i.status !== "cancelled");
  const invoiced = invs.reduce((t, i) => t + i.total, 0);
  const paid = invs.reduce((t, i) => t + (i.paid_amount || 0), 0);
  return {
    invoiced,
    paid,
    remaining: Math.max(0, invoiced - paid),
    invoice_count: invs.length,
    overdue_count: invs.filter((i) => i.state === "overdue").length,
  };
}

export type AccountingSummaryCloud = {
  invoiced: number;
  paid: number;
  remaining: number;
  overdueAmount: number;
  overdueCount: number;
  invoiceCount: number;
  dueSoon: Invoice[];
  overdue: Invoice[];
  recentPayments: Array<InvoicePayment & { invoice_no: string; company_name: string }>;
  monthly: Array<{ month: string; label: string; invoiced: number; collected: number }>;
};

export async function accountingSummary(): Promise<AccountingSummaryCloud> {
  const invs = (await listInvoices()).filter((i) => i.status !== "cancelled");
  const invoiced = invs.reduce((t, i) => t + i.total, 0);
  const paid = invs.reduce((t, i) => t + (i.paid_amount || 0), 0);
  const overdue = invs
    .filter((i) => i.state === "overdue")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  const dueSoon = invs
    .filter((i) => i.state === "due_soon")
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const { data: payRows, error: pErr } = await supabaseAdmin()
    .from("invoice_payments")
    .select("*")
    .order("paid_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);
  if (pErr) assertNoSupabaseError(pErr, "invoice_payments");
  const names = await crmUserNameMap();
  const invById = new Map(invs.map((i) => [i.id, i]));
  const recentPayments = (payRows || []).map((r: any) => {
    const inv = invById.get(Number(r.invoice_id));
    return {
      ...mapPaymentCloud(r, r.created_by ? names.get(Number(r.created_by)) : undefined),
      invoice_no: inv?.invoice_no || "",
      company_name: inv?.company_name || "",
    };
  });

  const monthly: AccountingSummaryCloud["monthly"] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const [y, m] = key.split("-");
    monthly.push({ month: key, label: `${m}/${y}`, invoiced: 0, collected: 0 });
  }
  const byMonth = new Map(monthly.map((x) => [x.month, x]));
  for (const i of invs) {
    const b = byMonth.get(i.issue_date.slice(0, 7));
    if (b) b.invoiced += i.total;
  }
  const { data: allPays, error: aErr } = await supabaseAdmin().from("invoice_payments").select("amount,paid_at").limit(5000);
  if (aErr) assertNoSupabaseError(aErr, "invoice_payments");
  for (const p of allPays || []) {
    const b = byMonth.get(String((p as any).paid_at).slice(0, 7));
    if (b) b.collected += Number((p as any).amount || 0);
  }

  return {
    invoiced,
    paid,
    remaining: Math.max(0, invoiced - paid),
    overdueAmount: overdue.reduce((t, i) => t + (i.remaining || 0), 0),
    overdueCount: overdue.length,
    invoiceCount: invs.length,
    dueSoon: dueSoon.slice(0, 10),
    overdue: overdue.slice(0, 10),
    recentPayments,
    monthly,
  };
}
