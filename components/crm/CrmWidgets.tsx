"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Phone, User, X } from "lucide-react";
import { WinCelebration } from "./Celebration";
import {
  LOST_REASONS,
  formatCrmValue,
  type CrmOpportunityEnriched,
  type CrmPipeline,
} from "@/lib/crm-types";
import { formatDate } from "@/lib/utils";

/* ------------------------------ small pieces ----------------------------- */

export function StagePill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ background: color }}
    >
      {name}
    </span>
  );
}

export function HealthDot({ health }: { health: "good" | "warning" | "danger" }) {
  const cls =
    health === "danger"
      ? "bg-rose-500"
      : health === "warning"
        ? "bg-amber-400"
        : "bg-emerald-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} title={health} />;
}

export function AlertBadges({ opp }: { opp: CrmOpportunityEnriched }) {
  if (!opp.alerts.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {opp.alerts.map((a, i) => (
        <span
          key={i}
          title={a.detail}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            a.type === "sla" || a.type === "stale"
              ? "bg-rose-100 text-rose-700 border border-rose-200"
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          {a.label}
        </span>
      ))}
    </div>
  );
}

export function MigrationWarning({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-bold">⚠️ Chưa chạy migration CRM trên Supabase</div>
      <div className="mt-2 leading-relaxed">{text}</div>
      <div className="mt-3 rounded-xl bg-slate-900 p-3 font-mono text-xs leading-relaxed text-white">
        <div>1. Vào Supabase Dashboard → SQL Editor</div>
        <div>2. Mở file supabase/schema.sql, copy toàn bộ và chạy</div>
        <div>
          3. Chạy thêm lệnh: <span className="text-amber-300">NOTIFY pgrst, 'reload schema';</span>
        </div>
        <div>4. Đợi 10s rồi reload trang này</div>
      </div>
    </div>
  );
}

/* -------------------------------- OppCard -------------------------------- */

export function OppCard({
  opp,
  onMove,
}: {
  opp: CrmOpportunityEnriched;
  onMove: (opp: CrmOpportunityEnriched) => void;
}) {
  return (
    <div className="rounded-2xl border border-navy-900/10 bg-white p-3 shadow-sm transition hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/crm/co-hoi/${opp.id}`}
          className="min-w-0 flex-1 text-sm font-bold leading-snug text-navy-900 hover:text-teal-700 hover:underline"
        >
          {opp.company_name}
        </Link>
        <HealthDot health={opp.health} />
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-navy-900/55">
        <span className="inline-flex items-center gap-1">
          <User className="h-3 w-3" /> {opp.owner_name || "Chưa gán"}
        </span>
        {opp.estimated_value > 0 && (
          <span className="font-bold text-teal-700">{formatCrmValue(opp.estimated_value)}</span>
        )}
      </div>

      {opp.contact_name && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-navy-900/55">
          <Phone className="h-3 w-3" />
          <span className="truncate">
            {opp.contact_name}
            {opp.contact_phone ? ` · ${opp.contact_phone}` : ""}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
            opp.alerts.some((a) => a.type === "sla")
              ? "bg-rose-100 text-rose-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <Clock className="h-3 w-3" />
          {opp.days_in_stage} ngày ở giai đoạn này
        </span>
      </div>

      {opp.is_open && (
        <div className="mt-2 rounded-xl bg-teal-50 px-2.5 py-2 text-[11px]">
          <div className="font-semibold text-navy-900/70">Bước tiếp theo:</div>
          {opp.next_action ? (
            <>
              <div className="font-bold text-navy-900">{opp.next_action}</div>
              {opp.next_action_date && (
                <div
                  className={`mt-0.5 font-semibold ${
                    opp.days_to_followup !== null && opp.days_to_followup < 0
                      ? "text-rose-600"
                      : "text-teal-700"
                  }`}
                >
                  Hẹn: {formatDate(opp.next_action_date)}
                  {opp.days_to_followup !== null && opp.days_to_followup < 0
                    ? ` (trễ ${Math.abs(opp.days_to_followup)} ngày)`
                    : opp.days_to_followup === 0
                      ? " (hôm nay)"
                      : ""}
                </div>
              )}
            </>
          ) : (
            <div className="font-bold text-amber-700">— Chưa có, cần bổ sung —</div>
          )}
        </div>
      )}

      <div className="mt-2">
        <AlertBadges opp={opp} />
      </div>

      {opp.is_open && (
        <button
          onClick={() => onMove(opp)}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-navy-900 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
        >
          Chuyển giai đoạn <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
      {opp.is_lost && opp.lost_reason && (
        <div className="mt-2 rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700">
          Lý do: {opp.lost_reason}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- MoveStageModal ---------------------------- */

export function MoveStageModal({
  opp,
  pipeline,
  onClose,
  onMoved,
}: {
  opp: CrmOpportunityEnriched;
  pipeline: CrmPipeline;
  onClose: () => void;
  onMoved: (updated: CrmOpportunityEnriched) => void;
}) {
  const stages = useMemo(
    () => [...(pipeline.stages || [])].sort((a, b) => a.sort_order - b.sort_order),
    [pipeline]
  );
  const currentIdx = stages.findIndex((s) => s.id === opp.stage_id);
  const [targetId, setTargetId] = useState<number>(() => stages[currentIdx + 1]?.id || 0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wonInfo, setWonInfo] = useState<{
    company: string;
    value: string;
    owner: string;
    email: string;
    rawValue: number;
  } | null>(null);

  const target = stages.find((s) => s.id === targetId);
  const isForward = target ? target.sort_order > (stages[currentIdx]?.sort_order ?? 0) : false;
  const needCriteria = target && !target.is_lost && (isForward || target.is_won);
  const current = stages[currentIdx];

  async function submit() {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/opportunities/${opp.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_stage_id: target.id,
          checklist,
          note,
          lost_reason: lostReason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Chuyển giai đoạn thất bại");
      onMoved(d.opp);
      if (target.is_won) {
        setWonInfo({
          company: d.opp.company_name || opp.company_name,
          value: formatCrmValue(d.opp.estimated_value || 0),
          owner: d.opp.owner_name || "",
          email: d.opp.contact_email || "",
          rawValue: d.opp.estimated_value || 0,
        });
      } else {
        onClose();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {wonInfo && target?.is_won && (
        <WinCelebration
          companyName={wonInfo.company}
          valueLabel={wonInfo.value}
          ownerName={wonInfo.owner}
          detailHref={`/dashboard/crm/co-hoi/${opp.id}`}
          pipelineKey={pipeline.key}
          contactEmail={wonInfo.email}
          estimatedValue={wonInfo.rawValue}
          onClose={onClose}
        />
      )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-extrabold">Chuyển giai đoạn</h3>
            <p className="mt-0.5 text-sm text-navy-900/60">{opp.company_name}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-1.5 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <StagePill name={current?.name || opp.stage_name} color={current?.color || opp.stage_color} />
          <ArrowRight className="h-4 w-4 text-navy-900/40" />
          <select
            value={targetId}
            onChange={(e) => setTargetId(Number(e.target.value))}
            className="input font-bold"
          >
            <option value={0}>— Chọn giai đoạn —</option>
            {stages
              .filter((s) => s.id !== opp.stage_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_won ? " ✅" : ""}
                  {s.is_lost ? " ⛔" : ""}
                </option>
              ))}
          </select>
        </div>

        {target && !target.is_lost && !isForward && !target.is_won && (
          <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            ↩ Chuyển lùi — không yêu cầu điều kiện, hệ thống chỉ ghi log.
          </div>
        )}

        {needCriteria && current && (
          <div className="mt-4 rounded-2xl border border-navy-900/10 bg-[#fffaf0] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
              Điều kiện rời “{current.name}”
            </div>
            {current.exit_criteria?.length ? (
              <div className="mt-2 space-y-2">
                {current.exit_criteria.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!checklist[c.key]}
                      onChange={(e) => setChecklist({ ...checklist, [c.key]: e.target.checked })}
                      className="mt-1 h-4 w-4 accent-amber-600"
                    />
                    <span className="font-medium">
                      {c.label}
                      {c.required && <span className="ml-1 text-rose-500">*</span>}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-navy-900/50">Không có điều kiện bắt buộc.</div>
            )}
          </div>
        )}

        {target?.is_lost && (
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
              Lý do không phù hợp <span className="text-rose-500">*</span>
            </label>
            <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="input mt-1">
              <option value="">— Chọn lý do —</option>
              {LOST_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
            Ghi chú chuyển giai đoạn
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="VD: Khách đã nhận báo giá, hẹn thứ 6 phản hồi..."
            className="input mt-1"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-navy-900/15 py-2.5 text-sm font-bold"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={!target || saving}
            className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? "Đang chuyển..." : "Xác nhận chuyển"}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
