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
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  expires_at: string;
  validity_years: number; // 1-10 years per client contract
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

// Support 1-10 years per contract
export const VALIDITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type ValidityYears = (typeof VALIDITY_OPTIONS)[number];

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
