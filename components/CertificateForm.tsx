"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CountdownRing } from "./CountdownRing";
import { QrArtwork } from "./QrArtwork";
import { ValiditySeal } from "./ValiditySeal";
import { expiryFromStandard, formatDate, remainingDays, getValidityYears, formatDuns, todayLocalIso } from "@/lib/utils";
import { FDA_VALIDITY_OPTIONS, GACC_FIXED_YEARS, DEFAULT_VALIDITY, type Certificate, type Standard } from "@/lib/types";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

type FormState = {
  standard: Standard;
  registration_code: string;
  duns_code: string;
  us_agent: string;
  service_price: string;
  company_name: string;
  scope: string;
  registered_at: string;
  validity_years: number;
};

export function CertificateForm({ initial }: { initial?: Certificate }) {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>({
    standard: initial?.standard || "FDA",
    registration_code: initial?.registration_code || "",
    duns_code: initial?.standard === "GACC" ? "" : initial?.duns_code || "",
    us_agent: initial?.standard === "GACC" ? "" : initial?.us_agent || "Vexim US Compliance LLC",
    service_price: initial ? String(initial.service_price) : "",
    company_name: initial?.company_name || "",
    scope: initial?.scope || "",
    registered_at: initial?.registered_at?.slice(0, 10) || todayLocalIso(),
    validity_years: initial?.standard === "GACC" ? GACC_FIXED_YEARS : initial?.validity_years || DEFAULT_VALIDITY[initial?.standard || "FDA"] || 2,
  });
  const [item, setItem] = useState<Certificate | undefined>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [origin, setOrigin] = useState("");

  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewYears, setRenewYears] = useState<number>(initial?.standard === "GACC" ? GACC_FIXED_YEARS : initial?.validity_years || 2);
  const [renewFee, setRenewFee] = useState<string>("0");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (item) {
      setRenewYears(getValidityYears(item));
    }
  }, [item?.id]);

  useEffect(() => {
    if (form.standard === "GACC") {
      if (form.validity_years !== GACC_FIXED_YEARS || form.duns_code || form.us_agent) {
        setForm((s) => ({ ...s, validity_years: GACC_FIXED_YEARS, duns_code: "", us_agent: "" }));
      }
    }
  }, [form.standard]);

  const expires = useMemo(
    () => expiryFromStandard(form.registered_at, form.standard, form.validity_years),
    [form.registered_at, form.standard, form.validity_years]
  );
  const savedLeft = item ? remainingDays(item.expires_at) : remainingDays(expires);
  const left = item ? savedLeft : remainingDays(expires);
  // Simplified: published = valid, no separate confirm step
  const published = item?.status === "published" || item?.status === "expired";
  const valid = published && savedLeft >= 0;
  const confirmed = published; // auto-confirmed on publish
  const displayValidity = form.standard === "GACC" ? GACC_FIXED_YEARS : form.validity_years;
  const savedValidity = item ? getValidityYears(item) : form.validity_years;

  const renewBaseDate = useMemo(() => {
    if (!item) return todayLocalIso();
    return remainingDays(item.expires_at) >= 0 ? item.expires_at : todayLocalIso();
  }, [item?.expires_at]);

  const renewNewExpiry = useMemo(() => {
    if (!item) return "";
    return expiryFromStandard(renewBaseDate, item.standard, renewYears);
  }, [renewBaseDate, item?.standard, renewYears]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function handleDunsChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setForm((s) => ({ ...s, duns_code: digits }));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setBusy("save");
    setMsg("");
    if (form.standard === "FDA" && form.duns_code) {
      const digits = form.duns_code.replace(/\D/g, "");
      if (digits.length !== 9) {
        setBusy("");
        setMsg(t("form.dunsError"));
        return;
      }
    }
    const finalValidity = form.standard === "GACC" ? GACC_FIXED_YEARS : Number(form.validity_years);
    const isGacc = form.standard === "GACC";
    const payload = {
      ...form,
      service_price: Number(String(form.service_price).replace(/[^\d]/g, "") || 0),
      validity_years: finalValidity,
      duns_code: isGacc ? "" : form.duns_code.replace(/\D/g, "").slice(0, 9),
      us_agent: isGacc ? "" : form.us_agent.trim().slice(0, 200),
    };
    const res = await fetch(item ? `/api/certificates/${item.id}` : "/api/certificates", {
      method: item ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Failed to save");
      return;
    }
    if (!item) {
      router.replace(`/dashboard/ho-so/${data.id}`);
      return;
    }
    setItem(data.item);
    setMsg(
      t("form.saved", {
        years: data.item.validity_years,
        yearLabel: data.item.validity_years === 1 ? t("common.year") : t("common.years"),
        date: formatDate(data.item.expires_at),
      })
    );
  }

  async function publish() {
    if (!item) {
      // If no item yet, save first then publish
      await save();
      return;
    }
    setBusy("publish");
    setMsg("");
    const res = await fetch(`/api/certificates/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Publish failed");
      return;
    }
    setItem(data.item);
    setMsg(t("form.publishedMsg"));
  }

  async function doRenew() {
    if (!item) return;
    setBusy("renew");
    setMsg("");
    const finalRenewYears = item.standard === "GACC" ? GACC_FIXED_YEARS : renewYears;
    const payload = {
      action: "renew",
      validity_years: finalRenewYears,
      renew_years: finalRenewYears,
      extra_fee: Number(String(renewFee).replace(/[^\d]/g, "") || 0),
    };
    const res = await fetch(`/api/certificates/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Renew failed");
      return;
    }
    setItem(data.item);
    setShowRenewDialog(false);
    setMsg(
      t("form.renewedMsg", {
        years: getValidityYears(data.item),
        yearLabel: getValidityYears(data.item) === 1 ? t("common.year") : t("common.years"),
        date: formatDate(data.item.expires_at),
        count: data.item.renewal_count,
      })
    );
  }

  const qrUrl = item && origin ? `${origin}/verify/${item.public_code}` : "";

  const isGacc = form.standard === "GACC";
  const isFda = form.standard === "FDA";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-card md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-900">
              {item ? item.certificate_no : t("form.newRecord")}
            </h1>
            <p className="mt-1 text-sm text-navy-900/55">{t("form.specialistFill")}</p>
            <div className="mt-2 inline-flex items-center gap-2 text-[11px]">
              <span className={`px-2.5 py-1 rounded-full font-bold ${published ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border"}`}>
                {published ? (valid ? "✓ Đã xuất bản - Hợp lệ" : "Đã xuất bản - Hết hạn") : "Nháp"}
              </span>
              {published && item?.published_at && (
                <span className="text-slate-400">Xuất bản: {formatDate(item.published_at)}</span>
              )}
            </div>
          </div>
          <ValiditySeal valid={valid} confirmed={confirmed} size="sm" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("form.standard")}>
            <select
              value={form.standard}
              onChange={(e) => {
                const newStd = e.target.value as Standard;
                setForm((s) => ({
                  ...s,
                  standard: newStd,
                  validity_years: newStd === "GACC" ? GACC_FIXED_YEARS : s.validity_years,
                  duns_code: newStd === "GACC" ? "" : s.duns_code,
                  us_agent: newStd === "GACC" ? "" : s.us_agent || "Vexim US Compliance LLC",
                }));
              }}
              className="input"
            >
              <option value="FDA">{t("form.standardFDA")}</option>
              <option value="GACC">{t("form.standardGACC")}</option>
            </select>
          </Field>
          <Field label={t("form.contractDuration")}>
            {isGacc ? (
              <>
                <input className="input bg-slate-50 font-bold" readOnly value={`5 ${t("common.years")} (fixed)`} />
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.gaccFixed")}</div>
              </>
            ) : (
              <>
                <select
                  value={form.validity_years}
                  onChange={(e) => patch("validity_years", Number(e.target.value))}
                  className="input font-semibold"
                >
                  {FDA_VALIDITY_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? t("common.year") : t("common.years")}{" "}
                      {y === DEFAULT_VALIDITY[form.standard] ? t("form.default", { standard: form.standard }) : ""}{" "}
                      {y === 1 ? t("form.shortTerm") : y >= 8 ? t("form.longTerm") : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.fdaFlexible")}</div>
              </>
            )}
          </Field>
          <Field label={t("form.certificateNo")}>
            <input className="input bg-slate-50" readOnly value={item?.certificate_no || t("form.autoGenerated")} />
          </Field>
          <Field label={t("form.registrationCode")}>
            <input
              className="input"
              required
              value={form.registration_code}
              onChange={(e) => patch("registration_code", e.target.value)}
              placeholder={t("form.registrationCodePlaceholder")}
            />
          </Field>
          {isFda ? (
            <>
              <Field label={t("form.dunsNumber")}>
                <input
                  className="input font-mono"
                  value={form.duns_code ? formatDuns(form.duns_code) : ""}
                  onChange={(e) => handleDunsChange(e.target.value)}
                  placeholder={t("form.dunsPlaceholder")}
                  maxLength={11}
                />
                <div className="mt-1 text-[11px] text-navy-900/50">
                  {t("form.dunsHelp")}{" "}
                  {form.duns_code.length === 9 ? t("form.dunsValid") : form.duns_code ? t("form.dunsDigits", { count: form.duns_code.length }) : t("form.dunsOptional")}
                </div>
              </Field>
              <Field label={t("form.usAgent") || "US Agent"}>
                <input
                  className="input"
                  value={form.us_agent}
                  onChange={(e) => patch("us_agent", e.target.value)}
                  placeholder={t("form.usAgentPlaceholder") || "Vexim US Compliance LLC"}
                  maxLength={200}
                />
                <div className="mt-1 text-[11px] text-navy-900/50">
                  {t("form.usAgentHelp") || "Đại diện US Agent bắt buộc cho đăng ký FDA."}
                </div>
              </Field>
            </>
          ) : (
            <div className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
              GACC không yêu cầu DUNS và US Agent. Chỉ áp dụng cho FDA.
            </div>
          )}
          <Field label={t("form.serviceFee")}>
            <input
              className="input"
              inputMode="numeric"
              value={form.service_price}
              onChange={(e) => patch("service_price", e.target.value)}
              placeholder={t("form.serviceFeePlaceholder")}
            />
          </Field>
          <Field label={t("form.companyName")} className="md:col-span-2">
            <input className="input" required value={form.company_name} onChange={(e) => patch("company_name", e.target.value)} />
          </Field>
          <Field label={t("form.scope")} className="md:col-span-2">
            <textarea
              className="input min-h-[90px]"
              value={form.scope}
              onChange={(e) => patch("scope", e.target.value)}
              placeholder={t("form.scopePlaceholder")}
            />
          </Field>
          <Field label={t("form.registrationDate")}>
            <input
              type="date"
              className="input"
              required
              value={form.registered_at}
              onChange={(e) => patch("registered_at", e.target.value)}
            />
          </Field>
          <Field label={t("form.expiryDate", { years: displayValidity, yearLabel: displayValidity === 1 ? t("common.year") : t("common.years") })}>
            <input className="input bg-slate-50 font-semibold" readOnly value={expires} />
            <div className="mt-1 text-[11px] text-emerald-700">
              {t("form.contractYears", {
                years: displayValidity,
                yearLabel: displayValidity === 1 ? t("common.year") : t("common.years"),
                from: formatDate(form.registered_at),
                to: formatDate(expires),
              })}
            </div>
          </Field>
          <Field label={t("form.daysRemaining")}>
            <input
              className="input bg-slate-50"
              readOnly
              value={
                left < 0
                  ? t("form.expired")
                  : t("form.daysLeft", { days: left, years: Math.floor(left / 365), remaining: left % 365 })
              }
            />
          </Field>
          <Field label={t("form.certificateValidity")}>
            <div className="flex h-[42px] items-center text-sm font-semibold">
              {published ? (
                <span className={valid ? "text-emerald-600" : "text-rose-600"}>
                  {valid
                    ? t("form.validRunning", {
                        years: displayValidity,
                        yearLabel: displayValidity === 1 ? t("common.year") : t("common.years"),
                      })
                    : t("form.expiredStatus")}
                </span>
              ) : (
                <span className="text-navy-900/45">Nháp - chưa xuất bản</span>
              )}
            </div>
          </Field>
          {item && item.renewal_count > 0 && (
            <>
              <Field label={t("form.renewalCount")}>
                <input className="input bg-slate-50" readOnly value={`${item.renewal_count} ${t("common.times")}`} />
              </Field>
              <Field label={t("form.lastRenewed")}>
                <input className="input bg-slate-50" readOnly value={item.last_renewed_at ? formatDate(item.last_renewed_at) : "—"} />
              </Field>
            </>
          )}
        </div>

        {msg && <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{msg}</div>}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={!!busy} className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold">
            {busy === "save" ? t("form.saving") : t("form.saveDraft")}
          </button>
          <button
            type="button"
            disabled={!!busy || !item}
            onClick={publish}
            className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lift"
          >
            {busy === "publish" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("form.publishing")}
              </span>
            ) : published ? (
              t("form.published")
            ) : (
              t("form.publish")
            )}
          </button>
          {published && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                setRenewYears(item ? getValidityYears(item) : displayValidity);
                setRenewFee("0");
                setShowRenewDialog(true);
              }}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-950"
            >
              {t("form.renew")}
            </button>
          )}
        </div>
        <div className="pt-2 text-[11px] text-slate-500">
          Luồng mới: <b>Lưu nháp</b> → <b>Xuất bản + tạo QR</b> (tự động hợp lệ, không cần bước Xác nhận riêng)
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold">{t("form.validityTitle")}</h3>
            {valid && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </div>
          <CountdownRing
            registeredAt={item?.registered_at || form.registered_at}
            expiresAt={item?.expires_at || expires}
            running={published}
          />
          <p className="mt-4 text-center text-xs text-navy-900/50">
            {t("form.registeredExpires", {
              from: formatDate(form.registered_at),
              to: formatDate(expires),
              years: displayValidity,
              yearLabel: displayValidity === 1 ? t("common.year") : t("common.years"),
            })}
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-navy-900">{t("form.contractDetails")}:</div>
            <div className="mt-1 text-navy-900/60">
              {t("form.standardLabel")}: <b>{form.standard}</b> · {t("form.duration")}:{" "}
              <b>
                {displayValidity} {displayValidity === 1 ? t("common.year") : t("common.years")}
              </b>{" "}
              · {t("form.renewal")}:{" "}
              <b>{isGacc ? `5 ${t("common.years")} fixed` : t("form.selectable")}</b>
            </div>
            {isFda && form.duns_code && (
              <div className="mt-2">
                {t("form.dunsLabel")}: <b className="font-mono">{formatDuns(form.duns_code)}</b>
              </div>
            )}
            {isFda && form.us_agent && (
              <div className="mt-2">
                US Agent: <b>{form.us_agent}</b>
              </div>
            )}
          </div>
        </div>
        {published && qrUrl ? (
          <QrArtwork url={qrUrl} label={item?.certificate_no} />
        ) : (
          <div className="rounded-3xl border border-dashed border-navy-900/15 bg-white p-6 text-center text-sm text-navy-900/45">
            {t("form.qrAfterPublish")}
          </div>
        )}
      </aside>

      {showRenewDialog && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-navy-900">{t("form.renewTitle")}</h3>
              <button onClick={() => setShowRenewDialog(false)} className="rounded-full p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-navy-900/60">
              {item.certificate_no} · {item.company_name}
            </p>
            <div className="mt-1 text-xs text-navy-900/50">
              {t("form.currentExpiry")}: <b>{formatDate(item.expires_at)}</b> · {t("form.baseDate")}:{" "}
              <b>{formatDate(renewBaseDate)}</b> ({remainingDays(item.expires_at) >= 0 ? t("form.fromExpiry") : t("form.fromToday")})
            </div>

            <div className="mt-5 space-y-4">
              <label>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
                  {t("form.renewalDuration")}
                </div>
                {item.standard === "GACC" ? (
                  <>
                    <input className="input bg-slate-50 font-bold" readOnly value={`5 ${t("common.years")} (fixed)`} />
                    <div className="mt-1 text-[11px] text-navy-900/50">{t("form.gaccFixed")}</div>
                  </>
                ) : (
                  <>
                    <select value={renewYears} onChange={(e) => setRenewYears(Number(e.target.value))} className="input font-semibold">
                      {FDA_VALIDITY_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y} {y === 1 ? t("common.year") : t("common.years")}{" "}
                          {y === savedValidity ? t("form.currentContract") : ""}{" "}
                          {y === 1 ? t("form.oneYearRenewal") : y === 2 ? t("form.twoYears") : y >= 5 ? t("form.multiYear") : ""}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-navy-900/50">{t("form.exampleRenew")}</div>
                  </>
                )}
              </label>

              <label>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
                  {t("form.renewalFee")}
                </div>
                <input className="input" inputMode="numeric" value={renewFee} onChange={(e) => setRenewFee(e.target.value)} placeholder="0" />
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.renewalFeeHelp")}</div>
              </label>

              <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                <div className="font-semibold text-emerald-900">{t("form.previewExpiry")}:</div>
                <div className="mt-1 text-emerald-800">
                  {t("form.previewText", {
                    from: formatDate(renewBaseDate),
                    years: item.standard === "GACC" ? GACC_FIXED_YEARS : renewYears,
                    yearLabel: (item.standard === "GACC" ? GACC_FIXED_YEARS : renewYears) === 1 ? t("common.year") : t("common.years"),
                    to: formatDate(renewNewExpiry),
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowRenewDialog(false)}
                disabled={!!busy}
                className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold"
              >
                {t("form.cancel")}
              </button>
              <button
                onClick={doRenew}
                disabled={!!busy}
                className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-950 disabled:opacity-50"
              >
                {busy === "renew" ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("form.renewing")}
                  </span>
                ) : (
                  t("form.renewAction", {
                    years: item.standard === "GACC" ? GACC_FIXED_YEARS : renewYears,
                    yearLabel: (item.standard === "GACC" ? GACC_FIXED_YEARS : renewYears) === 1 ? t("common.year") : t("common.years"),
                  })
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">{label}</div>
      {children}
    </label>
  );
}
