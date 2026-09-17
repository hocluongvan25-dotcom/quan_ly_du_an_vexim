"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SERVICE_NAMES, type ServiceContract } from "@/lib/accounting";

export default function ServiceContractsPage() {
  const [items, setItems] = useState<ServiceContract[]>([]);
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("ALL");
  const [st, setSt] = useState("ALL");

  useEffect(() => {
    fetch("/api/service-contracts")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (svc !== "ALL" && c.service_type !== svc) return false;
      if (st !== "ALL" && c.status !== st) return false;
      const hay = `${c.contract_no} ${c.company_name} ${c.contact_name || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, svc, st]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Hợp đồng dịch vụ</h1>
          <p className="mt-1 text-sm text-navy-900/55">Sale xuất khẩu & Vận hành Amazon — chu kỳ 3 / 6 / 12 tháng</p>
        </div>
        <Link
          href="/dashboard/dich-vu/moi"
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Tạo hợp đồng
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm mã HĐ, công ty, người liên hệ…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        {["ALL", "SALE_EXPORT", "AMAZON_OPS"].map((s) => (
          <button
            key={s}
            onClick={() => setSvc(s)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              svc === s ? "bg-navy-900 text-white" : "bg-white text-navy-900"
            }`}
          >
            {s === "ALL" ? "Tất cả" : SERVICE_NAMES[s as keyof typeof SERVICE_NAMES]}
          </button>
        ))}
        {["ALL", "active", "expired", "terminated"].map((s) => (
          <button
            key={s}
            onClick={() => setSt(s)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              st === s ? "bg-teal-500 text-navy-950" : "bg-white text-navy-900"
            }`}
          >
            {s === "ALL" ? "Mọi trạng thái" : s === "active" ? "Đang hiệu lực" : s === "expired" ? "Hết hạn" : "Đã chấm dứt"}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Mã HĐ</th>
                <th className="px-4 py-3">Công ty</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Chu kỳ</th>
                <th className="px-4 py-3">Hiệu lực</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/dich-vu/${c.id}`} className="font-mono font-bold text-teal-700">
                      {c.contract_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.company_name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        c.service_type === "SALE_EXPORT" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {SERVICE_NAMES[c.service_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.cycle_months} tháng</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {String(c.started_at).slice(0, 10)} → {String(c.ends_at).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "expired"
                            ? "bg-red-100 text-red-600"
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {c.status === "active" ? "Đang hiệu lực" : c.status === "expired" ? "Hết hạn" : "Đã chấm dứt"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    Chưa có hợp đồng nào.
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
