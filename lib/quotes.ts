import { PAYMENT_REQUEST_DEFAULTS } from "./payment-request";
import { DEFAULT_VAT_RATE, formatMoney } from "./accounting";
import { daysBetween, remainingDays, todayUtcIso } from "./utils";
import { moneyInWords } from "./money-words";
import {
  getQuoteTemplate,
  isQuoteTemplateKey,
  templateItems,
  type QuoteLine,
  type QuoteTemplateKey,
} from "./quote-templates";

/* ============================================================================
 * BÁO GIÁ DỊCH VỤ — Vexim Global
 * Nhân viên chọn dịch vụ → hệ thống điền sẵn hạng mục + đơn giá + điều khoản,
 * nhân viên chỉ nhập thông tin khách hàng. Mọi con số được tính lại ở server.
 * ========================================================================== */

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";
export type QuoteState = QuoteStatus | "expired";

export const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected"];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi khách",
  accepted: "Khách đồng ý",
  rejected: "Khách từ chối",
};

export const QUOTE_STATE_LABELS: Record<QuoteState, string> = {
  ...QUOTE_STATUS_LABELS,
  expired: "Hết hiệu lực",
};

export const MAX_QUOTE_ITEMS = 40;
export const MAX_QUOTE_LINES = 20;
export const MAX_VALIDITY_DAYS = 180;
/** Hiệu lực mặc định khi dịch vụ không khai báo số ngày hiệu lực. */
export const DEFAULT_VALIDITY_DAYS = 15;

/** Thông tin người lập / đơn vị mặc định lấy từ mẫu chứng từ thanh toán */
export const QUOTE_DEFAULTS = {
  issuer_name: PAYMENT_REQUEST_DEFAULTS.issuer_name,
  city: PAYMENT_REQUEST_DEFAULTS.city,
  bank_account: PAYMENT_REQUEST_DEFAULTS.bank_account,
  bank_name: PAYMENT_REQUEST_DEFAULTS.bank_name,
  account_holder: PAYMENT_REQUEST_DEFAULTS.account_holder,
  signer_name: PAYMENT_REQUEST_DEFAULTS.signer_name,
  signer_title: PAYMENT_REQUEST_DEFAULTS.signer_title,
};

export type Quote = {
  id: number;
  quote_no: string;
  template_key: QuoteTemplateKey;
  service_name: string;
  title: string;
  company_name: string;
  company_address: string;
  company_tax_code: string;
  contact_name: string;
  contact_title: string;
  contact_phone: string;
  contact_email: string;
  items: QuoteLine[];
  scope: string[];
  /** Hồ sơ/tài liệu khách hàng cần cung cấp (snapshot theo báo giá) */
  documents: string[];
  terms: string[];
  timeline: string;
  payment_terms: string;
  note: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  optional_total: number;
  issue_date: string;
  valid_until: string;
  status: QuoteStatus;
  opportunity_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
};

export type QuoteView = Quote & {
  state: QuoteState;
  days_left: number;
  total_in_words: string;
};

export type QuoteDraft = Omit<
  Quote,
  | "id" | "quote_no" | "subtotal" | "discount_amount" | "vat_amount"
  | "total" | "optional_total" | "created_by" | "created_at" | "updated_at" | "created_by_name"
>;

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && QUOTE_STATUSES.includes(value as QuoteStatus);
}

/* --------------------------------- Đọc dữ liệu ---------------------------- */

/** SQLite lưu JSON text, Supabase lưu jsonb — đọc an toàn cho cả hai. */
export function parseJsonArray(value: unknown): string[] {
  const parsed = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((v): v is string => typeof v === "string");
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseQuoteItems(value: unknown): QuoteLine[] {
  const parsed = typeof value === "string" ? safeParse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      name: String(row.name ?? ""),
      unit: String(row.unit ?? ""),
      qty: Number(row.qty ?? 1),
      unit_price: Number(row.unit_price ?? 0),
      note: String(row.note ?? ""),
      optional: row.optional === true,
    }));
}

/* --------------------------------- Tính tiền ------------------------------ */

export type QuoteTotals = {
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  optional_total: number;
};

const money = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

/** Hạng mục chính cộng vào tổng; hạng mục tùy chọn chỉ hiển thị để khách chọn. */
export function calcQuoteTotals(
  items: QuoteLine[],
  discountPercent = 0,
  vatRate = 8
): QuoteTotals {
  const subtotal = items.filter((i) => !i.optional).reduce((sum, i) => sum + money(i.qty * i.unit_price), 0);
  const optionalTotal = items.filter((i) => i.optional).reduce((sum, i) => sum + money(i.qty * i.unit_price), 0);
  const percent = Number.isFinite(discountPercent) && discountPercent > 0 && discountPercent <= 100 ? discountPercent : 0;
  const rate = Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100 ? vatRate : 8;
  const discountAmount = Math.round((subtotal * percent) / 100);
  const net = subtotal - discountAmount;
  const vatAmount = Math.round((net * rate) / 100);
  return {
    subtotal,
    discount_percent: percent,
    discount_amount: discountAmount,
    vat_rate: rate,
    vat_amount: vatAmount,
    total: net + vatAmount,
    optional_total: optionalTotal,
  };
}

/* -------------------------------- Kiểm tra -------------------------------- */

function cleanText(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${label} không được để trống.`);
    return "";
  }
  const text = String(value).normalize("NFC").replace(/\s+/g, " ").trim();
  if (required && !text) throw new Error(`${label} không được để trống.`);
  if (text.length > max) throw new Error(`${label} tối đa ${max} ký tự.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error(`${label} không hợp lệ.`);
  return text;
}

function cleanParagraph(value: unknown, label: string, max: number): string {
  if (value === undefined || value === null) return "";
  const text = String(value).normalize("NFC").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (text.length > max) throw new Error(`${label} tối đa ${max} ký tự.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error(`${label} không hợp lệ.`);
  return text;
}

export function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cleanAmount(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 1e12) {
    throw new Error(`${label} phải là số nguyên từ 0 đến 1.000 tỷ đồng.`);
  }
  return n;
}

export function normalizeQuoteLine(value: unknown, index: number): QuoteLine {
  const row = (value || {}) as Record<string, unknown>;
  const label = `Hạng mục ${index + 1}`;
  const qty = Number(row.qty);
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > 9999) {
    throw new Error(`${label}: số lượng phải là số nguyên từ 1 đến 9999.`);
  }
  return {
    name: cleanText(row.name, `${label}: nội dung`, 300, true),
    unit: cleanText(row.unit, `${label}: đơn vị tính`, 30),
    qty,
    unit_price: cleanAmount(row.unit_price, `${label}: đơn giá`),
    note: cleanText(row.note, `${label}: ghi chú`, 200),
    optional: row.optional === true,
  };
}

export function normalizeQuoteItems(value: unknown): QuoteLine[] {
  if (!Array.isArray(value)) throw new Error("Danh sách hạng mục không hợp lệ.");
  if (value.length === 0) throw new Error("Báo giá cần ít nhất 01 hạng mục chính.");
  if (value.length > MAX_QUOTE_ITEMS) throw new Error(`Báo giá tối đa ${MAX_QUOTE_ITEMS} hạng mục.`);
  const items = value.map((row, index) => normalizeQuoteLine(row, index));
  if (!items.some((i) => !i.optional)) throw new Error("Báo giá cần ít nhất 01 hạng mục chính (không phải tùy chọn).");
  if (items.some((i) => !i.optional && i.unit_price === 0) && !items.every((i) => !i.optional && i.unit_price === 0)) {
    throw new Error("Hạng mục chính có đơn giá 0 ₫ — kiểm tra lại hoặc chuyển thành hạng mục tùy chọn.");
  }
  return items;
}

export function normalizeQuoteLines(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} không hợp lệ.`);
  return value
    .map((row) => cleanText(row, label, 300))
    .filter(Boolean)
    .slice(0, MAX_QUOTE_LINES);
}

/**
 * Chuẩn hoá + kiểm tra toàn bộ nội dung báo giá ở server.
 * Client gửi gì cũng không ảnh hưởng: mọi con số được tính lại từ hạng mục.
 *
 * `template` là mẫu đã resolve từ Bảng giá dịch vụ (DB ưu tiên hơn file), dùng
 * để điền tiêu đề/tên dịch vụ khi client để trống.
 */
export function prepareQuoteInput(
  raw: Record<string, unknown>,
  template?: { title?: string; name?: string; vat_rate?: number; validity_days?: number }
): QuoteDraft {
  const templateKey = raw.template_key;
  if (!isQuoteTemplateKey(templateKey)) {
    throw new Error("Dịch vụ không hợp lệ. Chọn một trong: FDA, GACC, Sale xuất khẩu, Vận hành Amazon.");
  }
  // Bảng giá đã resolve (DB ưu tiên hơn file) — dùng làm giá trị mặc định cho các trường client bỏ trống.
  const fallback = template || getQuoteTemplate(templateKey)!;
  const items = normalizeQuoteItems(raw.items);
  const discount = Number(raw.discount_percent ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100 || Math.abs(discount * 100 - Math.round(discount * 100)) > 1e-8) {
    throw new Error("Chiết khấu phải từ 0 đến 100%, tối đa 2 chữ số thập phân.");
  }
  const hasVat = raw.vat_rate !== undefined && raw.vat_rate !== null && raw.vat_rate !== "";
  const vatRate = hasVat ? Number(raw.vat_rate) : Number(fallback.vat_rate ?? DEFAULT_VAT_RATE);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100 || Math.abs(vatRate * 100 - Math.round(vatRate * 100)) > 1e-8) {
    throw new Error("VAT phải từ 0 đến 100%, tối đa 2 chữ số thập phân.");
  }
  const issueDate = raw.issue_date === undefined || raw.issue_date === null || raw.issue_date === ""
    ? todayUtcIso()
    : String(raw.issue_date).slice(0, 10);
  if (!validIsoDate(issueDate)) throw new Error("Ngày báo giá không hợp lệ.");
  // Không gửi ngày hết hiệu lực → lấy theo số ngày hiệu lực của dịch vụ trong bảng giá.
  let validUntil = raw.valid_until === undefined || raw.valid_until === null || raw.valid_until === ""
    ? quoteValidUntil(issueDate, Number(fallback.validity_days) || DEFAULT_VALIDITY_DAYS)
    : String(raw.valid_until).slice(0, 10);
  if (validUntil && !validIsoDate(validUntil)) throw new Error("Ngày hết hiệu lực không hợp lệ.");
  if (validUntil && validUntil < issueDate) throw new Error("Ngày hết hiệu lực phải sau ngày báo giá.");
  if (validUntil && daysBetween(issueDate, validUntil) > MAX_VALIDITY_DAYS) {
    throw new Error(`Hiệu lực báo giá tối đa ${MAX_VALIDITY_DAYS} ngày.`);
  }
  const opportunityId = raw.opportunity_id === undefined || raw.opportunity_id === null || raw.opportunity_id === ""
    ? null
    : Number(raw.opportunity_id);
  if (opportunityId !== null && (!Number.isSafeInteger(opportunityId) || opportunityId <= 0)) {
    throw new Error("Cơ hội CRM liên kết không hợp lệ.");
  }
  return {
    template_key: templateKey,
    service_name: cleanText(raw.service_name, "Tên dịch vụ", 120) || fallback.name || quoteServiceName(templateKey),
    title: cleanText(raw.title, "Tiêu đề báo giá", 200) || fallback.title || "",
    company_name: cleanText(raw.company_name, "Tên công ty khách hàng", 250, true),
    company_address: cleanText(raw.company_address, "Địa chỉ khách hàng", 300),
    company_tax_code: cleanText(raw.company_tax_code, "Mã số thuế", 50),
    contact_name: cleanText(raw.contact_name, "Người liên hệ", 120),
    contact_title: cleanText(raw.contact_title, "Chức danh người liên hệ", 120),
    contact_phone: cleanText(raw.contact_phone, "Số điện thoại", 40),
    contact_email: cleanText(raw.contact_email, "Email", 160),
    items,
    documents: normalizeQuoteLines(raw.documents, "Hồ sơ cần cung cấp"),
    scope: normalizeQuoteLines(raw.scope, "Phạm vi công việc"),
    terms: normalizeQuoteLines(raw.terms, "Điều khoản"),
    timeline: cleanParagraph(raw.timeline, "Tiến độ dự kiến", 600),
    payment_terms: cleanParagraph(raw.payment_terms, "Điều khoản thanh toán", 600),
    note: cleanParagraph(raw.note, "Ghi chú", 800),
    discount_percent: discount,
    vat_rate: vatRate,
    issue_date: issueDate,
    valid_until: validUntil,
    status: isQuoteStatus(raw.status) ? raw.status : "draft",
    opportunity_id: opportunityId,
  };
}

/* -------------------------------- Trạng thái ------------------------------ */

/** Hiệu lực đã hết nhưng khách chưa phản hồi → hiển thị "Hết hiệu lực". */
export function quoteState(quote: { status: QuoteStatus; valid_until: string | null }): QuoteState {
  if (quote.status === "accepted" || quote.status === "rejected") return quote.status;
  if (quote.valid_until && remainingDays(String(quote.valid_until).slice(0, 10)) < 0) return "expired";
  return quote.status;
}

export function quoteDaysLeft(quote: { valid_until: string | null }): number {
  return quote.valid_until ? remainingDays(String(quote.valid_until).slice(0, 10)) : 0;
}

export function enrichQuote(quote: Quote): QuoteView {
  return {
    ...quote,
    state: quoteState(quote),
    days_left: quoteDaysLeft(quote),
    total_in_words: moneyInWords(quote.total),
  };
}

/** Báo giá chỉ được sửa khi còn là nháp; muốn sửa bản đã gửi thì nhân bản. */
export function assertQuoteEditable(quote: { status: QuoteStatus }) {
  if (quote.status !== "draft") throw new Error("LOCKED_QUOTE");
}

export function canDeleteQuote(quote: { status: QuoteStatus }, role: string): boolean {
  return quote.status === "draft" || role === "admin";
}

/* ------------------------------- Tiện ích UI ------------------------------ */

export function quoteTemplateLabel(key: QuoteTemplateKey): string {
  return getQuoteTemplate(key)?.name || key;
}

/** Tên dịch vụ mặc định của mẫu (giá mặc định) — tên thật lưu theo từng báo giá */
export function quoteServiceName(key: QuoteTemplateKey): string {
  return getQuoteTemplate(key)?.name || key;
}

export function quoteTemplateShortLabel(key: QuoteTemplateKey): string {
  return getQuoteTemplate(key)?.short_name || key;
}

export function defaultQuoteItems(key: QuoteTemplateKey): QuoteLine[] {
  return templateItems(key);
}

export function quoteValidUntil(issueDate: string, validityDays: number): string {
  const days = Number.isFinite(validityDays) && validityDays > 0 && validityDays <= MAX_VALIDITY_DAYS
    ? Math.round(validityDays)
    : 15;
  const date = new Date(`${issueDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return issueDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function quoteMoney(value: number): string {
  return `${formatMoney(value)} ₫`;
}

export function quoteRefDate(iso: string): string {
  if (!validIsoDate(iso)) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Nội dung nhắn Zalo/Email để gửi khách — copy 1 nút, không cần gõ lại. */
export function buildQuoteMessage(quote: QuoteView): string {
  const greeting = quote.contact_name ? `Kính gửi Anh/Chị ${quote.contact_name}` : "Kính gửi Quý khách hàng";
  const core = quote.items.filter((i) => !i.optional);
  const optional = quote.items.filter((i) => i.optional);
  const lines = [
    `${greeting}${quote.company_name ? ` — ${quote.company_name}` : ""},`,
    "",
    `Vexim Global gửi Anh/Chị báo giá dịch vụ ${quote.service_name} mã số ${quote.quote_no}.`,
    `• Ngày báo giá: ${quoteRefDate(quote.issue_date)}${quote.valid_until ? ` — hiệu lực đến ${quoteRefDate(quote.valid_until)}` : ""}`,
    "",
    "Hạng mục chính:",
    ...core.map((item, index) =>
      `${index + 1}. ${item.name} — ${item.qty} ${item.unit || "đơn vị"} × ${formatMoney(item.unit_price)} ₫ = ${formatMoney(item.qty * item.unit_price)} ₫`
    ),
    "",
    `Tạm tính: ${quoteMoney(quote.subtotal)}`,
    ...(quote.discount_amount > 0 ? [`Chiết khấu ${quote.discount_percent}%: -${quoteMoney(quote.discount_amount)}`] : []),
    `VAT ${quote.vat_rate}%: ${quoteMoney(quote.vat_amount)}`,
    `TỔNG CỘNG: ${quoteMoney(quote.total)}`,
    quote.total_in_words ? `(Bằng chữ: ${quote.total_in_words})` : "",
  ];
  if (optional.length > 0) {
    lines.push(
      "",
      "Hạng mục tùy chọn (chưa tính vào tổng, Anh/Chị chọn thêm nếu cần):",
      ...optional.map((item) => `- ${item.name}: ${formatMoney(item.qty * item.unit_price)} ₫${item.note ? ` (${item.note})` : ""}`)
    );
  }
  if (quote.documents.length > 0) {
    lines.push("", "Hồ sơ cần cung cấp để triển khai:", ...quote.documents.map((item) => `- ${item}`));
  }
  if (quote.payment_terms) lines.push("", `Điều khoản thanh toán: ${quote.payment_terms}`);
  if (quote.timeline) lines.push(`Tiến độ: ${quote.timeline}`);
  lines.push("", "Vexim Global gửi kèm bản báo giá PDF. Anh/Chị xem qua và phản hồi giúp em để hai bên tiến hành ký kết.", "", "Trân trọng cảm ơn!");
  return lines.join("\n");
}
