import { daysBetween, parseDate, todayUtcIso } from "@/lib/utils";
import type { Standard } from "@/lib/types";
import type { LookupStatus } from "./content";

/** Độ dài tối thiểu của từ khóa tra cứu. */
export const MIN_QUERY_LENGTH = 3;
/** Số kết quả tra cứu tối đa trả về một lần. */
export const MAX_LOOKUP_RESULTS = 8;

/** Số ngày còn lại được coi là "Sắp hết hạn" để nhắc khách gia hạn. */
export const EXPIRING_SOON_DAYS = 90;

/** Bỏ dấu tiếng Việt, dấu cách và dấu phân cách để so khớp số đăng ký. */
export function normalizeForSearch(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[\s\-_./\\,]/g, "");
}

/**
 * Ẩn các chữ số ở giữa số đăng ký, giữ lại phần đầu và phần cuối để đối tác
 * vẫn nhận ra mã của mình mà không công bố toàn bộ số trên trang tra cứu.
 * Ví dụ: 12345678901 thành 12•••••901.
 */
export function maskRegistrationCode(code: string): string {
  const trimmed = (code || "").trim();
  if (!trimmed) return "";

  const chars = Array.from(trimmed);
  const digitIndexes = chars.map((char, index) => (/\d/.test(char) ? index : -1)).filter((index) => index >= 0);
  if (digitIndexes.length <= 3) return trimmed;

  const keepStart = digitIndexes.length >= 8 ? 2 : 1;
  const keepEnd = digitIndexes.length >= 8 ? 3 : 2;
  const visible = new Set<number>([
    ...digitIndexes.slice(0, keepStart),
    ...digitIndexes.slice(-keepEnd),
  ]);

  return chars.map((char, index) => (/\d/.test(char) && !visible.has(index) ? "•" : char)).join("");
}

export function remainingDaysUntil(expiresAt: string, today = todayUtcIso()): number {
  if (!parseDate(expiresAt)) return 0;
  return daysBetween(today, expiresAt);
}

/** Trạng thái hiệu lực hiển thị cho khách: còn hiệu lực, sắp hết hạn, hết hiệu lực. */
export function lookupStatus(expiresAt: string, today = todayUtcIso()): LookupStatus {
  const days = remainingDaysUntil(expiresAt, today);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "valid";
}

/** Định dạng ngày kiểu Việt Nam: 31/12/2026. */
export function formatDdMmYyyy(value: string | null | undefined): string {
  if (!value) return "";
  const dateOnly = String(value).slice(0, 10);
  const parts = dateOnly.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

export function normalizedStandard(value: string | null | undefined): Standard | undefined {
  const upper = (value || "").toUpperCase();
  if (upper === "FDA") return "FDA";
  if (upper === "GACC") return "GACC";
  return undefined;
}

/**
 * Thông báo theo mùa chỉ hiển thị từ 01/10 đến 31/12 của năm chẵn,
 * đúng kỳ gia hạn đăng ký cơ sở thực phẩm với FDA.
 */
export function renewalSeasonYear(date = new Date()): number | null {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month < 10 || year % 2 !== 0) return null;
  return year;
}
