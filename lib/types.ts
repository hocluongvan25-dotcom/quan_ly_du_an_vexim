export type Role = "admin" | "specialist";
export type Standard = "FDA" | "GACC";
export type CertificateStatus = "draft" | "published" | "expired";

// FDA Registration Status - for tracking FDA facility registration lifecycle
export type FdaRegistrationStatus =
  | "pending"
  | "submitted"
  | "registered"
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"
  | "on_hold";

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
  fda_registration_status: FdaRegistrationStatus; // FDA registration lifecycle status
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
  duns_code: string;
  fda_registration_status: FdaRegistrationStatus;
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

// FDA Registration Status options
export const FDA_STATUS_OPTIONS: Array<{
  value: FdaRegistrationStatus;
  label: string;
  description: string;
  color: string;
}> = [
  { value: "pending", label: "Pending", description: "Awaiting submission", color: "slate" },
  { value: "submitted", label: "Submitted", description: "Submitted to FDA", color: "amber" },
  { value: "registered", label: "Registered", description: "Registered with FDA", color: "blue" },
  { value: "active", label: "Active", description: "Active and valid", color: "emerald" },
  { value: "expired", label: "Expired", description: "Registration expired", color: "rose" },
  { value: "cancelled", label: "Cancelled", description: "Cancelled by facility or FDA", color: "gray" },
  { value: "suspended", label: "Suspended", description: "Suspended by FDA", color: "red" },
  { value: "on_hold", label: "On Hold", description: "On hold pending action", color: "orange" },
];

export const DEFAULT_FDA_STATUS: FdaRegistrationStatus = "pending";

export function isValidFdaStatus(status: string): boolean {
  return FDA_STATUS_OPTIONS.some((o) => o.value === status);
}

export function getFdaStatusLabel(status: string): string {
  return FDA_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

export function getFdaStatusColor(status: string): string {
  return FDA_STATUS_OPTIONS.find((o) => o.value === status)?.color || "slate";
}
