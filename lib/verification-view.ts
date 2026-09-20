import type { Certificate } from "./types";
import { remainingDays } from "./utils";

type VerificationRecord = Pick<Certificate,
  "status" | "validity_confirmed" | "registered_at" | "expires_at" | "company_name" | "registration_code"
>;

function validDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
}

/** Evaluate against the server's actual read time, not a hard-coded date or the browser timezone. */
export function verificationResult(cert: VerificationRecord, checkedAt: string) {
  const now = new Date(checkedAt);
  const datesValid = validDate(cert.registered_at) && validDate(cert.expires_at) &&
    cert.registered_at.slice(0, 10) <= cert.expires_at.slice(0, 10);
  const left = datesValid && Number.isFinite(now.getTime()) ? remainingDays(cert.expires_at, now) : null;
  if (cert.status === "draft" || left === null) {
    return { state: "unverified", title: "Verification Pending", label: "Chưa xác nhận hiệu lực", description: "Hồ sơ chưa đủ điều kiện xác nhận hiệu lực. Vui lòng liên hệ Vexim Global để kiểm tra thông tin.", left } as const;
  }
  if (left < 0 || cert.status === "expired") {
    return { state: "expired", title: "Certificate Expired", label: "Hết hiệu lực", description: "Chứng nhận đã hết hiệu lực theo hồ sơ xác minh. Vui lòng liên hệ đơn vị thực hiện để kiểm tra tình trạng gia hạn.", left } as const;
  }
  if (!cert.validity_confirmed || !cert.company_name.trim() || !cert.registration_code.trim()) {
    return { state: "unverified", title: "Verification Pending", label: "Chưa xác nhận hiệu lực", description: "Hồ sơ chưa được xác nhận hiệu lực. Vui lòng liên hệ Vexim Global để kiểm tra thông tin đăng ký.", left } as const;
  }
  if (cert.registered_at.slice(0, 10) > now.toISOString().slice(0, 10)) {
    return { state: "unverified", title: "Certificate Not Yet Valid", label: "Chưa có hiệu lực", description: "Chứng nhận chưa đến ngày bắt đầu hiệu lực theo hồ sơ xác minh.", left } as const;
  }
  return { state: "valid", title: "Certificate Verified", label: "Còn hiệu lực", description: "Chứng nhận hiện đang có hiệu lực và thông tin đăng ký khớp với hồ sơ xác minh.", left } as const;
}

export function formatCheckedAt(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  return `${part("day")} ${part("month")} ${part("year")} · ${part("hour")}:${part("minute")} ICT`;
}

export function formatRegistrationDate(iso: string | null) {
  if (!iso || !validDate(iso)) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
