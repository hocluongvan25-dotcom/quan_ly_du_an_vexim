import { hashPassword } from "./auth";
import { supabaseAdmin } from "./supabase";
import { expiryFromStandard, randomCode, remainingDays, getValidityYears } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";
import { DEFAULT_VALIDITY, isValidValidityYears } from "./types";

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
  const item: Certificate = {
    id: Number(row.id),
    public_code: String(row.public_code),
    certificate_no: String(row.certificate_no),
    standard: row.standard as Standard,
    registration_code: String(row.registration_code || ""),
    duns_code: String(row.duns_code || ""),
    service_price: Number(row.service_price || 0),
    company_name: String(row.company_name || ""),
    scope: String(row.scope || ""),
    registered_at: String(row.registered_at).slice(0, 10),
    expires_at: String(row.expires_at).slice(0, 10),
    validity_years: isValidValidityYears(validity) ? validity : DEFAULT_VALIDITY[row.standard as Standard] ?? 2,
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
    throw new Error(
      `SUPABASE_SCHEMA_MISSING: Table '${context}' does not exist or is not exposed in Supabase. ` +
        `Please go to Supabase Dashboard > SQL Editor and run the entire supabase/schema.sql file, ` +
        `then run: NOTIFY pgrst, 'reload schema'; ` +
        `Original details: ${error.message}`
    );
  }
  throw error;
}

function normalizeValidityYears(input: number | undefined, standard: Standard): number {
  if (input && isValidValidityYears(input)) return Math.round(input);
  return DEFAULT_VALIDITY[standard] ?? 2;
}

const SAMPLE_CERTS: Array<{
  no: string;
  standard: Standard;
  code: string;
  duns: string;
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
    duns: "987654321",
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
    duns: "445556666",
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
        duns_code: s.duns,
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
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
  created_by: number;
}) {
  const validity = normalizeValidityYears(input.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const no = await nextCertificateNo(input.standard);
  const duns = (input.duns_code || "").replace(/\D/g, "").slice(0, 9);
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .insert({
      public_code: randomCode(12),
      certificate_no: no,
      standard: input.standard,
      registration_code: input.registration_code.trim(),
      duns_code: duns,
      service_price: Math.max(0, Math.round(input.service_price || 0)),
      company_name: input.company_name.trim(),
      scope: input.scope.trim(),
      registered_at: input.registered_at,
      expires_at: expires,
      validity_years: validity,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) assertNoSupabaseError(error, "certificates");
  return Number((data as any)?.id ?? 0);
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
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const validity = normalizeValidityYears(input.validity_years ?? current.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const reset =
    current.registered_at !== input.registered_at ||
    current.standard !== input.standard ||
    current.validity_years !== validity;
  const duns = input.duns_code !== undefined ? input.duns_code.replace(/\D/g, "").slice(0, 9) : current.duns_code;
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({
      standard: input.standard,
      registration_code: input.registration_code.trim(),
      duns_code: duns,
      service_price: Math.max(0, Math.round(input.service_price || 0)),
      company_name: input.company_name.trim(),
      scope: input.scope.trim(),
      registered_at: input.registered_at,
      expires_at: expires,
      validity_years: validity,
      validity_confirmed: reset ? false : Boolean(current.validity_confirmed),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "certificates");
}

export async function confirmValidity(id: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!current.registered_at || !current.expires_at) throw new Error("MISSING_DATES");
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({ validity_confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "certificates");
}

export async function publishCertificate(id: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!current.validity_confirmed) throw new Error("NOT_CONFIRMED");
  if (!current.company_name || !current.registration_code) throw new Error("INCOMPLETE");
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({
      status: "published",
      published_at: current.published_at || new Date().toISOString(),
      revenue_recorded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "certificates");
  return (await getCertificate(id))!;
}

export async function renewCertificate(id: number, extraFee = 0) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  // Renewal must follow contract duration (validity_years), not fixed 2 years
  const validity = getValidityYears(current);
  const baseDate =
    remainingDays(current.expires_at) >= 0
      ? current.expires_at
      : new Date().toISOString().slice(0, 10);
  const nextExpiry = expiryFromStandard(baseDate, current.standard, validity);
  const extra = Math.max(0, Math.round(extraFee || 0));
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({
      expires_at: nextExpiry,
      renewal_count: current.renewal_count + 1,
      last_renewed_at: new Date().toISOString(),
      service_price: current.service_price + extra,
      status: "published",
      validity_confirmed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) assertNoSupabaseError(error, "certificates");
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
