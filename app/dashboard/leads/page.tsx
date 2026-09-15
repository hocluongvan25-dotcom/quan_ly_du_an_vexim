"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

type Lead = {
  id: number;
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  email: string;
  company_name: string;
  certificate_no: string;
  public_code: string;
  message: string;
  source_url: string;
  ip: string;
  status: "new" | "contacted" | "converted" | "closed";
  created_at: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"all" | "sales" | "amazon">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Lead["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setWarning(null);
    fetch("/api/consultation")
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.items || []);
        if (d.warning) setWarning(d.warning);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: number, status: Lead["status"]) => {
    await fetch(`/api/consultation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.service_type !== filter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    sales: leads.filter((l) => l.service_type === "sales").length,
    amazon: leads.filter((l) => l.service_type === "amazon").length,
    new: leads.filter((l) => l.status === "new").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Leads - Tư Vấn Xuất Khẩu</h1>
        <p className="mt-1 text-sm text-navy-900/60">
          Dữ liệu từ form đăng ký tư vấn 2 dịch vụ ở trang verify (B2B). Tự động gửi email về {process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@veximglobal.com"} qua Zoho SMTP.
        </p>
      </div>

      {warning && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 text-sm text-amber-900">
          <div className="font-bold flex items-center gap-2">⚠️ Cảnh báo Supabase - Bảng consultation_leads chưa tồn tại</div>
          <div className="mt-2 leading-relaxed">{warning}</div>
          <div className="mt-3 rounded-xl bg-slate-900 text-white p-3 font-mono text-xs leading-relaxed">
            <div>1. Vào Supabase Dashboard → SQL Editor</div>
            <div>2. Mở file supabase/schema.sql, copy toàn bộ và chạy</div>
            <div>3. Chạy thêm lệnh: <span className="text-amber-300">NOTIFY pgrst, 'reload schema';</span></div>
            <div>4. Đợi 10s rồi reload trang này</div>
          </div>
          <div className="mt-2 text-xs text-amber-800/80">
            Trong khi chờ migration, leads vẫn được gửi qua email (không bị mất), chỉ không lưu vào DB để hiển thị ở đây.
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="text-xs uppercase tracking-wider text-navy-900/45">Tổng Leads</div>
          <div className="mt-1 text-2xl font-extrabold">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs uppercase tracking-wider text-amber-700/70">Sale Xuất Khẩu</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-900">{stats.sales}</div>
          <div className="text-[11px] text-amber-700/60">veximtrade.com</div>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-4">
          <div className="text-xs uppercase tracking-wider text-white/50">Amazon US</div>
          <div className="mt-1 text-2xl font-extrabold">{stats.amazon}</div>
          <div className="text-[11px] text-white/50">veximops.com</div>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-700/70">Chưa liên hệ</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-900">{stats.new}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm border">
          {(["all", "sales", "amazon"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {f === "all" ? "Tất cả" : f === "sales" ? "Sale Mỹ" : "Amazon"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm border">
          {(["all", "new", "contacted", "converted", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusFilter === f ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {f === "all" ? "All Status" : f}
            </button>
          ))}
        </div>
        <button onClick={load} className="ml-auto text-xs font-semibold text-teal-700 hover:underline">↻ Reload</button>
      </div>

      <div className="rounded-3xl bg-white shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Từ chứng nhận</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Chưa có lead nào</td></tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs">{formatDate(l.created_at)}<div className="text-[11px] text-slate-400">{new Date(l.created_at).toLocaleTimeString("vi-VN")}</div></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${l.service_type === "sales" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-900 text-white"}`}>
                        {l.service_type === "sales" ? "Sale Mỹ" : "Amazon US"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{l.name}</div>
                      {l.company_name && <div className="text-xs text-slate-500">{l.company_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold"><a href={`tel:${l.phone}`} className="text-emerald-700 hover:underline">{l.phone}</a></div>
                      <div className="flex gap-1 mt-1">
                        <a href={`https://zalo.me/${l.phone.replace(/\D/g,"")}`} target="_blank" className="text-[10px] bg-[#0084ff] text-white px-2 py-0.5 rounded-full">Zalo</a>
                        {l.email && <span className="text-[11px] text-slate-500">{l.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.certificate_no && <div className="font-mono">{l.certificate_no}</div>}
                      {l.public_code && <div className="text-[11px] text-slate-400">{l.public_code}</div>}
                    </td>
                    <td className="px-4 py-3 text-[11px] max-w-[160px] truncate">
                      <a href={l.source_url} target="_blank" className="text-teal-700 hover:underline truncate block">{l.source_url ? new URL(l.source_url).pathname : "—"}</a>
                      <div className="text-slate-400">{l.ip}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={l.status} onChange={(e)=>updateStatus(l.id, e.target.value as any)} className="text-xs border rounded-full px-2 py-1 bg-white">
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="converted">converted</option>
                        <option value="closed">closed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
