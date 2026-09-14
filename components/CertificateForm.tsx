"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CountdownRing } from "./CountdownRing";
import { QrArtwork } from "./QrArtwork";
import { ValiditySeal } from "./ValiditySeal";
import { expiryFromStandard, formatDate, remainingDays, getValidityYears, formatDuns } from "@/lib/utils";
import { VALIDITY_OPTIONS, DEFAULT_VALIDITY, type Certificate, type Standard } from "@/lib/types";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

type FormState = {
  standard: Standard;
  registration_code: string;
  duns_code: string;
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
    duns_code: initial?.duns_code || "",
    service_price: initial ? String(initial.service_price) : "",
    company_name: initial?.company_name || "",
    scope: initial?.scope || "",
    registered_at: initial?.registered_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    validity_years: initial?.validity_years || (initial?.standard ? DEFAULT_VALIDITY[initial.standard] : 2),
  });
  const [item, setItem] = useState<Certificate | undefined>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [origin, setOrigin] = useState("");

  // Renew dialog state
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewYears, setRenewYears] = useState<number>(initial?.validity_years || 2);
  const [renewFee, setRenewFee] = useState<string>("0");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (item) {
      setRenewYears(getValidityYears(item));
    }
  }, [item?.id]);

  const expires = useMemo(
    () => expiryFromStandard(form.registered_at, form.standard, form.validity_years),
    [form.registered_at, form.standard, form.validity_years]
  );
  const left = remainingDays(item?.expires_at || expires);
  const confirmed = Boolean(item?.validity_confirmed);
  const published = item?.status === "published" || item?.status === "expired";
  const valid = confirmed && left >= 0;
  const currentValidity = item ? getValidityYears(item) : form.validity_years;

  // Renew preview calculation
  const renewBaseDate = useMemo(() => {
    if (!item) return new Date().toISOString().slice(0, 10);
    return remainingDays(item.expires_at) >= 0 ? item.expires_at : new Date().toISOString().slice(0, 10);
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
    if (form.duns_code) {
      const digits = form.duns_code.replace(/\D/g, "");
      if (digits.length !== 9) {
        setBusy("");
        setMsg(t("form.dunsError"));
        return;
      }
    }
    const payload = {
      ...form,
      service_price: Number(String(form.service_price).replace(/[^\d]/g, "") || 0),
      validity_years: Number(form.validity_years),
      duns_code: form.duns_code.replace(/\D/g, "").slice(0, 9),
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

  async function action(kind: "confirm" | "publish") {
    if (!item) {
      await save();
      return;
    }
    setBusy(kind);
    setMsg("");
    const res = await fetch(`/api/certificates/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: kind }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setMsg(data.error || "Action failed");
      return;
    }
    setItem(data.item);
    if (kind === "confirm") setMsg(t("form.validityConfirmed"));
    if (kind === "publish") setMsg(t("form.publishedMsg"));
  }

  async function doRenew() {
    if (!item) return;
    setBusy("renew");
    setMsg("");
    const payload = {
      action: "renew",
      validity_years: renewYears,
      renew_years: renewYears,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-card md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-900">
              {item ? item.certificate_no : t("form.newRecord")}
            </h1>
            <p className="mt-1 text-sm text-navy-900/55">{t("form.specialistFill")}</p>
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
                  validity_years: initial ? s.validity_years : DEFAULT_VALIDITY[newStd] ?? 2,
                }));
              }}
              className="input"
            >
              <option value="FDA">{t("form.standardFDA")}</option>
              <option value="GACC">{t("form.standardGACC")}</option>
            </select>
          </Field>
          <Field label={t("form.contractDuration")}>
            <select
              value={form.validity_years}
              onChange={(e) => patch("validity_years", Number(e.target.value))}
              className="input font-semibold"
            >
              {VALIDITY_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y} {y === 1 ? t("common.year") : t("common.years")}{" "}
                  {y === DEFAULT_VALIDITY[form.standard] ? t("form.default", { standard: form.standard }) : ""}{" "}
                  {y === 1 ? t("form.shortTerm") : y >= 8 ? t("form.longTerm") : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-navy-900/50">
              {form.standard === "FDA" ? t("form.fdaFlexible") : t("form.gaccFlexible")}
            </div>
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
          <Field label={t("form.expiryDate", { years: form.validity_years, yearLabel: form.validity_years === 1 ? t("common.year") : t("common.years") })}>
            <input className="input bg-slate-50 font-semibold" readOnly value={expires} />
            <div className="mt-1 text-[11px] text-emerald-700">
              {t("form.contractYears", {
                years: form.validity_years,
                yearLabel: form.validity_years === 1 ? t("common.year") : t("common.years"),
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
              {confirmed ? (
                <span className={valid ? "text-emerald-600" : "text-rose-600"}>
                  {valid
                    ? t("form.validRunning", {
                        years: currentValidity,
                        yearLabel: currentValidity === 1 ? t("common.year") : t("common.years"),
                      })
                    : t("form.expiredStatus")}
                </span>
              ) : (
                <span className="text-navy-900/45">{t("form.notConfirmed")}</span>
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
            onClick={() => action("confirm")}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "confirm" ? t("form.confirming") : t("form.confirmValidity")}
          </button>
          <button
            type="button"
            disabled={!!busy || !item || !confirmed}
            onClick={() => action("publish")}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
                setRenewYears(currentValidity);
                setRenewFee("0");
                setShowRenewDialog(true);
              }}
              className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-semibold text-navy-950"
            >
              {t("form.renew")}
            </button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold">{t("form.validityTitle")}</h3>
            {confirmed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </div>
          <CountdownRing
            registeredAt={item?.registered_at || form.registered_at}
            expiresAt={item?.expires_at || expires}
            running={confirmed}
          />
          <p className="mt-4 text-center text-xs text-navy-900/50">
            {t("form.registeredExpires", {
              from: formatDate(form.registered_at),
              to: formatDate(expires),
              years: form.validity_years,
              yearLabel: form.validity_years === 1 ? t("common.year") : t("common.years"),
            })}
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-navy-900">{t("form.contractDetails")}:</div>
            <div className="mt-1 text-navy-900/60">
              {t("form.standardLabel")}: <b>{form.standard}</b> · {t("form.duration")}:{" "}
              <b>
                {form.validity_years} {form.validity_years === 1 ? t("common.year") : t("common.years")}
              </b>{" "}
              · {t("form.renewal")}: <b>{t("form.selectable")}</b>
            </div>
            {form.duns_code && (
              <div className="mt-2">
                {t("form.dunsLabel")}: <b className="font-mono">{formatDuns(form.duns_code)}</b>
              </div>
            )}
            {item && item.renewal_count > 0 && (
              <div className="mt-2 text-navy-900/60">
                {t("form.renewedTimes", {
                  count: item.renewal_count,
                  date: item.last_renewed_at ? formatDate(item.last_renewed_at) : "—",
                  years: currentValidity,
                  yearLabel: currentValidity === 1 ? t("common.year") : t("common.years"),
                })}
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

      {/* Renew Dialog */}
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
                <select value={renewYears} onChange={(e) => setRenewYears(Number(e.target.value))} className="input font-semibold">
                  {VALIDITY_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? t("common.year") : t("common.years")}{" "}
                      {y === currentValidity ? t("form.currentContract") : ""}{" "}
                      {y === 1 ? t("form.oneYearRenewal") : y === 2 ? t("form.twoYears") : y >= 5 ? t("form.multiYear") : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.exampleRenew")}</div>
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
                    years: renewYears,
                    yearLabel: renewYears === 1 ? t("common.year") : t("common.years"),
                    to: formatDate(renewNewExpiry),
                  })}
                </div>
                <div className="mt-1 text-xs text-emerald-700/70">
                  {t("form.renewalCountPreview", {
                    count: item.renewal_count + 1,
                    years: renewYears,
                    yearLabel: renewYears === 1 ? t("common.year") : t("common.years"),
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
                  t("form.renewAction", { years: renewYears, yearLabel: renewYears === 1 ? t("common.year") : t("common.years") })
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
