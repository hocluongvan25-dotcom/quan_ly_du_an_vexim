import nodemailer from "nodemailer";
import { verifyUrlFor } from "./site-url";
import { EXPIRY_STAGE_PRESENTATION, type NotificationType } from "./expiry-notice";
export type { NotificationType } from "./expiry-notice";

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

/**
 * Nhãn trạng thái và màu dùng chung cho email + giao diện quản lý.
 * Màu thay đổi theo từng mốc, nhưng nội dung vẫn nói rõ ngày cụ thể để không phụ thuộc vào màu sắc.
 */
export function getNotificationLabel(type: NotificationType): {
  vi: string;
  en: string;
  urgency: "low" | "medium" | "high" | "critical" | "complete";
} {
  const stage = EXPIRY_STAGE_PRESENTATION[type];
  return { vi: stage.labelVi, en: stage.labelEn, urgency: stage.urgency };
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

const FDA_REGISTRATION_GUIDANCE_URL = "https://www.fda.gov/food/hfp-constituent-updates/fda-reminds-food-facilities-biennial-renewal-requirements";
const FDA_AGENT_GUIDANCE_URL = "https://www.fda.gov/files/food/published/Questions-and-Answers-Regarding-Food-Facility-Registration-(Seventh-Edition).pdf";

/** Hướng xử lý tăng dần theo mốc, không dùng ngôn từ hù dọa hoặc cam kết kết quả. */
function expiryNextStep(type: NotificationType, isExpired: boolean, standard: "FDA" | "GACC") {
  const officialSystem = standard === "FDA" ? "FDA Industry Systems" : "hệ thống đăng ký chính thức của cơ quan quản lý";
  if (isExpired) {
    return `Trước khi bố trí lô hàng tiếp theo, hãy xác minh trạng thái hiện tại trên ${officialSystem} và liên hệ Vexim để được đối chiếu hồ sơ, hướng xử lý tiếp theo.`;
  }
  if (type === "14_days" || type === "7_days" || type === "3_days" || type === "1_day") {
    return `Ưu tiên xác minh trạng thái đăng ký chính thức trên ${officialSystem} ngay, đặc biệt nếu doanh nghiệp sắp xếp lô hàng. Liên hệ Vexim để đối chiếu hồ sơ và thời gian xử lý trước khi chốt lịch giao hàng.`;
  }
  if (type === "30_days") {
    return `Đề nghị doanh nghiệp xác nhận tình trạng hồ sơ chính thức trên ${officialSystem}, rà soát thay đổi về cơ sở/thông tin đăng ký và thống nhất kế hoạch với Vexim trong thời gian sớm.`;
  }
  if (type === "60_days") {
    return `Đây là thời điểm phù hợp để đối chiếu thông tin cơ sở, mã đăng ký và các thay đổi cần cập nhật; vui lòng xác nhận chu kỳ chính thức trên ${officialSystem} cùng Vexim.`;
  }
  return `Vui lòng kiểm tra thông tin doanh nghiệp, địa chỉ cơ sở và mã đăng ký đang lưu tại Vexim; xác nhận mốc gia hạn chính thức trên ${officialSystem} để chủ động lập kế hoạch.`;
}

function renewalRisk(data: ExpiryWarningData) {
  if (data.standard === "FDA") {
    return {
      title: "Rủi ro nếu đăng ký FDA chính thức không được duy trì",
      impact: "Với cơ sở thực phẩm nước ngoài thuộc diện phải đăng ký, nếu đăng ký FDA chính thức bị hết hạn do không gia hạn theo yêu cầu, FDA xem cơ sở là chưa đăng ký. Thực phẩm từ cơ sở đó đưa vào Hoa Kỳ có thể bị giữ tại cửa khẩu hoặc cơ sở bảo đảm cho đến khi đăng ký hợp lệ. Cơ sở nước ngoài cũng phải duy trì một U.S. Agent đã đồng ý đảm nhiệm vai trò này; nếu không có agent hợp lệ, FDA có thể giữ lô hàng cho đến khi hồ sơ được cập nhật. Tùy hồ sơ và quyết định của FDA, việc này có thể làm chậm thông quan/giao hàng và phát sinh chi phí logistics.",
      clarification: `Mốc ngày trong email là kỳ hạn dịch vụ/hồ sơ Vexim đang theo dõi, không phải trạng thái thời gian thực trên FDA Industry Systems. Hợp đồng dịch vụ hết hạn tự nó không xác nhận đăng ký FDA đã hết hạn; tuy nhiên, nếu ${data.us_agent ? `hồ sơ Vexim hiện ghi U.S. Agent là ${data.us_agent} và` : ""} dịch vụ sắp kết thúc bao gồm vai trò U.S. Agent, doanh nghiệp cần thống nhất phương án thay thế/cập nhật với FDA. Thay đổi thông tin bắt buộc cần được cập nhật trong 60 ngày. Food Facility Registration thuộc diện áp dụng gia hạn hai năm một lần, từ 1/10–31/12 của năm chẵn; FDA không thu phí đăng ký/gia hạn, còn phí Vexim (nếu có) là phí dịch vụ riêng theo hợp đồng. Hãy xác minh trạng thái chính thức và phạm vi dịch vụ với Vexim.`,
      sources: [
        { label: "FDA: chu kỳ gia hạn Food Facility Registration", url: FDA_REGISTRATION_GUIDANCE_URL },
        { label: "FDA: U.S. Agent và cập nhật đăng ký cơ sở nước ngoài", url: FDA_AGENT_GUIDANCE_URL },
      ],
    };
  }

  return {
    title: "Rủi ro nếu hồ sơ đăng ký chính thức không được duy trì",
    impact: "Nếu hồ sơ GACC chính thức hết hiệu lực hoặc thông tin cần cập nhật chưa được hoàn tất, doanh nghiệp có thể gặp vướng mắc khi sử dụng mã đăng ký cho lô hàng thuộc diện áp dụng; việc này có thể ảnh hưởng tiến độ khai báo, thông quan và giao hàng. Yêu cầu cụ thể phụ thuộc nhóm sản phẩm và trạng thái hồ sơ của cơ quan quản lý.",
    clarification: "Mốc ngày trong email là kỳ hạn dịch vụ/hồ sơ Vexim đang theo dõi; việc kết thúc dịch vụ Vexim không tự động thay đổi trạng thái đăng ký GACC chính thức. Hãy xác minh trên hệ thống đăng ký hiện hành và đối chiếu phạm vi sản phẩm với Vexim trước khi bố trí lô hàng.",
    sources: [],
  };
}

/** Dòng trạng thái mô tả mốc dịch vụ/hồ sơ Vexim, không khẳng định trạng thái pháp lý trên cổng FDA/GACC. */
export function registrationStatusLine(data: ExpiryWarningData, isExpired: boolean) {
  const remaining = Math.max(0, Math.round(data.remaining_days || 0));
  if (isExpired) return "Đã qua mốc hết hạn ghi nhận tại Vexim";
  if (remaining <= 0) return "Mốc hết hạn ghi nhận tại Vexim là hôm nay";
  return `Còn ${remaining} ngày đến mốc hết hạn ghi nhận tại Vexim`;
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
  const effectiveStage = isExpired ? "expired" : onExpiryDay ? "1_day" : type;
  const stage = EXPIRY_STAGE_PRESENTATION[effectiveStage];
  const stageLabel = onExpiryDay ? "Hết hạn hôm nay" : stage.labelVi;
  const risk = renewalRisk(data);
  const nextStep = expiryNextStep(effectiveStage, isExpired, data.standard);
  const remainingLabel = isExpired ? "Đã qua mốc" : remaining === 0 ? "Hôm nay (0 ngày)" : `${remaining} ngày`;

  // Nêu rõ đây là kỳ dịch vụ/hồ sơ Vexim, không suy diễn thành trạng thái chính thức trên FDA/GACC.
  const subject = isExpired
    ? `[Quá mốc dịch vụ Vexim] Hồ sơ theo dõi ${noun} của ${data.company_name} · ${expiryDate}`
    : onExpiryDay
      ? `[Dịch vụ Vexim đến hạn hôm nay] Hồ sơ ${noun} của ${data.company_name}`
      : `[Còn ${remaining} ngày] Dịch vụ Vexim theo dõi hồ sơ ${noun} của ${data.company_name} sắp kết thúc`;

  const summary = isExpired
    ? `Theo hồ sơ Vexim, mốc kết thúc dịch vụ theo dõi hồ sơ ${noun} của ${data.company_name} đã qua vào ngày ${expiryDate}. Vui lòng xác minh trạng thái đăng ký chính thức trước khi sắp xếp lô hàng tiếp theo.`
    : onExpiryDay
      ? `Theo hồ sơ Vexim, dịch vụ theo dõi hồ sơ ${noun} của ${data.company_name} đến mốc kết thúc ngày ${expiryDate} hôm nay. Đây không phải xác nhận tự động về trạng thái đăng ký chính thức trên cổng của cơ quan quản lý.`
      : `Theo hồ sơ Vexim, dịch vụ theo dõi hồ sơ ${noun} của ${data.company_name} dự kiến kết thúc vào ngày ${expiryDate}. Doanh nghiệp nên xác nhận trạng thái đăng ký chính thức và chủ động kế hoạch trước mốc này.`;

  const row = (label: string, value: string, mono = false) => `
        <tr>
          <td style="padding:9px 0; color:#64748b; width:210px; vertical-align:top; border-bottom:1px solid #eef2f7">${label}</td>
          <td style="padding:9px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #eef2f7${mono ? "; font-family:'SFMono-Regular',Consolas,monospace" : ""}">${value}</td>
        </tr>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:${stage.email.accent}; padding:20px 24px; color:#ffffff">
      <div style="font-size:11px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.92">VEXIM GLOBAL · HỆ THỐNG QUẢN LÝ HỒ SƠ FDA/GACC</div>
      <div style="margin-top:10px; font-size:20px; font-weight:800">Thông báo mốc dịch vụ/hồ sơ</div>
      <div style="margin-top:4px; font-size:13px; opacity:0.95">${data.company_name} · ${noun} · ${data.certificate_no}</div>
    </div>

    <div style="padding:24px">
      <div style="background:${stage.email.background}; border:1px solid ${stage.email.border}; border-left:5px solid ${stage.email.accent}; border-radius:12px; padding:14px 16px; margin-bottom:20px">
        <div style="font-size:12px; font-weight:800; letter-spacing:0.04em; color:${stage.email.accent}">${statusLine}</div>
        <div style="margin-top:6px; font-size:11px; font-weight:700; color:${stage.email.accent}">MỐC THÔNG BÁO: ${stageLabel.toLocaleUpperCase("vi-VN")}</div>
      </div>

      <p style="margin:0 0 18px; font-size:14px; line-height:1.65; color:#334155">${summary}</p>

      <div style="margin:0 0 22px; padding:16px; background:#FFFBEB; border:1px solid #FDE68A; border-left:5px solid ${stage.email.accent}; border-radius:12px">
        <div style="font-size:14px; font-weight:800; color:#78350F">${risk.title}</div>
        <p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:#451A03">${risk.impact}</p>
        <p style="margin:10px 0 0; font-size:12px; line-height:1.65; color:#57534E">${risk.clarification}</p>
        ${risk.sources.map((source) => `<p style="margin:10px 0 0; font-size:12px"><a href="${source.url}" style="color:#0f766e; font-weight:700">${source.label}</a></p>`).join("")}
      </div>

      <div style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin-bottom:6px">Thông tin hồ sơ Vexim đang theo dõi</div>
      <table style="width:100%; border-collapse:collapse; font-size:14px">
        <tbody>
          ${row("Doanh nghiệp", data.company_name)}
          ${row("Mã hồ sơ Vexim", data.certificate_no, true)}
          ${row(registrationNoLabel(data.standard), data.registration_code || "—", true)}
          ${data.duns_code ? row("D-U-N-S", data.duns_code) : ""}
          ${data.us_agent ? row("U.S. Agent", data.us_agent) : ""}
          ${row("Ngày đăng ký ghi nhận", formatEmailDate(data.registered_at))}
          ${row("Mốc kết thúc kỳ dịch vụ (Vexim)", expiryDate)}
          ${row("Kỳ hạn dịch vụ/hồ sơ Vexim", `${data.validity_years} năm`)}
          ${row("Thời gian đến mốc Vexim ghi nhận", remainingLabel)}
          ${row("Cơ quan quản lý", registryName)}
          ${row("Hồ sơ trên hệ thống Vexim", `<a href="${verifyUrl}" style="color:#0f766e; word-break:break-all">${verifyUrl}</a>`)}
        </tbody>
      </table>

      <div style="margin-top:22px; padding:16px; background:#F8FAFC; border:1px solid #e2e8f0; border-radius:12px">
        <div style="font-size:13px; font-weight:800; color:#0f172a">Bước tiếp theo</div>
        <p style="margin:8px 0 0; font-size:13px; line-height:1.65; color:#334155">${nextStep}</p>
        <p style="margin:10px 0 0; font-size:13px; color:#334155">
          Hotline: <a href="tel:0373685634" style="color:#0f172a; font-weight:700; text-decoration:none">0373 685 634</a>
          · Email: <a href="mailto:${FROM_EMAIL}" style="color:#0f172a; font-weight:700; text-decoration:none">${FROM_EMAIL}</a>
        </p>
      </div>

      <div style="margin-top:20px">
        <a href="${verifyUrl}" style="display:inline-block; background:${stage.email.accent}; color:#ffffff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Xem hồ sơ đang theo dõi tại Vexim</a>
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

${risk.title.toUpperCase()}
${risk.impact}
${risk.clarification}
${risk.sources.map((source) => `${source.label}: ${source.url}`).join("\n")}
THÔNG TIN HỒ SƠ VEXIM ĐANG THEO DÕI
Doanh nghiệp: ${data.company_name}
Mã hồ sơ Vexim: ${data.certificate_no}
${registrationNoLabel(data.standard)}: ${data.registration_code || "—"}
${data.duns_code ? `D-U-N-S: ${data.duns_code}\n` : ""}${data.us_agent ? `U.S. Agent: ${data.us_agent}\n` : ""}Ngày đăng ký ghi nhận: ${formatEmailDate(data.registered_at)}
Mốc kết thúc kỳ dịch vụ (Vexim): ${expiryDate}
Kỳ hạn dịch vụ/hồ sơ Vexim: ${data.validity_years} năm
Thời gian đến mốc Vexim ghi nhận: ${remainingLabel}
Cơ quan quản lý: ${registryName}
Hồ sơ trên hệ thống Vexim: ${verifyUrl}

BƯỚC TIẾP THEO
${nextStep}
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
  const stage = EXPIRY_STAGE_PRESENTATION.renewal_reminder;
  const subject = `[Đã gia hạn] ${noun} của ${data.company_name} có hiệu lực đến ${expiryDate}`;

  const row = (label: string, value: string, mono = false) => `
        <tr>
          <td style="padding:9px 0; color:#64748b; width:210px; vertical-align:top; border-bottom:1px solid #eef2f7">${label}</td>
          <td style="padding:9px 0; color:#0f172a; font-weight:600; border-bottom:1px solid #eef2f7${mono ? "; font-family:'SFMono-Regular',Consolas,monospace" : ""}">${value}</td>
        </tr>`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif; max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden">
    <div style="background:${stage.email.accent}; padding:20px 24px; color:#ffffff">
      <div style="font-size:11px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.92">VEXIM GLOBAL · HỆ THỐNG QUẢN LÝ HỒ SƠ FDA/GACC</div>
      <div style="margin-top:10px; font-size:20px; font-weight:800">Xác nhận gia hạn đăng ký</div>
      <div style="margin-top:4px; font-size:13px; opacity:0.9">${data.company_name} · ${noun} · ${data.certificate_no}</div>
    </div>

    <div style="padding:24px">
      <div style="background:${stage.email.background}; border:1px solid ${stage.email.border}; border-left:5px solid ${stage.email.accent}; border-radius:12px; padding:14px 16px; margin-bottom:20px">
        <div style="font-size:12px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:${stage.email.accent}">Đã gia hạn · Hiệu lực đến ${expiryDate}</div>
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
        <a href="${verifyUrl}" style="display:inline-block; background:${stage.email.accent}; color:#ffffff; padding:12px 20px; border-radius:999px; text-decoration:none; font-weight:700; font-size:13px">Kiểm tra thông tin hồ sơ</a>
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

