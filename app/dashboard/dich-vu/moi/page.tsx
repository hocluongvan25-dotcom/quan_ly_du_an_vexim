"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SERVICE_NAMES } from "@/lib/accounting";
import { todayUtcIso } from "@/lib/utils";

function NewContractForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [serviceType, setServiceType] = useState(
    sp.get("service") === "AMAZON_OPS" ? "AMAZON_OPS" : "SALE_EXPORT"
  );
  const [company, setCompany] = useState(sp.get("company") || "");
  const [email, setEmail] = useState(sp.get("email") || "");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [scope, setScope] = useState("");
  const [cycle, setCycle] = useState(6);
  const [started, setStarted] = useState(todayUtcIso());
  const [value, setValue] = useState(sp.get("price") || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/service-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          company_name: company,
          company_email: email,
          contact_name: contact,
          contact_phone: phone,
          scope,
          cycle_months: cycle,
          started_at: started,
          contract_value: Number(value || 0),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Tạo hợp đồng thất bại");
      router.push(`/dashboard/dich-vu/${d.id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/dich-vu" className="text-sm font-bold text-teal-700">
        ← Về danh sách hợp đồng
      </Link>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy-900">Tạo hợp đồng dịch vụ</h1>
      <p className="mt-1 text-sm text-navy-900/55">Mã hợp đồng tự sinh theo dịch vụ. Ngày hết hạn tự tính theo chu kỳ.</p>

      <div className="mt-6 space-y-4 rounded-3xl bg-white p-6 shadow-card">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Dịch vụ</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["SALE_EXPORT", "AMAZON_OPS"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setServiceType(s)}
                className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold ${
                  serviceType === s ? "border-teal-500 bg-teal-50 text-navy-900" : "border-slate-100 text-slate-400"
                }`}
              >
                {SERVICE_NAMES[s]}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs font-bold">
          Tên công ty *
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-bold">
            Người liên hệ
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            SĐT
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
        </div>
        <label className="block text-xs font-bold">
          Email công ty
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <label className="block text-xs font-bold">
          Phạm vi công việc
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={3}
            placeholder="VD: Tìm kiếm & chăm sóc 20 khách xuất khẩu/tháng…"
            className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold">Chu kỳ (tháng, 1–60)</div>
            <input
              type="number"
              min={1}
              max={60}
              value={cycle}
              onChange={(e) => setCycle(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
            <div className="mt-1.5 flex gap-1.5">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setCycle(m)}
                  className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-extrabold ${
                    cycle === m ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {m}T
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-bold">
            Ngày bắt đầu *
            <input
              type="date"
              value={started}
              onChange={(e) => setStarted(e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Giá trị HĐ (₫)
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
        </div>

        {err && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">{err}</div>}

        <button
          onClick={submit}
          disabled={busy || !company.trim() || !started}
          className="w-full rounded-xl bg-teal-500 py-3 text-sm font-extrabold text-navy-950 disabled:opacity-50"
        >
          {busy ? "Đang tạo…" : "Tạo hợp đồng"}
        </button>
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense>
      <NewContractForm />
    </Suspense>
  );
}
