import { hashPassword } from "./auth";
import { supabaseAdmin } from "./supabase";
import { bucketRevenue, expiryFromStandard, randomCode, remainingDays } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as Role,
    team_id: row.team_id == null ? null : Number(row.team_id),
    created_at: String(row.created_at),
  };
}

function mapCert(row: Record<string, unknown>): Certificate {
  const joined = row.staff_users as { name?: string } | { name?: string }[] | null;
  const name = Array.isArray(joined) ? joined[0]?.name : joined?.name;
  const item: Certificate = {
    id: Number(row.id),
    public_code: String(row.public_code),
    certificate_no: String(row.certificate_no),
    standard: row.standard as Standard,
    registration_code: String(row.registration_code || ""),
    service_price: Number(row.service_price || 0),
    company_name: String(row.company_name || ""),
    scope: String(row.scope || ""),
    registered_at: String(row.registered_at).slice(0, 10),
    expires_at: String(row.expires_at).slice(0, 10),
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

const SAMPLE_CERTS: Array<{
  no: string;
  standard: Standard;
  code: string;
  price: number;
  company: string;
  scope: string;
  registered: string;
  published: string;
}> = [
  {
    no: "VXM-FDA-2025-0001",
    standard: "FDA",
    code: "17823456789",
    price: 18500000,
    company: "Công ty CP Thực phẩm An Phát",
    scope: "Food Facility Registration — chế biến thủy sản đông lạnh xuất khẩu sang Hoa Kỳ",
    registered: "2025-01-15",
    published: "2025-01-16T09:30:00Z",
  },
  {
    no: "VXM-GACC-2024-0008",
    standard: "GACC",
    code: "VN-GACC-44012345678",
    price: 42000000,
    company: "Công ty TNHH Nông sản Mekong",
    scope: "Đăng ký doanh nghiệp sản xuất thực phẩm xuất khẩu vào Trung Quốc (GACC Decree 248)",
    registered: "2024-03-20",
    published: "2024-03-22T09:30:00Z",
  },
  {
    no: "VXM-FDA-2026-0004",
    standard: "FDA",
    code: "18900123456",
    price: 21000000,
    company: "Green Leaf Cosmetics JSC",
    scope: "MoCRA facility registration & cosmetic product listing",
    registered: "2026-02-10",
    published: "2026-02-12T09:30:00Z",
  },
  {
    no: "VXM-GACC-2026-0002",
    standard: "GACC",
    code: "VN-GACC-33098765432",
    price: 38500000,
    company: "Công ty CP Gạo Việt Phát",
    scope: "Cơ sở xay xát, đóng gói gạo xuất khẩu sang thị trường Trung Quốc",
    registered: "2026-06-01",
    published: "2026-06-03T09:30:00Z",
  },
  {
    no: "VXM-FDA-2026-0012",
    standard: "FDA",
    code: "17200998877",
    price: 16500000,
    company: "Công ty TNHH Hải sản Bình Minh",
    scope: "FDA Food Facility Registration — thủy sản tươi sống và đông lạnh",
    registered: "2026-08-18",
    published: "2026-08-20T09:30:00Z",
  },
];

let seeded = false;

/** Đặt VEXIM_DISABLE_DEMO_SEED=1 để không tự tạo tài khoản/dữ liệu demo (nên bật ở production). */
function demoSeedDisabled() {
  return process.env.VEXIM_DISABLE_DEMO_SEED === "1";
}

export async function ensureSeed() {
  if (seeded || demoSeedDisabled()) return;
  const sb = supabaseAdmin();
  const { count, error } = await sb.from("staff_users").select("id", { count: "exact", head: true });
  if (error) throw error;
  if ((count || 0) > 0) {
    seeded = true;
    return;
  }

  const { data: users, error: userErr } = await sb
    .from("staff_users")
    .insert([
      {
        email: "admin@veximglobal.com",
        name: "Quản trị viên",
        password_hash: hashPassword("Vexim@Admin2026"),
        role: "admin",
      },
      {
        email: "chuyenmon@veximglobal.com",
        name: "Chuyên viên hồ sơ",
        password_hash: hashPassword("Vexim@CM2026"),
        role: "specialist",
      },
    ])
    .select("id, email");
  if (userErr) throw userErr;
  const spec = users?.find((u) => u.email === "chuyenmon@veximglobal.com");
  const admin = users?.find((u) => u.email === "admin@veximglobal.com");
  const by = (email: string) =>
    email.includes("Green") ? admin?.id : spec?.id || admin?.id;

  await sb.from("certificates").insert(
    SAMPLE_CERTS.map((s) => ({
      public_code: randomCode(12),
      certificate_no: s.no,
      standard: s.standard,
      registration_code: s.code,
      service_price: s.price,
      company_name: s.company,
      scope: s.scope,
      registered_at: s.registered,
      expires_at: expiryFromStandard(s.registered, s.standard),
      validity_confirmed: true,
      status: "published",
      published_at: s.published,
      revenue_recorded: true,
      created_by: s.company.includes("Green") ? admin?.id : spec?.id || admin?.id,
    }))
  );
  void by;
  seeded = true;
}

export async function findUserByEmail(email: string) {
  await ensureSeed();
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return { ...mapUser(data), password_hash: String(data.password_hash) };
}

export async function listUsers(): Promise<User[]> {
  await ensureSeed();
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .select("id, email, name, role, team_id, created_at")
    .order("id");
  if (error) throw error;
  return (data || []).map(mapUser);
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  team_id?: number | null;
}) {
  const { data, error } = await supabaseAdmin()
    .from("staff_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      password_hash: hashPassword(input.password),
      role: input.role,
      team_id: input.team_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return Number(data.id);
}

export async function updateUserRole(userId: number, role: Role) {
  const { error } = await supabaseAdmin().from("staff_users").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function updateUserTeam(userId: number, teamId: number | null) {
  const { error } = await supabaseAdmin().from("staff_users").update({ team_id: teamId }).eq("id", userId);
  if (error) throw error;
}

export async function nextCertificateNo(standard: Standard) {
  const year = new Date().getFullYear();
  const prefix = `VXM-${standard}-${year}-`;
  const { data } = await supabaseAdmin()
    .from("certificates")
    .select("certificate_no")
    .like("certificate_no", `${prefix}%`)
    .order("certificate_no", { ascending: false })
    .limit(1);
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
  if (error) throw error;
  return (data || []).map(mapCert);
}

export async function getCertificate(id: number) {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("*, staff_users(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCert(data) : undefined;
}

export async function getCertificateByPublicCode(code: string) {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select("*")
    .eq("public_code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? mapCert(data) : undefined;
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
  const expires = expiryFromStandard(input.registered_at, input.standard);
  const no = await nextCertificateNo(input.standard);
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .insert({
      public_code: randomCode(12),
      certificate_no: no,
      standard: input.standard,
      registration_code: input.registration_code.trim(),
      service_price: Math.max(0, Math.round(input.service_price || 0)),
      company_name: input.company_name.trim(),
      scope: input.scope.trim(),
      registered_at: input.registered_at,
      expires_at: expires,
      created_by: input.created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  return Number(data.id);
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
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const expires = expiryFromStandard(input.registered_at, input.standard);
  const reset =
    current.registered_at !== input.registered_at || current.standard !== input.standard;
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({
      standard: input.standard,
      registration_code: input.registration_code.trim(),
      service_price: Math.max(0, Math.round(input.service_price || 0)),
      company_name: input.company_name.trim(),
      scope: input.scope.trim(),
      registered_at: input.registered_at,
      expires_at: expires,
      validity_confirmed: reset ? false : Boolean(current.validity_confirmed),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function confirmValidity(id: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!current.registered_at || !current.expires_at) throw new Error("MISSING_DATES");
  const { error } = await supabaseAdmin()
    .from("certificates")
    .update({ validity_confirmed: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
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
  if (error) throw error;
  return (await getCertificate(id))!;
}

export async function renewCertificate(id: number, extraFee = 0) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const nextExpiry = expiryFromStandard(
    remainingDays(current.expires_at) >= 0
      ? current.expires_at
      : new Date().toISOString().slice(0, 10),
    current.standard
  );
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
  if (error) throw error;
  return (await getCertificate(id))!;
}

export async function deleteCertificate(id: number) {
  const current = await getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "published" && current.revenue_recorded) {
    throw new Error("PUBLISHED");
  }
  const { error } = await supabaseAdmin().from("certificates").delete().eq("id", id);
  if (error) throw error;
}

export async function revenueStats() {
  const { data, error } = await supabaseAdmin()
    .from("certificates")
    .select(
      "id, standard, service_price, published_at, registered_at, company_name, certificate_no, status"
    )
    .eq("revenue_recorded", true)
    .not("published_at", "is", null);
  if (error) throw error;
  const rows = (data || []).map((r) => ({
    id: Number(r.id),
    standard: String(r.standard) as Standard,
    service_price: Number(r.service_price || 0),
    published_at: String(r.published_at),
    company_name: String(r.company_name || ""),
    certificate_no: String(r.certificate_no || ""),
    status: String(r.status || ""),
  }));
  return bucketRevenue(rows);
}
