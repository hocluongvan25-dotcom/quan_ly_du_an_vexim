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
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Flame,
  Plus,
  Target,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { formatCrmValue, type CrmOpportunityEnriched } from "@/lib/crm-types";
import { formatDate } from "@/lib/utils";
import { MigrationWarning } from "@/components/crm/CrmWidgets";

type DashboardData = {
  openCount: number;
  openValue: number;
  wonMonth: number;
  wonMonthValue: number;
  lostMonth: number;
  followupToday: number;
  overdueSla: number;
  missingAction: number;
  stale: number;
  pipelineStats: Array<{
    key: string;
    name: string;
    stages: Array<{ key: string; name: string; color: string; count: number; value: number; is_won: boolean; is_lost: boolean }>;
    openCount: number;
    openValue: number;
  }>;
  alerts: CrmOpportunityEnriched[];
  myToday: CrmOpportunityEnriched[];
  avgStageDays: Array<{ pipeline_key: string; pipeline_name: string; stage_key: string; stage_name: string; avg_days: number; samples: number }>;
  ownerStats: Array<{ owner_id: number | null; owner_name: string; open: number; openValue: number; won: number; lost: number; conversion: number }>;
  dropoff: Array<{ pipeline_key: string; pipeline_name: string; from_stage: string; count: number }>;
  trend: Array<{ month: string; created: number; won: number; wonValue: number; lost: number }>;
  me: { id: number; role: string };
};

type PeriodRow = {
  key: string;
  label: string;
  created: number;
  won: number;
  wonValue: number;
  lost: number;
  conversion: number;
};

/** Gộp trend tháng thành quý / năm */
function groupTrend(
  trend: DashboardData["trend"],
  mode: "month" | "quarter" | "year"
): PeriodRow[] {
  const map = new Map<string, PeriodRow>();
  for (const t of trend || []) {
    const [y, m] = t.month.split("-");
    const mi = Number(m);
    const key = mode === "month" ? t.month : mode === "quarter" ? `${y}-Q${Math.floor((mi - 1) / 3) + 1}` : y;
    const label =
      mode === "month" ? `${m}/${y}` : mode === "quarter" ? `Q${Math.floor((mi - 1) / 3) + 1}/${y}` : y;
    const cur = map.get(key) || { key, label, created: 0, won: 0, wonValue: 0, lost: 0, conversion: 0 };
    cur.created += t.created;
    cur.won += t.won;
    cur.wonValue += t.wonValue;
    cur.lost += t.lost;
    map.set(key, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((r) => ({
      ...r,
      conversion: r.won + r.lost > 0 ? Math.round((r.won / (r.won + r.lost)) * 100) : 0,
    }));
}

const PIPELINE_TABS = [
  { key: "", label: "Tất cả dịch vụ" },
  { key: "FDA", label: "FDA" },
  { key: "GACC", label: "GACC" },
  { key: "SALE_EXPORT", label: "Sale XK Mỹ" },
  { key: "AMAZON_OPS", label: "Amazon US" },
];

export default function CrmDashboardPage() {
  const [pipeline, setPipeline] = useState("");
  const [pipeTab, setPipeTab] = useState("");
  const [periodTab, setPeriodTab] = useState<"month" | "quarter" | "year">("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  const load = (p = pipeline) => {
    setLoading(true);
    setWarning(null);
    fetch(`/api/crm/dashboard${p ? `?pipeline=${p}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.warning) {
          setWarning(d.warning);
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự chọn tab pipeline: ưu tiên pipeline đang lọc, rồi pipeline có dữ liệu
  useEffect(() => {
    if (!data) return;
    const keys = data.pipelineStats.map((p) => p.key);
    if (pipeline && keys.includes(pipeline)) {
      setPipeTab(pipeline);
      return;
    }
    if (!pipeTab || !keys.includes(pipeTab)) {
      const withData = data.pipelineStats.find((p) => p.openCount > 0);
      setPipeTab(withData?.key || keys[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pipeline]);

  const pick = (p: string) => {
    setPipeline(p);
    load(p);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            CRM Vận hành
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">
            Toàn cảnh cơ hội bán hàng
          </h1>
          <p className="mt-1 text-sm text-navy-900/60">
            Bao nhiêu cơ hội? Ở giai đoạn nào? Bao lâu? Bước tiếp theo? Có bị bỏ quên không?
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/crm/pipeline"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
          >
            Kanban Pipeline →
          </Link>
          <Link
            href="/dashboard/crm/co-hoi/moi"
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-4 w-4" /> Cơ hội mới
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl border bg-white p-1 shadow-sm">
        {PIPELINE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => pick(t.key)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              pipeline === t.key ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {warning && <MigrationWarning text={warning} />}

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải...</div>
      ) : data ? (
        <>
          {/* Hàng 1: KPI */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={<Briefcase className="h-5 w-5" />}
              label="Cơ hội đang mở"
              value={String(data.openCount)}
              hint={`Giá trị dự kiến ${formatCrmValue(data.openValue)}`}
              tone="navy"
            />
            <Kpi
              icon={<CalendarClock className="h-5 w-5" />}
              label="Cần follow-up"
              value={String(data.followupToday)}
              hint="Đến hạn hôm nay hoặc đã trễ"
              tone={data.followupToday > 0 ? "amber" : "green"}
            />
            <Kpi
              icon={<Flame className="h-5 w-5" />}
              label="Quá hạn SLA"
              value={String(data.overdueSla)}
              hint={`${data.stale} khách ≥14 ngày chưa cập nhật`}
              tone={data.overdueSla > 0 ? "red" : "green"}
            />
            <Kpi
              icon={<Target className="h-5 w-5" />}
              label="Thiếu bước tiếp theo"
              value={String(data.missingAction)}
              hint="Cơ hội mở nhưng chưa có next action"
              tone={data.missingAction > 0 ? "amber" : "green"}
            />
          </div>

          {/* Hàng 2: Pipeline hiện tại — tab ngang theo dịch vụ */}
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Pipeline hiện tại — mỗi khách ở giai đoạn nào?</h2>
              <Link href="/dashboard/crm/pipeline" className="shrink-0 text-sm font-semibold text-teal-700">
                Mở Kanban →
              </Link>
            </div>
            {data.pipelineStats.length > 1 && (
              <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto border-b border-navy-900/10 pb-3">
                {data.pipelineStats.map((p) => {
                  const active = pipeTab === p.key;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPipeTab(p.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "bg-navy-900 text-white shadow-card"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                          active ? "bg-teal-500 text-navy-950" : "bg-white text-navy-900"
                        }`}
                      >
                        {p.openCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {(() => {
              const p = data.pipelineStats.find((x) => x.key === pipeTab) || data.pipelineStats[0];
              if (!p) return <div className="text-sm text-slate-400">Chưa có pipeline nào.</div>;
              const max = Math.max(1, ...p.stages.filter((s) => !s.is_lost).map((s) => s.count));
              return (
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-bold">{p.name}</span>
                    <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      {p.openCount} đang mở · {formatCrmValue(p.openValue)}
                    </span>
                    <Link
                      href={`/dashboard/crm/pipeline?pipeline=${p.key}`}
                      className="ml-auto text-xs font-bold text-teal-700 hover:underline"
                    >
                      Kanban {p.name} →
                    </Link>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {p.stages
                      .filter((s) => !s.is_won && !s.is_lost)
                      .map((s) => (
                        <Link
                          key={s.key}
                          href={`/dashboard/crm/pipeline?pipeline=${p.key}`}
                          className="rounded-2xl border border-navy-900/10 p-3 transition hover:shadow-card"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                            {s.name}
                          </div>
                          <div className="mt-1 font-display text-2xl font-extrabold">{s.count}</div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(s.count / max) * 100}%`, background: s.color }}
                            />
                          </div>
                        </Link>
                      ))}
                  </div>
                  <div className="mt-3 flex gap-3 text-xs font-semibold">
                    {p.stages
                      .filter((s) => s.is_won || s.is_lost)
                      .map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1 text-navy-900/60">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.name}: {s.count}
                        </span>
                      ))}
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Hàng 2.5: Tổng kết theo kỳ */}
          <PeriodSummary trend={data.trend} tab={periodTab} onTab={setPeriodTab} />

          {/* Hàng 3: Cảnh báo + Việc của tôi */}
          <div className="grid gap-4 lg:grid-cols-5">
            <section className="rounded-3xl bg-white p-5 shadow-card lg:col-span-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Cần hành động ngay
              </h2>
              <p className="mt-0.5 text-xs text-navy-900/55">
                Cơ hội quá SLA · bị bỏ quên · trễ follow-up · thiếu next action
              </p>
              <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {data.alerts.length === 0 && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Tuyệt vời — không có cơ hội nào cần cảnh báo.
                  </div>
                )}
                {data.alerts.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/crm/co-hoi/${o.id}`}
                    className="block rounded-2xl border border-navy-900/10 p-3 transition hover:shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{o.company_name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-navy-900/55">
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 font-bold text-white"
                            style={{ background: o.stage_color }}
                          >
                            {o.stage_name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" /> {o.owner_name || "Chưa gán"}
                          </span>
                          <span>· {o.days_in_stage} ngày ở giai đoạn này</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {o.alerts.map((a, i) => (
                        <span
                          key={i}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.type === "sla" || a.type === "stale"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {a.label}
                        </span>
                      ))}
                    </div>
                    {o.next_action && (
                      <div className="mt-1 truncate text-[11px] text-navy-900/60">
                        → {o.next_action}
                        {o.next_action_date ? ` · hẹn ${formatDate(o.next_action_date)}` : ""}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card lg:col-span-2">
              <h2 className="font-display text-lg font-bold">📌 Việc của tôi</h2>
              <p className="mt-0.5 text-xs text-white/55">Follow-up đến hạn & sắp đến hạn của bạn</p>
              <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {data.myToday.length === 0 && (
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                    Không có việc gấp. Hãy kiểm tra cơ hội thiếu next action.
                  </div>
                )}
                {data.myToday.map((o) => (
                  <Link
                    key={o.id}
                    href={`/dashboard/crm/co-hoi/${o.id}`}
                    className="block rounded-2xl bg-white/10 p-3 transition hover:bg-white/15"
                  >
                    <div className="truncate text-sm font-bold">{o.company_name}</div>
                    <div className="mt-0.5 text-[11px] text-white/60">
                      {o.stage_name} · {o.pipeline_name}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-amber-300">
                      {o.next_action || "⚠ Chưa có bước tiếp theo"}
                    </div>
                    {o.next_action_date && (
                      <div
                        className={`text-[11px] font-bold ${
                          o.days_to_followup !== null && o.days_to_followup < 0
                            ? "text-rose-300"
                            : "text-teal-400"
                        }`}
                      >
                        {formatDate(o.next_action_date)}
                        {o.days_to_followup !== null && o.days_to_followup < 0
                          ? ` · trễ ${Math.abs(o.days_to_followup)} ngày`
                          : o.days_to_followup === 0
                            ? " · hôm nay"
                            : o.days_to_followup === 1
                              ? " · ngày mai"
                              : ""}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-emerald-500/20 p-3">
                  <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" /> {data.wonMonth}
                  </div>
                  <div className="text-[11px] text-white/60">Chốt tháng này</div>
                  <div className="text-[11px] font-bold text-emerald-300">{formatCrmValue(data.wonMonthValue)}</div>
                </div>
                <div className="rounded-2xl bg-rose-500/20 p-3">
                  <div className="flex items-center justify-center gap-1 text-2xl font-extrabold text-rose-300">
                    <XCircle className="h-5 w-5" /> {data.lostMonth}
                  </div>
                  <div className="text-[11px] text-white/60">Mất tháng này</div>
                </div>
              </div>
            </section>
          </div>

          {/* Hàng 4: Insights */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <TrendingUp className="h-4 w-4 text-teal-600" /> Thời gian TB mỗi giai đoạn
              </h2>
              <div className="mt-3 space-y-2">
                {data.avgStageDays.length === 0 && (
                  <div className="text-sm text-slate-400">Chưa đủ dữ liệu lịch sử.</div>
                )}
                {data.avgStageDays.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {s.stage_name}
                      <span className="ml-1 text-[11px] text-slate-400">({s.pipeline_key})</span>
                    </span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                      {s.avg_days} ngày
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <h2 className="font-display text-base font-bold">🏆 Hiệu suất theo sale</h2>
              <div className="mt-3 space-y-2">
                {data.ownerStats.map((o, i) => (
                  <div key={i} className="rounded-2xl border border-navy-900/10 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{o.owner_name}</span>
                      <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white">
                        Chốt {o.conversion}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-navy-900/60">
                      {o.open} đang mở ({formatCrmValue(o.openValue)}) · ✅ {o.won} · ❌ {o.lost}
                    </div>
                  </div>
                ))}
                {data.ownerStats.length === 0 && (
                  <div className="text-sm text-slate-400">Chưa có dữ liệu.</div>
                )}
              </div>
            </section>
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <h2 className="font-display text-base font-bold">🔍 Mất khách ở đâu nhiều nhất?</h2>
              <div className="mt-3 space-y-2">
                {data.dropoff.length === 0 && (
                  <div className="text-sm text-slate-400">Chưa có dữ liệu mất khách.</div>
                )}
                {data.dropoff.slice(0, 8).map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {d.from_stage}
                      <span className="ml-1 text-[11px] text-slate-400">({d.pipeline_key})</span>
                    </span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                      {d.count} khách
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/crm/pipeline"
                className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold hover:bg-slate-200"
              >
                Xem toàn bộ pipeline <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PeriodSummary({
  trend,
  tab,
  onTab,
}: {
  trend: DashboardData["trend"];
  tab: "month" | "quarter" | "year";
  onTab: (t: "month" | "quarter" | "year") => void;
}) {
  const rows = groupTrend(trend, tab);
  const chartData = rows.map((r) => ({
    label: r.label,
    "Giá trị chốt (tr)": Math.round((r.wonValue / 1000000) * 10) / 10,
    "Mới": r.created,
    "Chốt": r.won,
    "Mất": r.lost,
  }));
  const totals = rows.reduce(
    (t, r) => ({ created: t.created + r.created, won: t.won + r.won, lost: t.lost + r.lost, wonValue: t.wonValue + r.wonValue }),
    { created: 0, won: 0, lost: 0, wonValue: 0 }
  );
  const totalConv = totals.won + totals.lost > 0 ? Math.round((totals.won / (totals.won + totals.lost)) * 100) : 0;
  const hasData = totals.created + totals.won + totals.lost > 0;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">📊 Tổng kết theo kỳ</h2>
          <p className="mt-0.5 text-xs text-navy-900/55">
            Cơ hội mới · chốt · mất · tỷ lệ chốt từng {tab === "month" ? "tháng" : tab === "quarter" ? "quý" : "năm"} (12 tháng gần nhất)
          </p>
        </div>
        <div className="flex gap-1 rounded-full border bg-slate-50 p-1">
          {(
            [
              ["month", "Tháng"],
              ["quarter", "Quý"],
              ["year", "Năm"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => onTab(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                tab === k ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-400">
          Chưa có dữ liệu trong 12 tháng gần nhất.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-navy-900/10 p-3">
              <div className="mb-1 px-1 text-xs font-bold text-navy-900/60">Giá trị chốt được (triệu VND)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => [`${v} tr`, ""]} />
                  <Bar dataKey="Giá trị chốt (tr)" fill="#E8B22A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl border border-navy-900/10 p-3">
              <div className="mb-1 px-1 text-xs font-bold text-navy-900/60">Số lượng cơ hội</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Mới" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Chốt" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Mất" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-navy-900/45">
                <tr>
                  <th className="pb-2">Kỳ</th>
                  <th className="pb-2 text-right">Mới</th>
                  <th className="pb-2 text-right">Chốt</th>
                  <th className="pb-2 text-right">Mất</th>
                  <th className="pb-2 text-right">Tỷ lệ chốt</th>
                  <th className="pb-2 text-right">Giá trị chốt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-navy-900/5">
                    <td className="py-2 font-bold">{r.label}</td>
                    <td className="py-2 text-right">{r.created}</td>
                    <td className="py-2 text-right font-bold text-emerald-600">{r.won}</td>
                    <td className="py-2 text-right text-rose-600">{r.lost}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.conversion >= 50
                            ? "bg-emerald-100 text-emerald-700"
                            : r.conversion > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.won + r.lost > 0 ? `${r.conversion}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2 text-right font-bold text-teal-700">{formatCrmValue(r.wonValue)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy-900/15 bg-[#fffaf0] font-extrabold">
                  <td className="py-2">Tổng</td>
                  <td className="py-2 text-right">{totals.created}</td>
                  <td className="py-2 text-right text-emerald-600">{totals.won}</td>
                  <td className="py-2 text-right text-rose-600">{totals.lost}</td>
                  <td className="py-2 text-right">{totalConv}%</td>
                  <td className="py-2 text-right text-teal-700">{formatCrmValue(totals.wonValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
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
  tone: "navy" | "amber" | "red" | "green";
}) {
  const toneCls =
    tone === "red"
      ? "bg-rose-50 text-rose-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "green"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-teal-50 text-teal-700";
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneCls}`}>{icon}</div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </div>
  );
}
