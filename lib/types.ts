export type Role = "admin" | "specialist";
export type Standard = "FDA" | "GACC";
export type CertificateStatus = "draft" | "published" | "expired";

export type User = {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
};

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
};

export type Certificate = {
  id: number;
  public_code: string;
  certificate_no: string;
  standard: Standard;
  registration_code: string;
  duns_code: string; // DUNS number - 9-digit business identifier required for FDA
  us_agent: string; // US Agent - required for FDA, not applicable for GACC
  service_price: number;
  company_name: string;
  company_email: string; // Company email for expiry warnings, hidden from QR
  company_address: string; // Customer address, printed on the public QR verification page
  portal_user: string; // Customer login (internal only - staff use it to work in the customer portal)
  portal_pass: string; // Password for that login (internal only - never rendered on the QR/verify page)
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_years: number; // FDA fixed 2 years (biennial renewal), GACC fixed 5 years
  validity_confirmed: number;
  status: CertificateStatus;
  published_at: string | null;
  revenue_recorded: number;
  renewal_count: number;
  last_renewed_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  pending_changes?: import("./certificate-workflow").CertificateChanges | null;
};

export type PublicCertificate = {
  public_code: string;
  certificate_no: string;
  standard: Standard;
  registration_code: string;
  duns_code: string;
  us_agent: string;
  company_name: string;
  company_address: string;
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_years: number;
  validity_confirmed: boolean;
  status: CertificateStatus;
  remaining_ms: number;
  remaining_days: number;
  total_days: number;
  elapsed_days: number;
  is_valid: boolean;
};

export const COMPANY = {
  name: "Vexim Global",
  legal: "VEXIM GLOBAL CO., LTD",
  address: "No. 25/6/51 Ngoa Long, Tay Tuu, Bac Tu Liem, Hanoi",
  phone: "0373 685 634",
  phoneHref: "tel:0373685634",
  email: "contact@veximglobal.com",
  website: "https://www.veximglobal.com",
  websiteLabel: "www.veximglobal.com",
  hours: "Mon–Fri: 8:00–18:00 · Sat: 8:00–12:00",
};

export const STANDARD_YEARS: Record<Standard, number> = {
  FDA: 2,
  GACC: 5,
};

// FDA: chọn 1-10 năm theo hợp đồng thật (mặc định 2 năm, đăng ký 2 năm/lần vào năm chẵn).
// GACC: CỐ ĐỊNH 5 năm, không cho chọn số năm khác.
// US Agent là dịch vụ thuê riêng theo năm, không phải hiệu lực đăng ký FDA
export const FDA_FIXED_YEARS = 2 as const;
export const GACC_FIXED_YEARS = 5 as const;
export const VALIDITY_YEARS_MIN = 1 as const;
export const VALIDITY_YEARS_MAX = 10 as const;
export const VALIDITY_YEARS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** GACC chỉ có một kỳ hạn duy nhất: 5 năm cố định. */
export const GACC_VALIDITY_OPTIONS = [GACC_FIXED_YEARS] as const;
export const FDA_VALIDITY_OPTIONS = VALIDITY_YEARS_OPTIONS; // giữ tên cũ để không vỡ chỗ dùng
export const VALIDITY_OPTIONS = FDA_VALIDITY_OPTIONS;
export type ValidityYears = number;

export const DEFAULT_VALIDITY: Record<Standard, number> = {
  FDA: 2,
  GACC: 5,
};

export function getDefaultValidity(standard: Standard): number {
  return DEFAULT_VALIDITY[standard] ?? 2;
}

export function isValidValidityYears(n: number): boolean {
  return Number.isInteger(n) && n >= VALIDITY_YEARS_MIN && n <= VALIDITY_YEARS_MAX;
}

/** FDA chọn 1-10 năm; GACC cố định 5 năm. */
export function isValidValidityYearsForStandard(n: number, standard?: Standard): boolean {
  if (standard === "GACC") return Math.round(n) === GACC_FIXED_YEARS;
  return isValidValidityYears(Math.round(n));
}

/** Số năm chọn được theo tiêu chuẩn: FDA 1-10 năm, GACC chỉ 5 năm. */
export function getValidityOptionsForStandard(standard?: Standard): number[] {
  return standard === "GACC" ? [...GACC_VALIDITY_OPTIONS] : [...VALIDITY_YEARS_OPTIONS];
}

/** Tiêu chuẩn này có cho chọn số năm không (GACC thì không). */
export function canChooseValidityYears(standard?: Standard): boolean {
  return standard !== "GACC";
}

/** Số năm gửi lên: GACC luôn 5; FDA lấy 1-10, trống/không hợp lệ thì về mặc định. */
export function resolveValidityYears(input: unknown, standard: Standard): number {
  if (standard === "GACC") return GACC_FIXED_YEARS;
  const raw = typeof input === "number" ? input : Number(String(input ?? "").trim());
  if (Number.isFinite(raw) && isValidValidityYears(Math.round(raw))) return Math.round(raw);
  return getDefaultValidity(standard);
}

/** true khi ô số năm có giá trị nhưng không hợp lệ (để API trả lỗi rõ ràng). */
export function isInvalidValidityInput(input: unknown, standard?: Standard): boolean {
  const text = String(input ?? "").trim();
  if (!text) return false;
  const n = Number(text);
  if (!Number.isFinite(n)) return true;
  return !isValidValidityYearsForStandard(n, standard);
}

// DUNS validation - 9 digits, but allow with dashes/spaces, store normalized
export function isValidDunsCode(code: string): boolean {
  if (!code) return true; // optional field
  const digits = code.replace(/\D/g, "");
  return digits.length === 9;
}

export function normalizeDunsCode(code: string): string {
  return code.replace(/\D/g, "").slice(0, 9);
}

export function formatDunsCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 9) return code;
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`; // e.g., 12-345-6789
}
