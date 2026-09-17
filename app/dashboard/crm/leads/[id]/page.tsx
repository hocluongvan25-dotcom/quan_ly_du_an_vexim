"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, FlaskConical, Plus, UserPlus } from "lucide-react";
import {
  ActivityTypeBadge,
  Field,
  LeadStatusBadge,
  Modal,
  OwnerTag,
  RoleBadge,
  SourceLabel,
} from "@/components/CrmBits";
import {
  ACTIVITY_TYPE_LABEL,
  LEAD_SOURCE_LABEL,
  ROLE_LABEL,
  type ActivityType,
  type CrmActivity,
  type CrmLead,
  type LeadSource,
  type Role,
  type SessionUser,
  type User,
} from "@/lib/types";
import { formatDate, fromNow } from "@/lib/utils";

/**
 * Trang chi tiết lead: nơi SR viết research note / qualification,
 * LR bổ sung contact & company information, AE phân công và chuyển đổi.
 */
export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState<Partial<CrmLead>>({});
  const [actOpen, setActOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [act, setAct] = useState({
    type: "research_note" as ActivityType,
    subject: "",
    content: "",
    is_follow_up: false,
    due_at: "",
  });

  async function load() {
    const [l, m, a] = await Promise.all([
      fetch(`/api/crm/leads/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
      fetch(`/api/crm/activities?limit=200`).then((r) => r.json()),
    ]);
    if (l.item) {
      setLead(l.item);
      setForm(l.item);
    }
    setMe(m.user || null);
    setActivities((a.items || []).filter((x: CrmActivity) => x.lead_id === id));
    if (m.user?.role === "admin" || m.user?.role === "ae") {
      const u = await fetch("/api/users").then((r) => r.json());
      setUsers((u.items || []).filter((x: User) => ["ae", "sr", "lr"].includes(x.role)));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!lead) {
    return <div className="text-sm text-navy-900/50">Đang tải lead...</div>;
  }

  const canEdit = ["admin", "ae", "sr", "lr"].includes(me?.role || "");
  const isAE = me?.role === "ae" || me?.role === "admin";
  const converted = lead.status === "converted";

  async function patch(body: Record<string, unknown>) {
    const r = await fetch(`/api/crm/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không cập nhật được");
      return null;
    }
    setErr("");
    load();
    return d.item;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    await patch({ ...form, quality_score: Number(form.quality_score || 0) });
  }

  async function addActivity(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/crm/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: id,
        type: act.type,
        subject: act.subject,
        content: act.content,
        is_follow_up: act.is_follow_up,
        due_at: act.due_at || undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không ghi được hoạt động");
      return;
    }
    setAct({ type: "research_note", subject: "", content: "", is_follow_up: false, due_at: "" });
    setActOpen(false);
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dashboard/crm/leads"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900/55"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách lead
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold text-navy-900">{lead.company_name}</h1>
          <LeadStatusBadge status={lead.status} />
          <span className="text-xs text-navy-900/45">{lead.code}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-navy-900/60">
          <OwnerTag name={lead.owner_name} missing="Chưa phân công" />
          <SourceLabel source={lead.source} />
          <span>· tạo bởi {lead.created_by_name || "—"}</span>
          <span>· hoạt động cuối {fromNow(lead.last_activity_at || lead.created_at)}</span>
          {isAE && !converted && (
            <button
              onClick={() => {
                setAssignTo(lead.owner_id ? String(lead.owner_id) : "");
                setAssignOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-navy-900/5 px-2.5 py-1 text-xs font-bold text-navy-900/65"
            >
              <UserPlus className="h-3.5 w-3.5" /> Phân công
            </button>
          )}
        </div>
        {converted && lead.opportunity_code && (
          <Link
            href={`/dashboard/crm/co-hoi/${lead.converted_opportunity_id}`}
            className="mt-3 inline-block rounded-xl bg-emerald-500/15 px-3 py-1.5 text-sm font-bold text-emerald-700"
          >
            Đã chuyển thành cơ hội {lead.opportunity_code} →
          </Link>
        )}
      </div>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</p>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Thông tin doanh nghiệp</h2>
            {canEdit && !converted && (
              <button
                onClick={() => setActOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-700"
              >
                <Plus className="h-3.5 w-3.5" /> Ghi hoạt động
              </button>
            )}
          </div>
          <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Tên doanh nghiệp">
              <input
                className="input"
                disabled={converted}
                value={form.company_name || ""}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              />
            </Field>
            <Field label="Người liên hệ">
              <input
                className="input"
                disabled={converted}
                value={form.contact_name || ""}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </Field>
            <Field label="Chức vụ">
              <input
                className="input"
                disabled={converted}
                value={form.contact_title || ""}
                onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
              />
            </Field>
            <Field label="Điện thoại">
              <input
                className="input"
                disabled={converted}
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                disabled={converted}
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <input
                className="input"
                disabled={converted}
                value={form.website || ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
            <Field label="Ngành hàng">
              <input
                className="input"
                disabled={converted}
                value={form.industry || ""}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </Field>
            <Field label="Quy mô">
              <input
                className="input"
                disabled={converted}
                value={form.employee_size || ""}
                onChange={(e) => setForm({ ...form, employee_size: e.target.value })}
              />
            </Field>
            <Field label="Doanh thu (ước)">
              <input
                className="input"
                disabled={converted}
                value={form.annual_revenue || ""}
                onChange={(e) => setForm({ ...form, annual_revenue: e.target.value })}
              />
            </Field>
            <Field label="Thị trường mục tiêu">
              <input
                className="input"
                disabled={converted}
                value={form.target_market || ""}
                onChange={(e) => setForm({ ...form, target_market: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sản phẩm chính">
                <input
                  className="input"
                  disabled={converted}
                  value={form.main_products || ""}
                  onChange={(e) => setForm({ ...form, main_products: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Chuẩn đang có / đang cần">
                <input
                  className="input"
                  disabled={converted}
                  value={form.current_standards || ""}
                  onChange={(e) => setForm({ ...form, current_standards: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Pain points">
                <textarea
                  className="input min-h-[70px]"
                  disabled={converted}
                  value={form.pain_points || ""}
                  onChange={(e) => setForm({ ...form, pain_points: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Nguồn lead">
              <select
                className="input"
                disabled={converted}
                value={form.source || "other"}
                onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
              >
                {Object.entries(LEAD_SOURCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Điểm chất lượng (0–5)">
              <input
                className="input"
                type="number"
                min={0}
                max={5}
                disabled={converted}
                value={form.quality_score ?? 0}
                onChange={(e) => setForm({ ...form, quality_score: Number(e.target.value) })}
              />
            </Field>
            {canEdit && !converted && (
              <div className="sm:col-span-2 flex justify-end">
                <button className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
                  Lưu thông tin
                </button>
              </div>
            )}
          </form>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Qualification</h2>
            <p className="mt-1 text-xs text-navy-900/50">
              SR đánh giá lead theo BANT rồi đổi trạng thái. AE review lại trước khi chuyển thành cơ
              hội.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["contacted", "qualified", "unqualified"] as const).map((s) => (
                <button
                  key={s}
                  disabled={converted || lead.status === s}
                  onClick={() => patch({ action: "status", status: s })}
                  className="rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 disabled:opacity-40"
                >
                  {s === "contacted" ? "Đã liên hệ" : s === "qualified" ? "Đủ điều kiện" : "Không đủ điều kiện"}
                </button>
              ))}
            </div>
            {lead.certificate_id && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Doanh nghiệp này đã có hồ sơ trong hệ thống (id #{lead.certificate_id}).
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Activity log</h2>
            <ul className="mt-3 space-y-3">
              {activities.length === 0 && (
                <li className="text-sm text-navy-900/50">
                  Chưa có hoạt động nào. SR hãy viết research note đầu tiên.
                </li>
              )}
              {activities.map((a) => (
                <li key={a.id} className="rounded-2xl border border-navy-900/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActivityTypeBadge type={a.type} />
                    <span className="text-sm font-semibold text-navy-900">{a.subject}</span>
                  </div>
                  {a.content && (
                    <p className="mt-1.5 whitespace-pre-line text-sm text-navy-900/70">{a.content}</p>
                  )}
                  <div className="mt-1.5 text-[11px] text-navy-900/45">
                    {a.created_by_name || "—"} · {fromNow(a.performed_at)}
                    {a.due_at ? ` · hạn ${formatDate(a.due_at)}` : ""}
                    {a.completed_at ? " · đã xong" : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <Modal
        open={actOpen}
        onClose={() => setActOpen(false)}
        title="Ghi hoạt động"
        subtitle={lead.company_name}
        wide
      >
        <form onSubmit={addActivity} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại hoạt động">
              <select
                className="input"
                value={act.type}
                onChange={(e) => setAct({ ...act, type: e.target.value as ActivityType })}
              >
                {Object.entries(ACTIVITY_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tiêu đề *">
              <input
                className="input"
                required
                value={act.subject}
                onChange={(e) => setAct({ ...act, subject: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Nội dung">
            <textarea
              className="input min-h-[110px]"
              value={act.content}
              onChange={(e) => setAct({ ...act, content: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={act.is_follow_up}
                onChange={(e) => setAct({ ...act, is_follow_up: e.target.checked })}
              />
              Đây là follow-up cần theo dõi
            </label>
            {act.is_follow_up && (
              <Field label="Hạn follow-up">
                <input
                  className="input"
                  type="date"
                  value={act.due_at}
                  onChange={(e) => setAct({ ...act, due_at: e.target.value })}
                />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActOpen(false)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
              <FlaskConical className="h-4 w-4" /> Lưu hoạt động
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Phân công lead"
        subtitle={lead.company_name}
      >
        <div className="space-y-3">
          <Field label="Giao cho">
            <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">— Chưa phân công —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.role as Role]})
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAssignOpen(false)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              onClick={async () => {
                await patch({ action: "assign", owner_id: assignTo ? Number(assignTo) : null });
                setAssignOpen(false);
              }}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Phân công
            </button>
          </div>
        </div>
      </Modal>

      {me?.role && <RoleBadge role={me.role} />}
    </div>
  );
}
