import nodemailer from "nodemailer";

// Zoho Mail SMTP configuration for contact@veximglobal.com
// Required env vars:
// ZOHO_SMTP_HOST=smtp.zoho.com (or smtppro.zoho.com for US DC, smtp.zoho.eu for EU)
// ZOHO_SMTP_PORT=465 (SSL) or 587 (TLS)
// ZOHO_SMTP_USER=contact@veximglobal.com
// ZOHO_SMTP_PASS=your app password (Zoho > My Account > Security > App Passwords)
// ZOHO_FROM_NAME=Vexim Global
// ZOHO_FROM_EMAIL=contact@veximglobal.com
// ZOHO_TO_EMAIL=contact@veximglobal.com (where leads are sent)

const SMTP_HOST = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = parseInt(process.env.ZOHO_SMTP_PORT || "465", 10);
const SMTP_USER = process.env.ZOHO_SMTP_USER || process.env.ZOHO_FROM_EMAIL || "contact@veximglobal.com";
const SMTP_PASS = process.env.ZOHO_SMTP_PASS || "";
const FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || "contact@veximglobal.com";
const FROM_NAME = process.env.ZOHO_FROM_NAME || "Vexim Global";
const TO_EMAIL = process.env.ZOHO_TO_EMAIL || "contact@veximglobal.com";

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_PASS) {
    console.warn("[Email] ZOHO_SMTP_PASS not set, email sending disabled (mock mode)");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Zoho specific
    tls: {
      ciphers: "SSLv3",
    },
  });

  return transporter;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; mocked?: boolean }> {
  const trans = getTransporter();

  if (!trans) {
    // Mock mode - log to console
    console.log("[Email MOCK] Would send email:", {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
    });
    return { success: true, mocked: true, messageId: "mock-" + Date.now() };
  }

  try {
    const info = await trans.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });

    console.log("[Email] Sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Send failed:", err);
    return { success: false, error: err.message || String(err) };
  }
}

// Verify SMTP connection (useful for health check)
export async function verifyEmailConnection(): Promise<{ ok: boolean; error?: string }> {
  const trans = getTransporter();
  if (!trans) return { ok: false, error: "SMTP not configured (missing ZOHO_SMTP_PASS)" };
  try {
    await trans.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// --- Lead notification templates ---

export type LeadData = {
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  company_name?: string;
  certificate_no?: string;
  public_code?: string;
  email?: string;
  message?: string;
  source_url?: string;
  ip?: string;
};

export function buildLeadAdminEmail(lead: LeadData): { subject: string; html: string; text: string } {
  const serviceLabel = lead.service_type === "sales" ? "Phòng Sale Xuất Khẩu Mỹ" : "Vận Hành Amazon US";
  const serviceLink = lead.service_type === "sales" ? "https://veximtrade.com" : "https://veximops.com";
  const subject = `[Vexim Lead] ${serviceLabel} - ${lead.name} - ${lead.phone}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:linear-gradient(135deg,#059669,#0f766e,#0f172a); padding:20px 24px; color:#fff">
      <div style="font-size:12px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.8">VEXIM GLOBAL - NEW LEAD</div>
      <div style="margin-top:8px; font-size:20px; font-weight:800">Khách đăng ký tư vấn: ${serviceLabel}</div>
    </div>
    <div style="padding:24px">
      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <tr><td style="padding:8px 0; color:#64748b; width:140px">Dịch vụ</td><td style="padding:8px 0; font-weight:700"><a href="${serviceLink}" style="color:#0f172a">${serviceLabel}</a> (${lead.service_type})</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Họ tên / Nhà máy</td><td style="padding:8px 0; font-weight:600">${lead.name}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">SĐT / Zalo</td><td style="padding:8px 0; font-weight:700"><a href="tel:${lead.phone}" style="color:#059669">${lead.phone}</a></td></tr>
        ${lead.email ? `<tr><td style="padding:8px 0; color:#64748b">Email</td><td style="padding:8px 0">${lead.email}</td></tr>` : ""}
        ${lead.company_name ? `<tr><td style="padding:8px 0; color:#64748b">Công ty (từ cert)</td><td style="padding:8px 0">${lead.company_name}</td></tr>` : ""}
        ${lead.certificate_no ? `<tr><td style="padding:8px 0; color:#64748b">Certificate No</td><td style="padding:8px 0; font-family:monospace">${lead.certificate_no}</td></tr>` : ""}
        ${lead.public_code ? `<tr><td style="padding:8px 0; color:#64748b">Public Code</td><td style="padding:8px 0; font-family:monospace">${lead.public_code}</td></tr>` : ""}
        ${lead.source_url ? `<tr><td style="padding:8px 0; color:#64748b">Nguồn</td><td style="padding:8px 0"><a href="${lead.source_url}" style="color:#0f766e; word-break:break-all">${lead.source_url}</a></td></tr>` : ""}
        ${lead.ip ? `<tr><td style="padding:8px 0; color:#64748b">IP</td><td style="padding:8px 0; font-family:monospace; font-size:12px">${lead.ip}</td></tr>` : ""}
      </table>
      ${lead.message ? `<div style="margin-top:16px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; font-size:13px"><b>Ghi chú:</b> ${lead.message}</div>` : ""}
      <div style="margin-top:20px; display:flex; gap:8px">
        <a href="tel:${lead.phone}" style="display:inline-block; background:#0f172a; color:#fff; padding:10px 16px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Gọi ngay</a>
        <a href="https://zalo.me/${lead.phone.replace(/\D/g,'')}" style="display:inline-block; background:#0084ff; color:#fff; padding:10px 16px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Chat Zalo</a>
      </div>
      <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8">Lead được tạo lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} - Hệ thống tự động Vexim Global<br/>Truy cập dashboard: /dashboard/leads để xem chi tiết</div>
    </div>
  </div>
  `;

  const text = `New Lead - ${serviceLabel}\nName: ${lead.name}\nPhone: ${lead.phone}\nCompany: ${lead.company_name || ""}\nCertificate: ${lead.certificate_no || ""}\nSource: ${lead.source_url || ""}\n`;

  return { subject, html, text };
}

export function buildLeadAutoReply(lead: LeadData): { subject: string; html: string; text: string } | null {
  if (!lead.email) return null; // No email to reply
  const serviceLabel = lead.service_type === "sales" ? "Phòng Sale Xuất Khẩu Mỹ" : "Vận Hành Gian Hàng Amazon US";
  const subject = `[Vexim Global] Đã nhận yêu cầu tư vấn ${serviceLabel}`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:600px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:#0f172a; padding:20px 24px; color:#fff">
      <div style="font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#94a3b8">VEXIM GLOBAL CO., LTD</div>
      <div style="margin-top:6px; font-size:18px; font-weight:800">Cảm ơn bạn đã đăng ký tư vấn</div>
    </div>
    <div style="padding:24px; font-size:14px; line-height:1.6; color:#334155">
      <p>Chào <b>${lead.name}</b>,</p>
      <p>Vexim Global đã nhận được yêu cầu tư vấn dịch vụ <b>${serviceLabel}</b> của bạn.</p>
      <p>Đội ngũ chuyên gia xuất khẩu Mỹ sẽ liên hệ qua SĐT/Zalo <b>${lead.phone}</b> trong vòng 24h làm việc.</p>
      <div style="margin:16px 0; padding:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px">
        <div style="font-size:12px; font-weight:700; color:#166534">Bạn đã đăng ký:</div>
        <div style="margin-top:4px">${serviceLabel} - Kết nối buyer B2B & vận hành Amazon US</div>
      </div>
      <p>Trong lúc chờ, bạn có thể tham khảo:</p>
      <ul style="padding-left:18px">
        <li><a href="https://veximtrade.com" style="color:#0f766e; font-weight:600">veximtrade.com</a> - Phòng sale xuất khẩu Mỹ</li>
        <li><a href="https://veximops.com" style="color:#0f172a; font-weight:600">veximops.com</a> - Vận hành Amazon US</li>
      </ul>
      <p style="margin-top:16px">Trân trọng,<br/><b>Vexim Global Team</b><br/>Hotline: 0373 685 634 | contact@veximglobal.com</p>
      <div style="margin-top:20px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8">Email tự động, vui lòng không reply. Liên hệ trực tiếp contact@veximglobal.com nếu cần hỗ trợ.</div>
    </div>
  </div>
  `;

  return { subject, html, text: `Cảm ơn ${lead.name} đã đăng ký tư vấn ${serviceLabel}. Chúng tôi sẽ liên hệ ${lead.phone} trong 24h.` };
}

export async function sendLeadNotification(lead: LeadData) {
  const adminEmail = buildLeadAdminEmail(lead);
  
  // Send to admin (contact@veximglobal.com)
  const adminResult = await sendEmail({
    to: TO_EMAIL,
    subject: adminEmail.subject,
    html: adminEmail.html,
    text: adminEmail.text,
    replyTo: lead.email || undefined,
  });

  // Auto-reply to customer if email provided
  let autoReplyResult = null;
  const autoReply = buildLeadAutoReply(lead);
  if (autoReply && lead.email) {
    autoReplyResult = await sendEmail({
      to: lead.email,
      subject: autoReply.subject,
      html: autoReply.html,
      text: autoReply.text,
    });
  }

  return { adminResult, autoReplyResult };
}

// --- Expiry Warning Email Templates ---

export type ExpiryWarningData = {
  certificate_no: string;
  company_name: string;
  standard: "FDA" | "GACC";
  registration_code: string;
  registered_at: string;
  expires_at: string;
  validity_years: number;
  remaining_days: number;
  public_code: string;
  recipient_email?: string;
  recipient_name?: string;
  duns_code?: string;
  us_agent?: string;
};

export type NotificationType = "90_days" | "60_days" | "30_days" | "14_days" | "7_days" | "3_days" | "1_day" | "expired" | "renewal_reminder";

export function getNotificationLabel(type: NotificationType): { vi: string; en: string; urgency: "low" | "medium" | "high" | "critical" } {
  switch (type) {
    case "90_days": return { vi: "Còn 90 ngày", en: "90 days remaining", urgency: "low" };
    case "60_days": return { vi: "Còn 60 ngày", en: "60 days remaining", urgency: "low" };
    case "30_days": return { vi: "Còn 30 ngày", en: "30 days remaining", urgency: "medium" };
    case "14_days": return { vi: "Còn 14 ngày", en: "14 days remaining", urgency: "medium" };
    case "7_days": return { vi: "Còn 7 ngày - Cần gia hạn gấp", en: "7 days - Urgent renewal", urgency: "high" };
    case "3_days": return { vi: "Còn 3 ngày - Khẩn cấp", en: "3 days - Critical", urgency: "critical" };
    case "1_day": return { vi: "Còn 1 ngày - Hết hạn hôm nay", en: "Expires today", urgency: "critical" };
    case "expired": return { vi: "Đã hết hạn", en: "Expired", urgency: "critical" };
    case "renewal_reminder": return { vi: "Nhắc gia hạn", en: "Renewal reminder", urgency: "medium" };
    default: return { vi: "Cảnh báo hết hạn", en: "Expiry warning", urgency: "medium" };
  }
}

export function buildExpiryWarningEmail(data: ExpiryWarningData, type: NotificationType): { subject: string; html: string; text: string } {
  const label = getNotificationLabel(type);
  const isExpired = type === "expired" || data.remaining_days < 0;
  const isCritical = label.urgency === "critical";
  const isHigh = label.urgency === "high";

  const standardLabel = data.standard === "FDA" ? "FDA Hoa Kỳ" : "GACC Trung Quốc";
  const verifyUrl = `https://verify.vexim.vn/verify/${data.public_code}`;

  const subject = isExpired
    ? `[KHẨN CẤP] Chứng nhận ${data.standard} ${data.certificate_no} của ${data.company_name} ĐÃ HẾT HẠN`
    : `[Cảnh báo ${label.vi}] Chứng nhận ${data.standard} ${data.certificate_no} - ${data.company_name} ${label.vi.toLowerCase()}`;

  const urgencyColor = isExpired ? "#dc2626" : isCritical ? "#ea580c" : isHigh ? "#d97706" : "#059669";
  const urgencyBg = isExpired ? "#fef2f2" : isCritical ? "#fff7ed" : isHigh ? "#fffbeb" : "#f0fdf4";
  const urgencyBorder = isExpired ? "#fecaca" : isCritical ? "#fed7aa" : isHigh ? "#fde68a" : "#bbf7d0";

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:${isExpired ? 'linear-gradient(135deg,#dc2626,#991b1b)' : isCritical ? 'linear-gradient(135deg,#ea580c,#9a3412)' : 'linear-gradient(135deg,#059669,#0f766e,#0f172a)'}; padding:20px 24px; color:#fff">
      <div style="font-size:11px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.9">VEXIM GLOBAL - CẢNH BÁO HẾT HẠN</div>
      <div style="margin-top:8px; font-size:20px; font-weight:800">${isExpired ? '⛔ Chứng nhận đã hết hạn' : `⚠️ ${label.vi}`}</div>
      <div style="margin-top:4px; font-size:13px; opacity:0.9">${data.company_name} · ${data.certificate_no} · ${standardLabel}</div>
    </div>
    <div style="padding:24px">
      <div style="background:${urgencyBg}; border:1px solid ${urgencyBorder}; border-radius:12px; padding:16px; margin-bottom:20px">
        <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:${urgencyColor}">${isExpired ? 'Đã hết hạn' : `Còn ${data.remaining_days} ngày`}</div>
        <div style="margin-top:6px; font-size:14px; color:#334155; line-height:1.5">
          ${isExpired
            ? `Chứng nhận <b>${data.certificate_no}</b> (${standardLabel}) của <b>${data.company_name}</b> đã hết hạn vào ngày <b>${data.expires_at}</b>. Vui lòng gia hạn ngay để tránh gián đoạn xuất khẩu.`
            : `Chứng nhận <b>${data.certificate_no}</b> (${standardLabel}) của <b>${data.company_name}</b> sẽ hết hạn vào ngày <b>${data.expires_at}</b> (còn <b>${data.remaining_days} ngày</b>). Vui lòng chuẩn bị gia hạn.`}
        </div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <tr><td style="padding:8px 0; color:#64748b; width:160px">Công ty</td><td style="padding:8px 0; font-weight:700">${data.company_name}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Số chứng nhận</td><td style="padding:8px 0; font-family:monospace; font-weight:600">${data.certificate_no}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Tiêu chuẩn</td><td style="padding:8px 0"><span style="background:${data.standard === 'FDA' ? '#dbeafe' : '#dcfce7'}; color:${data.standard === 'FDA' ? '#1e40af' : '#166534'}; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700">${data.standard}</span> ${standardLabel}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Mã đăng ký</td><td style="padding:8px 0; font-family:monospace">${data.registration_code}</td></tr>
        ${data.duns_code ? `<tr><td style="padding:8px 0; color:#64748b">DUNS</td><td style="padding:8px 0; font-family:monospace">${data.duns_code}</td></tr>` : ""}
        ${data.us_agent ? `<tr><td style="padding:8px 0; color:#64748b">US Agent</td><td style="padding:8px 0">${data.us_agent}</td></tr>` : ""}
        <tr><td style="padding:8px 0; color:#64748b">Ngày đăng ký</td><td style="padding:8px 0">${data.registered_at}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Ngày hết hạn</td><td style="padding:8px 0; font-weight:700; color:${urgencyColor}">${data.expires_at}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Kỳ hạn</td><td style="padding:8px 0">${data.validity_years} năm</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Còn lại</td><td style="padding:8px 0; font-weight:700">${data.remaining_days < 0 ? 0 : data.remaining_days} ngày</td></tr>
        <tr><td style="padding:8px 0; color:#64748b">Xác thực</td><td style="padding:8px 0"><a href="${verifyUrl}" style="color:#0f766e; word-break:break-all">${verifyUrl}</a></td></tr>
      </table>

      <div style="margin-top:24px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px">
        <div style="font-size:13px; font-weight:700; color:#0f172a">Hành động cần thiết:</div>
        <ul style="margin:8px 0 0 18px; padding:0; font-size:13px; line-height:1.6; color:#334155">
          ${isExpired
            ? `<li>Liên hệ Vexim ngay để gia hạn khẩn cấp, tránh bị FDA/GACC thu hồi mã</li><li>Chuẩn bị hồ sơ cập nhật nếu có thay đổi về công ty, sản phẩm</li><li>Không xuất khẩu lô hàng mới cho đến khi gia hạn xong</li>`
            : `<li>Liên hệ Vexim để được tư vấn gia hạn ${data.standard} (hiệu lực FDA 1-10 năm theo hợp đồng (thường 2 năm), GACC cố định 5 năm)</li><li>Chuẩn bị phí gia hạn và hồ sơ liên quan</li><li>Gia hạn sớm để được giá ưu đãi và tránh phí gấp</li>`}
        </ul>
      </div>

      <div style="margin-top:20px; display:flex; gap:8px; flex-wrap:wrap">
        <a href="tel:0373685634" style="display:inline-block; background:#0f172a; color:#fff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">📞 Gọi Vexim: 0373 685 634</a>
        <a href="${verifyUrl}" style="display:inline-block; background:#fff; color:#0f172a; border:1px solid #e2e8f0; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">🔍 Xác thực chứng nhận</a>
      </div>

      <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8">
        Email tự động từ hệ thống quản lý FDA/GACC Vexim Global<br/>
        Gửi lúc ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Mã: ${data.public_code}<br/>
        VEXIM GLOBAL CO., LTD · No. 25/6/51 Ngoa Long, Tay Tuu, Bac Tu Liem, Hanoi<br/>
        Hotline: 0373 685 634 · Email: contact@veximglobal.com · Website: www.veximglobal.com
      </div>
    </div>
  </div>
  `;

  const text = `${isExpired ? 'HET HAN' : label.vi} - ${data.certificate_no} - ${data.company_name}\nStandard: ${data.standard}\nRegistration: ${data.registration_code}\nRegistered: ${data.registered_at}\nExpires: ${data.expires_at}\nRemaining: ${data.remaining_days} days\nVerify: ${verifyUrl}\n`;

  return { subject, html, text };
}

export async function sendExpiryWarningEmail(data: ExpiryWarningData, type: NotificationType, recipientEmails: string[]) {
  const emailContent = buildExpiryWarningEmail(data, type);
  
  // Filter valid emails
  const validEmails = recipientEmails.filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (validEmails.length === 0) {
    console.warn("[Email] No valid recipient for expiry warning", data.certificate_no);
    return { success: false, error: "No valid recipients" };
  }

  const result = await sendEmail({
    to: validEmails,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  return result;
}

