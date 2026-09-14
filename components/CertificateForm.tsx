"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CountdownRing } from "./CountdownRing";
import { QrArtwork } from "./QrArtwork";
import { ValiditySeal } from "./ValiditySeal";
import { expiryFromStandard, formatDate, remainingDays } from "@/lib/utils";
import { STANDARD_YEARS, type Certificate, type Standard } from "@/lib/types";
import { CheckCircle2, Loader2 } from "lucide-react";

type FormState = {
  standard: Standard;
  registration_code: string;
  service_price: string;
  company_name: string;
  scope: string;
  registered_at: string;
};

export function CertificateForm({ initial }: { initial?: Certificate }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    standard: initial?.standard || "FDA",
    registration_code: initial?.registration_code || "",
    service_price: initial ? String(initial.service_price) : "",
    company_name: initial?.company_name || "",
    scope: initial?.scope || "",
    registered_at: initial?.registered_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  });
  const [item, setItem] = useState<Certificate | undefined>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const expires = useMemo(
    () => expiryFromStandard(form.registered_at, form.standard),
    [form.registered_at, form.standard]
  );
  const left = remainingDays(item?.expires_at || expires);
  const confirmed = Boolean(item?.validity_confirmed);
  const published = item?.status === "published" || item?.status === "expired";
  const valid = confirmed && left >= 0;

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save");
    setMsg("");
    const payload = {
      ...form,
      service_price: Number(String(form.service_price).replace(/[^\d]/g, "") || 0),
    };
    const res = await fetch(item ? `/api/certificates/${item.id}` : "/api/certificates", {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Không lưu được");
      return;
    }
    if (!item) {
      router.replace(`/dashboard/ho-so/${data.id}`);
      return;
    }
    setItem(data.item);
    setMsg("Đã lưu hồ sơ.");
  }

  async function action(kind: "confirm" | "publish" | "renew") {
    if (!item) {
      await save();
      return;
    }
    setBusy(kind);
    setMsg("");
    const extra =
      kind === "renew"
        ? Number(prompt("Phí gia hạn (VND), để trống nếu không cộng thêm:", "0") || 0)
        : 0;
    const res = await fetch(`/api/certificates/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: kind, extra_fee: extra }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Thao tác thất bại");
      return;
    }
    setItem(data.item);
    if (kind === "confirm") setMsg("Đã xác nhận hiệu lực. Biểu tượng VALID đã kích hoạt.");
    if (kind === "publish") setMsg("Đã xuất bản. Doanh thu đã được cộng và mã QR sẵn sàng in.");
    if (kind === "renew") setMsg("Đã gia hạn thêm một chu kỳ theo tiêu chuẩn.");
  }

  const qrUrl = item && origin ? `${origin}/verify/${item.public_code}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-card md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-900">
              {item ? item.certificate_no : "Hồ sơ mới"}
            </h1>
            <p className="mt-1 text-sm text-navy-900/55">
              Bộ phận chuyên môn điền sau khi đăng ký xong. Giá dịch vụ chỉ hiển thị nội bộ.
            </p>
          </div>
          <ValiditySeal valid={valid} confirmed={confirmed} size="sm" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Standards">
            <select
              value={form.standard}
              onChange={(e) => patch("standard", e.target.value as Standard)}
              className="input"
            >
              <option value="FDA">FDA — hiệu lực 2 năm</option>
              <option value="GACC">GACC — hiệu lực 5 năm</option>
            </select>
          </Field>
          <Field label="Certificate No">
            <input
              className="input bg-slate-50"
              readOnly
              value={item?.certificate_no || "Tự cấp khi lưu"}
            />
          </Field>
          <Field label="Mã số (FDA / GACC)">
            <input
              className="input"
              required
              value={form.registration_code}
              onChange={(e) => patch("registration_code", e.target.value)}
              placeholder="Nhập mã số đăng ký"
            />
          </Field>
          <Field label="Giá dịch vụ (ẩn với khách khi quét QR)">
            <input
              className="input"
              inputMode="numeric"
              value={form.service_price}
              onChange={(e) => patch("service_price", e.target.value)}
              placeholder="Ví dụ: 18500000"
            />
          </Field>
          <Field label="Tên công ty" className="md:col-span-2">
            <input
              className="input"
              required
              value={form.company_name}
              onChange={(e) => patch("company_name", e.target.value)}
            />
          </Field>
          <Field label="Scope" className="md:col-span-2">
            <textarea
              className="input min-h-[90px]"
              value={form.scope}
              onChange={(e) => patch("scope", e.target.value)}
              placeholder="Phạm vi đăng ký, loại hình cơ sở, thị trường..."
            />
          </Field>
          <Field label="Ngày đăng ký">
            <input
              type="date"
              className="input"
              required
              value={form.registered_at}
              onChange={(e) => patch("registered_at", e.target.value)}
            />
          </Field>
          <Field label={`Ngày hết hạn (tự tính ${STANDARD_YEARS[form.standard]} năm)`}>
            <input className="input bg-slate-50" readOnly value={expires} />
          </Field>
          <Field label="Số ngày còn lại">
            <input
              className="input bg-slate-50"
              readOnly
              value={left < 0 ? "Đã hết hạn" : `${left} ngày`}
            />
          </Field>
          <Field label="Certificate validity">
            <div className="flex h-[42px] items-center text-sm font-semibold">
              {confirmed ? (
                <span className={valid ? "text-emerald-600" : "text-rose-600"}>
                  {valid ? "VALID — đồng hồ hiệu lực đang chạy" : "EXPIRED"}
                </span>
              ) : (
                <span className="text-navy-900/45">Chưa xác nhận</span>
              )}
            </div>
          </Field>
        </div>

        {msg && (
          <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{msg}</div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={!!busy}
            className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold"
          >
            {busy === "save" ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button
            type="button"
            disabled={!!busy || !item}
            onClick={() => action("confirm")}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "confirm" ? "..." : "Xác nhận hiệu lực (VALID)"}
          </button>
          <button
            type="button"
            disabled={!!busy || !item || !confirmed}
            onClick={() => action("publish")}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "publish" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Xuất bản
              </span>
            ) : published ? (
              "Đã xuất bản"
            ) : (
              "Xuất bản + tạo QR"
            )}
          </button>
          {published && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => action("renew")}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-950"
            >
              Gia hạn 1 chu kỳ
            </button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold">Certificate validity</h3>
            {confirmed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </div>
          <CountdownRing
            registeredAt={item?.registered_at || form.registered_at}
            expiresAt={item?.expires_at || expires}
            running={confirmed}
          />
          <p className="mt-4 text-center text-xs text-navy-900/50">
            Đăng ký {formatDate(form.registered_at)} → hết hạn {formatDate(expires)}
          </p>
        </div>
        {published && qrUrl ? (
          <QrArtwork url={qrUrl} label={item?.certificate_no} />
        ) : (
          <div className="rounded-3xl border border-dashed border-navy-900/15 bg-white p-6 text-center text-sm text-navy-900/45">
            Mã QR sẽ xuất hiện sau khi nhấn <b>Xuất bản</b>.
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
        {label}
      </div>
      {children}
    </label>
  );
}
