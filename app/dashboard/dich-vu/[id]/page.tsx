"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import InvoiceSection from "@/components/accounting/InvoiceSection";
import { SERVICE_NAMES, formatMoney, type ServiceContract } from "@/lib/accounting";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<ServiceContract | null>(null);
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showRenew, setShowRenew] = useState(false);
  const [renewCycle, setRenewCycle] = useState(6);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    const r = await fetch(`/api/service-contracts/${id}`);
    const d = await r.json();
    if (d.item) {
      setItem(d.item);
      setRenewCycle(d.item.cycle_months);
      setForm({
        company_name: d.item.company_name,
        company_email: d.item.company_email || "",
        contact_name: d.item.contact_name || "",
        contact_phone: d.item.contact_phone || "",
        scope: d.item.scope || "",
        started_at: String(d.item.started_at).slice(0, 10),
        contract_value: d.item.contract_value,
      });
    }
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (body: any, okMsg?: string) => {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch(`/api/service-contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Thất bại");
      await load();
      setShowRenew(false);
      setEditing(false);
      if (okMsg) alert(okMsg);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Xóa hợp đồng này? Chỉ xóa được khi chưa có hóa đơn nào.")) return;
    const r = await fetch(`/api/service-contracts/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Xóa thất bại");
      return;
    }
    router.push("/dashboard/dich-vu");
  };

  if (!item) return <div className="text-sm text-slate-500">Đang tải…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/dashboard/dich-vu" className="text-sm font-bold text-teal-700">
        ← Về danh sách hợp đồng
      </Link>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm font-bold text-slate-400">{item.contract_no}</div>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-navy-900">{item.company_name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                {SERVICE_NAMES[item.service_type]}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  item.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "expired"
                      ? "bg-red-100 text-red-600"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {item.status === "active" ? "Đang hiệu lực" : item.status === "expired" ? "Hết hạn" : "Đã chấm dứt"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Giá trị HĐ</div>
            <div className="text-xl font-extrabold text-navy-900">{formatMoney(item.contract_value)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-slate-400">Chu kỳ:</span> <b>{item.cycle_months} tháng</b></div>
          <div><span className="text-slate-400">Hiệu lực:</span> <b>{String(item.started_at).slice(0, 10)} → {String(item.ends_at).slice(0, 10)}</b></div>
          <div><span className="text-slate-400">Liên hệ:</span> <b>{item.contact_name || "—"}</b></div>
          <div><span className="text-slate-400">SĐT:</span> <b>{item.contact_phone || "—"}</b></div>
          <div><span className="text-slate-400">Email:</span> <b>{item.company_email || "—"}</b></div>
        </div>
        {item.scope && (
          <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <span className="font-bold text-slate-400">Phạm vi: </span>{item.scope}
          </div>
        )}

        {err && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">{err}</div>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold"
          >
            ✏️ Sửa thông tin
          </button>
          {item.status === "expired" && (
            <button
              onClick={() => setShowRenew(true)}
              className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-extrabold text-navy-950"
            >
              🔁 Gia hạn chu kỳ mới
            </button>
          )}
          {item.status === "active" && (
            <button
              onClick={() => act({ action: "terminate" })}
              disabled={busy}
              className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700"
            >
              Chấm dứt HĐ
            </button>
          )}
          {item.status === "terminated" && (
            <button
              onClick={() => act({ action: "activate" })}
              disabled={busy}
              className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700"
            >
              Kích hoạt lại
            </button>
          )}
          {role === "admin" && (
            <button
              onClick={remove}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-500"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Sửa */}
        {editing && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-2">
            <label className="block text-xs font-bold md:col-span-2">
              Tên công ty
              <input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Liên hệ
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              SĐT
              <input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Email
              <input
                value={form.company_email}
                onChange={(e) => setForm({ ...form, company_email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Giá trị HĐ
              <input
                type="number"
                value={form.contract_value}
                onChange={(e) => setForm({ ...form, contract_value: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold md:col-span-2">
              Phạm vi công việc
              <textarea
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-normal"
              />
            </label>
            <button
              onClick={() => act(form)}
              disabled={busy}
              className="rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white md:col-span-2"
            >
              Lưu thay đổi
            </button>
          </div>
        )}

        {/* Gia hạn */}
        {showRenew && (
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
            <div className="text-sm font-extrabold text-navy-900">
              Gia hạn chu kỳ mới (bắt đầu từ ngày hết hạn cũ: {String(item.ends_at).slice(0, 10)})
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={60}
                value={renewCycle}
                onChange={(e) => setRenewCycle(Number(e.target.value))}
                className="w-24 rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
              />
              <span className="text-sm font-bold text-navy-900">tháng</span>
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setRenewCycle(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${
                    renewCycle === m ? "bg-navy-900 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {m}T
                </button>
              ))}
              <button
                onClick={() => act({ action: "renew", cycle_months: renewCycle }, "Đã gia hạn chu kỳ mới!")}
                disabled={busy}
                className="rounded-xl bg-teal-500 px-5 py-2 text-sm font-extrabold text-navy-950"
              >
                Xác nhận gia hạn
              </button>
              <button onClick={() => setShowRenew(false)} className="rounded-xl bg-white px-4 py-2 text-sm font-bold">
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hóa đơn — chỉ admin (kế toán) */}
      {role === "admin" && <InvoiceSection refType="service_contract" refId={Number(id)} />}
    </div>
  );
}
