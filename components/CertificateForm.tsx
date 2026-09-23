"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CountdownRing } from "./CountdownRing";
import { QrArtwork } from "./QrArtwork";
import { ValiditySeal } from "./ValiditySeal";
import { expiryFromStandard, formatDate, remainingDays, getValidityYears, formatDuns, todayLocalIso, todayUtcIso } from "@/lib/utils";
import { GACC_FIXED_YEARS, VALIDITY_YEARS_OPTIONS, canChooseValidityYears, getDefaultValidity, getValidityOptionsForStandard, type Certificate, type Standard, type Role } from "@/lib/types";
import { CheckCircle2, Loader2, X, Building2, Mail, EyeOff, Eye, KeyRound, Lock, Search, MapPin } from "lucide-react";
import { needsCertificateApproval, certificateFields, maskCredential } from "@/lib/certificate-workflow";
import { useI18n } from "@/lib/i18n/context";

type CompanyOption = { id: number; company_name: string; email: string; address?: string; standards?: string[]; certificate_count?: number; services_label?: string };

type FormState = {
  standard: Standard;
  registration_code: string;
  duns_code: string;
  us_agent: string;
  service_price: string;
  company_name: string;
  company_email: string;
  company_address: string;
  portal_user: string;
  portal_pass: string;
  scope: string;
  registered_at: string;
  validity_years: number;
};

type Prefill = { standard?: string; company?: string; email?: string; price?: string };

function toForm(item?: Certificate, prefill?: Prefill): FormState {
  const source = item ? { ...item, ...item.pending_changes } : undefined;
  const standard: Standard = source?.standard || (prefill?.standard === "GACC" ? "GACC" : "FDA");
  return {
    standard,
    registration_code: source?.registration_code || "",
    duns_code: source?.duns_code || "",
    us_agent: source ? source.us_agent : "Vexim Global LLC",
    service_price: source ? String(source.service_price) : prefill?.price || "",
    company_name: source?.company_name || prefill?.company || "",
    company_email: source?.company_email || prefill?.email || "",
    company_address: source?.company_address || "",
    portal_user: source?.portal_user || "",
    portal_pass: source?.portal_pass || "",
    scope: source?.scope || "",
    registered_at: source?.registered_at?.slice(0, 10) || todayLocalIso(),
    // FDA: giữ đúng số năm đã lưu (1-10). GACC: luôn 5 năm cố định.
    validity_years: standard === "GACC" ? GACC_FIXED_YEARS : source?.validity_years || getDefaultValidity(standard),
  };
}

async function certificateRequest(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Không thể cập nhật hồ sơ.");
  return data;
}

export function CertificateForm({ initial, prefill, role }: {
  initial?: Certificate;
  prefill?: Prefill;
  role?: Role;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const isAdmin = role === "admin";
  const [form, setForm] = useState<FormState>(() => toForm(initial, prefill));
  const [item, setItem] = useState<Certificate | undefined>(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(Boolean(initial));
  const [loadFailed, setLoadFailed] = useState(false);
  const [origin, setOrigin] = useState("");
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const companyWrapRef = useRef<HTMLDivElement>(null);

  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewYears, setRenewYears] = useState<number>(() =>
    initial?.validity_years || getDefaultValidity(initial?.standard === "GACC" ? "GACC" : "FDA"));
  const [renewFee, setRenewFee] = useState<string>("0");

  useEffect(() => {
    setOrigin(window.location.origin);
    // Fetch companies for autocomplete + email auto-fill
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const list = d.companies || d.items || [];
        if (Array.isArray(list)) {
          setCompanies(
            list.map((c: any) => ({
              id: c.id,
              company_name: c.company_name,
              email: c.email || "",
              address: c.address || "",
              standards: c.standards || [],
              certificate_count: c.certificate_count || 0,
              services_label: c.services_label || (c.standards || []).join(", "),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // The Next router may restore an old page snapshot. Always read persisted state on entry,
  // without publishing or mutating the certificate just to display its QR.
  useEffect(() => {
    if (!initial?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    certificateRequest(`/api/certificates/${initial.id}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setItem(data.item);
        setForm(toForm(data.item));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setMsg(error.message || t("form.loadFailed"));
          setLoadFailed(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initial?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!companyWrapRef.current) return;
      if (!companyWrapRef.current.contains(e.target as Node)) {
        setCompanySearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (item) setRenewYears(item.validity_years || getDefaultValidity(item.standard));
  }, [item?.id]);

  useEffect(() => {
    if (form.standard === "GACC") {
      if (form.duns_code || form.us_agent) {
        setForm((s) => ({ ...s, duns_code: "", us_agent: "" }));
      }
    }
  }, [form.standard]);

  const expires = useMemo(() => {
    if (item && item.registered_at === form.registered_at && item.standard === form.standard &&
        item.validity_years === form.validity_years) return item.expires_at;
    return expiryFromStandard(form.registered_at, form.standard, form.validity_years);
  }, [item, form.registered_at, form.standard, form.validity_years]);
  const dirty = item ? JSON.stringify(form) !== JSON.stringify(toForm(item)) : true;
  const needsApproval = item ? needsCertificateApproval(item) : false;
  const savedLeft = item ? remainingDays(item.expires_at) : remainingDays(expires);
  const left = item ? savedLeft : remainingDays(expires);
  const published = item?.status === "published" || item?.status === "expired";
  const valid = published && Boolean(item?.validity_confirmed) && savedLeft >= 0;
  const confirmed = published && Boolean(item?.validity_confirmed);
  // Số năm đang chọn trên form - ngày hết hạn luôn tính lại theo số này
  const displayValidity = form.standard === "GACC" ? GACC_FIXED_YEARS : form.validity_years;
  const validitySelectable = canChooseValidityYears(form.standard);

  const renewBaseDate = useMemo(() => {
    if (!item) return todayUtcIso();
    return remainingDays(item.expires_at) >= 0 ? item.expires_at : todayUtcIso();
  }, [item?.expires_at]);

  const renewNewExpiry = useMemo(() => {
    if (!item) return "";
    return expiryFromStandard(renewBaseDate, item.standard, renewYears);
  }, [renewBaseDate, item?.standard, renewYears]);

  const filteredCompanies = useMemo(() => {
    const q = form.company_name.trim().toLowerCase();
    if (!q) return companies.slice(0, 8);
    return companies.filter((c) => c.company_name.toLowerCase().includes(q)).slice(0, 8);
  }, [companies, form.company_name]);

  function selectCompany(c: CompanyOption) {
    setForm((s) => ({
      ...s,
      company_name: c.company_name,
      company_email: c.email || s.company_email,
      company_address: c.address || s.company_address,
    }));
    setCompanySearchOpen(false);
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  // Diff rows for the admin review list: never print a stored password in clear text.
  function diffValue(field: string, value: unknown) {
    const text = String(value ?? "").trim();
    if (field === "portal_pass") return text ? maskCredential(text) : "—";
    return text || "—";
  }

  function handleDunsChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setForm((s) => ({ ...s, duns_code: digits }));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (loading || loadFailed || busy || (item && !dirty)) return;
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
    const finalValidity = form.standard === "GACC"
      ? GACC_FIXED_YEARS
      : Math.min(10, Math.max(1, Math.round(Number(form.validity_years) || getDefaultValidity(form.standard))));
    const isGacc = form.standard === "GACC";
    const payload = {
      ...form,
      expected_updated_at: item?.updated_at,
      company_name: form.company_name.trim(),
      company_email: form.company_email.trim(),
      company_address: form.company_address.trim().slice(0, 300),
      portal_user: form.portal_user.trim().slice(0, 200),
      portal_pass: form.portal_pass.slice(0, 200),
      service_price: Number(String(form.service_price).replace(/[^\d]/g, "") || 0),
      validity_years: finalValidity,
      duns_code: isGacc ? "" : form.duns_code.replace(/\D/g, "").slice(0, 9),
      us_agent: isGacc ? "" : form.us_agent.trim().slice(0, 200),
    };
    if (payload.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.company_email)) {
      setBusy("");
      setMsg("Email doanh nghiệp không hợp lệ.");
      return;
    }
    try {
      const data = await certificateRequest(item ? `/api/certificates/${item.id}` : "/api/certificates", {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!item) {
        router.replace(`/dashboard/ho-so/${data.id}`);
        router.refresh();
        return;
      }
      setItem(data.item);
      setForm(toForm(data.item));
      // DB thiếu cột (chưa migration) thì API trả cảnh báo để nhân viên biết User/Pass chưa lưu được
      setMsg(data.warning || (data.item.pending_changes || data.item.status === "draft" ? t("form.savedForApproval") : t("form.noPendingChanges")));
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t("form.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    if (!item || !isAdmin || busy || loading || loadFailed || dirty || !needsApproval) return;
    setBusy("publish");
    setMsg("");
    try {
      const data = await certificateRequest(`/api/certificates/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", expected_updated_at: item.updated_at }),
      });
      setItem(data.item);
      setForm(toForm(data.item));
      setMsg(data.warning || t("form.approvedMsg"));
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t("form.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  async function doRenew() {
    if (!item || !isAdmin || busy || dirty || needsApproval) return;
    setBusy("renew");
    setMsg("");
    const finalRenewYears = item.standard === "GACC"
      ? GACC_FIXED_YEARS
      : Math.min(10, Math.max(1, Math.round(Number(renewYears) || item.validity_years || getDefaultValidity(item.standard))));
    const payload = {
      action: "renew",
      validity_years: finalRenewYears,
      renew_years: finalRenewYears,
      extra_fee: Number(String(renewFee).replace(/[^\d]/g, "") || 0),
    };
    try {
      const data = await certificateRequest(`/api/certificates/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setItem(data.item);
      setForm(toForm(data.item));
      setShowRenewDialog(false);
      setMsg(t("form.renewedMsg", {
        years: getValidityYears(data.item),
        yearLabel: getValidityYears(data.item) === 1 ? t("common.year") : t("common.years"),
        date: formatDate(data.item.expires_at), count: data.item.renewal_count,
      }));
      router.refresh();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : t("form.requestFailed"));
    } finally {
      setBusy("");
    }
  }

  const qrUrl = item && origin ? `${origin}/verify/${item.public_code}` : "";

  const isGacc = form.standard === "GACC";
  const isFda = form.standard === "FDA";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-5 shadow-card md:p-7">
        {loading && <p role="status" className="text-sm text-slate-500">{t("form.loadingRecord")}</p>}
        {loadFailed && <button type="button" onClick={() => window.location.reload()} className="text-sm text-rose-700 underline">{t("form.reloadRecord")}</button>}
        <fieldset disabled={loading || loadFailed || !!busy} className="min-w-0 space-y-4">
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

        {item?.pending_changes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">{t("form.pendingApproval")}</p>
            <p className="mt-1 text-xs">{t("form.pendingApprovalHelp")}</p>
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold">{t("form.reviewChanges")}</summary>
              <ul className="mt-2 space-y-2 break-words text-xs">
                {certificateFields.filter((field) => item.pending_changes![field] !== item[field]).map((field) => (
                  <li key={field}><b>{t(`form.changeFields.${field}`)}</b>: {diffValue(field, item[field])} → <b>{diffValue(field, item.pending_changes![field])}</b></li>
                ))}
              </ul>
            </details>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("form.standard")}>
            <select
              value={form.standard}
              onChange={(e) => {
                const newStd = e.target.value as Standard;
                setForm((s) => ({
                  ...s,
                  standard: newStd,
                  // Mỗi tiêu chuẩn có mặc định riêng (FDA 2 năm, GACC 5 năm) nhưng vẫn chọn lại 1-10 năm được
                  validity_years: getDefaultValidity(newStd),
                  duns_code: newStd === "GACC" ? "" : s.duns_code,
                  us_agent: newStd === "GACC" ? "" : s.us_agent || "Vexim Global LLC",
                }));
              }}
              className="input"
            >
              <option value="FDA">{t("form.standardFDA")}</option>
              <option value="GACC">{t("form.standardGACC")}</option>
            </select>
          </Field>
          <Field label={t("form.contractDuration")}>
            {validitySelectable ? (
              <>
                <select
                  className="input font-bold"
                  value={String(form.validity_years)}
                  onChange={(e) => patch("validity_years", Number(e.target.value))}
                >
                  {getValidityOptionsForStandard(form.standard).map((years) => (
                    <option key={years} value={years}>
                      {years} {years === 1 ? t("common.year") : t("common.years")}
                      {years === getDefaultValidity(form.standard) ? ` ${t("form.validityDefaultTag")}` : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.validityHelp")}</div>
              </>
            ) : (
              <>
                <input
                  className="input bg-slate-50 font-bold"
                  readOnly
                  value={`${GACC_FIXED_YEARS} ${t("common.years")} ${t("form.validityFixedTag")}`}
                />
                <div className="mt-1 text-[11px] text-navy-900/50">{t("form.gaccFixed")}</div>
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
                  placeholder={t("form.usAgentPlaceholder") || "Vexim Global LLC"}
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
          <Field label={
            <span className="inline-flex items-center gap-1.5">
              Email doanh nghiệp
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border px-2 py-0.5 text-[10px] font-bold text-slate-500">
                <EyeOff className="h-3 w-3" /> Ẩn với QR
              </span>
            </span> as any
          }>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                <Mail className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-navy-900/70" />
              </div>
              <div className="pointer-events-none absolute left-11 top-1/2 h-5 w-px -translate-y-1/2 bg-navy-900/10" />
              <input
                className="input !pl-[52px] !pr-3"
                type="email"
                value={form.company_email}
                onChange={(e) => patch("company_email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            <div className="mt-1 text-[11px] text-navy-900/50">Tự động lấy từ danh bạ doanh nghiệp, dùng gửi cảnh báo hết hạn. Không hiển thị khi quét QR.</div>
          </Field>
          <div className="md:col-span-2" ref={companyWrapRef}>
            <Field label={
              <span className="inline-flex items-center gap-1.5">
                {t("form.companyName")}
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 inline-flex items-center gap-1">
                  <Search className="h-3 w-3" /> Tìm kiếm
                </span>
              </span> as any
            }>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                  <Building2 className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-navy-900/70" />
                </div>
                <div className="pointer-events-none absolute left-11 top-1/2 h-5 w-px -translate-y-1/2 bg-navy-900/10" />
                <input
                  className="input !pl-[52px] !pr-11"
                  required
                  value={form.company_name}
                  onChange={(e) => {
                    patch("company_name", e.target.value);
                    setCompanySearchOpen(true);
                  }}
                  onFocus={() => setCompanySearchOpen(true)}
                  placeholder="Nhập tên công ty để tìm kiếm..."
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setCompanySearchOpen((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
                  tabIndex={-1}
                >
                  <Search className="h-4 w-4 text-slate-500" />
                </button>
                {companySearchOpen && filteredCompanies.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-xl">
                    <div className="sticky top-0 z-10 flex justify-between bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                      <span>{companies.length} doanh nghiệp • {filteredCompanies.length} kết quả</span>
                      <span className="text-[10px]">Dịch vụ →</span>
                    </div>
                    {filteredCompanies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCompany(c)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 border-b last:border-0"
                      >
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-navy-900">{c.company_name}</div>
                          {c.email && <div className="truncate text-[11px] text-slate-500">{c.email}</div>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="flex gap-1">
                            {(c.standards || []).length > 0 ? (
                              (c.standards || []).map((s) => (
                                <span
                                  key={s}
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${
                                    s === "FDA"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : s === "GACC"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full bg-slate-50 border px-2 py-0.5 text-[10px] text-slate-400">Chưa có DV</span>
                            )}
                          </div>
                          {c.certificate_count ? (
                            <span className="text-[10px] text-slate-400">{c.certificate_count} hồ sơ</span>
                          ) : null}
                        </div>
                        {form.company_name === c.company_name && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-1" />}
                      </button>
                    ))}
                    {form.company_name.trim() && !filteredCompanies.some((c) => c.company_name.toLowerCase() === form.company_name.trim().toLowerCase()) && (
                      <div className="px-3 py-2 text-xs text-slate-500">Nhấn Enter để tạo mới: <b className="text-navy-900">{form.company_name.trim()}</b></div>
                    )}
                  </div>
                )}
              </div>
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("form.companyAddress") as any}>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                  <MapPin className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-navy-900/70" />
                </div>
                <div className="pointer-events-none absolute left-11 top-1/2 h-5 w-px -translate-y-1/2 bg-navy-900/10" />
                <input
                  className="input !pl-[52px] !pr-3"
                  value={form.company_address}
                  onChange={(e) => patch("company_address", e.target.value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  maxLength={300}
                  autoComplete="off"
                />
              </div>
              <div className="mt-1 text-[11px] text-navy-900/50">
                Địa chỉ của khách hàng, hiển thị công khai ở mục 01 “Thông tin doanh nghiệp” khi khách quét mã QR.
              </div>
            </Field>
          </div>
          <Field label={t("form.scope")} className="md:col-span-2">
            <textarea
              className="input min-h-[90px]"
              value={form.scope}
              onChange={(e) => patch("scope", e.target.value)}
              placeholder={t("form.scopePlaceholder")}
            />
          </Field>
          <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 font-display text-sm font-extrabold text-navy-900">
                <Lock className="h-4 w-4 text-amber-600" />
                {t("form.portalSection")}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                <EyeOff className="h-3 w-3" /> {t("form.internalOnly")}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-navy-900/55">{t("form.portalHelp")}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label={t("form.portalUser")}>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center">
                    <KeyRound className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-navy-900/70" />
                  </div>
                  <div className="pointer-events-none absolute left-11 top-1/2 h-5 w-px -translate-y-1/2 bg-navy-900/10" />
                  <input
                    className="input !pl-[52px] !pr-3"
                    value={form.portal_user}
                    onChange={(e) => patch("portal_user", e.target.value)}
                    placeholder={t("form.portalUserPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </Field>
              <Field label={t("form.portalPass")}>
                <div className="relative group">
                  <input
                    className="input !pr-11"
                    type={showPass ? "text" : "password"}
                    value={form.portal_pass}
                    onChange={(e) => patch("portal_pass", e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? t("form.hidePass") : t("form.showPass")}
                    title={showPass ? t("form.hidePass") : t("form.showPass")}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-slate-100"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </button>
                </div>
              </Field>
            </div>
          </div>
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

        {msg && <div role="status" className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{msg}</div>}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={!!busy || (!!item && !dirty)} className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            {busy === "save" ? t("form.saving") : item ? t("form.saveChanges") : t("form.saveDraft")}
          </button>
          {isAdmin && <button
            type="button"
            disabled={!!busy || !item || dirty || !needsApproval}
            onClick={publish}
            className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lift"
          >
            {busy === "publish" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-4 w-4 animate-spin" /> {t("form.publishing")}
              </span>
            ) : !needsApproval && published ? (
              t("form.published")
            ) : (
              t("form.approvePublish")
            )}
          </button>}
          {published && isAdmin && (
            <button
              type="button"
              disabled={!!busy || dirty || needsApproval}
              onClick={() => {
                setRenewYears(item ? item.validity_years || getDefaultValidity(item.standard) : displayValidity);
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
          {dirty && item ? t("form.unsavedChanges") : t("form.approvalFlow")}
        </div>
        </fieldset>
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
              <b>
                {isGacc ? `${GACC_FIXED_YEARS} ${t("common.years")} ${t("form.validityFixedTag")}` : `${displayValidity} ${displayValidity === 1 ? t("common.year") : t("common.years")}`}
              </b>
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
                {canChooseValidityYears(item.standard) ? (
                  <>
                    <select
                      className="input font-bold"
                      value={String(renewYears)}
                      onChange={(e) => setRenewYears(Number(e.target.value))}
                    >
                      {getValidityOptionsForStandard(item.standard).map((years) => (
                        <option key={years} value={years}>
                          {years} {years === 1 ? t("common.year") : t("common.years")}
                          {years === (item.validity_years || getDefaultValidity(item.standard)) ? ` ${t("form.validityCurrentTag")}` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 text-[11px] text-navy-900/50">{t("form.renewalHelp")}</div>
                  </>
                ) : (
                  <>
                    <input
                      className="input bg-slate-50 font-bold"
                      readOnly
                      value={`${GACC_FIXED_YEARS} ${t("common.years")} ${t("form.validityFixedTag")}`}
                    />
                    <div className="mt-1 text-[11px] text-navy-900/50">{t("form.gaccFixed")}</div>
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
  label: string | React.ReactNode;
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
