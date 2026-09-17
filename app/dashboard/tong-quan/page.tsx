"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import {
  Briefcase,
  CheckCircle2,
  Filter,
  Globe,
  MessageSquare,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { EmployeeOverview, GrowthBucket, OverviewStats } from "@/lib/overview";
import { formatCrmValue } from "@/lib/crm-types";
import { formatVnd } from "@/lib/utils";

type Period = "months" | "quarters" | "years";
const PERIOD_TABS: Array<{ key: Period; label: string }> = [
  { key: "months", label: "Tháng" },
  { key: "quarters", label: "Quý" },
  { key: "years", label: "Năm" },
];

export default function OverviewPage() {
  const [data, setData] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [growthTab, setGrowthTab] = useState<Period>("months");
  const [empId, setEmpId] = useState<number | null>(null);
  const [empTab, setEmpTab] = useState<Period>("months");

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json().then((d) => ({ ok: r.ok, status: r.status, d })))
      .then(({ ok, status, d }) => {
        if (!ok) {
          if (status === 403) setForbidden(true);
          else setError(d.error || "Tải thất bại");
        } else {
          setData(d);
          if (d.employees?.length) setEmpId(d.employees[0].id);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải...</div>;
  }
  if (forbidden) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-card">
        <div className="text-lg font-bold">🔒 Chỉ Admin mới được xem Toàn cảnh</div>
        <Link href="/dashboard" className="mt-3 inline-block text-sm font-bold text-teal-700">
          ← Về Tổng quan
        </Link>
      </div>
    );
  }
  if (error || !data) {
    return <div className="rounded-3xl bg-white p-12 text-center font-bold text-rose-600 shadow-card">{error || "Lỗi"}</div>;
  }

  const emp = data.employees.find((e) => e.id === empId) || data.employees[0];
  const growthRows = data.growth[growthTab];
  const empRows = emp?.series[empTab] || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          <Globe className="h-3.5 w-3.5" /> Dành cho Admin
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Toàn cảnh vận hành</h1>
        <p className="mt-1 text-sm text-navy-900/60">
          Bao trùm mọi dịch vụ: CRM + doanh thu chứng nhận + leads — tăng trưởng & KPI nhân viên theo tháng, quý, năm.
        </p>
      </div>

      {/* KPI tổng */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi icon={<Wallet className="h-5 w-5" />} label="Doanh thu đã ghi nhận" value={formatVnd(data.kpis.recordedRevenueTotal)} hint={`12 tháng gần nhất: ${formatCrmValue(data.kpis.recordedRevenue12m)}`} tone="navy" />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Giá trị chốt CRM (12T)" value={formatCrmValue(data.kpis.wonValue12m)} hint={`Tỷ lệ chốt ${data.kpis.conversion12m}%`} tone="green" />
        <Kpi icon={<Briefcase className="h-5 w-5" />} label="Cơ hội đang mở" value={String(data.kpis.openOpps)} hint={`Giá trị dự kiến ${formatCrmValue(data.kpis.openValue)}`} tone="navy" />
        <Kpi icon={<MessageSquare className="h-5 w-5" />} label="Leads 12 tháng" value={String(data.kpis.leads12m)} hint={`${data.kpis.oppsCreated12m} cơ hội mới được tạo`} tone="amber" />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Tỷ lệ chốt (12T)" value={`${data.kpis.conversion12m}%`} hint="Chốt / (Chốt + Mất)" tone="green" />
        <Kpi icon={<Users className="h-5 w-5" />} label="Nhân sự hoạt động" value={String(data.kpis.activeEmployees)} hint={`Tổng ${data.employees.length} tài khoản`} tone="amber" />
      </div>

      {/* Phễu 12 tháng */}
      <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Filter className="h-5 w-5 text-teal-400" /> Phễu bán hàng — 12 tháng gần nhất
        </h2>
        <div className="mt-4 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <FunnelBox label="Leads" value={data.funnel12m.leads} />
          <FunnelArrow label={`${data.funnel12m.leadToOpp}%`} />
          <FunnelBox label="Cơ hội mới" value={data.funnel12m.opps} />
          <FunnelArrow label={`${data.funnel12m.oppToWon}%`} />
          <FunnelBox label="Chốt" value={data.funnel12m.won} highlight />
        </div>
        <p className="mt-3 text-xs text-white/50">
          Lead → Cơ hội: lead tư vấn được tạo thành cơ hội CRM. Cơ hội → Chốt: cơ hội đi đến ký hợp đồng.
        </p>
      </section>

      {/* Tăng trưởng */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">📈 Tăng trưởng toàn công ty</h2>
          <PeriodTabs tab={growthTab} onTab={setGrowthTab} />
        </div>
        <GrowthCharts rows={growthRows} />
        <GrowthTable rows={growthRows} showRevenue showLeads />
      </section>

      {/* KPI nhân viên */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">👥 KPI từng nhân viên (12 tháng)</h2>
        <p className="mt-0.5 text-xs text-navy-900/55">Bấm vào thẻ nhân viên để xem biểu đồ chi tiết theo kỳ.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.employees.map((e) => (
            <button
              key={e.id}
              onClick={() => setEmpId(e.id)}
              className={`rounded-2xl border-2 p-4 text-left transition ${
                emp?.id === e.id
                  ? "border-navy-900 bg-navy-900 text-white shadow-card"
                  : "border-navy-900/10 hover:border-navy-900/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-extrabold">{e.name}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    emp?.id === e.id ? "bg-teal-500 text-navy-950" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {e.role === "admin" ? "Admin" : "Sale"}
                </span>
              </div>
              <div className={`mt-2 grid grid-cols-3 gap-1 text-center text-xs ${emp?.id === e.id ? "text-white/80" : "text-navy-900/55"}`}>
                <div>
                  <div className="text-lg font-extrabold">{e.totals.won}</div>
                  <div>Chốt</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">{e.totals.conversion}%</div>
                  <div>Tỷ lệ</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold">{e.totals.activities}</div>
                  <div>Hoạt động</div>
                </div>
              </div>
              <div className={`mt-2 truncate text-xs font-bold ${emp?.id === e.id ? "text-teal-400" : "text-teal-700"}`}>
                Chốt {formatCrmValue(e.totals.wonValue)} · Ghi nhận {formatCrmValue(e.totals.revenueRecorded)}
              </div>
            </button>
          ))}
          {data.employees.length === 0 && <div className="text-sm text-slate-400">Chưa có nhân sự.</div>}
        </div>

        {emp && (
          <div className="mt-4 rounded-3xl border border-navy-900/10 bg-[#fffaf0] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-extrabold">
                Biểu đồ của {emp.name} — {emp.totals.won} chốt · {emp.totals.conversion}% · {formatCrmValue(emp.totals.wonValue)}
              </h3>
              <PeriodTabs tab={empTab} onTab={setEmpTab} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <MiniStat label="Cơ hội mới" value={String(emp.totals.oppsCreated)} />
              <MiniStat label="Chốt / Mất" value={`${emp.totals.won} / ${emp.totals.lost}`} />
              <MiniStat label="Hoạt động" value={String(emp.totals.activities)} />
              <MiniStat label="Giá trị chốt" value={formatCrmValue(emp.totals.wonValue)} />
              <MiniStat label="DThu ghi nhận" value={formatCrmValue(emp.totals.revenueRecorded)} />
            </div>
            <div className="mt-3">
              <GrowthCharts rows={empRows} showActivities />
            </div>
            <GrowthTable rows={empRows} showRevenue showActivities />
          </div>
        )}
      </section>
    </div>
  );
}

/* --------------------------------- pieces -------------------------------- */

function PeriodTabs({ tab, onTab }: { tab: Period; onTab: (t: Period) => void }) {
  return (
    <div className="flex gap-1 rounded-full border bg-slate-50 p-1">
      {PERIOD_TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTab(t.key)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
            tab === t.key ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function GrowthCharts({ rows, showActivities }: { rows: GrowthBucket[]; showActivities?: boolean }) {
  const valueData = rows.map((r) => ({
    label: r.label,
    "Chốt CRM (tr)": Math.round((r.wonValue / 1000000) * 10) / 10,
    "DThu ghi nhận (tr)": Math.round((r.recordedRevenue / 1000000) * 10) / 10,
  }));
  const countData = rows.map((r) => ({
    label: r.label,
    Leads: r.leads,
    "Cơ hội mới": r.oppsCreated,
    Chốt: r.won,
    ...(showActivities ? { "Hoạt động": r.activities } : {}),
  }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-navy-900/10 bg-white p-3">
        <div className="mb-1 px-1 text-xs font-bold text-navy-900/60">Giá trị (triệu VND)</div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={valueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(v: any) => [`${v} tr`, ""]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Chốt CRM (tr)" fill="#E8B22A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="DThu ghi nhận (tr)" fill="#24180C" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-2xl border border-navy-900/10 bg-white p-3">
        <div className="mb-1 px-1 text-xs font-bold text-navy-900/60">Số lượng</div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={countData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Cơ hội mới" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Chốt" fill="#16a34a" radius={[6, 6, 0, 0]} />
            {showActivities && <Bar dataKey="Hoạt động" fill="#f59e0b" radius={[6, 6, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GrowthTable({
  rows,
  showRevenue,
  showLeads,
  showActivities,
}: {
  rows: GrowthBucket[];
  showRevenue?: boolean;
  showLeads?: boolean;
  showActivities?: boolean;
}) {
  const totals = rows.reduce(
    (t, r) => ({
      oppsCreated: t.oppsCreated + r.oppsCreated,
      won: t.won + r.won,
      lost: t.lost + r.lost,
      wonValue: t.wonValue + r.wonValue,
      recordedRevenue: t.recordedRevenue + r.recordedRevenue,
      leads: t.leads + r.leads,
      activities: t.activities + r.activities,
    }),
    { oppsCreated: 0, won: 0, lost: 0, wonValue: 0, recordedRevenue: 0, leads: 0, activities: 0 }
  );
  const conv = totals.won + totals.lost > 0 ? Math.round((totals.won / (totals.won + totals.lost)) * 100) : 0;
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-navy-900/10 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-navy-900/45">
          <tr>
            <th className="px-4 py-2">Kỳ</th>
            {showLeads && <th className="px-4 py-2 text-right">Leads</th>}
            <th className="px-4 py-2 text-right">Cơ hội mới</th>
            <th className="px-4 py-2 text-right">Chốt</th>
            <th className="px-4 py-2 text-right">Mất</th>
            {showActivities && <th className="px-4 py-2 text-right">Hoạt động</th>}
            <th className="px-4 py-2 text-right">Tỷ lệ chốt</th>
            <th className="px-4 py-2 text-right">Giá trị chốt</th>
            {showRevenue && <th className="px-4 py-2 text-right">DThu ghi nhận</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-navy-900/5">
              <td className="px-4 py-2 font-bold">{r.label}</td>
              {showLeads && <td className="px-4 py-2 text-right">{r.leads}</td>}
              <td className="px-4 py-2 text-right">{r.oppsCreated}</td>
              <td className="px-4 py-2 text-right font-bold text-emerald-600">{r.won}</td>
              <td className="px-4 py-2 text-right text-rose-600">{r.lost}</td>
              {showActivities && <td className="px-4 py-2 text-right">{r.activities}</td>}
              <td className="px-4 py-2 text-right">{r.won + r.lost > 0 ? `${r.conversion}%` : "—"}</td>
              <td className="px-4 py-2 text-right font-bold text-teal-700">{formatCrmValue(r.wonValue)}</td>
              {showRevenue && <td className="px-4 py-2 text-right font-semibold">{formatCrmValue(r.recordedRevenue)}</td>}
            </tr>
          ))}
          <tr className="border-t-2 border-navy-900/15 bg-[#fffaf0] font-extrabold">
            <td className="px-4 py-2">Tổng</td>
            {showLeads && <td className="px-4 py-2 text-right">{totals.leads}</td>}
            <td className="px-4 py-2 text-right">{totals.oppsCreated}</td>
            <td className="px-4 py-2 text-right text-emerald-600">{totals.won}</td>
            <td className="px-4 py-2 text-right text-rose-600">{totals.lost}</td>
            {showActivities && <td className="px-4 py-2 text-right">{totals.activities}</td>}
            <td className="px-4 py-2 text-right">{conv}%</td>
            <td className="px-4 py-2 text-right text-teal-700">{formatCrmValue(totals.wonValue)}</td>
            {showRevenue && <td className="px-4 py-2 text-right">{formatCrmValue(totals.recordedRevenue)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "navy" | "amber" | "green";
}) {
  const toneCls =
    tone === "amber"
      ? "bg-amber-50 text-amber-600"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-teal-50 text-teal-700";
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneCls}`}>{icon}</div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </div>
  );
}

function FunnelBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex-1 rounded-2xl p-4 text-center ${highlight ? "bg-teal-500 text-navy-950" : "bg-white/10"}`}>
      <div className="font-display text-3xl font-extrabold">{value}</div>
      <div className={`text-xs font-bold uppercase tracking-wider ${highlight ? "" : "text-white/60"}`}>{label}</div>
    </div>
  );
}

function FunnelArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1 px-1 text-sm font-extrabold text-teal-400">
      <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs">{label}</span>
      <span className="hidden md:inline">→</span>
      <span className="md:hidden">↓</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-0.5 font-display text-lg font-extrabold">{value}</div>
    </div>
  );
}
