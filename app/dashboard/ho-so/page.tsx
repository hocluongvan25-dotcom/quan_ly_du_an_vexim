"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDate, formatVnd, remainingDays, statusLabel } from "@/lib/utils";
import type { Certificate } from "@/lib/types";
import { Search } from "lucide-react";

export default function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [q, setQ] = useState("");
  const [std, setStd] = useState("ALL");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/certificates")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ""));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (std !== "ALL" && c.standard !== std) return false;
      const hay = `${c.certificate_no} ${c.company_name} ${c.registration_code}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, std]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Hồ sơ FDA & GACC</h1>
          <p className="mt-1 text-sm text-navy-900/55">Bộ phận chuyên môn điền thông tin sau khi đăng ký xong.</p>
        </div>
        <Link
          href="/dashboard/ho-so/moi"
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Tạo hồ sơ
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm công ty, mã chứng chỉ, mã số..."
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        {["ALL", "FDA", "GACC"].map((s) => (
          <button
            key={s}
            onClick={() => setStd(s)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              std === s ? "bg-navy-900 text-white" : "bg-white text-navy-900"
            }`}
          >
            {s === "ALL" ? "Tất cả" : s}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[#f7fafb] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Certificate No</th>
                <th className="px-4 py-3">Công ty</th>
                <th className="px-4 py-3">Standards</th>
                <th className="px-4 py-3">Mã số</th>
                <th className="px-4 py-3">Ngày ĐK / Hết hạn</th>
                <th className="px-4 py-3">Còn lại</th>
                {role === "admin" && <th className="px-4 py-3">Giá dịch vụ</th>}
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const left = remainingDays(c.expires_at);
                return (
                  <tr key={c.id} className="border-t border-navy-900/5 hover:bg-teal-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/ho-so/${c.id}`} className="font-semibold text-navy-900">
                        {c.certificate_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.company_name}</td>
                    <td className="px-4 py-3 font-bold">{c.standard}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.registration_code}</td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(c.registered_at)}
                      <div className="text-navy-900/45">→ {formatDate(c.expires_at)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{left < 0 ? "—" : `${left} ngày`}</td>
                    {role === "admin" && (
                      <td className="px-4 py-3 text-xs">{formatVnd(c.service_price)}</td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                          c.status === "draft"
                            ? "bg-slate-100 text-slate-600"
                            : left < 0
                              ? "bg-rose-50 text-rose-600"
                              : c.validity_confirmed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {c.validity_confirmed && c.status !== "draft" && left >= 0
                          ? "VALID"
                          : statusLabel(c.status, left)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-navy-900/45">
                    Chưa có hồ sơ phù hợp.
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
