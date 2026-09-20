import type { InvoiceView } from "./accounting";

/** Baseline spacing reserved for the handwritten signature and company seal. */
export const PAYMENT_REQUEST_SIGNATURE_GAP_MM = 35;

/** A saved snapshot. Never re-read company/bank/contract data when exporting. */
export type PaymentRequest = {
  document_no: string;
  recipient_name: string;
  issuer_name: string;
  city: string;
  contract_date: string;
  contract_value: number;
  percentage: number | null;
  service_description: string;
  fee_clause: string;
  installment_clause: string;
  bank_account: string;
  bank_name: string;
  account_holder: string;
  transfer_content: string;
  signer_name: string;
  signer_title: string;
};

export const PAYMENT_REQUEST_DEFAULTS: PaymentRequest = {
  document_no: "", recipient_name: "",
  issuer_name: "Công ty TNHH Một thành viên VEXIM GLOBAL", city: "Hà Nội",
  contract_date: "", contract_value: 0, percentage: null,
  service_description: "", fee_clause: "Điều 4. Phí dịch vụ và Phương thức thanh toán",
  installment_clause: "Mục 4.2", bank_account: "427313333", bank_name: "Ngân hàng MB Quân Đội",
  account_holder: "Công ty TNHH Một thành viên VEXIM GLOBAL", transfer_content: "",
  signer_name: "LƯƠNG VĂN HỌC", signer_title: "GIÁM ĐỐC",
};

export const REQUEST_TEXT_FIELDS = [
  ["document_no", "Số văn bản (để trống để tự sinh)", 100, false],
  ["recipient_name", "Tên công ty khách hàng", 250, true],
  ["service_description", "Dịch vụ theo hợp đồng", 500, true],
  ["fee_clause", "Điều khoản phí dịch vụ", 200, true],
  ["installment_clause", "Điều khoản thanh toán đợt", 100, true],
  ["issuer_name", "Tên đơn vị đề nghị", 250, true],
  ["city", "Địa danh lập văn bản", 100, true],
  ["bank_account", "Số tài khoản nhận tiền", 50, true],
  ["bank_name", "Ngân hàng nhận tiền", 150, true],
  ["account_holder", "Tên chủ tài khoản", 250, true],
  ["transfer_content", "Nội dung chuyển khoản (để trống để tự sinh)", 300, false],
  ["signer_name", "Họ tên người ký", 100, true],
  ["signer_title", "Chức danh người ký", 100, true],
] as const;

export function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= "9999-12-31" &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function normalizePaymentRequest(value: unknown): PaymentRequest | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Thông tin đề nghị thanh toán không hợp lệ.");
  const input = value as Record<string, unknown>;
  const result = {} as PaymentRequest;
  for (const [key, label, max, required] of REQUEST_TEXT_FIELDS) {
    if (typeof input[key] !== "string") throw new Error(`${label}: cần nhập văn bản.`);
    const text = (input[key] as string).normalize("NFC").trim();
    if ((required && !text) || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) {
      throw new Error(`${label}: ${required ? "không được để trống, " : ""}tối đa ${max} ký tự, không xuống dòng.`);
    }
    result[key] = text;
  }
  if (typeof input.contract_date !== "string" || !validIsoDate(input.contract_date)) throw new Error("Ngày ký hợp đồng không hợp lệ.");
  result.contract_date = input.contract_date;
  if (typeof input.contract_value !== "number" || !Number.isSafeInteger(input.contract_value) || input.contract_value <= 0 || input.contract_value > 1e12) {
    throw new Error("Giá trị hợp đồng chưa VAT phải là số nguyên dương, tối đa 1.000 tỷ đồng.");
  }
  result.contract_value = input.contract_value;
  const pct = input.percentage;
  if (pct !== null && (typeof pct !== "number" || !Number.isFinite(pct) || pct <= 0 || pct > 100 || Math.abs(pct * 100 - Math.round(pct * 100)) > 1e-8)) {
    throw new Error("Tỷ lệ thanh toán phải lớn hơn 0 và không quá 100%, tối đa 2 chữ số thập phân; hoặc để trống để nhập tiền trực tiếp.");
  }
  result.percentage = pct as number | null;
  return result;
}

/** Applies to both database adapters, so the API cannot bypass amount validation. */
export function preparePaymentRequest(value: unknown, invoice: { contract_no: string; issue_date: string; installment_no: number; subtotal: number; vat_rate: number; due_date?: string | null }) {
  const request = normalizePaymentRequest(value);
  if (!request) return { request: null, subtotal: invoice.subtotal };
  if (!invoice.contract_no.trim()) throw new Error("Cần số hợp đồng để lập giấy đề nghị thanh toán.");
  if (!validIsoDate(invoice.issue_date) || invoice.issue_date < request.contract_date) throw new Error("Ngày xuất phải hợp lệ và không trước ngày ký hợp đồng.");
  if (invoice.due_date && !validIsoDate(invoice.due_date)) throw new Error("Hạn thanh toán không hợp lệ.");
  if (!Number.isSafeInteger(invoice.installment_no) || invoice.installment_no < 1) throw new Error("Đợt thanh toán phải là số nguyên dương.");
  if (!Number.isFinite(invoice.vat_rate) || invoice.vat_rate < 0 || invoice.vat_rate > 100) throw new Error("VAT phải nằm trong khoảng 0–100%.");
  const subtotal = request.percentage === null ? invoice.subtotal : Math.round(request.contract_value * request.percentage / 100);
  if (!Number.isSafeInteger(subtotal) || subtotal <= 0 || subtotal > request.contract_value) throw new Error("Số tiền đợt chưa VAT phải lớn hơn 0 và không vượt giá trị hợp đồng.");
  return { request, subtotal };
}

export function savedPaymentRequest(value: unknown): PaymentRequest | null {
  // SQLite stores JSON text; Supabase stores jsonb. Old invoices deliberately stay null.
  return value == null ? null : (typeof value === "string" ? JSON.parse(value) : value) as PaymentRequest;
}

export function requestDocumentNo(inv: Pick<InvoiceView, "invoice_no" | "payment_request">) {
  return inv.payment_request?.document_no || `ĐNTT-${inv.invoice_no}`;
}
export function requestTransferContent(inv: Pick<InvoiceView, "installment_no" | "contract_no" | "payment_request">) {
  return inv.payment_request?.transfer_content || `Thanh toán ${inv.payment_request?.service_description || "dịch vụ"} lần ${inv.installment_no} theo hợp đồng ${inv.contract_no}`;
}
export function requestDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
export function requestMoney(value: number) { return new Intl.NumberFormat("vi-VN").format(value) + " đồng"; }

/** Shared by the on-screen preview and PDF; values are plain text, not HTML. */
export function paymentRequestParagraphs(inv: InvoiceView) {
  const p = inv.payment_request;
  if (!p) throw new Error("Hóa đơn chưa có thông tin đề nghị thanh toán. Hãy bổ sung tại form sửa hóa đơn.");
  const amount = Math.max(0, inv.remaining);
  return [
    { text: `Kính gửi: Ban lãnh đạo ${p.recipient_name}`, bold: true, center: true },
    { text: `- Căn cứ hợp đồng số ${inv.contract_no} ngày ${requestDate(p.contract_date)} đã ký giữa ${p.recipient_name} với ${p.issuer_name} về việc ${p.service_description}.` },
    { text: `- Căn cứ ${p.fee_clause}. Tổng phí dịch vụ là ${requestMoney(p.contract_value)} (chưa bao gồm VAT ${inv.vat_rate}%).` },
    { text: `- Theo ${p.installment_clause}: Thanh toán đợt ${inv.installment_no}${p.percentage === null ? "" : ` là ${p.percentage}% giá trị hợp đồng`}, với số tiền chưa VAT: ${requestMoney(inv.subtotal)}.` },
    { text: `+ Thuế VAT ${inv.vat_rate}%: ${requestMoney(inv.vat_amount)}.` },
    { text: `Tổng giá trị thanh toán đợt ${inv.installment_no} bao gồm VAT: ${requestMoney(inv.total)}.`, bold: true },
    ...(inv.paid_amount > 0 ? [{ text: `Đã thanh toán: ${requestMoney(inv.paid_amount)}. Còn phải thanh toán: ${requestMoney(amount)}.`, bold: true }] : []),
    { text: `Tổng số tiền đề nghị thanh toán${inv.paid_amount > 0 ? " còn lại" : ` lần ${inv.installment_no}`}: ${requestMoney(amount)}.`, bold: true },
    ...(inv.due_date ? [{ text: `Hạn thanh toán: ${requestDate(inv.due_date)}.` }] : []),
    { text: "Hình thức thanh toán: Chuyển khoản" },
    { text: `+ Số tài khoản: ${p.bank_account}` },
    { text: `+ Ngân hàng: ${p.bank_name}` },
    { text: `+ Chủ tài khoản: ${p.account_holder}` },
    { text: `+ Nội dung chuyển khoản: “${requestTransferContent(inv)}”` },
    { text: `Vậy ${p.issuer_name} đề nghị Ban lãnh đạo ${p.recipient_name} xem xét, tạo điều kiện thanh toán theo hợp đồng để chúng tôi tiếp tục triển khai các công việc tiếp theo.`, },
    { text: "Xin trân trọng cảm ơn!", italic: true },
  ];
}

export function assertPaymentRequestExportable(inv: InvoiceView) {
  if (inv.status === "cancelled") throw new Error("Hóa đơn đã hủy, không thể lập đề nghị thanh toán.");
  if (!Number.isFinite(inv.remaining) || inv.remaining <= 0) throw new Error("Hóa đơn đã thu đủ tiền, không còn số tiền để đề nghị thanh toán.");
  if (!inv.payment_request) throw new Error("Hóa đơn chưa có thông tin đề nghị thanh toán. Hãy bổ sung tại form sửa hóa đơn.");
  const prepared = preparePaymentRequest(inv.payment_request, inv);
  if (prepared.subtotal !== inv.subtotal || inv.vat_amount !== Math.round(inv.subtotal * inv.vat_rate / 100) || inv.total !== inv.subtotal + inv.vat_amount) {
    throw new Error("Thông tin hợp đồng và số tiền hóa đơn chưa khớp. Vui lòng kiểm tra lại.");
  }
}
