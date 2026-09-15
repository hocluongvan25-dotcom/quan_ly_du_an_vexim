import { DEFAULT_VALIDITY, STANDARD_YEARS, GACC_FIXED_YEARS, type Certificate, type Standard } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function parseDate(value: string) {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (!y || !m || !d) return null;
  // Use UTC to avoid timezone drift between Vercel (UTC) and client (VN UTC+7)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function toIsoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addYears(isoDate: string, years: number) {
  const d = parseDate(isoDate);
  if (!d) return isoDate;
  // Preserve UTC
  const y = d.getUTCFullYear() + years;
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // Handle Feb 29 -> Feb 28 if not leap year
  const lastDayOfMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDayOfMonth);
  const next = new Date(Date.UTC(y, m, safeDay, 0, 0, 0, 0));
  return toIsoDate(next);
}

// FDA flexible 1-10 years, GACC fixed 5 years
export function expiryFromStandard(
  registeredAt: string,
  standard: Standard,
  validityYears?: number | null
) {
  if (standard === "GACC") {
    return addYears(registeredAt, GACC_FIXED_YEARS);
  }
  const years =
    validityYears && Number.isFinite(validityYears) && validityYears >= 1 && validityYears <= 10
      ? Math.round(validityYears)
      : STANDARD_YEARS[standard] ?? DEFAULT_VALIDITY[standard] ?? 2;
  return addYears(registeredAt, years);
}

export function getValidityYears(cert: {
  standard: Standard;
  validity_years?: number | null;
  expires_at?: string;
  registered_at?: string;
}): number {
  if (cert.standard === "GACC") {
    return GACC_FIXED_YEARS;
  }
  if (cert.validity_years && cert.validity_years >= 1 && cert.validity_years <= 10) {
    return cert.validity_years;
  }
  // Fallback for old data without validity_years: calculate from dates or use default
  if (cert.expires_at && cert.registered_at) {
    const diff = daysBetween(cert.registered_at, cert.expires_at);
    const approxYears = Math.round(diff / 365);
    if (approxYears >= 1 && approxYears <= 10) return approxYears;
  }
  return STANDARD_YEARS[cert.standard] ?? DEFAULT_VALIDITY[cert.standard] ?? 2;
}

export function daysBetween(fromIso: string, toIso: string) {
  const a = parseDate(fromIso);
  const b = parseDate(toIso);
  if (!a || !b) return 0;
  // Use UTC diff
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function remainingDays(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  // End of expiry day in UTC
  const end = new Date(exp);
  end.setUTCHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  // Avoid -0
  const days = Math.ceil(diff / 86400000);
  return Object.is(days, -0) ? 0 : days;
}

export function remainingMs(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  const end = new Date(exp);
  end.setUTCHours(23, 59, 59, 999);
  return Math.max(0, end.getTime() - now.getTime());
}

export function isValidNow(expiresAt: string, registeredAt: string, now = new Date()) {
  const start = parseDate(registeredAt);
  const exp = parseDate(expiresAt);
  if (!start || !exp) return false;
  const end = new Date(exp);
  end.setUTCHours(23, 59, 59, 999);
  const begin = new Date(start);
  begin.setUTCHours(0, 0, 0, 0);
  return now.getTime() >= begin.getTime() && now.getTime() <= end.getTime();
}

export function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

export function statusLabel(status: string, remaining: number) {
  if (status !== "published") return status === "draft" ? "Draft" : "Expired";
  if (remaining < 0) return "Expired";
  if (remaining <= 90) return "Expiring Soon";
  return "Published";
}

export function validityLabel(years: number) {
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function formatDuns(code: string | null | undefined) {
  if (!code) return "—";
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 9) return code;
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
}

export function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
