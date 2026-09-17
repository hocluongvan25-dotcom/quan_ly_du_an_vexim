"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import {
  ACTIVITY_TYPES,
  INDUSTRIES,
  OPP_SOURCES,
  formatCrmValue,
  type CrmActivity,
  type CrmChecklistState,
  type CrmOpportunityEnriched,
  type CrmPipeline,
  type CrmStageHistory,
} from "@/lib/crm-types";
import { formatDate } from "@/lib/utils";
import { AlertBadges, HealthDot, MoveStageModal, StagePill } from "@/components/crm/CrmWidgets";

type DetailData = {
  opp: CrmOpportunityEnriched;
  pipeline: CrmPipeline;
  history: CrmStageHistory[];
  activities: CrmActivity[];
  checklists: CrmChecklistState[];
  permissions: { canEdit: boolean; canDelete: boolean; canReassign: boolean };
};

export default function OppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [owners, setOwners] = useState<Array<{ id: number; name: string; role: string }>>([]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/crm/opportunities/${id}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "Tải thất bại");
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/crm/owners")
      .then((r) => r.json())
      .then((d) => setOwners(d.items || []));
  }, [load]);

  async function remove() {
    if (!confirm("Xóa cơ hội này? Hành động không thể hoàn tác.")) return;
    const res = await fetch(`/api/crm/opportunities/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error || "Xóa thất bại");
      return;
    }
    router.push("/dashboard/crm/pipeline");
  }

  if (loading) return <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải...</div>;
  if (error || !data)
    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-white p-12 text-center shadow-card">
          <div className="font-bold text-rose-600">{error || "Không tìm thấy cơ hội"}</div>
          <Link href="/dashboard/crm/pipeline" className="mt-3 inline-block text-sm font-bold text-teal-700">
            ← Về Pipeline
          </Link>
        </div>
      </div>
    );

  const { opp, pipeline, history, activities, checklists, permissions } = data;
  const stages = [...(pipeline.stages || [])].sort((a, b) => a.sort_order - b.sort_order);
  const currentStage = stages.find((s) => s.id === opp.stage_id);
  const currentIdx = stages.findIndex((s) => s.id === opp.stage_id);

  return (
    <div className="space-y-5">
      <Link href="/dashboard/crm/pipeline" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Về Pipeline
      </Link>

      {/* FDA/GACC: nhắc tạo hồ sơ sau khi chốt */}
      {opp.is_won && (opp.pipeline_key === "FDA" || opp.pipeline_key === "GACC") && (
        <Link
          href={`/dashboard/ho-so/moi?standard=${opp.pipeline_key}&company=${encodeURIComponent(opp.company_name)}${opp.contact_email ? `&email=${encodeURIComponent(opp.contact_email)}` : ""}${opp.estimated_value ? `&price=${opp.estimated_value}` : ""}`}
          className="flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-teal-500 to-teal-400 p-5 text-navy-950 shadow-lift transition hover:shadow-card"
        >
          <div>
            <div className="font-display text-base font-extrabold">
              📁 Deal đã chốt — tạo hồ sơ {opp.pipeline_key} ngay!
            </div>
            <div className="mt-0.5 text-xs font-semibold opacity-70">
              Bấm để sang trang tạo hồ sơ (đã điền sẵn tên công ty & giá trị deal)
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white">Tạo hồ sơ →</div>
        </Link>
      )}

      {/* Sale/Amazon: HĐ đã tự sinh khi chốt — link sang xem */}
      {opp.is_won && (opp.pipeline_key === "SALE_EXPORT" || opp.pipeline_key === "AMAZON_OPS") && (
        <Link
          href={`/dashboard/dich-vu?q=${encodeURIComponent(opp.company_name)}`}
          className="flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-teal-500 to-teal-400 p-5 text-navy-950 shadow-lift transition hover:shadow-card"
        >
          <div>
            <div className="font-display text-base font-extrabold">
              ✅ Deal đã chốt — hợp đồng {opp.pipeline_key === "SALE_EXPORT" ? "Sale XK" : "Amazon"} đã tự
              tạo!
            </div>
            <div className="mt-0.5 text-xs font-semibold opacity-70">
              Bấm để xem hợp đồng, xác nhận ngày bắt đầu & chu kỳ
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white">
            Xem hợp đồng →
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <HealthDot health={opp.health} />
              <span className="text-xs font-bold uppercase tracking-wider text-navy-900/45">{opp.pipeline_name}</span>
              <StagePill name={opp.stage_name} color={opp.stage_color} />
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-900 md:text-3xl">{opp.company_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-navy-900/60">
              {opp.contact_name && (
                <span className="inline-flex items-center gap-1 font-semibold">
                  <User className="h-4 w-4" /> {opp.contact_name}
                </span>
              )}
              {opp.contact_phone && (
                <a href={`tel:${opp.contact_phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline">
                  <Phone className="h-4 w-4" /> {opp.contact_phone}
                </a>
              )}
              {opp.contact_phone && (
                <a
                  href={`https://zalo.me/${opp.contact_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  className="rounded-full bg-[#0084ff] px-2.5 py-0.5 text-[11px] font-bold text-white"
                >
                  Zalo
                </a>
              )}
              {opp.industry && <span>· {opp.industry}</span>}
              {opp.source && <span>· Nguồn: {opp.source}</span>}
            </div>
            <div className="mt-2">
              <AlertBadges opp={opp} />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-navy-900/45">Giá trị dự kiến</div>
            <div className="font-display text-3xl font-extrabold text-teal-700">{formatCrmValue(opp.estimated_value)}</div>
            <div className="mt-1 text-xs font-semibold text-navy-900/55">
              Owner: <span className="font-bold text-navy-900">{opp.owner_name || "Chưa gán"}</span>
            </div>
          </div>
        </div>

        {/* 4 ô trả lời câu hỏi 3-4 */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox
            icon={<Clock className="h-4 w-4" />}
            label={`Ở "${opp.stage_name}"`}
            value={`${opp.days_in_stage} ngày`}
            sub={opp.sla_days > 0 ? `Chuẩn ≤ ${opp.sla_days} ngày` : "Giai đoạn kết thúc"}
            alert={opp.alerts.some((a) => a.type === "sla")}
          />
          <InfoBox
            icon={<History className="h-4 w-4" />}
            label="Lần cập nhật cuối"
            value={opp.days_since_activity === 0 ? "Hôm nay" : `${opp.days_since_activity} ngày trước`}
            sub={opp.last_activity_at ? formatDate(opp.last_activity_at) : "Chưa có hoạt động"}
            alert={opp.alerts.some((a) => a.type === "stale")}
          />
          <InfoBox
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Bước tiếp theo"
            value={opp.next_action || "— Chưa có —"}
            sub={opp.next_action_date ? `Hẹn ${formatDate(opp.next_action_date)}` : ""}
            alert={!opp.next_action}
          />
          <InfoBox
            icon={<CalendarClock className="h-4 w-4" />}
            label="Dự kiến chốt"
            value={opp.expected_close_date ? formatDate(opp.expected_close_date) : "—"}
            sub={opp.is_lost ? `Lý do mất: ${opp.lost_reason}` : `Tạo ${formatDate(opp.created_at)}`}
          />
        </div>

        {permissions.canEdit && (
          <div className="mt-4 flex flex-wrap gap-2">
            {opp.is_open && (
              <button
                onClick={() => setShowMove(true)}
                className="flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
              >
                Chuyển giai đoạn <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowEdit(!showEdit)}
              className="flex items-center gap-1.5 rounded-xl border border-navy-900/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" /> Sửa thông tin
            </button>
            {permissions.canDelete && (
              <button
                onClick={remove}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" /> Xóa
              </button>
            )}
          </div>
        )}
      </div>

      {showEdit && permissions.canEdit && (
        <EditForm
          opp={opp}
          owners={owners}
          canReassign={permissions.canReassign}
          onDone={() => {
            setShowEdit(false);
            load();
          }}
        />
      )}

      {/* Pipeline progress */}
      <div className="overflow-x-auto rounded-3xl bg-white p-5 shadow-card">
        <div className="flex min-w-[640px] items-center">
          {stages
            .filter((s) => !s.is_lost)
            .map((s, i, arr) => {
              const idx = stages.indexOf(s);
              const done = idx < currentIdx;
              const cur = s.id === opp.stage_id;
              return (
                <div key={s.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                        cur ? "text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                      }`}
                      style={cur ? { background: s.color } : undefined}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <div className={`mt-1 text-center text-[10px] font-bold leading-tight ${cur ? "" : "text-slate-400"}`}>
                      {s.name}
                    </div>
                  </div>
                  {i < arr.length - 1 && <div className={`mx-1 mb-5 h-0.5 flex-1 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />}
                </div>
              );
            })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Hoạt động */}
        <div className="space-y-4 lg:col-span-3">
          {permissions.canEdit && opp.is_open && <ActivityForm oppId={opp.id} currentNext={opp.next_action} currentDate={opp.next_action_date} onDone={load} />}
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Lịch sử chăm sóc ({activities.length})</h2>
            <div className="mt-4 space-y-3">
              {activities.length === 0 && <div className="text-sm text-slate-400">Chưa có hoạt động nào. Hãy ghi nhận cuộc gọi / trao đổi đầu tiên.</div>}
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-extrabold text-teal-700">
                      {activityIcon(a.type)}
                    </div>
                    <div className="w-0.5 flex-1 bg-slate-100" />
                  </div>
                  <div className="flex-1 rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-navy-900 px-2 py-0.5 font-bold text-white">
                        {ACTIVITY_TYPES.find((t) => t.key === a.type)?.label || a.type}
                      </span>
                      {a.title && <span className="font-bold">{a.title}</span>}
                      <span className="ml-auto text-slate-400">
                        {a.created_by_name || ""} · {formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.content && <div className="mt-1.5 whitespace-pre-wrap text-sm">{a.content}</div>}
                    {a.outcome && (
                      <div className="mt-1.5 text-xs font-semibold text-teal-700">→ Kết quả: {a.outcome}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Cột phải: lịch sử giai đoạn + điều kiện */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-base font-bold">⏱ Đã ở mỗi giai đoạn bao lâu?</h2>
            <div className="mt-3 space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-2xl border border-navy-900/10 p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-bold">
                    {h.from_stage_name ? (
                      <>
                        <span className="text-navy-900/50">{h.from_stage_name}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-navy-900/30" />
                      </>
                    ) : (
                      <span className="text-navy-900/50">Tạo mới →</span>
                    )}
                    <span>{h.to_stage_name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-900/55">
                    {h.from_stage_id && (
                      <span className="font-bold text-teal-700">
                        Ở giai đoạn trước {h.duration_days < 1 && h.duration_days > 0 ? "<1" : Math.round(h.duration_days)} ngày
                      </span>
                    )}
                    <span>{formatDate(h.created_at)}</span>
                    {h.changed_by_name && <span>· {h.changed_by_name}</span>}
                  </div>
                  {h.note && <div className="mt-1 text-xs italic text-navy-900/60">“{h.note}”</div>}
                </div>
              ))}
            </div>
          </section>

          {currentStage && currentStage.exit_criteria?.length > 0 && opp.is_open && (
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <h2 className="font-display text-base font-bold">✅ Điều kiện để đi tiếp</h2>
              <p className="mt-0.5 text-xs text-navy-900/55">
                Muốn rời “{currentStage.name}” phải hoàn thành các điều kiện dưới đây.
              </p>
              <div className="mt-3 space-y-2">
                {currentStage.exit_criteria.map((c) => {
                  const st = checklists.find((x) => x.stage_key === currentStage.key && x.criterion_key === c.key);
                  return (
                    <div
                      key={c.key}
                      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                        st?.is_checked ? "bg-emerald-50 font-semibold text-emerald-800" : "bg-slate-50"
                      }`}
                    >
                      <span className="mt-0.5">{st?.is_checked ? "☑" : "☐"}</span>
                      <span>
                        {c.label}
                        {st?.is_checked && st.checked_by_name && (
                          <span className="ml-1 text-[11px] font-normal text-emerald-600">· {st.checked_by_name}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {opp.notes && (
            <section className="rounded-3xl bg-white p-5 shadow-card">
              <h2 className="font-display text-base font-bold">📝 Ghi chú</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{opp.notes}</p>
            </section>
          )}
        </div>
      </div>

      {showMove && (
        <MoveStageModal opp={opp} pipeline={pipeline} onClose={() => setShowMove(false)} onMoved={() => load()} />
      )}
    </div>
  );
}

function InfoBox({ icon, label, value, sub, alert }: { icon: React.ReactNode; label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${alert ? "border-amber-300 bg-amber-50" : "border-navy-900/10 bg-[#fffaf0]"}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900/45">
        {icon} {label}
      </div>
      <div className={`mt-1 truncate text-sm font-extrabold ${alert ? "text-amber-800" : ""}`} title={value}>
        {value}
      </div>
      {sub && <div className="truncate text-[11px] text-navy-900/50">{sub}</div>}
    </div>
  );
}

function activityIcon(type: string) {
  const map: Record<string, string> = {
    call: "📞",
    zalo: "💬",
    email: "✉️",
    meeting: "🤝",
    visit: "🏭",
    quote: "🧾",
    note: "📝",
    other: "📌",
  };
  return map[type] || "📌";
}

/* ------------------------------ ActivityForm ----------------------------- */

function ActivityForm({ oppId, currentNext, currentDate, onDone }: { oppId: number; currentNext: string; currentDate: string | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "call",
    title: "",
    content: "",
    outcome: "",
    next_action: currentNext || "",
    next_action_date: currentDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/opportunities/${oppId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lưu thất bại");
      setOpen(false);
      setForm({ type: "call", title: "", content: "", outcome: "", next_action: "", next_action_date: "" });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-3xl border-2 border-dashed border-teal-600/40 bg-teal-50/50 py-4 text-sm font-bold text-teal-700 hover:bg-teal-50"
      >
        ＋ Ghi nhận hoạt động (gọi điện, Zalo, gặp mặt...) & hẹn bước tiếp theo
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-bold">Ghi nhận hoạt động</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-navy-900/50">Loại</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input mt-1">
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Tiêu đề</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Gọi follow-up báo giá" className="input mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-navy-900/50">Nội dung trao đổi</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={2} placeholder="Khách nói gì? Cam kết gì?" className="input mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-navy-900/50">Kết quả</label>
          <input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="VD: Khách hẹn thứ 6 quyết định" className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Bước tiếp theo (cập nhật)</label>
          <input value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} placeholder="VD: Gọi lại xác nhận" className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Hẹn ngày</label>
          <input type="date" value={form.next_action_date} onChange={(e) => setForm({ ...form, next_action_date: e.target.value })} className="input mt-1" />
        </div>
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-navy-900/15 py-2 text-sm font-bold">
          Hủy
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-navy-900 py-2 text-sm font-bold text-white disabled:opacity-40">
          {saving ? "Đang lưu..." : "Lưu hoạt động"}
        </button>
      </div>
    </form>
  );
}

/* -------------------------------- EditForm ------------------------------- */

function EditForm({ opp, owners, canReassign, onDone }: { opp: CrmOpportunityEnriched; owners: Array<{ id: number; name: string; role: string }>; canReassign: boolean; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: opp.company_name,
    contact_name: opp.contact_name,
    contact_phone: opp.contact_phone,
    contact_email: opp.contact_email,
    industry: opp.industry,
    source: opp.source,
    estimated_value: String(opp.estimated_value || ""),
    owner_id: opp.owner_id ? String(opp.owner_id) : "",
    next_action: opp.next_action,
    next_action_date: opp.next_action_date || "",
    expected_close_date: opp.expected_close_date || "",
    notes: opp.notes,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: any = {
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        industry: form.industry,
        source: form.source,
        estimated_value: Number(form.estimated_value || 0),
        next_action: form.next_action,
        next_action_date: form.next_action_date || null,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes,
      };
      if (canReassign) body.owner_id = form.owner_id ? Number(form.owner_id) : null;
      const res = await fetch(`/api/crm/opportunities/${opp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lưu thất bại");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-bold">Sửa thông tin</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-navy-900/50">Công ty / Khách hàng *</label>
          <input required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Người liên hệ</label>
          <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">SĐT</label>
          <input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Email</label>
          <input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Giá trị dự kiến (VND)</label>
          <input type="number" min={0} value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Ngành hàng</label>
          <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className="input mt-1">
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Nguồn</label>
          <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input mt-1">
            <option value="">—</option>
            {OPP_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Owner {!canReassign && "(chỉ Admin đổi được)"}</label>
          <select value={form.owner_id} onChange={(e) => set("owner_id", e.target.value)} className="input mt-1" disabled={!canReassign}>
            <option value="">— Chưa gán —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Dự kiến chốt</label>
          <input type="date" value={form.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Bước tiếp theo</label>
          <input value={form.next_action} onChange={(e) => set("next_action", e.target.value)} className="input mt-1" />
        </div>
        <div>
          <label className="text-xs font-bold text-navy-900/50">Hẹn ngày</label>
          <input type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} className="input mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold text-navy-900/50">Ghi chú</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="input mt-1" />
        </div>
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}
      <button type="submit" disabled={saving} className="w-full rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white disabled:opacity-40">
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
