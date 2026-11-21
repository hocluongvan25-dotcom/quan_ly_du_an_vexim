/**
 * Địa chỉ công khai của hệ thống, dùng cho các link trong email.
 *
 * Mã QR trên hồ sơ trỏ tới `<domain đang chạy>/verify/<mã>` (lấy từ chính trình duyệt
 * của người tạo hồ sơ), nên email phải trỏ tới **đúng chỗ đó** để khách bấm là ra trang
 * xác minh. Trước đây email hardcode `verify.vexim.vn` — một tên miền không tồn tại,
 * nên khách bấm vào chỉ thấy trang không mở được.
 *
 * Thứ tự ưu tiên:
 *  1. `NEXT_PUBLIC_SITE_URL` (hoặc `SITE_URL`) — đặt trong Vercel khi đổi tên miền.
 *  2. Tên miền production/ deployment của Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`).
 *  3. Tên miền đang dùng thật của hệ thống.
 */
export const DEFAULT_SITE_URL = "https://vanhanh.veximglobal.com";

function stripTrailingSlashes(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function siteBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
  if (stripTrailingSlashes(explicit)) return stripTrailingSlashes(explicit);

  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${stripTrailingSlashes(vercel.replace(/^https?:\/\//i, ""))}`;

  return DEFAULT_SITE_URL;
}

/** Link xác minh công khai của một hồ sơ — cùng địa chỉ mà mã QR mã hoá. */
export function verifyUrlFor(publicCode: string) {
  return `${siteBaseUrl()}/verify/${publicCode}`;
}
