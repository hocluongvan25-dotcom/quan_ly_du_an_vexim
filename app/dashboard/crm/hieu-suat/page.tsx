"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { RoleBadge } from "@/components/CrmBits";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { cn, compactVnd, formatVnd } from "@/lib/utils";

type Member = {
  id: number;
  name: string;
  email: string;
  role: string;
  team_id: number | null;
  leads_created: number;
  leads_converted: number;
  activities_30d: number;
  opportunities: number;
  open_opportunities: number;
  open_value: number;
  weighted_value: number;
  won: number;
  won_value: number;
  lost: number;
  win_rate: number;
  stale: number;
  overdue_actions: number;
};

type Team = {
  id: number;
  name: string;
  ae_name: string;
  member_count: number;
  leads: number;
  opportunities: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedPipeline: number;
  wonValue: number;
  expectedRevenue: number;
  won: number;
  lost: number;
  rates: { leadToOpp: number; winRate: number; conversionRate: number };
  stale: number;
};

/**
 * Hiệu suất theo member & team — Founder/AE nhìn vào đây để biết
 * ai đang tạo pipeline, ai đang để cơ hội ngủ quên, thay vì hỏi từng người.
 */
export default function CrmPerformancePage() {
  const [data, setData] = useState<{ members: Member[]; teams: Team[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/crm/performance").then(async (r) => {
      if (!r.ok) {
        setErr("Chỉ Founder / AE được xem hiệu suất đội sales.");
        return;
      }
      setData(await r.json());
    });
  }, []);

  if (err) return <div className="rounded-3xl bg-white p-8 text-navy-900/60">{err}</div>;
  if (!data) return <div className="text-sm text-navy-900/50">Đang tải dữ liệu hiệu suất...</div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          VEXIM CRM · Hiệu suất
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">
          Hiệu suất team &amp; thành viên
        </h1>
        <p className="mt-1 text-sm text-navy-900/60">
          Số liệu để hành động: ai cần thêm lead, ai đang để cơ hội ngủ quên, ai chốt tốt.
        </p>
      </div>

      {data.teams.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.teams.map((t) => (
            <section key={t.id} className="rounded-3xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold">{t.name}</h2>
                  <p className="text-xs text-navy-900/50">
                    AE: {t.ae_name} · {t.member_count} thành viên
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-navy-900/45">
                    Pipeline
                  </div>
                  <div className="font-display text-lg font-extrabold text-navy-900">
                    {compactVnd(t.pipelineValue)} ₫
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Cell label="Lead" value={String(t.leads)} />
                <Cell label="Cơ hội mở" value={String(t.openOpportunities)} />
                <Cell label="Won" value={String(t.won)} />
                <Cell label="Win rate" value={`${t.rates.winRate}%`} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-navy-900/70">
                  Expected revenue {compactVnd(t.expectedRevenue)} ₫
                </span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-navy-900/70">
                  Đã thắng {compactVnd(t.wonValue)} ₫
                </span>
                {t.stale > 0 ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
                    {t.stale} cơ hội ngủ quên
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                    Pipeline khoẻ
                  </span>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Thành viên</th>
                <th className="px-4 py-3">Lead tạo</th>
                <th className="px-4 py-3">Lead chuyển đổi</th>
                <th className="px-4 py-3">Hoạt động 30 ngày</th>
                <th className="px-4 py-3">Cơ hội mở</th>
                <th className="px-4 py-3">Pipeline</th>
                <th className="px-4 py-3">Won</th>
                <th className="px-4 py-3">Win rate</th>
                <th className="px-4 py-3">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className="border-t border-navy-900/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={m.role} />
                      <div>
                        <div className="font-semibold text-navy-900">{m.name}</div>
                        <div className="text-[11px] text-navy-900/45">{m.email}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-navy-900/40">
                      {ROLE_LABEL[m.role as Role]}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m.leads_created}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {m.leads_converted}
                    <span className="text-[11px] text-navy-900/40">
                      {" "}
                      ({m.leads_created ? Math.round((m.leads_converted / m.leads_created) * 100) : 0}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        m.activities_30d >= 10
                          ? "bg-emerald-100 text-emerald-700"
                          : m.activities_30d >= 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      )}
                    >
                      {m.activities_30d}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m.open_opportunities}</td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{formatVnd(m.open_value)}</div>
                    <div className="text-[11px] text-navy-900/45">
                      weighted {compactVnd(m.weighted_value)} ₫
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="tabular-nums">{m.won}</div>
                    <div className="text-[11px] text-navy-900/45">{compactVnd(m.won_value)} ₫</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m.win_rate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.stale > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> {m.stale} ngủ quên
                        </span>
                      )}
                      {m.overdue_actions > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          {m.overdue_actions} follow-up trễ
                        </span>
                      )}
                      {m.stale === 0 && m.overdue_actions === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Ổn
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.members.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-navy-900/50">
                    Chưa có thành viên sales nào (AE / SR / LR).
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

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-teal-50 p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="font-display text-base font-extrabold text-navy-900">{value}</div>
    </div>
  );
}
