import type { InvoiceView } from "./accounting";
import type { PaymentRequest } from "./payment-request";

export function nextInvoiceInstallment(invoices: InvoiceView[]) {
  // Keep numbering stable even when an earlier invoice has been cancelled.
  return Math.max(0, ...invoices.map(i => i.installment_no)) + 1;
}

export type NextInstallment = {
  source: InvoiceView;
  payment_request: PaymentRequest | null;
  invoiced: number;
  remaining: number | null;
  kind: "ready" | "complete" | "missing" | "conflict";
};

/** Prefill only. Subtract issued principal, never receipts or VAT, to avoid billing twice. */
export function nextInstallmentDefaults(invoices: InvoiceView[]): NextInstallment | null {
  const active = invoices.filter(i => i.status !== "cancelled").sort((a, b) => b.installment_no - a.installment_no || b.id - a.id);
  const source = active[0];
  if (!source) return null;
  // One dossier may have several contracts/renewals. Never mix their amounts.
  const sameContract = active.filter(i => i.ref_type === source.ref_type && i.ref_id === source.ref_id && i.contract_no.trim() === source.contract_no.trim());
  const saved = sameContract.find(i => i.payment_request)?.payment_request;
  const invoiced = sameContract.reduce((sum, i) => sum + i.subtotal, 0);
  const result: NextInstallment = { source, payment_request: saved ? { ...saved, document_no: "", transfer_content: "", percentage: null } : null, invoiced, remaining: null, kind: "missing" };
  if (!saved || !source.contract_no.trim()) return result;
  if (!Number.isSafeInteger(saved.contract_value) || saved.contract_value <= 0 ||
      !Number.isSafeInteger(invoiced) || sameContract.some(i => !Number.isSafeInteger(i.subtotal) || i.subtotal < 0 ||
        (i.payment_request && (i.payment_request.contract_value !== saved.contract_value || i.payment_request.contract_date !== saved.contract_date)))) {
    return { ...result, kind: "conflict" };
  }
  const remaining = Math.max(0, saved.contract_value - invoiced);
  if (!remaining) return { ...result, remaining, kind: "complete" };
  // Prefer the exact complement of recorded percentages. Legacy/manual invoices use
  // the amount ratio instead. A two-decimal % must reproduce the exact remaining VND.
  const allPercentages = sameContract.every(i => i.payment_request?.percentage != null);
  const candidate = Math.round((allPercentages
    ? 100 - sameContract.reduce((sum, i) => sum + i.payment_request!.percentage!, 0)
    : remaining / saved.contract_value * 100) * 100) / 100;
  const percentage = candidate > 0 && candidate <= 100 && Math.round(saved.contract_value * candidate / 100) === remaining ? candidate : null;
  return { ...result, remaining, kind: "ready", payment_request: { ...result.payment_request!, percentage } };
}
