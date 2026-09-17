"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatMoney, type InvoiceView } from "@/lib/accounting";

const STATES = [
  { k: "ALL", label: "Tất cả" },
  { k: "overdue", label: "Quá hạn" },
  { k: "due_soon", label: "Sắp đến hạn" },
  { k: "issued", label: "Đã xuất" },
  { k: "partial", label: "Thu một phần" },
  { k: "paid", label: "Đã thu đủ" },
  { k: "cancelled", label: "Đã hủy" },
];

export default function InvoicesPage() {
  const [items, setItems] = useState<InvoiceView[]>([]);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("ALL");

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (st !== "ALL" && i.state !== st) return false;
      const hay = `${i.invoice_no} ${i.title || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, st]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Tất cả hóa đơn</h1>
          <p className="mt-1 text-sm text-navy-900/55">
            Tạo hóa đơn từ trang chi tiết hồ sơ / hợp đồng — mỗi đợt thu 1 hóa đơn
          </p>
        </div>
        <Link href="/dashboard/ke-toan" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold shadow-sm">
          ← Tổng quan kế toán
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số HĐ, nội dung…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        {STATES.map((s) => (
          <button
            key={s.k}
            onClick={() => setSt(s.k)}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              st === s.k ? "bg-navy-900 text-white" : "bg-white text-navy-900"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Số HĐ</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Chứng từ gốc</th>
                <th className="px-4 py-3">Ngày xuất</th>
                <th className="px-4 py-3">Hạn</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3 text-right">Đã thu</th>
                <th className="px-4 py-3 text-right">Còn lại</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/ke-toan/hoa-don/${i.id}`} className="font-mono font-bold text-teal-700">
                      {i.invoice_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">Đợt {i.installment_no}{i.title ? ` — ${i.title}` : ""}</td>
                  <td className="px-4 py-3 text-xs">
                    <Link
                      href={i.ref_type === "certificate" ? `/dashboard/ho-so/${i.ref_id}` : `/dashboard/dich-vu/${i.ref_id}`}
                      className="font-bold text-teal-700"
                    >
                      {i.ref_type === "certificate" ? "Hồ sơ" : "Hợp đồng"} #{i.ref_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{i.issue_date}</td>
                  <td className="px-4 py-3 text-xs">{i.due_date || "—"}</td>
                  <td className="px-4 py-3 text-right font-extrabold">{formatMoney(i.total)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatMoney(i.paid_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600">{formatMoney(i.remaining)}</td>
                  <td className="px-4 py-3 text-xs font-bold">
                    {i.state === "paid" ? "Đã thu đủ" : i.state === "overdue" ? `Quá hạn ${i.days_overdue} ngày` : i.state === "partial" ? "Thu một phần" : i.state === "due_soon" ? "Sắp đến hạn" : i.state === "cancelled" ? "Đã hủy" : "Đã xuất"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    Chưa có hóa đơn nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
