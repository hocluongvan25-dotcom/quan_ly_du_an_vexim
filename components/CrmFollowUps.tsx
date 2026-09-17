"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { daysUntil, formatDate, formatVnd } from "@/lib/utils";
import { CRM_STAGES, type CrmOpportunity } from "@/lib/types";
import type { FollowUpRow } from "@/lib/crm-core";

/**
 * Checklist follow-up của AE.
 *
 * Mỗi dòng là một việc thật, và `id` trỏ đúng bản ghi cần đóng:
 *  - kind = "opportunity" → next action gắn trên cơ hội (đóng bằng complete_next_action)
 *  - kind = "activity"    → follow-up có hạn đã hẹn (đóng bằng PUT /api/crm/activities/:id)
 *
 * Bản trước dùng id của cơ hội để gọi API hoạt động, nên bấm "Xong" là đóng nhầm
 * một activity khác — đây chính là lỗi đã sửa.
 */
export function CrmFollowUps({
  items,
  emptyLabel = "Không có follow-up nào đang chờ.",
}: {
  items: FollowUpRow[];
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function complete(row: FollowUpRow) {
    const key = `${row.kind}-${row.id}`;
    setBusy(key);
    setErr("");
    const url =
      row.kind === "activity" ? `/api/crm/activities/${row.id}` : `/api/crm/opportunities/${row.id}`;
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: row.kind === "opportunity" ? JSON.stringify({ action: "complete_next_action" }) : undefined,
    });
    setBusy(null);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || "Không đóng được follow-up này.");
      return;
    }
    router.refresh();
  }

  function href(row: FollowUpRow) {
    if (row.opportunity_id) return `/dashboard/crm/co-hoi/${row.opportunity_id}`;
    if (row.lead_id) return `/dashboard/crm/leads/${row.lead_id}`;
    return "/dashboard/crm";
  }

  if (!items.length) {
    return <p className="py-6 text-sm text-navy-900/50">{emptyLabel}</p>;
  }

  return (
    <div>
      {err && (
        <p className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>
      )}
      <ul className="divide-y divide-navy-900/5">
        {items.map((row) => {
          const d = daysUntil(row.due_at);
          const overdue = row.overdue || (d !== null && d < 0);
          const key = `${row.kind}-${row.id}`;
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-navy-900">{row.label}</span>
                  {row.code && <span className="text-[11px] text-navy-900/40">{row.code}</span>}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.kind === "activity"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-navy-900/5 text-navy-900/55"
                    }`}
                  >
                    {row.kind === "activity" ? "Follow-up đã hẹn" : "Next action"}
                  </span>
                  {overdue && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      Quá hạn {d !== null ? Math.abs(d) : 0} ngày
                    </span>
                  )}
                  {d === 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Đến hạn hôm nay
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm text-navy-900/70">{row.subject}</div>
                <div className="mt-0.5 text-[11px] text-navy-900/45">
                  Hạn {row.due_at ? formatDate(row.due_at) : "chưa đặt"} · owner{" "}
                  {row.owner_name || "—"}
                </div>
              </div>
              {typeof row.value === "number" && row.value > 0 && (
                <div className="text-sm text-navy-900/70">{formatVnd(row.value)}</div>
              )}
              <a
                href={href(row)}
                className="rounded-xl border border-navy-900/10 px-3 py-1.5 text-xs font-bold text-navy-900/70 hover:bg-navy-900/5"
              >
                Mở
              </a>
              <button
                onClick={() => complete(row)}
                disabled={busy === key}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/25 disabled:opacity-50"
                title="Ghi nhận đã làm xong và nhắc owner đặt next action mới"
              >
                <CheckCircle2 className="h-4 w-4" /> Xong
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StageStrip({ stage }: { stage: CrmOpportunity["stage"] }) {
  const order = CRM_STAGES.filter((s) => s.key !== "lost");
  const idx = order.findIndex((s) => s.key === stage);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {order.map((s, i) => {
        const done = stage === "lost" ? false : i <= idx;
        const active = s.key === stage;
        return (
          <span
            key={s.key}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              active
                ? "bg-navy-900 text-white"
                : done
                  ? "bg-teal-100 text-teal-700"
                  : "bg-navy-900/5 text-navy-900/40"
            }`}
          >
            {s.short}
          </span>
        );
      })}
      {stage === "lost" && (
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
          Lost
        </span>
      )}
    </div>
  );
}
