import { STANDARD_YEARS, type Standard } from "./types";

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
  return d.toLocaleDateString("vi-VN", {
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
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addYears(isoDate: string, years: number) {
  const d = parseDate(isoDate);
  if (!d) return isoDate;
  d.setFullYear(d.getFullYear() + years);
  return toIsoDate(d);
}

export function expiryFromStandard(registeredAt: string, standard: Standard) {
  return addYears(registeredAt, STANDARD_YEARS[standard]);
}

export function daysBetween(fromIso: string, toIso: string) {
  const a = parseDate(fromIso);
  const b = parseDate(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function remainingDays(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  const end = new Date(exp);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export function remainingMs(expiresAt: string, now = new Date()) {
  const exp = parseDate(expiresAt);
  if (!exp) return 0;
  const end = new Date(exp);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, end.getTime() - now.getTime());
}

export function isValidNow(expiresAt: string, registeredAt: string, now = new Date()) {
  const start = parseDate(registeredAt);
  const exp = parseDate(expiresAt);
  if (!start || !exp) return false;
  const end = new Date(exp);
  end.setHours(23, 59, 59, 999);
  const begin = new Date(start);
  begin.setHours(0, 0, 0, 0);
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
  if (status !== "published") return status === "draft" ? "Nháp" : "Hết hạn";
  if (remaining < 0) return "Hết hạn";
  if (remaining <= 90) return "Sắp hết hạn";
  return "Đã xuất bản";
}

/* ---------------- VEXIM CRM helpers ---------------- */

/** "3 ngày trước", "hôm qua", "2 giờ trước" — dùng cho activity feed. */
export function fromNow(value: string | null | undefined, now = new Date()) {
  if (!value) return "—";
  const raw = String(value).trim();
  const d = new Date(raw.includes("T") || raw.includes("Z") ? raw : raw.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "—";
  const diff = now.getTime() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return mins <= 1 ? "vừa xong" : `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hôm qua";
  if (days < 30) return `${days} ngày trước`;
  const months = Math.round(days / 30);
  return `${months} tháng trước`;
}

/** Đếm ngày tới hạn follow-up: số âm = quá hạn. */
export function daysUntil(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function compactVnd(n: number) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(".0", "")} tỷ`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".0", "")} triệu`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(days: number, from = new Date()) {
  return new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10);
}

export { daysSince } from "./crm-core";

/* ---------------- Doanh thu FDA / GACC (dùng chung SQLite + Supabase) ---------------- */

export type RevenueRow = {
  id: number;
  standard: Standard;
  service_price: number;
  published_at: string;
  company_name?: string;
  certificate_no?: string;
  status?: string;
};

export type RevenueBucket = {
  label: string;
  FDA: number;
  GACC: number;
  total: number;
};

/** Gom doanh thu đã ghi nhận theo tháng / quý / năm. */
export function bucketRevenue(rows: RevenueRow[]) {
  const months = new Map<string, RevenueBucket>();
  const quarters = new Map<string, RevenueBucket>();
  const years = new Map<string, RevenueBucket>();
  let total = 0;
  let fda = 0;
  let gacc = 0;

  const bump = (map: Map<string, RevenueBucket>, key: string, amt: number, std: Standard) => {
    const cur = map.get(key) || { label: key, FDA: 0, GACC: 0, total: 0 };
    if (std === "FDA") cur.FDA += amt;
    else cur.GACC += amt;
    cur.total += amt;
    map.set(key, cur);
  };

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
    bump(months, `${y}-${String(m).padStart(2, "0")}`, amt, r.standard);
    bump(quarters, `${y}-Q${q}`, amt, r.standard);
    bump(years, String(y), amt, r.standard);
  }

  const sorted = (map: Map<string, RevenueBucket>) =>
    Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));

  return {
    total,
    fda,
    gacc,
    count: rows.length,
    months: sorted(months).map((b) => ({ month: b.label, FDA: b.FDA, GACC: b.GACC, total: b.total })),
    quarters: sorted(quarters).map((b) => ({ quarter: b.label, FDA: b.FDA, GACC: b.GACC, total: b.total })),
    years: sorted(years).map((b) => ({ year: b.label, FDA: b.FDA, GACC: b.GACC, total: b.total })),
    recent: rows
      .slice()
      .sort((a, b) => (String(a.published_at) < String(b.published_at) ? 1 : -1))
      .slice(0, 8),
  };
}
