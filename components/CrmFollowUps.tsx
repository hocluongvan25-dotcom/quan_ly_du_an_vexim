"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { daysUntil, formatDate, formatVnd, fromNow } from "@/lib/utils";
import { CRM_STAGES, type CrmOpportunity } from "@/lib/types";

type Row = {
  id: number;
  code: string;
  company_name: string;
  title?: string;
  value?: number;
  owner_name?: string | null;
  next_action: string;
  next_action_due: string | null;
  last_activity_at?: string | null;
  stale?: number;
  action_overdue?: number;
};

/**
 * Checklist follow-up của AE: mọi cơ hội phải có next action,
 * và next action đến hạn thì phải được đóng lại trong ngày.
 */
export function CrmFollowUps({
  items,
  emptyLabel = "Không có follow-up nào đang chờ.",
}: {
  items: Row[];
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function complete(id: number) {
    setBusy(id);
    await fetch(`/api/crm/activities/${id}`, { method: "PUT" });
    setBusy(null);
    router.refresh();
  }

  if (!items.length) {
    return <p className="py-6 text-sm text-navy-900/50">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-navy-900/5">
      {items.map((o) => {
        const d = daysUntil(o.next_action_due);
        const overdue = d !== null && d < 0;
        return (
          <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-navy-900">{o.company_name}</span>
                <span className="text-[11px] text-navy-900/40">{o.code}</span>
                {overdue && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    Quá hạn {Math.abs(d!)} ngày
                  </span>
                )}
                {d === 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    Đến hạn hôm nay
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-sm text-navy-900/70">{o.next_action}</div>
              <div className="mt-0.5 text-[11px] text-navy-900/45">
                Hạn {o.next_action_due ? formatDate(o.next_action_due) : "chưa đặt"} · owner{" "}
                {o.owner_name || "—"} · hoạt động cuối {fromNow(o.last_activity_at)}
              </div>
            </div>
            {typeof o.value === "number" && (
              <div className="text-sm text-navy-900/70">{formatVnd(o.value)}</div>
            )}
            <a
              href={`/dashboard/crm/co-hoi/${o.id}`}
              className="rounded-xl border border-navy-900/10 px-3 py-1.5 text-xs font-bold text-navy-900/70 hover:bg-navy-900/5"
            >
              Mở
            </a>
            <button
              onClick={() => complete(o.id)}
              disabled={busy === o.id}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/25 disabled:opacity-50"
              title="Ghi nhận đã làm xong và nhắc owner đặt next action mới"
            >
              <CheckCircle2 className="h-4 w-4" /> Xong
            </button>
          </li>
        );
      })}
    </ul>
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
