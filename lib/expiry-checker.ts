import { listCertificates, listCompanies, getCompanyByName, hasNotificationBeenSent, createExpiryNotification } from "./db";
import { remainingDays, getValidityYears } from "./utils";
import type { Certificate } from "./types";
import { sendExpiryWarningEmail, sendRenewalConfirmationEmail, type ExpiryWarningData, type NotificationType } from "./email";

export type ExpiryCheckResult = {
  totalScanned: number;
  warningsSent: number;
  expiredFound: number;
  errors: number;
  details: Array<{
    certificate_no: string;
    company_name: string;
    remaining: number;
    type: NotificationType | null;
    sent: boolean;
    recipients: string[];
    error?: string;
  }>;
};

const THRESHOLDS: Array<{ days: number; type: NotificationType }> = [
  { days: 90, type: "90_days" },
  { days: 60, type: "60_days" },
  { days: 30, type: "30_days" },
  { days: 14, type: "14_days" },
  { days: 7, type: "7_days" },
  { days: 3, type: "3_days" },
  { days: 1, type: "1_day" },
  { days: 0, type: "1_day" }, // also treat 0 as 1_day
];

function getNotificationTypeForRemaining(remaining: number): NotificationType | null {
  if (remaining < 0) return "expired";
  // Exact matches for thresholds, plus we also want to catch if remaining is exactly threshold
  // For 90, 60, 30, 14, 7, 3, 1, 0
  for (const t of THRESHOLDS) {
    if (remaining === t.days) return t.type;
  }
  // Also if remaining is between thresholds, we don't send unless it's exactly threshold
  // But for safety, if remaining is 0, we already handled
  return null;
}

/**
 * Kỳ hạn hiện tại bắt đầu từ lúc nào: lần gia hạn gần nhất, hoặc ngày đăng ký đầu tiên.
 * Thông báo gửi TRƯỚC mốc này thuộc kỳ hạn cũ và không được chặn kỳ hạn mới.
 */
export function currentTermStart(cert: Certificate) {
  return cert.renewal_count > 0 && cert.last_renewed_at ? cert.last_renewed_at : cert.registered_at;
}

type ExpiryWarningFields = Pick<Certificate,
  "certificate_no" | "company_name" | "standard" | "registration_code" | "registered_at" |
  "expires_at" | "public_code" | "duns_code" | "us_agent"> & { validity_years?: number };

/** Dữ liệu cho email, dùng chung cho cảnh báo hết hạn và xác nhận gia hạn. */
export function warningDataFor(cert: ExpiryWarningFields, remaining: number, renewalCount = 0): ExpiryWarningData {
  return {
    certificate_no: cert.certificate_no,
    company_name: cert.company_name,
    standard: cert.standard,
    registration_code: cert.registration_code,
    registered_at: cert.registered_at,
    expires_at: cert.expires_at,
    validity_years: getValidityYears(cert as any),
    remaining_days: remaining,
    public_code: cert.public_code,
    duns_code: cert.duns_code,
    us_agent: cert.us_agent,
    renewal_count: renewalCount,
  };
}

/**
 * Người nhận email của một hồ sơ: email khách trên hồ sơ → danh bạ doanh nghiệp →
 * luôn thêm email admin để Vexim nắm được.
 */
export async function certificateRecipients(
  cert: Pick<Certificate, "company_name" | "company_email">,
  companyMap?: Map<string, { email: string; phone: string }>
) {
  const recipients: string[] = [];
  const certEmail = (cert.company_email || "").trim();
  if (certEmail) recipients.push(certEmail);
  if (recipients.length === 0 && companyMap) {
    const info = companyMap.get(cert.company_name.toLowerCase());
    if (info?.email) recipients.push(info.email);
  }
  if (recipients.length === 0) {
    try {
      const comp = await getCompanyByName(cert.company_name);
      if (comp?.email) recipients.push(comp.email);
    } catch {}
  }
  const adminEmail = process.env.ZOHO_TO_EMAIL || process.env.ZOHO_FROM_EMAIL || "contact@veximglobal.com";
  if (adminEmail && !recipients.includes(adminEmail)) recipients.push(adminEmail);
  return recipients;
}

/**
 * Sau khi gia hạn: gửi email xác nhận cho khách và ghi lại vào lịch sử thông báo.
 * Email lỗi không được làm hỏng việc gia hạn — chỉ trả về lý do.
 */
export async function notifyCertificateRenewed(cert: Certificate): Promise<{ sent: boolean; recipients: string[]; error?: string }> {
  const recipients = await certificateRecipients(cert);
  if (recipients.length === 0) return { sent: false, recipients, error: "No recipient email" };
  const remaining = remainingDays(cert.expires_at);
  const result = await sendRenewalConfirmationEmail(warningDataFor(cert, remaining, cert.renewal_count), recipients);
  try {
    await createExpiryNotification({
      certificate_id: cert.id,
      company_name: cert.company_name,
      notification_type: "renewal_reminder",
      recipient_email: recipients.join(", "),
      status: result.success ? "sent" : "failed",
    });
  } catch (e: any) {
    console.warn(`[ExpiryChecker] Failed to record renewal confirmation for ${cert.certificate_no}:`, e.message);
  }
  return { sent: result.success, recipients, error: result.success ? undefined : result.error };
}

/**
 * Scan all published certificates and send expiry warnings
 * - Checks remainingDays
 * - Sends email if threshold matches and not already sent
 * - Records in expiry_notifications to avoid duplicate
 */
export async function scanAndNotifyExpiry(): Promise<ExpiryCheckResult> {
  const certificates = await listCertificates();
  const companies = await listCompanies();
  const companyMap = new Map<string, { email: string; phone: string }>();
  companies.forEach((c) => {
    companyMap.set(c.company_name.toLowerCase(), { email: c.email, phone: c.phone });
  });

  const result: ExpiryCheckResult = {
    totalScanned: 0,
    warningsSent: 0,
    expiredFound: 0,
    errors: 0,
    details: [],
  };

  for (const cert of certificates) {
    if (cert.status === "draft") continue; // skip drafts
    result.totalScanned++;

    const remaining = remainingDays(cert.expires_at);
    const type = getNotificationTypeForRemaining(remaining);

    if (remaining < 0) result.expiredFound++;

    if (!type) {
      result.details.push({
        certificate_no: cert.certificate_no,
        company_name: cert.company_name,
        remaining,
        type: null,
        sent: false,
        recipients: [],
      });
      continue;
    }

    // Check if already sent
    try {
      const alreadySent = await hasNotificationBeenSent(cert.id, type, currentTermStart(cert));
      if (alreadySent) {
        result.details.push({
          certificate_no: cert.certificate_no,
          company_name: cert.company_name,
          remaining,
          type,
          sent: false,
          recipients: [],
          error: "Already sent",
        });
        continue;
      }
    } catch (e: any) {
      // If table missing, continue
      console.warn(`[ExpiryChecker] hasNotification check failed for ${cert.certificate_no}:`, e.message);
    }

    // Người nhận: email khách trên hồ sơ → danh bạ doanh nghiệp → email admin
    const recipients = await certificateRecipients(cert, companyMap);

    // If still no recipient, skip but log
    if (recipients.length === 0) {
      result.errors++;
      result.details.push({
        certificate_no: cert.certificate_no,
        company_name: cert.company_name,
        remaining,
        type,
        sent: false,
        recipients: [],
        error: "No recipient email",
      });
      continue;
    }

    const warningData = warningDataFor(cert, remaining, cert.renewal_count);

    try {
      const sendResult = await sendExpiryWarningEmail(warningData, type, recipients);
      if (sendResult.success) {
        result.warningsSent++;
        // Record notification
        try {
          await createExpiryNotification({
            certificate_id: cert.id,
            company_name: cert.company_name,
            notification_type: type,
            recipient_email: recipients.join(", "),
            status: "sent",
          });
        } catch (e: any) {
          console.warn(`[ExpiryChecker] Failed to record notification for ${cert.certificate_no}:`, e.message);
        }
        result.details.push({
          certificate_no: cert.certificate_no,
          company_name: cert.company_name,
          remaining,
          type,
          sent: true,
          recipients,
        });
      } else {
        result.errors++;
        try {
          await createExpiryNotification({
            certificate_id: cert.id,
            company_name: cert.company_name,
            notification_type: type,
            recipient_email: recipients.join(", "),
            status: "failed",
          });
        } catch {}
        result.details.push({
          certificate_no: cert.certificate_no,
          company_name: cert.company_name,
          remaining,
          type,
          sent: false,
          recipients,
          error: sendResult.error,
        });
      }
    } catch (err: any) {
      result.errors++;
      result.details.push({
        certificate_no: cert.certificate_no,
        company_name: cert.company_name,
        remaining,
        type,
        sent: false,
        recipients,
        error: err.message,
      });
    }
  }

  return result;
}

/**
 * Get certificates that need attention (expiring soon or expired)
 */
export async function getExpiringCertificates(daysThreshold = 90) {
  const certificates = await listCertificates();
  return certificates
    .filter((c) => c.status !== "draft")
    .map((c) => ({
      ...c,
      remaining_days: remainingDays(c.expires_at),
    }))
    .filter((c) => c.remaining_days <= daysThreshold)
    .sort((a, b) => a.remaining_days - b.remaining_days);
}
