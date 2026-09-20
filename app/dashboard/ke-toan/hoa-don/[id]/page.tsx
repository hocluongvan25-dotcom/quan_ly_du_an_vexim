"use client";

import PaymentRequestDownload from "@/components/accounting/PaymentRequestDownload";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/accounting";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [inv, setInv] = useState<any>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then((r) => {
      if (r.status === 403) {
        setForbidden(true);
        return null;
      }
      return r.json();
    }).then((d) => d && setInv(d.item || null));
  }, [id]);

  if (forbidden) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-card">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-2 font-display text-xl font-extrabold text-navy-900">Chỉ Admin (kế toán) mới được xem</h1>
      </div>
    );
  }

  if (!inv) return <div className="text-sm text-slate-500">Đang tải hóa đơn…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/dashboard/ke-toan/hoa-don" className="text-sm font-bold text-teal-700">
        ← Về danh sách hóa đơn
      </Link>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm font-bold text-slate-400">{inv.invoice_no}</div>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-navy-900">
              Hóa đơn đợt {inv.installment_no}
            </h1>
            {inv.title && <p className="mt-1 text-sm text-slate-500">{inv.title}</p>}
          </div>
          <Link
            href={`/dashboard/ke-toan/hoa-don/${inv.id}/in`}
            className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-white"
          >
            🖨️ In hóa đơn
          </Link>
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Chứng từ gốc</span>
            <Link
              href={inv.ref_type === "certificate" ? `/dashboard/ho-so/${inv.ref_id}` : `/dashboard/dich-vu/${inv.ref_id}`}
              className="font-bold text-teal-700"
            >
              {inv.ref_type === "certificate" ? "Hồ sơ" : "Hợp đồng dịch vụ"} #{inv.ref_id} →
            </Link>
          </div>
          <div className="flex justify-between gap-4"><span className="shrink-0 text-slate-400">Số hợp đồng</span><b className="min-w-0 break-all text-right font-mono">{inv.contract_no || "—"}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">Số tiền chưa VAT</span><b>{formatMoney(inv.subtotal)}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">VAT {inv.vat_rate}%</span><b>{formatMoney(inv.vat_amount)}</b></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-bold">Tổng cộng</span><b className="text-navy-900">{formatMoney(inv.total)}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">Đã thu</span><b className="text-emerald-600">{formatMoney(inv.paid_amount)}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">Còn lại</span><b className="text-amber-600">{formatMoney(inv.remaining)}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">Ngày xuất</span><b>{inv.issue_date}</b></div>
          <div className="flex justify-between"><span className="text-slate-400">Hạn thanh toán</span><b>{inv.due_date || "—"}</b></div>
          {inv.notes && <div className="text-xs text-slate-500">Ghi chú: {inv.notes}</div>}
        </div>

        <section className="mt-5 rounded-2xl border border-navy-900/10 p-4">
          <h2 className="font-bold">Giấy đề nghị thanh toán</h2>
          {inv.status === "cancelled" || inv.remaining <= 0 ? <p className="mt-2 text-sm text-slate-500">Hóa đơn đã hủy hoặc đã thu đủ tiền, không xuất đề nghị thanh toán.</p>
            : inv.payment_request ? <div className="mt-3 flex flex-wrap items-center gap-3">
              <PaymentRequestDownload id={inv.id} />
              <Link className="text-sm font-bold text-teal-700" href={`/dashboard/ke-toan/hoa-don/${inv.id}/de-nghi-thanh-toan`}>Xem nội dung đề nghị →</Link>
            </div> : <p className="mt-2 text-sm text-slate-500">Chưa có thông tin đề nghị thanh toán. Mở chứng từ gốc → Sửa hóa đơn để bổ sung ngày ký, giá trị hợp đồng và thông tin nhận tiền.</p>}
          <p className="mt-2 text-xs text-slate-500">PDF A4 gửi khách; số tiền đề nghị là số còn phải thu tại thời điểm tải. Không thay thế hóa đơn điện tử thuế.</p>
        </section>
        <h2 className="mt-5 font-display text-base font-extrabold text-navy-900">
          Lịch sử thu tiền ({(inv.payments || []).length})
        </h2>
        <div className="mt-2 space-y-2">
          {(inv.payments || []).length === 0 && (
            <p className="text-sm text-slate-400">Chưa thu đồng nào.</p>
          )}
          {(inv.payments || []).map((p: any) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 text-sm">
              <span className="font-extrabold text-emerald-600">+{formatMoney(p.amount)}</span>
              <span className="text-slate-500">{String(p.paid_at).slice(0, 10)}</span>
              {p.method && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">{p.method}</span>}
              {p.reference && <span className="font-mono text-xs text-slate-500">{p.reference}</span>}
              {p.note && <span className="text-xs text-slate-400">· {p.note}</span>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Thu tiền / sửa / hủy hóa đơn thực hiện tại trang chứng từ gốc (link ở trên).
        </p>
      </div>
    </div>
  );
}
