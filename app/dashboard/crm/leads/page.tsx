"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Field, LeadStatusBadge, Modal, OwnerTag, SourceLabel } from "@/components/CrmBits";
import { LEAD_SOURCE_LABEL, ROLE_LABEL, type CrmLead, type LeadSource, type LeadStatus, type Role, type SessionUser, type User } from "@/lib/types";
import { cn, fromNow, todayIso } from "@/lib/utils";

const EMPTY = {
  company_name: "",
  contact_name: "",
  contact_title: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  employee_size: "",
  main_products: "",
  target_market: "",
  current_standards: "",
  pain_points: "",
  source: "outbound" as LeadSource,
  source_detail: "",
  notes: "",
  quality_score: 0,
  owner_id: "",
  expected_close_date: todayIso(),
  value: "",
  standard: "FDA",
};

/**
 * Danh sách lead.
 *  - LR: tạo nguồn lead, bổ sung contact/company information.
 *  - SR: research, qualification, cập nhật dữ liệu.
 *  - AE: phân công lead, chuyển lead đủ điều kiện thành cơ hội.
 */
export default function CrmLeadsPage() {
  const router = useRouter();
  const [me, setMe] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<CrmLead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [mine, setMine] = useState(false);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [assignFor, setAssignFor] = useState<CrmLead | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [convertFor, setConvertFor] = useState<CrmLead | null>(null);
  const [convertForm, setConvertForm] = useState({
    title: "",
    value: "",
    standard: "FDA",
    owner_id: "",
    expected_close_date: "",
    next_action: "",
    next_action_due: "",
  });

  async function load() {
    const [a, b] = await Promise.all([
      fetch("/api/crm/leads").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setItems(a.items || []);
    setMe(b.user || null);
    if (b.user?.role === "admin") {
      const u = await fetch("/api/users").then((r) => r.json());
      setUsers(u.items || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const assignable = users.filter((u) => ["ae", "sr", "lr"].includes(u.role));
  const isAE = me?.role === "ae" || me?.role === "admin";
  const isSR = me?.role === "sr" || isAE;

  const filtered = useMemo(() => {
    return items.filter((l) => {
      if (status !== "ALL" && l.status !== status) return false;
      if (mine && l.owner_id !== me?.id && l.created_by !== me?.id) return false;
      const hay = `${l.code} ${l.company_name} ${l.contact_name} ${l.email} ${l.phone} ${l.industry}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, status, mine, me]);

  async function createLead(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: undefined,
        expected_close_date: undefined,
        standard: undefined,
        owner_id: form.owner_id ? Number(form.owner_id) : undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không tạo được lead");
      return;
    }
    setCreating(false);
    setForm(EMPTY);
    load();
  }

  async function patch(id: number, body: Record<string, unknown>) {
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

  async function doAssign() {
    if (!assignFor) return;
    await patch(assignFor.id, { action: "assign", owner_id: assignTo ? Number(assignTo) : null });
    setAssignFor(null);
    setAssignTo("");
  }

  async function doConvert() {
    if (!convertFor) return;
    setErr("");
    const r = await fetch(`/api/crm/leads/${convertFor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "convert",
        title: convertForm.title,
        value: Number(convertForm.value || 0),
        standard: convertForm.standard,
        owner_id: convertForm.owner_id ? Number(convertForm.owner_id) : undefined,
        expected_close_date: convertForm.expected_close_date || undefined,
        next_action: convertForm.next_action,
        next_action_due: convertForm.next_action_due || undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không chuyển được");
      return;
    }
    setConvertFor(null);
    router.push(`/dashboard/crm/co-hoi/${d.opportunity?.id ?? ""}`);
  }

  const stats = useMemo(() => {
    const by = (s: LeadStatus) => items.filter((l) => l.status === s).length;
    return {
      all: items.length,
      new: by("new"),
      contacted: by("contacted"),
      qualified: by("qualified"),
      converted: by("converted"),
      unassigned: items.filter((l) => !l.owner_id && l.status !== "converted").length,
    };
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            VEXIM CRM · Lead
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Quản lý Lead</h1>
          <p className="mt-1 text-sm text-navy-900/60">
            LR tạo nguồn → SR research &amp; qualification → AE phân công và chuyển thành cơ hội.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Tạo lead
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Counter label="Tổng lead" value={stats.all} />
        <Counter label="Lead mới" value={stats.new} />
        <Counter label="Đã liên hệ" value={stats.contacted} />
        <Counter label="Đủ điều kiện" value={stats.qualified} />
        <Counter label="Đã chuyển cơ hội" value={stats.converted} />
        <Counter label="Chưa phân công" value={stats.unassigned} tone={stats.unassigned ? "bad" : "good"} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm doanh nghiệp, người liên hệ, email, SĐT..."
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        {["ALL", "new", "contacted", "qualified", "converted", "unqualified"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-bold",
              status === s ? "bg-navy-900 text-white" : "bg-white text-navy-900/70"
            )}
          >
            {s === "ALL" ? "Tất cả" : s === "new" ? "Mới" : s === "contacted" ? "Đã liên hệ" : s === "qualified" ? "Đủ ĐK" : s === "converted" ? "Đã chuyển" : "Loại"}
          </button>
        ))}
        <button
          onClick={() => setMine((v) => !v)}
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-bold",
            mine ? "bg-teal-500 text-navy-950" : "bg-white text-navy-900/70"
          )}
        >
          Việc của tôi
        </button>
      </div>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</p>}

      <div className="overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Người liên hệ</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Hoạt động cuối</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-navy-900/5 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/crm/leads/${l.id}`} className="font-semibold text-navy-900">
                      {l.company_name}
                    </Link>
                    <div className="text-[11px] text-navy-900/45">
                      {l.code}
                      {l.industry ? ` · ${l.industry}` : ""}
                      {l.target_market ? ` · ${l.target_market}` : ""}
                    </div>
                    {l.certificate_id ? (
                      <div className="mt-1 text-[11px] font-bold text-emerald-700">
                        Đã có hồ sơ FDA/GACC
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div>{l.contact_name || "—"}</div>
                    <div className="text-[11px] text-navy-900/45">
                      {l.contact_title} {l.phone ? `· ${l.phone}` : ""}
                    </div>
                    <div className="text-[11px] text-navy-900/45">{l.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <SourceLabel source={l.source} />
                    {l.source_detail && (
                      <div className="text-[11px] text-navy-900/40">{l.source_detail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusBadge status={l.status} />
                    <div className="mt-1 text-[11px] text-navy-900/45">
                      Điểm chất lượng {l.quality_score}/5
                    </div>
                    {isSR && l.status !== "converted" && (
                      <div className="mt-1.5 flex gap-1">
                        {l.status !== "qualified" && (
                          <button
                            onClick={() => patch(l.id, { action: "status", status: "qualified" })}
                            className="rounded-lg bg-teal-100 px-2 py-1 text-[10px] font-bold text-teal-700"
                          >
                            Qualify
                          </button>
                        )}
                        {l.status !== "unqualified" && (
                          <button
                            onClick={() => patch(l.id, { action: "status", status: "unqualified" })}
                            className="rounded-lg bg-navy-900/5 px-2 py-1 text-[10px] font-bold text-navy-900/50"
                          >
                            Loại
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <OwnerTag name={l.owner_name} missing="Chưa phân công" />
                    {isAE && (
                      <button
                        onClick={() => {
                          setAssignFor(l);
                          setAssignTo(l.owner_id ? String(l.owner_id) : "");
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-navy-900/5 px-2 py-1 text-[10px] font-bold text-navy-900/60"
                      >
                        <UserPlus className="h-3 w-3" /> Phân công
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-navy-900/55">
                    {fromNow(l.last_activity_at || l.created_at)}
                    <div className="text-[11px] text-navy-900/40">
                      tạo bởi {l.created_by_name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAE && l.status !== "converted" && (
                      <button
                        onClick={() => {
                          setConvertFor(l);
                          setConvertForm({
                            title: `${l.company_name} — đăng ký hồ sơ xuất khẩu`,
                            value: "",
                            standard: l.current_standards.includes("GACC") ? "GACC" : "FDA",
                            owner_id: l.owner_id ? String(l.owner_id) : String(me?.id || ""),
                            expected_close_date: "",
                            next_action: "",
                            next_action_due: "",
                          });
                        }}
                        className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700"
                      >
                        Chuyển thành cơ hội
                      </button>
                    )}
                    {l.status === "converted" && l.opportunity_code && (
                      <span className="text-[11px] font-bold text-emerald-700">
                        {l.opportunity_code}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-navy-900/50">
                    Không có lead nào khớp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo lead mới"
        subtitle="LR thu thập thông tin ban đầu, SR bổ sung phần research sau."
        wide
      >
        <form onSubmit={createLead} className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên doanh nghiệp *">
            <input
              className="input"
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </Field>
          <Field label="Người liên hệ">
            <input
              className="input"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </Field>
          <Field label="Chức vụ">
            <input
              className="input"
              value={form.contact_title}
              onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
            />
          </Field>
          <Field label="Điện thoại">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              className="input"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </Field>
          <Field label="Ngành hàng">
            <input
              className="input"
              placeholder="Thuỷ sản, nông sản, mỹ phẩm..."
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </Field>
          <Field label="Quy mô nhân sự">
            <input
              className="input"
              value={form.employee_size}
              onChange={(e) => setForm({ ...form, employee_size: e.target.value })}
            />
          </Field>
          <Field label="Sản phẩm chính">
            <input
              className="input"
              value={form.main_products}
              onChange={(e) => setForm({ ...form, main_products: e.target.value })}
            />
          </Field>
          <Field label="Thị trường mục tiêu">
            <input
              className="input"
              placeholder="Hoa Kỳ / Trung Quốc / EU"
              value={form.target_market}
              onChange={(e) => setForm({ ...form, target_market: e.target.value })}
            />
          </Field>
          <Field label="Nguồn lead">
            <select
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
            >
              {Object.entries(LEAD_SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chi tiết nguồn">
            <input
              className="input"
              placeholder="VD: hội chợ Vietfood 2026"
              value={form.source_detail}
              onChange={(e) => setForm({ ...form, source_detail: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Chuẩn đang có / đang cần">
              <input
                className="input"
                placeholder="FDA, GACC, HACCP, ISO 22000..."
                value={form.current_standards}
                onChange={(e) => setForm({ ...form, current_standards: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Vấn đề của khách (pain points)">
              <textarea
                className="input min-h-[70px]"
                value={form.pain_points}
                onChange={(e) => setForm({ ...form, pain_points: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <textarea
                className="input min-h-[70px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          {isAE && (
            <Field label="Phân công cho" hint="Để trống thì lead thuộc về bạn.">
              <select
                className="input"
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
              >
                <option value="">— Tôi —</option>
                {assignable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABEL[u.role as Role]})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {err && <p className="sm:col-span-2 text-sm text-rose-600">{err}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
              Tạo lead
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(assignFor)}
        onClose={() => setAssignFor(null)}
        title="Phân công lead"
        subtitle={assignFor?.company_name}
      >
        <div className="space-y-3">
          <Field label="Giao cho">
            <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">— Chưa phân công (về bể chung) —</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.role as Role]})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-navy-900/50">
            Mọi thao tác phân công đều được ghi vào activity log để AE review hoạt động SR/LR.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAssignFor(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              onClick={doAssign}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Phân công
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(convertFor)}
        onClose={() => setConvertFor(null)}
        title="Chuyển lead thành cơ hội"
        subtitle={convertFor?.company_name}
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Tên cơ hội">
              <input
                className="input"
                value={convertForm.title}
                onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Giá trị dự kiến (VND)">
            <input
              className="input"
              type="number"
              value={convertForm.value}
              onChange={(e) => setConvertForm({ ...convertForm, value: e.target.value })}
            />
          </Field>
          <Field label="Chuẩn dịch vụ">
            <select
              className="input"
              value={convertForm.standard}
              onChange={(e) => setConvertForm({ ...convertForm, standard: e.target.value })}
            >
              <option value="FDA">FDA</option>
              <option value="GACC">GACC</option>
            </select>
          </Field>
          <Field label="Owner cơ hội" hint="Bắt buộc — không có cơ hội nào vô chủ.">
            <select
              className="input"
              value={convertForm.owner_id}
              onChange={(e) => setConvertForm({ ...convertForm, owner_id: e.target.value })}
            >
              <option value="">— Tôi —</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.role as Role]})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dự kiến chốt">
            <input
              className="input"
              type="date"
              value={convertForm.expected_close_date}
              onChange={(e) => setConvertForm({ ...convertForm, expected_close_date: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Next action" hint="Việc tiếp theo phải làm là gì?">
              <input
                className="input"
                value={convertForm.next_action}
                onChange={(e) => setConvertForm({ ...convertForm, next_action: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Hạn next action">
            <input
              className="input"
              type="date"
              value={convertForm.next_action_due}
              onChange={(e) => setConvertForm({ ...convertForm, next_action_due: e.target.value })}
            />
          </Field>
          {err && <p className="sm:col-span-2 text-sm text-rose-600">{err}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setConvertFor(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              onClick={doConvert}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Tạo cơ hội
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <div className="text-[10px] font-bold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div
        className={cn(
          "font-display text-xl font-extrabold",
          tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-navy-900"
        )}
      >
        {value}
      </div>
    </div>
  );
}
