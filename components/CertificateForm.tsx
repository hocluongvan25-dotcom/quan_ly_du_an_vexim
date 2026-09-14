"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CountdownRing } from "./CountdownRing";
import { QrArtwork } from "./QrArtwork";
import { ValiditySeal } from "./ValiditySeal";
import { expiryFromStandard, formatDate, remainingDays, getValidityYears, formatDuns } from "@/lib/utils";
import { VALIDITY_OPTIONS, DEFAULT_VALIDITY, type Certificate, type Standard } from "@/lib/types";
import { CheckCircle2, Loader2, X } from "lucide-react";

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
        setMsg("DUNS must be exactly 9 digits (e.g. 12-345-6789).");
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
    setMsg(`Saved. Validity ${data.item.validity_years} ${data.item.validity_years === 1 ? "year" : "years"}, expires ${formatDate(data.item.expires_at)}`);
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
    if (kind === "confirm") setMsg("Validity confirmed. VALID badge is now active.");
    if (kind === "publish") setMsg("Published. Revenue recorded and QR code ready to print.");
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
    setMsg(`Renewed for ${getValidityYears(data.item)} ${getValidityYears(data.item) === 1 ? "year" : "years"}: new expiry ${formatDate(data.item.expires_at)} (renewal #${data.item.renewal_count}).`);
  }

  const qrUrl = item && origin ? `${origin}/verify/${item.public_code}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-card md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-900">
              {item ? item.certificate_no : "New Record"}
            </h1>
            <p className="mt-1 text-sm text-navy-900/55">
              Specialists fill after registration is complete. Service fee is internal only. Contract duration 1-10 years. Renewal allows custom years + fee.
            </p>
          </div>
          <ValiditySeal valid={valid} confirmed={confirmed} size="sm" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Standard">
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
              <option value="FDA">FDA — Food & Cosmetics</option>
              <option value="GACC">GACC — China</option>
            </select>
          </Field>
          <Field label="Contract Duration (years)">
            <select
              value={form.validity_years}
              onChange={(e) => patch("validity_years", Number(e.target.value))}
              className="input font-semibold"
            >
              {VALIDITY_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y} {y === 1 ? "year" : "years"} {y === DEFAULT_VALIDITY[form.standard] ? `(default ${form.standard})` : ""} {y === 1 ? "- short term" : y >= 8 ? "- long term" : ""}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-navy-900/50">
              {form.standard === "FDA"
                ? "FDA flexible 1-10 years per client contract"
                : "GACC usually 5 years, customizable 1-10 years"}
            </div>
          </Field>
          <Field label="Certificate No">
            <input
              className="input bg-slate-50"
              readOnly
              value={item?.certificate_no || "Auto-generated on save"}
            />
          </Field>
          <Field label="Registration Code (FDA / GACC)">
            <input
              className="input"
              required
              value={form.registration_code}
              onChange={(e) => patch("registration_code", e.target.value)}
              placeholder="Enter registration code"
            />
          </Field>
          <Field label="DUNS Number (9 digits, for FDA)">
            <input
              className="input font-mono"
              value={form.duns_code ? formatDuns(form.duns_code) : ""}
              onChange={(e) => handleDunsChange(e.target.value)}
              placeholder="12-345-6789"
              maxLength={11}
            />
            <div className="mt-1 text-[11px] text-navy-900/50">
              Required for FDA facility registration. Format: XX-XXX-XXXX. {form.duns_code.length === 9 ? "✓ Valid" : form.duns_code ? `${form.duns_code.length}/9 digits` : "Optional"}
            </div>
          </Field>
          <Field label="Service Fee (hidden from customer QR scan)">
            <input
              className="input"
              inputMode="numeric"
              value={form.service_price}
              onChange={(e) => patch("service_price", e.target.value)}
              placeholder="Example: 18500000"
            />
          </Field>
          <Field label="Company Name" className="md:col-span-2">
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
              placeholder="Registration scope, facility type, market..."
            />
          </Field>
          <Field label="Registration Date">
            <input
              type="date"
              className="input"
              required
              value={form.registered_at}
              onChange={(e) => patch("registered_at", e.target.value)}
            />
          </Field>
          <Field label={`Expiry Date (auto ${form.validity_years} ${form.validity_years === 1 ? "year" : "years"})`}>
            <input className="input bg-slate-50 font-semibold" readOnly value={expires} />
            <div className="mt-1 text-[11px] text-emerald-700">
              Contract {form.validity_years} {form.validity_years === 1 ? "year" : "years"}: {formatDate(form.registered_at)} → {formatDate(expires)}
            </div>
          </Field>
          <Field label="Days Remaining">
            <input
              className="input bg-slate-50"
              readOnly
              value={left < 0 ? "Expired" : `${left} days (${Math.floor(left / 365)} years ${left % 365} days)`}
            />
          </Field>
          <Field label="Certificate Validity">
            <div className="flex h-[42px] items-center text-sm font-semibold">
              {confirmed ? (
                <span className={valid ? "text-emerald-600" : "text-rose-600"}>
                  {valid ? `VALID — ${currentValidity} ${currentValidity === 1 ? "year" : "years"} — running` : "EXPIRED"}
                </span>
              ) : (
                <span className="text-navy-900/45">Not confirmed</span>
              )}
            </div>
          </Field>
          {item && item.renewal_count > 0 && (
            <>
              <Field label="Renewal Count">
                <input className="input bg-slate-50" readOnly value={`${item.renewal_count} times`} />
              </Field>
              <Field label="Last Renewed At">
                <input className="input bg-slate-50" readOnly value={item.last_renewed_at ? formatDate(item.last_renewed_at) : "—"} />
              </Field>
            </>
          )}
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
            {busy === "save" ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={!!busy || !item}
            onClick={() => action("confirm")}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "confirm" ? "..." : "Confirm Validity (VALID)"}
          </button>
          <button
            type="button"
            disabled={!!busy || !item || !confirmed}
            onClick={() => action("publish")}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "publish" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing
              </span>
            ) : published ? (
              "Published"
            ) : (
              "Publish + Generate QR"
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
              Renew
            </button>
          )}
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display font-bold">Certificate Validity</h3>
            {confirmed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          </div>
          <CountdownRing
            registeredAt={item?.registered_at || form.registered_at}
            expiresAt={item?.expires_at || expires}
            running={confirmed}
          />
          <p className="mt-4 text-center text-xs text-navy-900/50">
            Registered {formatDate(form.registered_at)} → expires {formatDate(expires)} ({form.validity_years} {form.validity_years === 1 ? "year" : "years"} per contract)
          </p>
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-navy-900">Contract Details:</div>
            <div className="mt-1 text-navy-900/60">
              Standard: <b>{form.standard}</b> · Duration: <b>{form.validity_years} {form.validity_years === 1 ? "year" : "years"}</b> · Renewal: selectable 1-10 years + fee
            </div>
            {form.duns_code && (
              <div className="mt-2">
                DUNS: <b className="font-mono">{formatDuns(form.duns_code)}</b>
              </div>
            )}
            {item && item.renewal_count > 0 && (
              <div className="mt-2 text-navy-900/60">
                Renewed <b>{item.renewal_count}</b> times · Last: {item.last_renewed_at ? formatDate(item.last_renewed_at) : "—"} · Current term: <b>{currentValidity} {currentValidity === 1 ? "year" : "years"}</b>
              </div>
            )}
          </div>
        </div>
        {published && qrUrl ? (
          <QrArtwork url={qrUrl} label={item?.certificate_no} />
        ) : (
          <div className="rounded-3xl border border-dashed border-navy-900/15 bg-white p-6 text-center text-sm text-navy-900/45">
            QR code will appear after clicking <b>Publish</b>.
          </div>
        )}
      </aside>

      {/* Renew Dialog */}
      {showRenewDialog && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-navy-900">Renew Certificate</h3>
              <button onClick={() => setShowRenewDialog(false)} className="rounded-full p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-navy-900/60">
              {item.certificate_no} · {item.company_name}
            </p>
            <div className="mt-1 text-xs text-navy-900/50">
              Current expiry: <b>{formatDate(item.expires_at)}</b> · Base date for renewal: <b>{formatDate(renewBaseDate)}</b> ({remainingDays(item.expires_at) >= 0 ? "from current expiry" : "from today (expired)"})
            </div>

            <div className="mt-5 space-y-4">
              <label>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
                  Renewal Duration (years) — 1 to 10
                </div>
                <select
                  value={renewYears}
                  onChange={(e) => setRenewYears(Number(e.target.value))}
                  className="input font-semibold"
                >
                  {VALIDITY_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? "year" : "years"} {y === currentValidity ? "(current contract)" : ""} {y === 1 ? "- 1 year renewal" : y === 2 ? "- 2 years" : y >= 5 ? "- multi-year" : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-navy-900/50">
                  Example: contract renew 1 year, or choose multi-year package (3,5,10 years). Expiry will be extended by selected years.
                </div>
              </label>

              <label>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
                  Renewal Fee (VND) — extra service fee
                </div>
                <input
                  className="input"
                  inputMode="numeric"
                  value={renewFee}
                  onChange={(e) => setRenewFee(e.target.value)}
                  placeholder="0"
                />
                <div className="mt-1 text-[11px] text-navy-900/50">
                  Leave 0 if no extra fee. This amount will be added to service_price and counted in revenue if already published.
                </div>
              </label>

              <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                <div className="font-semibold text-emerald-900">Preview new expiry:</div>
                <div className="mt-1 text-emerald-800">
                  {formatDate(renewBaseDate)} + {renewYears} {renewYears === 1 ? "year" : "years"} → <b>{formatDate(renewNewExpiry)}</b>
                </div>
                <div className="mt-1 text-xs text-emerald-700/70">
                  Renewal count will become {item.renewal_count + 1}, validity_years updated to {renewYears} {renewYears === 1 ? "year" : "years"}.
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowRenewDialog(false)}
                disabled={!!busy}
                className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={doRenew}
                disabled={!!busy}
                className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-950 disabled:opacity-50"
              >
                {busy === "renew" ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" /> Renewing...
                  </span>
                ) : (
                  `Renew ${renewYears} ${renewYears === 1 ? "year" : "years"}`
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
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-900/50">
        {label}
      </div>
      {children}
    </label>
  );
}
