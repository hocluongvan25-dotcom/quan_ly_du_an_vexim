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
