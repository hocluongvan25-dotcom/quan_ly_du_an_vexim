"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { formatDate, formatVnd, fromNow } from "@/lib/utils";

type Customer = {
  id: number;
  company_name: string;
  opportunity_id: number;
  opportunity_code: string;
  value: number;
  standard: string | null;
  won_at: string;
  owner_name?: string;
  certificate_id?: number | null;
  certificate_no?: string;
};

/** Khách hàng = cơ hội đã Won. Đây là đầu ra thật của pipeline. */
export default function CrmCustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);

  useEffect(() => {
    fetch("/api/crm/customers")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }, []);

  const total = items.reduce((s, c) => s + c.value, 0);
  const linked = items.filter((c) => c.certificate_id).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          VEXIM CRM · Khách hàng
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">
          Khách hàng đã chốt
        </h1>
        <p className="mt-1 text-sm text-navy-900/60">
          {items.length} khách hàng · tổng giá trị {formatVnd(total)} · {linked}/{items.length || 0} đã
          gắn hồ sơ FDA/GACC
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Cơ hội</th>
                <th className="px-4 py-3">Chuẩn</th>
                <th className="px-4 py-3">Giá trị</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Ngày thắng</th>
                <th className="px-4 py-3">Hồ sơ FDA/GACC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-navy-900/5">
                  <td className="px-4 py-3 font-semibold text-navy-900">{c.company_name}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/crm/co-hoi/${c.opportunity_id}`}
                      className="font-semibold text-teal-700"
                    >
                      {c.opportunity_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.standard || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatVnd(c.value)}</td>
                  <td className="px-4 py-3">{c.owner_name || "—"}</td>
                  <td className="px-4 py-3">
                    {formatDate(c.won_at)}
                    <div className="text-[11px] text-navy-900/40">{fromNow(c.won_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.certificate_id ? (
                      <Link
                        href={`/dashboard/ho-so/${c.certificate_id}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700"
                      >
                        <Award className="h-4 w-4" /> {c.certificate_no}
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-amber-600">
                        Chưa gắn hồ sơ — cần bổ sung
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-navy-900/50">
                    Chưa có khách hàng nào. Khi AE chuyển cơ hội sang Won, khách sẽ xuất hiện ở đây.
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
