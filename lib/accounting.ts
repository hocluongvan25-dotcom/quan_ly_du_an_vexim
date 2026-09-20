import type { PaymentRequest } from "./payment-request";
import { daysBetween, remainingDays, todayUtcIso } from "./utils";

/* ============================================================================
 * KẾ TOÁN THU CHI + HỢP ĐỒNG DỊCH VỤ — Vexim Global
 * - Hợp đồng Sale XK / Amazon theo chu kỳ 3-6-12 tháng
 * - Mỗi đợt thu = 1 hóa đơn: tiền hàng + VAT (mặc định 8%) + tổng
 * - Trạng thái hóa đơn suy ra từ tiền đã thu + hạn thanh toán (không nhập tay)
 * ========================================================================== */

export const DEFAULT_VAT_RATE = 8;
export const MAX_INVOICE_CONTRACT_NO_LENGTH = 100;

/** Optional external contract reference; stored on the invoice, not inferred on every read. */
export function normalizeInvoiceContractNo(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Số hợp đồng phải là văn bản.");
  const text = value.trim();
  if (text.length > MAX_INVOICE_CONTRACT_NO_LENGTH) throw new Error("Số hợp đồng không được vượt quá 100 ký tự.");
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new Error("Số hợp đồng không được chứa ký tự điều khiển hoặc xuống dòng.");
  return text;
}
/** Gợi ý nhanh chu kỳ (tháng) — người dùng được nhập tay số khác */
export const SERVICE_CYCLE_PRESETS = [3, 6, 12] as const;
export const SERVICE_CYCLES = SERVICE_CYCLE_PRESETS; // alias tương thích ngược
export const MIN_CYCLE_MONTHS = 1;
export const MAX_CYCLE_MONTHS = 60;

/** Chuẩn hóa chu kỳ nhập tay: số nguyên 1..60, sai thì về mặc định */
export function normalizeCycleMonths(v: unknown, fallback = 6): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < MIN_CYCLE_MONTHS || n > MAX_CYCLE_MONTHS) return fallback;
  return n;
}

export type ServiceType = "SALE_EXPORT" | "AMAZON_OPS";
export type ServiceStatus = "draft" | "active" | "expired" | "terminated";
export type InvoiceRefType = "certificate" | "service_contract";
export type InvoiceState = "paid" | "partial" | "overdue" | "due_soon" | "issued" | "cancelled";

export const SERVICE_NAMES: Record<ServiceType, string> = {
  SALE_EXPORT: "Sale xuất khẩu Mỹ",
  AMAZON_OPS: "Vận hành Amazon US",
};

export const SERVICE_PREFIX: Record<ServiceType, string> = {
  SALE_EXPORT: "VXM-SALE",
  AMAZON_OPS: "VXM-AMZ",
};

export const PAYMENT_METHODS = ["Chuyển khoản", "Tiền mặt", "Khác"];

export type ServiceContract = {
  id: number;
  contract_no: string;
  service_type: ServiceType;
  company_name: string;
  company_email: string;
  contact_name: string;
  contact_phone: string;
  scope: string;
  cycle_months: number;
  started_at: string;
  ends_at: string;
  contract_value: number;
  status: ServiceStatus;
  renewal_count: number;
  last_renewed_at: string | null;
  opportunity_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
};

export type InvoicePayment = {
  id: number;
  invoice_id: number;
  amount: number;
  paid_at: string;
  method: string;
  reference: string;
  note: string;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
};

export type Invoice = {
  id: number;
  invoice_no: string;
  contract_no: string;
  payment_request: PaymentRequest | null;
  ref_type: InvoiceRefType;
  ref_id: number;
  installment_no: number;
  title: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  issue_date: string;
  due_date: string | null;
  status: "issued" | "cancelled";
  notes: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  // enrich
  company_name?: string;
  ref_label?: string;
  paid_amount?: number;
  remaining?: number;
  state?: InvoiceState;
  days_overdue?: number;
  payments?: InvoicePayment[];
};

/** Hóa đơn kèm số liệu thu tiền (API luôn trả dạng này) */
export type InvoiceView = Invoice & {
  paid_amount: number;
  remaining: number;
  state: InvoiceState;
  days_overdue: number;
};

export type RefSummary = {
  invoiced: number;
  paid: number;
  remaining: number;
  invoice_count: number;
  overdue_count: number;
};

/** Tính tiền hóa đơn phía server — không tin số client gửi lên */
export function calcInvoiceTotals(subtotal: number, vatRate: number) {
  const sub = Math.max(0, Math.round(subtotal || 0));
  const rate = Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100 ? vatRate : DEFAULT_VAT_RATE;
  const vat = Math.round((sub * rate) / 100);
  return { subtotal: sub, vat_rate: rate, vat_amount: vat, total: sub + vat };
}

const norm = (v: number | null | undefined) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Trạng thái thực tế của hóa đơn từ tiền đã thu + hạn */
export function invoiceState(inv: {
  status: string;
  total: number;
  paid_amount?: number | null;
  due_date?: string | null;
}): InvoiceState {
  if (inv.status === "cancelled") return "cancelled";
  const total = norm(inv.total);
  const paid = norm(inv.paid_amount);
  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return "partial";
  if (inv.due_date) {
    const left = remainingDays(String(inv.due_date).slice(0, 10));
    if (left < 0) return "overdue";
    if (left <= 7) return "due_soon";
  }
  return "issued";
}

export const INVOICE_STATE_LABELS: Record<InvoiceState, string> = {
  paid: "Đã thu đủ",
  partial: "Thu một phần",
  overdue: "Quá hạn",
  due_soon: "Sắp đến hạn",
  issued: "Đã phát hành",
  cancelled: "Đã hủy",
};

// Số ngày quá hạn (dương khi trễ, 0 nếu chưa đến hạn)
export function overdueDays(dueDate: string | null | undefined, today = todayUtcIso()): number {
  if (!dueDate) return 0;
  const left = remainingDays(String(dueDate).slice(0, 10));
  return left < 0 ? Math.abs(left) : 0;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n || 0));
}
