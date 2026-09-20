"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney, DEFAULT_VAT_RATE, MAX_INVOICE_CONTRACT_NO_LENGTH, type InvoiceView } from "@/lib/accounting";
import PaymentRequestFields from "./PaymentRequestFields";
import PaymentRequestDownload from "./PaymentRequestDownload";
import { PAYMENT_REQUEST_DEFAULTS, type PaymentRequest } from "@/lib/payment-request";
import { todayUtcIso } from "@/lib/utils";

const STATE_META: Record<string, { label: string; cls: string }> = {
  issued: { label: "Đã xuất", cls: "bg-slate-100 text-slate-700" },
  due_soon: { label: "Sắp đến hạn", cls: "bg-amber-100 text-amber-800" },
  overdue: { label: "Quá hạn", cls: "bg-red-100 text-red-700" },
  partial: { label: "Thu một phần", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "Đã thu đủ", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy", cls: "bg-slate-200 text-slate-500 line-through" },
};

function liveTotal(subtotal: number, vatRate: number) {
  const st = Math.max(0, Math.round(subtotal || 0));
  const vat = Math.round((st * (vatRate || 0)) / 100);
  return { st, vat, total: st + vat };
}

export default function InvoiceSection({
  refType,
  refId,
  defaultContractNo = "",
  defaultCompanyName = "",
  defaultServiceDescription = "",
  defaultContractValue = 0,
}: {
  refType: "certificate" | "service_contract";
  refId: number;
  defaultContractNo?: string;
  defaultCompanyName?: string;
  defaultServiceDescription?: string;
  defaultContractValue?: number;
}) {
  const [items, setItems] = useState<InvoiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [payments, setPayments] = useState<Record<number, any[]>>({});
  const [editing, setEditing] = useState<InvoiceView | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const requestDefaults = { recipient_name: defaultCompanyName, service_description: defaultServiceDescription, contract_value: defaultContractValue };
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(() => ({ ...PAYMENT_REQUEST_DEFAULTS, ...requestDefaults }));
  const [createdId, setCreatedId] = useState<number | null>(null);

  // Form tạo HĐ
  const [inst, setInst] = useState(1);
  const [title, setTitle] = useState("");
  const [contractNo, setContractNo] = useState(defaultContractNo);
  const [subtotal, setSubtotal] = useState("");
  const [vatRate, setVatRate] = useState(String(DEFAULT_VAT_RATE));
  const [issueDate, setIssueDate] = useState(todayUtcIso());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Form thu tiền
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState(todayUtcIso());
  const [payMethod, setPayMethod] = useState("Chuyển khoản");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/invoices?ref_type=${refType}&ref_id=${refId}`);
      const d = await r.json();
      setItems(d.items || []);
      const next = Math.max(0, ...(d.items || []).map((i: InvoiceView) => i.installment_no)) + 1;
      setInst(next);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refType, refId]);

  useEffect(() => {
    setContractNo(defaultContractNo);
  }, [refType, refId, defaultContractNo]);

  const totals = useMemo(() => {
    const live = items.filter((i) => i.status !== "cancelled");
    return {
      invoiced: live.reduce((s, i) => s + i.total, 0),
      paid: live.reduce((s, i) => s + i.paid_amount, 0),
      remaining: live.reduce((s, i) => s + i.remaining, 0),
    };
  }, [items]);

  const loadPayments = async (inv: InvoiceView) => {
    if (openId === inv.id) {
      setOpenId(null);
      return;
    }
    setOpenId(inv.id);
    setPayAmt(inv.remaining > 0 ? String(inv.remaining) : "");
    setPayDate(todayUtcIso());
    setPayMethod("Chuyển khoản");
    setPayRef("");
    setPayNote("");
    const r = await fetch(`/api/invoices/${inv.id}`);
    const d = await r.json();
    setPayments((p) => ({ ...p, [inv.id]: d.item?.payments || [] }));
  };

  const refreshOne = async (id: number) => {
    const r = await fetch(`/api/invoices/${id}`);
    const d = await r.json();
    if (d.item) {
      setItems((list) => list.map((i) => (i.id === id ? d.item : i)));
      setPayments((p) => ({ ...p, [id]: d.item.payments || [] }));
    } else {
      load();
    }
  };

  const submitNew = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_type: refType,
          ref_id: refId,
          installment_no: inst,
          title,
          contract_no: contractNo.trim(),
          payment_request: paymentRequest,
          subtotal: Number(subtotal || 0),
          vat_rate: Number(vatRate || 0),
          issue_date: issueDate,
          due_date: dueDate || null,
          notes,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Tạo hóa đơn thất bại");
      setCreatedId(d.id);
      setShowNew(false);
      setPaymentRequest(p => p ? { ...p, document_no: "", transfer_content: "", percentage: null } : null);
      setTitle("");
      setSubtotal("");
      setDueDate("");
      setNotes("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPay = async (inv: InvoiceView) => {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices/${inv.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmt || 0),
          paid_at: payDate,
          method: payMethod,
          reference: payRef,
          note: payNote,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ghi nhận thất bại");
      await refreshOne(inv.id);
      setPayAmt("");
      setPayRef("");
      setPayNote("");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (inv: InvoiceView, pid: number) => {
    if (!confirm("Xóa lần thu này? (dùng khi ghi nhầm)")) return;
    await fetch(`/api/invoices/${inv.id}/payments?payment_id=${pid}`, { method: "DELETE" });
    await refreshOne(inv.id);
  };

  const cancelInv = async (inv: InvoiceView) => {
    if (!confirm(`Hủy hóa đơn ${inv.invoice_no}?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Hủy thất bại");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteInv = async (inv: InvoiceView) => {
    if (!confirm(`Xóa hẳn hóa đơn ${inv.invoice_no}? Chỉ xóa khi tạo nhầm.`)) return;
    const r = await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Xóa thất bại");
      return;
    }
    await load();
  };

  const submitEdit = async () => {
    if (!editing) return;
    setErr("");
    setBusy(true);
    try {
      const r = await fetch(`/api/invoices/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          contract_no: editing.contract_no || "",
          payment_request: editing.payment_request,
          due_date: editing.due_date || null,
          notes: editing.notes,
          ...(editing.paid_amount === 0
            ? { subtotal: editing.subtotal, vat_rate: editing.vat_rate }
            : {}),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lưu thất bại");
      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const preview = liveTotal(Number(subtotal || 0), Number(vatRate || 0));

  if (loading) return <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-card">Đang tải hóa đơn…</div>;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-navy-900">🧾 Hóa đơn & thu tiền</h2>
          <p className="mt-0.5 text-xs text-navy-900/55">Mỗi đợt thu = 1 hóa đơn. VAT mặc định {DEFAULT_VAT_RATE}%.</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-white"
        >
          {showNew ? "Đóng" : `+ Tạo hóa đơn đợt ${inst}`}
        </button>
      </div>

      {/* Tổng hợp */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Đã xuất HĐ", value: totals.invoiced, cls: "text-navy-900" },
          { label: "Đã thu", value: totals.paid, cls: "text-emerald-600" },
          { label: "Còn phải thu", value: totals.remaining, cls: "text-amber-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.label}</div>
            <div className={`mt-1 text-lg font-extrabold ${k.cls}`}>{formatMoney(k.value)}</div>
          </div>
        ))}
      </div>

      {err && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">{err}</div>}

      {createdId && <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm">
        <span>Đã tạo hóa đơn thành công.</span>
        <Link className="font-bold text-teal-700" href={`/dashboard/ke-toan/hoa-don/${createdId}`}>Xem hóa đơn & đề nghị thanh toán →</Link>
      </div>}
      {/* Form tạo HĐ */}
      {showNew && (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-bold text-navy-900">
              Đợt thu
              <input
                type="number"
                min={1}
                value={inst}
                onChange={(e) => setInst(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-navy-900 md:col-span-2">
              Nội dung hóa đơn
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`VD: Thanh toán đợt ${inst} — triển khai FDA`}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold text-navy-900 md:col-span-3">
              Số hợp đồng
              <input
                type="text"
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
                maxLength={MAX_INVOICE_CONTRACT_NO_LENGTH}
                placeholder="VD: 158/2026/HĐDV-VEXIM"
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
              <span className="mt-1 block text-[11px] font-normal text-slate-500">
                Số hợp đồng ký với khách hàng, khác số hóa đơn. Bắt buộc khi lập giấy đề nghị thanh toán; trường hợp khác có thể để trống.
              </span>
            </label>
            <label className="text-xs font-bold text-navy-900">
              Số tiền chưa VAT (₫)
              <input
                type="number"
                min={0}
                readOnly={!!paymentRequest && paymentRequest.percentage !== null}
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="VD: 50000000"
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold text-navy-900">
              VAT (%)
              <input
                type="number"
                min={0}
                max={100}
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <div className="rounded-xl bg-white px-3 py-2 text-xs">
              <div className="font-bold text-slate-500">Tổng cộng (tự tính)</div>
              <div className="mt-0.5 text-base font-extrabold text-navy-900">{formatMoney(preview.total)}</div>
              <div className="text-slate-400">VAT: {formatMoney(preview.vat)}</div>
            </div>
            <label className="text-xs font-bold text-navy-900">
              Ngày xuất
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold text-navy-900">
              Hạn thanh toán
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-bold text-navy-900">
              Ghi chú
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          <PaymentRequestFields value={paymentRequest} defaults={requestDefaults} onChange={p => {
            setPaymentRequest(p);
            if (p && p.percentage !== null) setSubtotal(String(Math.round(p.contract_value * p.percentage / 100)));
          }} />
          <button
            onClick={submitNew}
            disabled={busy}
            className="mt-3 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-extrabold text-navy-950 disabled:opacity-50"
          >
            {busy ? "Đang tạo…" : `Tạo hóa đơn đợt ${inst} — ${formatMoney(preview.total)}`}
          </button>
        </div>
      )}

      {/* Danh sách HĐ */}
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            Chưa có hóa đơn nào. Bấm “Tạo hóa đơn đợt 1” để xuất đợt thu đầu tiên.
          </div>
        )}
        {items.map((inv) => {
          const meta = STATE_META[inv.state] || STATE_META.issued;
          const pct = inv.total > 0 ? Math.round((inv.paid_amount / inv.total) * 100) : 0;
          const isOpen = openId === inv.id;
          return (
            <div key={inv.id} className="overflow-hidden rounded-2xl border border-slate-100">
              <button
                onClick={() => loadPayments(inv)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-navy-900">{inv.invoice_no}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
                    {inv.days_overdue > 0 && inv.state === "overdue" && (
                      <span className="text-[11px] font-bold text-red-500">quá {inv.days_overdue} ngày</span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    Đợt {inv.installment_no}
                    {inv.title ? ` · ${inv.title}` : ""} · Xuất {inv.issue_date}
                    {inv.due_date ? ` · Hạn ${inv.due_date}` : ""}
                  </div>
                  {inv.contract_no && <div className="mt-1 break-all text-xs text-slate-500">Số hợp đồng: <span className="font-mono font-semibold">{inv.contract_no}</span></div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-navy-900">{formatMoney(inv.total)}</div>
                  <div className="text-[11px] font-bold text-emerald-600">
                    đã thu {formatMoney(inv.paid_amount)} ({pct}%)
                  </div>
                  {inv.remaining > 0 && inv.status !== "cancelled" && (
                    <div className="text-[11px] font-bold text-amber-600">
                      còn lại {formatMoney(inv.remaining)}
                    </div>
                  )}
                </div>
              </button>
              {inv.payment_request && inv.status !== "cancelled" && inv.remaining > 0 && <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
                <PaymentRequestDownload id={inv.id} />
                <Link className="text-xs font-bold text-teal-700" href={`/dashboard/ke-toan/hoa-don/${inv.id}/de-nghi-thanh-toan`}>Xem đề nghị</Link>
              </div>}
              {/* Tiến độ thu */}
              <div className="h-1.5 bg-slate-100">
                <div
                  className={`h-full ${inv.state === "paid" ? "bg-emerald-500" : "bg-teal-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                  <div className="grid gap-2 text-xs md:grid-cols-4">
                    <div>Chưa VAT: <b>{formatMoney(inv.subtotal)}</b></div>
                    <div>VAT {inv.vat_rate}%: <b>{formatMoney(inv.vat_amount)}</b></div>
                    <div>Tổng: <b>{formatMoney(inv.total)}</b></div>
                    <div>
                      Còn lại: <b className="text-amber-600">{formatMoney(inv.remaining)}</b>
                    </div>
                  </div>
                  {inv.notes && <div className="mt-2 text-xs text-slate-500">Ghi chú: {inv.notes}</div>}

                  {/* Lịch sử thu tiền */}
                  <div className="mt-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Lịch sử thu tiền ({(payments[inv.id] || []).length})
                    </div>
                    {(payments[inv.id] || []).length === 0 && (
                      <div className="mt-1 text-xs text-slate-400">Chưa thu đồng nào.</div>
                    )}
                    {(payments[inv.id] || []).map((p: any) => (
                      <div
                        key={p.id}
                        className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs"
                      >
                        <span className="font-extrabold text-emerald-600">+{formatMoney(p.amount)}</span>
                        <span className="text-slate-500">{String(p.paid_at).slice(0, 10)}</span>
                        {p.method && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold">{p.method}</span>}
                        {p.reference && <span className="font-mono text-slate-500">{p.reference}</span>}
                        {p.note && <span className="text-slate-400">· {p.note}</span>}
                        <button
                          onClick={() => removePayment(inv, p.id)}
                          className="ml-auto font-bold text-red-400 hover:text-red-600"
                          title="Xóa lần thu (ghi nhầm)"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Ghi nhận thu */}
                  {inv.status !== "cancelled" && inv.remaining > 0 && (
                    <div className="mt-3 rounded-xl bg-white p-3">
                      <div className="text-xs font-extrabold text-navy-900">+ Ghi nhận thu tiền</div>
                      <div className="mt-2 grid gap-2 md:grid-cols-5">
                        <input
                          type="number"
                          min={0}
                          value={payAmt}
                          onChange={(e) => setPayAmt(e.target.value)}
                          placeholder="Số tiền"
                          className="rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        >
                          <option>Chuyển khoản</option>
                          <option>Tiền mặt</option>
                          <option>Khác</option>
                        </select>
                        <input
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                          placeholder="Mã giao dịch"
                          className="rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        />
                        <input
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Ghi chú"
                          className="rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => submitPay(inv)}
                        disabled={busy}
                        className="mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                      >
                        {busy ? "Đang ghi…" : "Ghi nhận thu tiền"}
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/ke-toan/hoa-don/${inv.id}/in`}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-navy-900 shadow-sm"
                    >
                      🖨️ In
                    </Link>
                    <button
                      onClick={() => setEditing({ ...inv })}
                      className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-navy-900 shadow-sm"
                    >
                      ✏️ Sửa
                    </button>
                    {inv.status !== "cancelled" && inv.paid_amount === 0 && (
                      <button
                        onClick={() => cancelInv(inv)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-amber-600 shadow-sm"
                      >
                        Hủy HĐ
                      </button>
                    )}
                    {inv.paid_amount === 0 && (
                      <button
                        onClick={() => deleteInv(inv)}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-red-500 shadow-sm"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal sửa */}
      {editing && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-navy-950/60 p-4">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
            <h3 className="font-display text-lg font-extrabold text-navy-900">Sửa {editing.invoice_no}</h3>
            {editing.paid_amount > 0 && (
              <p className="mt-1 text-xs font-bold text-amber-600">
                Đã thu tiền nên không sửa được số tiền — có thể sửa số hợp đồng, nội dung, hạn và ghi chú.
              </p>
            )}
            {err && <p role="alert" className="mt-2 text-xs text-red-600">{err}</p>}
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold">
                Nội dung
                <input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Số hợp đồng
                <input
                  type="text"
                  value={editing.contract_no || ""}
                  maxLength={MAX_INVOICE_CONTRACT_NO_LENGTH}
                  onChange={(e) => setEditing({ ...editing, contract_no: e.target.value })}
                  placeholder="VD: 158/2026/HĐDV-VEXIM"
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                />
              </label>
              {editing.paid_amount === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold">
                    Chưa VAT
                    <input
                      type="number"
                      readOnly={!!editing.payment_request && editing.payment_request.percentage !== null}
                      value={editing.subtotal}
                      onChange={(e) => setEditing({ ...editing, subtotal: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="block text-xs font-bold">
                    VAT %
                    <input
                      type="number"
                      value={editing.vat_rate}
                      onChange={(e) => setEditing({ ...editing, vat_rate: Number(e.target.value) })}
                      className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                </div>
              )}
              <label className="block text-xs font-bold">
                Hạn thanh toán
                <input
                  type="date"
                  value={editing.due_date || ""}
                  onChange={(e) => setEditing({ ...editing, due_date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Ghi chú
                <input
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            <PaymentRequestFields value={editing.payment_request} defaults={requestDefaults} locked={editing.paid_amount > 0} onChange={p => {
              setEditing({ ...editing, payment_request: p,
                ...(p && p.percentage !== null && editing.paid_amount === 0 ? { subtotal: Math.round(p.contract_value * p.percentage / 100) } : {}) });
            }} />
            <div className="mt-4 flex gap-2">
              <button
                onClick={submitEdit}
                disabled={busy}
                className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Lưu
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
