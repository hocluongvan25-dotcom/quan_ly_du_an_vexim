/**
 * Tra cứu công khai theo số đăng ký hoặc tên doanh nghiệp.
 *
 * Chỉ trả về các trường được phép công bố: tên doanh nghiệp, loại mã, tình trạng,
 * hạn tiếp theo và mã công khai. Không trả phí dịch vụ, thông tin đăng nhập cổng
 * khách hàng hay email nội bộ.
 */
import type { Certificate, Standard } from "./types";
import { remainingDays } from "./utils";

export type LookupStatus = "valid" | "expiring" | "expired";

export type PublicLookupItem = {
  company_name: string;
  standard: Standard;
  status: LookupStatus;
  /** Ngày hết hạn hiện tại, dạng YYYY-MM-DD. */
  expires_at: string;
  public_code: string;
};

/** Số kết quả trả về tối đa cho một lần tra cứu. */
export const LOOKUP_RESULT_LIMIT = 6;

/** Còn từ 60 ngày trở xuống thì coi là sắp hết hạn. */
export const EXPIRING_SOON_DAYS = 60;

export const LOOKUP_MIN_QUERY = 2;

/** Bỏ dấu tiếng Việt, gộp khoảng trắng, về chữ thường. */
export function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Bỏ hết ký tự phân cách để so mã đăng ký (dấu gạch, dấu chấm, khoảng trắng). */
export function normalizeCode(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function certificateLookupStatus(item: Certificate, now = new Date()): LookupStatus {
  if (!item.validity_confirmed) return "expired";
  const days = remainingDays(item.expires_at, now);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "valid";
}

/** Hồ sơ nháp không bao giờ xuất hiện trong tra cứu công khai. */
export function isPublicRecord(item: Certificate): boolean {
  return item.status !== "draft" && Boolean(item.public_code);
}

export function certificateMatches(item: Certificate, type: Standard, query: string): boolean {
  if (!isPublicRecord(item)) return false;
  if (item.standard !== type) return false;

  const text = normalizeText(query);
  if (text.length < LOOKUP_MIN_QUERY) return false;

  if (normalizeText(item.company_name).includes(text)) return true;

  const code = normalizeCode(query);
  if (!code) return false;
  return (
    normalizeCode(item.registration_code).includes(code) ||
    normalizeCode(item.certificate_no).includes(code) ||
    normalizeCode(item.public_code) === code
  );
}

export function toPublicLookupItem(item: Certificate, now = new Date()): PublicLookupItem {
  return {
    company_name: item.company_name,
    standard: item.standard,
    status: certificateLookupStatus(item, now),
    expires_at: String(item.expires_at).slice(0, 10),
    public_code: item.public_code,
  };
}

export function searchPublicRecords(
  items: Certificate[],
  type: Standard,
  query: string,
  limit = LOOKUP_RESULT_LIMIT,
): PublicLookupItem[] {
  const now = new Date();
  return items
    .filter((item) => certificateMatches(item, type, query))
    .slice(0, limit)
    .map((item) => toPublicLookupItem(item, now));
}

/** dd/mm/yyyy cho phần hiển thị. */
export function formatLookupDate(iso: string): string {
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}
