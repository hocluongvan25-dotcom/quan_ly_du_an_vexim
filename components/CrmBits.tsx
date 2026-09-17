"use client";

import {
  ACTIVITY_TYPE_LABEL,
  CRM_STAGES,
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  ROLE_LABEL,
  STALE_DAYS,
  type ActivityType,
  type LeadSource,
  type LeadStatus,
  type OpportunityStage,
  type Role,
} from "@/lib/types";
import { cn, compactVnd } from "@/lib/utils";

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  const meta = CRM_STAGES.find((s) => s.key === stage);
  const tone: Record<OpportunityStage, string> = {
    contacted: "bg-navy-900/5 text-navy-900/70",
    qualified: "bg-teal-100 text-teal-700",
    proposal: "bg-gold-100 text-gold-600",
    negotiation: "bg-amber-100 text-amber-700",
    won: "bg-emerald-100 text-emerald-700",
    lost: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone[stage])}>
      {meta?.label ?? stage}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const tone: Record<LeadStatus, string> = {
    new: "bg-sky-100 text-sky-700",
    contacted: "bg-navy-900/5 text-navy-900/70",
    qualified: "bg-teal-100 text-teal-700",
    unqualified: "bg-navy-900/5 text-navy-900/40 line-through",
    converted: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone[status])}>
      {LEAD_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role | string }) {
  const tone: Record<string, string> = {
    admin: "bg-navy-900 text-white",
    ae: "bg-gold-400 text-navy-950",
    sr: "bg-teal-100 text-teal-700",
    lr: "bg-sky-100 text-sky-700",
    specialist: "bg-navy-900/10 text-navy-900/70",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase", tone[role] || tone.specialist)}>
      {role === "specialist" ? "CM" : String(role)}
    </span>
  );
}

export function OwnerTag({ name, missing }: { name?: string | null; missing?: string }) {
  if (!name) {
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
        {missing || "Chưa có owner"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900/70">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] font-extrabold text-teal-700">
        {name.split(" ").slice(-1)[0]?.slice(0, 1)?.toUpperCase()}
      </span>
      {name}
    </span>
  );
}

export function StaleFlag({ stale, days }: { stale: boolean; days?: number | null }) {
  if (!stale) return null;
  return (
    <span
      className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
      title={`Không có hoạt động nào trong ${days ?? STALE_DAYS}+ ngày`}
    >
      Ngủ quên {days ?? STALE_DAYS}+ ngày
    </span>
  );
}

export function SourceLabel({ source }: { source: LeadSource }) {
  return <span className="text-xs text-navy-900/55">{LEAD_SOURCE_LABEL[source] || source}</span>;
}

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const tone: Record<string, string> = {
    research_note: "bg-violet-100 text-violet-700",
    qualification: "bg-teal-100 text-teal-700",
    call: "bg-sky-100 text-sky-700",
    email: "bg-indigo-100 text-indigo-700",
    meeting: "bg-gold-100 text-gold-600",
    whatsapp: "bg-emerald-100 text-emerald-700",
    task: "bg-amber-100 text-amber-700",
    note: "bg-navy-900/5 text-navy-900/60",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", tone[type] || tone.note)}>
      {ACTIVITY_TYPE_LABEL[type] || type}
    </span>
  );
}

export function Money({ value, compact }: { value: number; compact?: boolean }) {
  return <span className="font-semibold tabular-nums">{compact ? compactVnd(value) : value.toLocaleString("vi-VN")} ₫</span>;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "my-8 w-full rounded-3xl bg-white p-6 shadow-lift",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-extrabold text-navy-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-navy-900/55">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-navy-900/5 px-3 py-1 text-sm font-bold text-navy-900/60 hover:bg-navy-900/10"
          >
            Đóng
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-navy-900/40">{hint}</span>}
    </label>
  );
}

export function RoleHint({ role }: { role: Role }) {
  return (
    <div className="rounded-2xl bg-teal-50 p-3 text-xs leading-relaxed text-navy-900/70">
      <span className="font-bold text-teal-700">{ROLE_LABEL[role]}</span> —{" "}
      {role === "admin" && "nhìn thấy toàn bộ pipeline, không cần hỏi từng người."}
      {role === "ae" && "Pipeline Owner: mọi cơ hội phải có owner và next action."}
      {role === "sr" && "research doanh nghiệp, qualification, bổ sung dữ liệu."}
      {role === "lr" && "tạo nguồn lead và thu thập thông tin ban đầu."}
      {role === "specialist" && "điền và xuất bản hồ sơ FDA / GACC."}
    </div>
  );
}
