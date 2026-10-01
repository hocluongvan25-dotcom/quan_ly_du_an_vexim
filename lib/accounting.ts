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
/* ---------------------- Nợ của các đợt trước ----------------------------- */

/** Một đợt trước còn nợ, thuộc cùng hợp đồng/hồ sơ. */
export type PriorDebt = {
  invoice_id: number;
  invoice_no: string;
  installment_no: number;
  subtotal: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  remaining: number;
};

export type PaymentAllocation = {
  invoice_id: number;
  invoice_no: string;
  installment_no: number;
  amount: number;
};

/** Kết quả ghi nhận một lần thu tiền (có thể chia cho nhiều hóa đơn). */
export type PaymentResult = { id: number; allocations: PaymentAllocation[] };

/** Dữ liệu tối thiểu để tính nợ — chấp nhận cả `Invoice` (số tiền có thể chưa có). */
export type PriorDebtSource = {
  id: number;
  invoice_no?: string;
  contract_no?: string;
  installment_no?: number;
  status?: string;
  subtotal?: number;
  vat_amount?: number;
  total?: number;
  paid_amount?: number;
  remaining?: number;
};

/**
 * Nợ còn lại của các đợt TRƯỚC trong cùng hợp đồng/hồ sơ, cũ nhất trước.
 * Không tính hóa đơn đã hủy và không tính chính đợt đang xét.
 *
 * Trường hợp thật: khách chưa trả VAT đợt 1 (chỉ tạm ứng 9.000.000 trên hóa đơn
 * 9.720.000) → đợt 1 còn 720.000; số này tự động thành nợ và phải được cộng vào
 * đề nghị thanh toán của đợt 2.
 */
export function priorDebtsOf(
  current: { id: number; installment_no: number; contract_no?: string },
  siblings: PriorDebtSource[]
): PriorDebt[] {
  // Hóa đơn có số hợp đồng thì chỉ gom nợ TRONG CÙNG hợp đồng đó — cùng một hồ sơ
  // có thể có nhiều hợp đồng (gia hạn, dịch vụ khác) và không được cấn trừ lẫn nhau.
  const contractNo = String(current.contract_no || "").trim();
  return siblings
    .filter((i) => i.status !== "cancelled" && i.id !== current.id)
    .filter((i) => !contractNo || String(i.contract_no || "").trim() === contractNo)
    .filter((i) => Number(i.installment_no || 0) < current.installment_no)
    .map((i) => ({
      invoice_id: i.id,
      invoice_no: String(i.invoice_no || ""),
      installment_no: Number(i.installment_no || 0),
      subtotal: Math.round(Number(i.subtotal || 0)),
      vat_amount: Math.round(Number(i.vat_amount || 0)),
      total: Math.round(Number(i.total || 0)),
      paid_amount: Math.round(Number(i.paid_amount || 0)),
      remaining: Math.round(Number(i.remaining || 0)),
    }))
    .filter((d) => d.remaining > 0)
    .sort((a, b) => a.installment_no - b.installment_no);
}

export function carriedOverTotal(debts: PriorDebt[]) {
  return debts.reduce((sum, d) => sum + d.remaining, 0);
}

/** Gắn nợ đợt trước vào một hóa đơn (dùng ở cả SQLite và Supabase). */
export function withPriorDebts<T extends { id: number; installment_no: number; contract_no?: string }>(
  invoice: T,
  siblings: PriorDebtSource[]
) {
  const prior_debts = priorDebtsOf(invoice, siblings);
  return { ...invoice, prior_debts, carried_over: carriedOverTotal(prior_debts) };
}

/** Tổng phải thu của một đợt = còn lại của đợt này + nợ các đợt trước. */
export function totalCollectible(inv: { remaining: number; carried_over?: number }) {
  return Math.max(0, Math.round(inv.remaining || 0)) + Math.max(0, Math.round(inv.carried_over || 0));
}

/**
 * Chia số tiền khách vừa trả cho các khoản còn nợ, **cũ nhất trước**, phần còn lại
 * trả cho đợt hiện tại. Nhờ vậy khi khách trả hết ở đợt 2, 720.000 VAT của đợt 1
 * được gạch nợ đúng chỗ thay vì để đợt 1 treo nợ mãi.
 */
export function planPaymentAllocation(
  amount: number,
  current: { invoice_id: number; invoice_no: string; installment_no: number; remaining: number },
  debts: PriorDebt[]
): PaymentAllocation[] {
  let left = Math.max(0, Math.round(amount || 0));
  const allocations: PaymentAllocation[] = [];
  // Luôn trả đợt cũ nhất trước, kể cả khi nơi gọi đưa danh sách chưa sắp xếp
  for (const debt of [...debts].sort((a, b) => a.installment_no - b.installment_no)) {
    if (left <= 0) break;
    const pay = Math.min(left, debt.remaining);
    if (pay <= 0) continue;
    allocations.push({ invoice_id: debt.invoice_id, invoice_no: debt.invoice_no, installment_no: debt.installment_no, amount: pay });
    left -= pay;
  }
  if (left > 0) {
    allocations.push({ invoice_id: current.invoice_id, invoice_no: current.invoice_no, installment_no: current.installment_no, amount: left });
  }
  return allocations;
}

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
  /** Nợ còn lại của các đợt trước trong cùng hợp đồng/hồ sơ (gắn khi đọc hóa đơn từ DB). */
  prior_debts?: PriorDebt[];
  carried_over?: number;
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
