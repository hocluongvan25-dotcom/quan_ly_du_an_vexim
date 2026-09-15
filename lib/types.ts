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
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_years: number; // FDA 1-10 years flexible, GACC fixed 5 years
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
};

export type PublicCertificate = {
  public_code: string;
  certificate_no: string;
  standard: Standard;
  registration_code: string;
  duns_code: string;
  us_agent: string;
  company_name: string;
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

// FDA flexible 1-10 years, GACC fixed 5 years
export const FDA_VALIDITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const GACC_FIXED_YEARS = 5 as const;
export const VALIDITY_OPTIONS = FDA_VALIDITY_OPTIONS; // backward compat, FDA options
export type ValidityYears = (typeof FDA_VALIDITY_OPTIONS)[number];

export const DEFAULT_VALIDITY: Record<Standard, number> = {
  FDA: 2,
  GACC: 5,
};

export function getDefaultValidity(standard: Standard): number {
  return DEFAULT_VALIDITY[standard] ?? 2;
}

export function isValidValidityYears(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

export function isValidValidityYearsForStandard(n: number, standard: Standard): boolean {
  if (standard === "GACC") {
    return n === GACC_FIXED_YEARS;
  }
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

export function getValidityOptionsForStandard(standard: Standard): number[] {
  if (standard === "GACC") return [GACC_FIXED_YEARS];
  return [...FDA_VALIDITY_OPTIONS];
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
