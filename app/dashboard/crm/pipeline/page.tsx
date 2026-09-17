"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import type { CrmOpportunityEnriched, CrmPipeline } from "@/lib/crm-types";
import { MigrationWarning, MoveStageModal, OppCard } from "@/components/crm/CrmWidgets";

/** Số thẻ hiển thị ban đầu mỗi cột — chống lag khi 1 giai đoạn có hàng trăm khách */
const PAGE_SIZE = 12;

type SortKey = "priority" | "followup" | "value" | "updated";
type AlertKey = "all" | "sla" | "stale" | "followup" | "no_action";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "priority", label: "🚨 Cần xử lý trước" },
  { key: "followup", label: "⏰ Hẹn follow-up gần nhất" },
  { key: "value", label: "💰 Giá trị cao trước" },
  { key: "updated", label: "🕒 Mới cập nhật" },
];

const ALERT_OPTIONS: Array<{ key: AlertKey; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "sla", label: "⚠️ Quá SLA" },
  { key: "stale", label: "🔕 Bị bỏ quên" },
  { key: "followup", label: "⏰ Trễ hẹn" },
  { key: "no_action", label: "📌 Thiếu next action" },
];

function compareOpps(a: CrmOpportunityEnriched, b: CrmOpportunityEnriched, sort: SortKey): number {
  if (sort === "priority") {
    const rank = (o: CrmOpportunityEnriched) => (o.health === "danger" ? 0 : o.health === "warning" ? 1 : 2);
    return rank(a) - rank(b) || b.days_in_stage - a.days_in_stage;
  }
  if (sort === "followup") {
    const da = a.days_to_followup ?? 9999;
    const db = b.days_to_followup ?? 9999;
    return da - db || b.days_in_stage - a.days_in_stage;
  }
  if (sort === "value") {
    return (b.estimated_value || 0) - (a.estimated_value || 0);
  }
  return String(b.updated_at).localeCompare(String(a.updated_at));
}

function PipelineBoard() {
  const searchParams = useSearchParams();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [pipelineKey, setPipelineKey] = useState(searchParams.get("pipeline") || "FDA");
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CrmOpportunityEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [moving, setMoving] = useState<CrmOpportunityEnriched | null>(null);
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [alertFilter, setAlertFilter] = useState<AlertKey>("all");
  const [visibleCount, setVisibleCount] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe({ id: d.user.id, role: d.user.role });
          if (d.user.role !== "admin") setScope("mine");
        }
      })
      .catch(() => {});
    fetch("/api/crm/pipelines")
      .then((r) => r.json())
      .then((d) => {
        setPipelines(d.items || []);
        if (d.warning) setWarning(d.warning);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (pipelineKey) sp.set("pipeline", pipelineKey);
    sp.set("scope", scope);
    if (q) sp.set("q", q);
    fetch(`/api/crm/opportunities?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        if (d.warning) setWarning(d.warning);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pipelineKey, scope, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Đổi bộ lọc / pipeline → thu gọn các cột về PAGE_SIZE
  useEffect(() => {
    setVisibleCount({});
  }, [pipelineKey, scope, q, sortBy, alertFilter]);

  // Lọc + sắp xếp phía client (chịu được hàng trăm thẻ, chỉ render PAGE_SIZE thẻ/cột)
  const visible = useMemo(() => {
    const filtered =
      alertFilter === "all" ? items : items.filter((o) => o.alerts.some((a) => a.type === alertFilter));
    return [...filtered].sort((a, b) => compareOpps(a, b, sortBy));
  }, [items, alertFilter, sortBy]);

  const pipe = pipelines.find((p) => p.key === pipelineKey) || pipelines[0];
  const stages = [...(pipe?.stages || [])].sort((a, b) => a.sort_order - b.sort_order);
  const openStages = stages.filter((s) => !s.is_won && !s.is_lost);
  const endStages = stages.filter((s) => s.is_won || s.is_lost);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">CRM Vận hành</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Pipeline bán hàng</h1>
          <p className="mt-1 text-sm text-navy-900/60">
            Mỗi khách bắt buộc ở một giai đoạn — không có “đang chăm sóc” chung chung.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/crm"
            className="rounded-xl border border-navy-900/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
          <Link
            href={`/dashboard/crm/co-hoi/moi${pipelineKey ? `?pipeline=${pipelineKey}` : ""}`}
            className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-navy-950 hover:bg-teal-400"
          >
            <Plus className="h-4 w-4" /> Cơ hội mới
          </Link>
        </div>
      </div>

      {warning && <MigrationWarning text={warning} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-2xl border bg-white p-1 shadow-sm">
          {pipelines.map((p) => (
            <button
              key={p.key}
              onClick={() => setPipelineKey(p.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                pipelineKey === p.key || (!pipelineKey && p === pipelines[0])
                  ? "bg-navy-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border bg-white p-1 shadow-sm">
          <button
            onClick={() => setScope("mine")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === "mine" ? "bg-teal-500 text-navy-950" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Của tôi
          </button>
          <button
            onClick={() => setScope("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${scope === "all" ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Cả team
          </button>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm công ty, người liên hệ, SĐT..."
            className="input w-64 !pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl border bg-white px-3 py-1.5 shadow-sm">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-transparent text-xs font-bold outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1 rounded-2xl border bg-white p-1 shadow-sm">
          {ALERT_OPTIONS.map((o) => {
            const count =
              o.key === "all" ? items.length : items.filter((x) => x.alerts.some((a) => a.type === o.key)).length;
            return (
              <button
                key={o.key}
                onClick={() => setAlertFilter(o.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  alertFilter === o.key ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {o.label} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-xs font-semibold text-navy-900/50">
          {alertFilter !== "all" || q ? (
            <>
              Đang hiện <span className="font-extrabold text-navy-900">{visible.length}</span> / {items.length} cơ hội
            </>
          ) : (
            <>
              Tổng <span className="font-extrabold text-navy-900">{items.length}</span> cơ hội
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải...</div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {openStages.map((s) => {
              const cards = visible.filter((o) => o.stage_id === s.id);
              const shown = visibleCount[s.id] ?? PAGE_SIZE;
              const slice = cards.slice(0, shown);
              const remaining = cards.length - slice.length;
              return (
                <div key={s.id} className="w-[300px] shrink-0 rounded-3xl bg-white/70 p-3 shadow-sm">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm font-extrabold">{s.name}</span>
                    <span className="ml-auto rounded-full bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white">
                      {cards.length}
                    </span>
                  </div>
                  {s.sla_days > 0 && (
                    <div className="mb-2 px-1 text-[11px] font-semibold text-navy-900/45">
                      Chuẩn: ≤ {s.sla_days} ngày
                      {cards.length > shown && (
                        <span className="ml-1 font-bold text-teal-700">
                          · hiện {slice.length}/{cards.length}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-0.5">
                    {cards.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-navy-900/15 p-4 text-center text-xs text-navy-900/35">
                        {alertFilter !== "all" ? "Không có khách nào khớp bộ lọc" : "Trống"}
                      </div>
                    )}
                    {slice.map((o) => (
                      <OppCard key={o.id} opp={o} onMove={setMoving} />
                    ))}
                    {remaining > 0 && (
                      <button
                        onClick={() => setVisibleCount((v) => ({ ...v, [s.id]: shown + PAGE_SIZE }))}
                        className="w-full rounded-2xl border-2 border-dashed border-teal-600/40 bg-teal-50/50 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-50"
                      >
                        Xem thêm {Math.min(PAGE_SIZE, remaining)} / còn {remaining} khách ↓
                      </button>
                    )}
                    {shown > PAGE_SIZE && remaining === 0 && cards.length > PAGE_SIZE && (
                      <button
                        onClick={() => setVisibleCount((v) => ({ ...v, [s.id]: PAGE_SIZE }))}
                        className="w-full rounded-2xl py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        Thu gọn ↑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {endStages.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {endStages.map((s) => {
                const cards = items.filter((o) => o.stage_id === s.id);
                return (
                  <div key={s.id} className="rounded-3xl bg-white p-4 shadow-card">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                      <span className="text-sm font-extrabold">
                        {s.name} ({cards.length})
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {cards.slice(0, 6).map((o) => (
                        <Link
                          key={o.id}
                          href={`/dashboard/crm/co-hoi/${o.id}`}
                          className="truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          {o.company_name}
                          <span className="ml-1 font-normal text-slate-400">· {o.owner_name}</span>
                        </Link>
                      ))}
                      {cards.length === 0 && <div className="text-xs text-slate-400">Chưa có.</div>}
                      {cards.length > 6 && (
                        <div className="text-xs text-slate-400">+ {cards.length - 6} cơ hội khác</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {moving && pipe && (
        <MoveStageModal
          opp={moving}
          pipeline={pipe}
          onClose={() => setMoving(null)}
          onMoved={() => load()}
        />
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-12 text-center text-slate-400">Đang tải...</div>}>
      <PipelineBoard />
    </Suspense>
  );
}
