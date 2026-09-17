"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { INDUSTRIES, OPP_SOURCES, type CrmPipeline } from "@/lib/crm-types";

function CreateForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [owners, setOwners] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    pipeline_key: sp.get("pipeline") || "FDA",
    company_name: sp.get("company") || "",
    contact_name: sp.get("contact") || "",
    contact_phone: sp.get("phone") || "",
    contact_email: "",
    industry: "",
    source: sp.get("source") || "",
    estimated_value: "",
    owner_id: "",
    next_action: "Gọi điện xác nhận nhu cầu",
    next_action_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    expected_close_date: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/crm/pipelines")
      .then((r) => r.json())
      .then((d) => setPipelines(d.items || []));
    fetch("/api/crm/owners")
      .then((r) => r.json())
      .then((d) => setOwners(d.items || []));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe({ id: d.user.id, role: d.user.role });
          setForm((f) => ({ ...f, owner_id: f.owner_id || String(d.user.id) }));
        }
      });
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimated_value: Number(form.estimated_value || 0),
          owner_id: form.owner_id ? Number(form.owner_id) : null,
          next_action_date: form.next_action_date || null,
          expected_close_date: form.expected_close_date || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Tạo cơ hội thất bại");
      router.push(`/dashboard/crm/co-hoi/${d.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">CRM Vận hành</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Tạo cơ hội mới</h1>
        <p className="mt-1 text-sm text-navy-900/60">
          Cơ hội mới luôn bắt đầu ở “Lead mới”. Hãy gán Owner và hẹn bước tiếp theo ngay.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-card">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
            Dịch vụ / Pipeline <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {pipelines.map((p) => (
              <button
                type="button"
                key={p.key}
                onClick={() => set("pipeline_key", p.key)}
                className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${
                  form.pipeline_key === p.key
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-navy-900/10 hover:border-navy-900/30"
                }`}
              >
                {p.name}
                <div className={`mt-0.5 text-[11px] font-normal ${form.pipeline_key === p.key ? "text-white/60" : "text-navy-900/50"}`}>
                  {p.stages?.length || 0} giai đoạn
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
              Công ty / Khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              placeholder="VD: Công ty CP Thực phẩm Sông Hồng"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Người liên hệ</label>
            <input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="VD: Chị Lan — Giám đốc" className="input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Số điện thoại</label>
            <input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="09xx xxx xxx" className="input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Email</label>
            <input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="email@congty.vn" className="input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Giá trị dự kiến (VND)</label>
            <input
              type="number"
              min={0}
              value={form.estimated_value}
              onChange={(e) => set("estimated_value", e.target.value)}
              placeholder="VD: 22000000"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Ngành hàng</label>
            <select value={form.industry} onChange={(e) => set("industry", e.target.value)} className="input mt-1">
              <option value="">— Chọn —</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Nguồn</label>
            <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input mt-1">
              <option value="">— Chọn —</option>
              {OPP_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">
              Owner (người chịu trách nhiệm)
            </label>
            <select
              value={form.owner_id}
              onChange={(e) => set("owner_id", e.target.value)}
              className="input mt-1"
              disabled={me?.role !== "admin"}
              title={me?.role !== "admin" ? "Bạn là Owner của cơ hội này" : ""}
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.role === "admin" ? "(Admin)" : ""}
                </option>
              ))}
            </select>
            {me?.role !== "admin" && (
              <div className="mt-1 text-[11px] text-navy-900/45">Bạn tự động là Owner. Admin có thể gán lại.</div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Ngày dự kiến chốt</label>
            <input type="date" value={form.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} className="input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Bước tiếp theo</label>
            <input value={form.next_action} onChange={(e) => set("next_action", e.target.value)} placeholder="VD: Gọi điện xác nhận nhu cầu" className="input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Hẹn ngày</label>
            <input type="date" value={form.next_action_date} onChange={(e) => set("next_action_date", e.target.value)} className="input mt-1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-navy-900/50">Ghi chú</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Bối cảnh, nhu cầu ban đầu..." className="input mt-1" />
          </div>
        </div>

        {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>}

        <div className="flex gap-2">
          <Link href="/dashboard/crm/pipeline" className="flex-1 rounded-xl border border-navy-900/15 py-2.5 text-center text-sm font-bold">
            Hủy
          </Link>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white disabled:opacity-40">
            {saving ? "Đang tạo..." : "Tạo cơ hội"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewOppPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-12 text-center text-slate-400">Đang tải...</div>}>
      <CreateForm />
    </Suspense>
  );
}
