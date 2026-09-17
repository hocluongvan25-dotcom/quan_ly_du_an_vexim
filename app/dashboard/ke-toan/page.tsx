"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/accounting";

export default function AccountingPage() {
  const [data, setData] = useState<any>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/accounting/summary")
      .then((r) => {
        if (r.status === 403) setForbidden(true);
        return r.json();
      })
      .then((d) => setData(d));
  }, []);

  if (forbidden) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-card">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-2 font-display text-xl font-extrabold text-navy-900">Chỉ Admin (kế toán) mới được xem</h1>
      </div>
    );
  }
  if (data && !data.monthly) return <div className="text-sm text-slate-500">Đang tải số liệu kế toán…</div>;
  if (!data) return <div className="text-sm text-slate-500">Đang tải số liệu kế toán…</div>;

  const { dueSoon, overdue, monthly } = data;
  const maxM = Math.max(1, ...monthly.map((m: any) => Math.max(m.invoiced, m.collected)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Kế toán — Thu chi</h1>
          <p className="mt-1 text-sm text-navy-900/55">Công nợ phải thu, hóa đơn đến hạn & dòng tiền</p>
        </div>
        <Link
          href="/dashboard/ke-toan/hoa-don"
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Tất cả hóa đơn →
        </Link>
      </div>

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Tổng đã xuất HĐ", value: data.invoiced, cls: "text-navy-900" },
          { label: "Đã thu", value: data.paid, cls: "text-emerald-600" },
          { label: "Còn phải thu", value: data.remaining, cls: "text-amber-600" },
          { label: "Quá hạn", value: data.overdueAmount, cls: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.label}</div>
            <div className={`mt-1 font-display text-2xl font-extrabold ${k.cls}`}>{formatMoney(k.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Quá hạn */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-extrabold text-red-600">
            🔴 Quá hạn ({overdue.length})
          </h2>
          {overdue.length === 0 && <p className="mt-2 text-sm text-slate-400">Không có hóa đơn quá hạn. Tốt!</p>}
          <div className="mt-3 space-y-2">
            {overdue.map((i: any) => (
              <Link
                key={i.id}
                href={`/dashboard/ke-toan/hoa-don/${i.id}`}
                className="flex items-center justify-between gap-2 rounded-2xl bg-red-50/60 px-4 py-2.5 hover:bg-red-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{i.invoice_no} · {i.company_name}</div>
                  <div className="text-[11px] font-bold text-red-500">quá {i.days_overdue} ngày · hạn {i.due_date}</div>
                </div>
                <div className="shrink-0 text-right text-sm font-extrabold text-red-600">
                  {formatMoney(i.remaining)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sắp đến hạn */}
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-extrabold text-amber-600">
            🟡 Đến hạn trong 7 ngày ({dueSoon.length})
          </h2>
          {dueSoon.length === 0 && <p className="mt-2 text-sm text-slate-400">Không có hóa đơn sắp đến hạn.</p>}
          <div className="mt-3 space-y-2">
            {dueSoon.map((i: any) => (
              <Link
                key={i.id}
                href={`/dashboard/ke-toan/hoa-don/${i.id}`}
                className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50/60 px-4 py-2.5 hover:bg-amber-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{i.invoice_no} · {i.company_name}</div>
                  <div className="text-[11px] font-bold text-amber-600">hạn {i.due_date}</div>
                </div>
                <div className="shrink-0 text-right text-sm font-extrabold text-amber-600">
                  {formatMoney(i.remaining)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Dòng tiền 12 tháng */}
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-extrabold text-navy-900">Dòng tiền 12 tháng gần nhất</h2>
        <div className="mt-1 flex gap-4 text-xs font-bold text-slate-400">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-navy-900" />Đã xuất HĐ</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded bg-teal-500" />Đã thu</span>
        </div>
        <div className="mt-4 flex h-48 items-end gap-2">
          {monthly.map((m: any) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${m.month}: xuất ${formatMoney(m.invoiced)} / thu ${formatMoney(m.collected)}`}>
              <div className="flex h-36 w-full items-end justify-center gap-1">
                <div className="w-full max-w-[18px] rounded-t bg-navy-900/80" style={{ height: `${(m.invoiced / maxM) * 100}%` }} />
                <div className="w-full max-w-[18px] rounded-t bg-teal-500" style={{ height: `${(m.collected / maxM) * 100}%` }} />
              </div>
              <div className="text-[10px] font-bold text-slate-400">{m.month.slice(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
