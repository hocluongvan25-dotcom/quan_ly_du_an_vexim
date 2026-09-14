"use client";

import { useEffect, useState } from "react";
import { formatVnd } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stats = {
  total: number;
  fda: number;
  gacc: number;
  count: number;
  months: Array<{ month: string; FDA: number; GACC: number; total: number }>;
  quarters: Array<{ quarter: string; FDA: number; GACC: number; total: number }>;
  years: Array<{ year: string; FDA: number; GACC: number; total: number }>;
  recent: Array<{
    certificate_no: string;
    company_name: string;
    standard: string;
    service_price: number;
    published_at: string;
  }>;
};

export default function RevenuePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"month" | "quarter" | "year">("month");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/revenue").then(async (r) => {
      if (!r.ok) {
        setErr("Chỉ quản trị viên được xem doanh thu.");
        return;
      }
      setStats(await r.json());
    });
  }, []);

  if (err) {
    return <div className="rounded-3xl bg-white p-8 text-navy-900/60">{err}</div>;
  }
  if (!stats) return <div className="text-sm text-navy-900/50">Đang tải thống kê...</div>;

  const data =
    tab === "month" ? stats.months : tab === "quarter" ? stats.quarters : stats.years;
  const key = tab === "month" ? "month" : tab === "quarter" ? "quarter" : "year";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-navy-900">Doanh thu FDA & GACC</h1>
        <p className="mt-1 text-sm text-navy-900/55">
          Chi phí được cộng vào hệ thống ngay khi hồ sơ xuất bản. Không hiển thị trên landing page khách hàng.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Tổng doanh thu" value={formatVnd(stats.total)} hint={`${stats.count} hồ sơ xuất bản`} />
        <Card label="FDA" value={formatVnd(stats.fda)} hint="Chu kỳ 2 năm" />
        <Card label="GACC" value={formatVnd(stats.gacc)} hint="Chu kỳ 5 năm" />
      </div>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["month", "Theo tháng"],
              ["quarter", "Theo quý"],
              ["year", "Theo năm"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === k ? "bg-navy-900 text-white" : "bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6eef2" />
              <XAxis dataKey={key} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1e6)}tr`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatVnd(v)} />
              <Legend />
              <Bar dataKey="FDA" fill="#0A2F4A" radius={[6, 6, 0, 0]} />
              <Bar dataKey="GACC" fill="#128C86" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Hồ sơ đã ghi doanh thu</h2>
        <div className="mt-3 divide-y divide-navy-900/5">
          {stats.recent.map((r) => (
            <div key={r.certificate_no} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-semibold">{r.company_name}</div>
                <div className="text-xs text-navy-900/45">
                  {r.certificate_no} · {r.standard} · {r.published_at}
                </div>
              </div>
              <div className="font-bold text-navy-900">{formatVnd(r.service_price)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-2 font-display text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </div>
  );
}
