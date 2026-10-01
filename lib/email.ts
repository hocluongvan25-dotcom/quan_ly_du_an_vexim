import nodemailer from "nodemailer";
import { verifyUrlFor } from "./site-url";

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
  renewal_count?: number;
};

export type NotificationType = "90_days" | "60_days" | "30_days" | "14_days" | "7_days" | "3_days" | "1_day" | "expired" | "renewal_reminder";

/**
 * Nhãn trạng thái dùng trong email và danh sách thông báo.
 * Văn phong trung tính, không thúc ép ("cần gia hạn gấp", "khẩn cấp") — đây là
 * thông báo tự động của hệ thống quản lý hồ sơ, không phải email bán hàng.
 */
export function getNotificationLabel(type: NotificationType): { vi: string; en: string; urgency: "low" | "medium" | "high" | "critical" } {
  switch (type) {
    case "90_days": return { vi: "Còn 90 ngày", en: "90 days remaining", urgency: "low" };
    case "60_days": return { vi: "Còn 60 ngày", en: "60 days remaining", urgency: "low" };
    case "30_days": return { vi: "Còn 30 ngày", en: "30 days remaining", urgency: "medium" };
    case "14_days": return { vi: "Còn 14 ngày", en: "14 days remaining", urgency: "medium" };
    case "7_days": return { vi: "Còn 7 ngày", en: "7 days remaining", urgency: "high" };
    case "3_days": return { vi: "Còn 3 ngày", en: "3 days remaining", urgency: "high" };
    case "1_day": return { vi: "Còn 1 ngày", en: "1 day remaining", urgency: "high" };
    case "expired": return { vi: "Đã hết hạn", en: "Expired", urgency: "high" };
    case "renewal_reminder": return { vi: "Nhắc gia hạn", en: "Renewal reminder", urgency: "medium" };
    default: return { vi: "Thông báo tình trạng hồ sơ", en: "Registration status notice", urgency: "medium" };
  }
}

/** "Đăng ký FDA" / "Đăng ký GACC" — FDA facility registration không phải "chứng nhận". */
export function registrationSubject(standard: "FDA" | "GACC") {
  return standard === "FDA" ? "Đăng ký FDA" : "Đăng ký GACC";
}

/** Tên trường số đăng ký theo đúng thuật ngữ của từng cơ quan. */
export function registrationNoLabel(standard: "FDA" | "GACC") {
  return standard === "FDA" ? "FDA Registration No." : "GACC Registration No.";
}

function formatEmailDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (iso || "—");
}

/** Dòng trạng thái duy nhất, dùng chung cho tiêu đề, chip và bảng thông tin. */
export function registrationStatusLine(data: ExpiryWarningData, isExpired: boolean) {
  const remaining = Math.max(0, Math.round(data.remaining_days || 0));
  if (isExpired) return "Đã hết hiệu lực";
  if (remaining <= 0) return "Hết hiệu lực hôm nay";
  return `Còn ${remaining} ngày đến ngày hết hạn`;
}

export function buildExpiryWarningEmail(data: ExpiryWarningData, type: NotificationType): { subject: string; html: string; text: string } {
  const isExpired = type === "expired" || data.remaining_days < 0;
  const remaining = Math.max(0, Math.round(data.remaining_days || 0));
  const onExpiryDay = !isExpired && remaining <= 0;
  const noun = registrationSubject(data.standard);
  const statusLine = registrationStatusLine(data, isExpired);
  const registryName = data.standard === "FDA"
    ? "U.S. Food and Drug Administration (FDA)"
    : "General Administration of Customs of China (GACC)";
  const verifyUrl = verifyUrlFor(data.public_code);
  const expiryDate = formatEmailDate(data.expires_at);

  // Tiêu đề ngắn, factual: [Còn 7 ngày] Đăng ký FDA của <công ty> sắp hết hạn
  const subject = isExpired
    ? `[Đã hết hạn] ${noun} của ${data.company_name} đã hết hiệu lực ngày ${expiryDate}`
    : onExpiryDay
      ? `[Hết hạn hôm nay] ${noun} của ${data.company_name} hết hiệu lực hôm nay`
      : `[Còn ${remaining} ngày] ${noun} của ${data.company_name} sắp hết hạn`;

  const summary = isExpired
    ? `${noun} của ${data.company_name} đã hết hiệu lực vào ngày ${expiryDate}. Nếu doanh nghiệp tiếp tục xuất khẩu sản phẩm thuộc phạm vi đăng ký, vui lòng liên hệ Vexim để kiểm tra hồ sơ và thủ tục gia hạn.`
    : onExpiryDay
      ? `${noun} của ${data.company_name} hết hiệu lực trong hôm nay (${expiryDate}). Nếu doanh nghiệp tiếp tục xuất khẩu sản phẩm thuộc phạm vi đăng ký, vui lòng liên hệ Vexim để kiểm tra thủ tục gia hạn trước khi hết ngày.`
      : `${noun} của ${data.company_name} dự kiến hết hạn vào ngày ${expiryDate}. Nếu doanh nghiệp tiếp tục xuất khẩu sản phẩm thuộc phạm vi đăng ký, vui lòng chuẩn bị và kiểm tra thủ tục gia hạn trước ngày hết hạn.`;

  const accent = isExpired ? "#B91C1C" : "#0B1837";
  const statusBg = isExpired ? "#FEF2F2" : "#F8F4EC";
  const statusBorder = isExpired ? "#F3D4D4" : "#E7D4A6";

  const row = (label: string, value: string, mono = false) => `
        <tr>
          <td style="padding:9px 0; color:#64748b; width:210px; vertical-align:top; border-bottom:1px solid #eef2f7">${label}</td>
          <td style="padding:9px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #eef2f7${mono ? "; font-family:'SFMono-Regular',Consolas,monospace" : ""}">${value}</td>
        </tr>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:${accent}; padding:20px 24px; color:#ffffff">
      <div style="font-size:11px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.85">VEXIM GLOBAL · HỆ THỐNG QUẢN LÝ HỒ SƠ FDA/GACC</div>
      <div style="margin-top:10px; font-size:20px; font-weight:800">Thông báo tình trạng đăng ký</div>
      <div style="margin-top:4px; font-size:13px; opacity:0.9">${data.company_name} · ${noun} · ${data.certificate_no}</div>
    </div>

    <div style="padding:24px">
      <div style="background:${statusBg}; border:1px solid ${statusBorder}; border-radius:12px; padding:14px 16px; margin-bottom:20px">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:${accent}">${statusLine}</div>
      </div>

      <p style="margin:0 0 22px; font-size:14px; line-height:1.65; color:#334155">${summary}</p>

      <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin-bottom:6px">Thông tin hồ sơ</div>
      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <tbody>
          ${row("Doanh nghiệp", data.company_name)}
          ${row("Mã hồ sơ Vexim", data.certificate_no, true)}
          ${row(registrationNoLabel(data.standard), data.registration_code || "—", true)}
          ${data.duns_code ? row("D-U-N-S", data.duns_code) : ""}
          ${data.us_agent ? row("U.S. Agent", data.us_agent) : ""}
          ${row("Ngày đăng ký", formatEmailDate(data.registered_at))}
          ${row("Ngày hết hạn", expiryDate)}
          ${row("Kỳ hạn đăng ký", `${data.validity_years} năm`)}
          ${row("Số ngày còn lại", `${remaining} ngày`)}
          ${row("Cơ quan đăng ký", registryName)}
          ${row("Kiểm tra thông tin hồ sơ", `<a href="${verifyUrl}" style="color:#0f766e; word-break:break-all">${verifyUrl}</a>`)}
        </tbody>
      </table>

      <div style="margin-top:22px; padding:16px; background:#F8FAFC; border:1px solid #e2e8f0; border-radius:12px">
        <div style="font-size:13px; font-weight:700; color:#0f172a">Nếu cần gia hạn</div>
        <p style="margin:8px 0 0; font-size:13px; line-height:1.6; color:#334155">
          Vui lòng liên hệ Vexim để kiểm tra hồ sơ hiện tại, xác nhận thông tin đăng ký và báo phí gia hạn.
        </p>
        <p style="margin:10px 0 0; font-size:13px; color:#334155">
          Hotline: <a href="tel:0373685634" style="color:#0f172a; font-weight:700; text-decoration:none">0373 685 634</a>
          · Email: <a href="mailto:${FROM_EMAIL}" style="color:#0f172a; font-weight:700; text-decoration:none">${FROM_EMAIL}</a>
        </p>
      </div>

      <div style="margin-top:20px">
        <a href="${verifyUrl}" style="display:inline-block; background:#0B1837; color:#ffffff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Kiểm tra thông tin hồ sơ</a>
      </div>

      <div style="margin-top:22px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; line-height:1.7; color:#94a3b8">
        Email được gửi tự động từ hệ thống quản lý hồ sơ FDA/GACC của Vexim Global.<br/>
        Thời gian gửi: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}<br/>
        Mã hồ sơ: ${data.certificate_no} · Mã tra cứu: ${data.public_code}<br/>
        VEXIM GLOBAL CO., LTD · No. 25/6/51 Ngoa Long, Tay Tuu, Bac Tu Liem, Hanoi<br/>
        Hotline: 0373 685 634 · Email: ${FROM_EMAIL} · Website: www.veximglobal.com
      </div>
    </div>
  </div>
  `;

  const text = `${subject}

${summary}

THÔNG TIN HỒ SƠ
Doanh nghiệp: ${data.company_name}
Mã hồ sơ Vexim: ${data.certificate_no}
${registrationNoLabel(data.standard)}: ${data.registration_code || "—"}
${data.duns_code ? `D-U-N-S: ${data.duns_code}\n` : ""}${data.us_agent ? `U.S. Agent: ${data.us_agent}\n` : ""}Ngày đăng ký: ${formatEmailDate(data.registered_at)}
Ngày hết hạn: ${expiryDate}
Kỳ hạn đăng ký: ${data.validity_years} năm
Số ngày còn lại: ${remaining} ngày
Cơ quan đăng ký: ${registryName}
Kiểm tra thông tin hồ sơ: ${verifyUrl}

NẾU CẦN GIA HẠN
Vui lòng liên hệ Vexim để kiểm tra hồ sơ hiện tại, xác nhận thông tin đăng ký và báo phí gia hạn.
Hotline: 0373 685 634 · Email: ${FROM_EMAIL}

Email được gửi tự động từ hệ thống quản lý hồ sơ FDA/GACC của Vexim Global.
Mã hồ sơ: ${data.certificate_no} · Mã tra cứu: ${data.public_code}
VEXIM GLOBAL CO., LTD · Hotline: 0373 685 634 · ${FROM_EMAIL} · www.veximglobal.com
`;

  return { subject, html, text };
}


/** Email xác nhận gia hạn — cùng văn phong thông báo tự động với email cảnh báo hết hạn. */
export function buildRenewalConfirmationEmail(data: ExpiryWarningData): { subject: string; html: string; text: string } {
  const noun = registrationSubject(data.standard);
  const registryName = data.standard === "FDA"
    ? "U.S. Food and Drug Administration (FDA)"
    : "General Administration of Customs of China (GACC)";
  const verifyUrl = verifyUrlFor(data.public_code);
  const expiryDate = formatEmailDate(data.expires_at);
  const renewals = Math.max(1, Math.round(data.renewal_count || 1));
  const subject = `[Đã gia hạn] ${noun} của ${data.company_name} có hiệu lực đến ${expiryDate}`;

  const row = (label: string, value: string, mono = false) => `
        <tr>
          <td style="padding:9px 0; color:#64748b; width:210px; vertical-align:top; border-bottom:1px solid #eef2f7">${label}</td>
          <td style="padding:9px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #eef2f7${mono ? "; font-family:'SFMono-Regular',Consolas,monospace" : ""}">${value}</td>
        </tr>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:#0B1837; padding:20px 24px; color:#ffffff">
      <div style="font-size:11px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.85">VEXIM GLOBAL · HỆ THỐNG QUẢN LÝ HỒ SƠ FDA/GACC</div>
      <div style="margin-top:10px; font-size:20px; font-weight:800">Xác nhận gia hạn đăng ký</div>
      <div style="margin-top:4px; font-size:13px; opacity:0.9">${data.company_name} · ${noun} · ${data.certificate_no}</div>
    </div>

    <div style="padding:24px">
      <div style="background:#F8F4EC; border:1px solid #E7D4A6; border-radius:12px; padding:14px 16px; margin-bottom:20px">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#0B1837">Đã gia hạn · Hiệu lực đến ${expiryDate}</div>
      </div>

      <p style="margin:0 0 22px; font-size:14px; line-height:1.65; color:#334155">
        ${noun} của ${data.company_name} đã được gia hạn và ghi nhận trong hệ thống quản lý hồ sơ của Vexim.
        Kỳ hạn mới có hiệu lực đến ngày ${expiryDate}. Thông tin dưới đây là bản ghi mới nhất của hồ sơ.
      </p>

      <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin-bottom:6px">Thông tin hồ sơ</div>
      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <tbody>
          ${row("Doanh nghiệp", data.company_name)}
          ${row("Mã hồ sơ Vexim", data.certificate_no, true)}
          ${row(registrationNoLabel(data.standard), data.registration_code || "—", true)}
          ${data.duns_code ? row("D-U-N-S", data.duns_code) : ""}
          ${data.us_agent ? row("U.S. Agent", data.us_agent) : ""}
          ${row("Ngày đăng ký", formatEmailDate(data.registered_at))}
          ${row("Ngày hết hạn (mới)", expiryDate)}
          ${row("Kỳ hạn đăng ký", `${data.validity_years} năm`)}
          ${row("Số lần gia hạn", `${renewals} lần`)}
          ${row("Cơ quan đăng ký", registryName)}
          ${row("Kiểm tra thông tin hồ sơ", `<a href="${verifyUrl}" style="color:#0f766e; word-break:break-all">${verifyUrl}</a>`)}
        </tbody>
      </table>

      <div style="margin-top:22px; padding:16px; background:#F8FAFC; border:1px solid #e2e8f0; border-radius:12px">
        <div style="font-size:13px; font-weight:700; color:#0f172a">Nếu cần hỗ trợ</div>
        <p style="margin:8px 0 0; font-size:13px; line-height:1.6; color:#334155">
          Vui lòng liên hệ Vexim nếu cần kiểm tra hoặc cập nhật thông tin đăng ký của doanh nghiệp.
        </p>
        <p style="margin:10px 0 0; font-size:13px; color:#334155">
          Hotline: <a href="tel:0373685634" style="color:#0f172a; font-weight:700; text-decoration:none">0373 685 634</a>
          · Email: <a href="mailto:${FROM_EMAIL}" style="color:#0f172a; font-weight:700; text-decoration:none">${FROM_EMAIL}</a>
        </p>
      </div>

      <div style="margin-top:20px">
        <a href="${verifyUrl}" style="display:inline-block; background:#0B1837; color:#ffffff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Kiểm tra thông tin hồ sơ</a>
      </div>

      <div style="margin-top:22px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; line-height:1.7; color:#94a3b8">
        Email được gửi tự động từ hệ thống quản lý hồ sơ FDA/GACC của Vexim Global.<br/>
        Thời gian gửi: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}<br/>
        Mã hồ sơ: ${data.certificate_no} · Mã tra cứu: ${data.public_code}<br/>
        VEXIM GLOBAL CO., LTD · No. 25/6/51 Ngoa Long, Tay Tuu, Bac Tu Liem, Hanoi<br/>
        Hotline: 0373 685 634 · Email: ${FROM_EMAIL} · Website: www.veximglobal.com
      </div>
    </div>
  </div>
  `;

  const text = `${subject}

${noun} của ${data.company_name} đã được gia hạn và ghi nhận trong hệ thống quản lý hồ sơ của Vexim.
Kỳ hạn mới có hiệu lực đến ngày ${expiryDate}.

THÔNG TIN HỒ SƠ
Doanh nghiệp: ${data.company_name}
Mã hồ sơ Vexim: ${data.certificate_no}
${registrationNoLabel(data.standard)}: ${data.registration_code || "—"}
${data.duns_code ? `D-U-N-S: ${data.duns_code}\n` : ""}${data.us_agent ? `U.S. Agent: ${data.us_agent}\n` : ""}Ngày đăng ký: ${formatEmailDate(data.registered_at)}
Ngày hết hạn (mới): ${expiryDate}
Kỳ hạn đăng ký: ${data.validity_years} năm
Số lần gia hạn: ${renewals} lần
Cơ quan đăng ký: ${registryName}
Kiểm tra thông tin hồ sơ: ${verifyUrl}

NẾU CẦN HỖ TRỢ
Vui lòng liên hệ Vexim nếu cần kiểm tra hoặc cập nhật thông tin đăng ký của doanh nghiệp.
Hotline: 0373 685 634 · Email: ${FROM_EMAIL}

Email được gửi tự động từ hệ thống quản lý hồ sơ FDA/GACC của Vexim Global.
Mã hồ sơ: ${data.certificate_no} · Mã tra cứu: ${data.public_code}
VEXIM GLOBAL CO., LTD · Hotline: 0373 685 634 · ${FROM_EMAIL} · www.veximglobal.com
`;

  return { subject, html, text };
}

export async function sendRenewalConfirmationEmail(data: ExpiryWarningData, recipientEmails: string[]) {
  const emailContent = buildRenewalConfirmationEmail(data);
  const validEmails = recipientEmails.filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (validEmails.length === 0) {
    console.warn("[Email] No valid recipient for renewal confirmation", data.certificate_no);
    return { success: false, error: "No valid recipients" };
  }
  return sendEmail({
    to: validEmails,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
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

