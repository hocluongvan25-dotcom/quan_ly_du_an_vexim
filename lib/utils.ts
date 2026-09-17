import { DEFAULT_VALIDITY, STANDARD_YEARS, GACC_FIXED_YEARS, type Standard } from "./types";

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

/**
 * Parse YYYY-MM-DD to Date at UTC midnight.
 * Using UTC avoids drift between Vercel (UTC) and VN (UTC+7).
 */
export function parseDate(value: string) {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function toIsoDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local date YYYY-MM-DD for form defaults (user's timezone) */
export function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** UTC date YYYY-MM-DD for server-side calculations */
/** Chuẩn hóa tên công ty để khớp deal ↔ hồ sơ/hợp đồng */
export function normCompany(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function todayUtcIso(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Add months preserving UTC, clamping day to end of month (Jan 31 + 1mo -> Feb 28)
 */
export function addMonths(isoDate: string, months: number) {
  const d = parseDate(isoDate);
  if (!d) return isoDate;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  const targetY = new Date(Date.UTC(y, m, 1)).getUTCFullYear();
  const targetM = new Date(Date.UTC(y, m, 1)).getUTCMonth();
  const lastDay = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
  return toIsoDate(new Date(Date.UTC(targetY, targetM, Math.min(day, lastDay), 0, 0, 0, 0)));
}

/**
 * Add years preserving UTC and handling Feb 29 -> Feb 28
 */
export function addYears(isoDate: string, years: number) {
  const d = parseDate(isoDate);
  if (!d) return isoDate;
  const y = d.getUTCFullYear() + years;
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  const next = new Date(Date.UTC(y, m, safeDay, 0, 0, 0, 0));
  return toIsoDate(next);
}

// FDA fixed 2 years, GACC fixed 5 years
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
  if (cert.expires_at && cert.registered_at) {
    const diff = daysBetween(cert.registered_at, cert.expires_at);
    const approxYears = Math.round(diff / 365);
    if (approxYears >= 1 && approxYears <= 10) return approxYears;
  }
  return STANDARD_YEARS[cert.standard] ?? DEFAULT_VALIDITY[cert.standard] ?? 2;
}

/**
 * Days between two YYYY-MM-DD dates (UTC, date-only)
 * Example: daysBetween('2026-09-15','2027-09-15') = 365
 */
export function daysBetween(fromIso: string, toIso: string) {
  const a = parseDate(fromIso);
  const b = parseDate(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Remaining days = daysBetween(today UTC, expires)
 * - expiry today => 0 (last valid day, still HỢP LỆ)
 * - expiry tomorrow => 1
 * - expiry yesterday => -1 (HẾT HẠN)
 * This makes total = elapsed + remaining
 */
export function remainingDays(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  const todayIso = todayUtcIso(now);
  return daysBetween(todayIso, expiresAt);
}

/**
 * Remaining ms until end of expiry day UTC (for countdown timer)
 */
export function remainingMs(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  const end = new Date(exp);
  end.setUTCHours(23, 59, 59, 999);
  return Math.max(0, end.getTime() - now.getTime());
}

/**
 * Valid if today UTC is between registered and expires inclusive
 */
export function isValidNow(expiresAt: string, registeredAt: string, now = new Date()) {
  const start = parseDate(registeredAt);
  const exp = parseDate(expiresAt);
  if (!start || !exp) return false;
  const todayIso = todayUtcIso(now);
  const today = parseDate(todayIso);
  if (!today) return false;
  return today.getTime() >= start.getTime() && today.getTime() <= exp.getTime();
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
