"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatVnd, remainingDays, getValidityYears, formatDuns } from "@/lib/utils";
import { certificateRecordState, type CertificateRecordState } from "@/lib/certificate-workflow";
import type { Certificate } from "@/lib/types";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

const STATUS_FILTERS: CertificateRecordState[] = ["valid", "expiring", "expired", "pending", "draft"];
const STATUS_LABEL_KEY: Record<CertificateRecordState, string> = {
  valid: "records.statusValid",
  expiring: "records.statusExpiring",
  expired: "records.statusExpired",
  pending: "records.statusPending",
  draft: "records.statusDraft",
};
const STATUS_BADGE_STYLE: Record<CertificateRecordState, string> = {
  valid: "bg-emerald-50 text-emerald-700",
  expiring: "bg-amber-50 text-amber-700",
  expired: "bg-rose-50 text-rose-600",
  pending: "bg-sky-50 text-sky-700",
  draft: "bg-slate-100 text-slate-600",
};

const SORTS = ["expiry", "company", "newest"] as const;
type SortKey = (typeof SORTS)[number];

function CertificatesList() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  // Bộ lọc — đọc từ URL để chia sẻ được link đã lọc (ví dụ: hồ sơ sắp hết hạn)
  const [q, setQ] = useState(sp.get("q") || "");
  const [std, setStd] = useState(sp.get("standard") || "ALL");
  const [status, setStatus] = useState(sp.get("status") || "ALL");
  const [term, setTerm] = useState(sp.get("term") || "ALL");
  const [sort, setSort] = useState<SortKey>(
    (SORTS as readonly string[]).includes(sp.get("sort") || "") ? (sp.get("sort") as SortKey) : "expiry"
  );

  useEffect(() => {
    fetch("/api/certificates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ""))
      .catch(() => setRole(""));
  }, []);

  // Giữ bộ lọc trên URL để tải lại / gửi link vẫn giữ nguyên.
  // Dùng history.replaceState thay vì router.replace: chỉ đổi thanh địa chỉ,
  // không kích hoạt điều hướng của Next (nếu không, mỗi ký tự gõ vào ô tìm kiếm
  // sẽ thành một lần gọi server).
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (std !== "ALL") params.set("standard", std);
    if (status !== "ALL") params.set("status", status);
    if (term !== "ALL") params.set("term", term);
    if (sort !== "expiry") params.set("sort", sort);
    const query = params.toString();
    window.history.replaceState(null, "", `/dashboard/ho-so${query ? `?${query}` : ""}`);
  }, [q, std, status, term, sort]);

  const isFiltered = q.trim() !== "" || std !== "ALL" || status !== "ALL" || term !== "ALL" || sort !== "expiry";

  // Lọc theo từ khoá + tiêu chuẩn + kỳ hạn (chưa lọc theo trạng thái, để đếm được số lượng từng trạng thái)
  const baseFiltered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((c) => {
      if (std !== "ALL" && c.standard !== std) return false;
      if (term !== "ALL" && String(getValidityYears(c)) !== term) return false;
      if (!needle) return true;
      const hay = `${c.certificate_no} ${c.company_name} ${c.registration_code} ${c.duns_code || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, std, term]);

  const statusCounts = useMemo(() => {
    const counts: Record<CertificateRecordState, number> = { valid: 0, expiring: 0, expired: 0, pending: 0, draft: 0 };
    for (const c of baseFiltered) counts[certificateRecordState(c)]++;
    return counts;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    const rows = baseFiltered.filter((c) => status === "ALL" || certificateRecordState(c) === status);
    const sorted = [...rows];
    if (sort === "expiry") sorted.sort((a, b) => a.expires_at.localeCompare(b.expires_at));
    if (sort === "company") sorted.sort((a, b) => a.company_name.localeCompare(b.company_name, "vi"));
    if (sort === "newest") sorted.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")) || b.id - a.id);
    return sorted;
  }, [baseFiltered, status, sort]);

  // Kỳ hạn có trong dữ liệu, để bộ lọc luôn khớp với thực tế
  const terms = useMemo(
    () => Array.from(new Set(items.map((c) => getValidityYears(c)))).sort((a, b) => a - b),
    [items]
  );

  function clearFilters() {
    setQ("");
    setStd("ALL");
    setStatus("ALL");
    setTerm("ALL");
    setSort("expiry");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">{t("records.title")}</h1>
          <p className="mt-1 text-sm text-navy-900/55">{t("records.subtitle")}</p>
        </div>
        <Link
          href="/dashboard/ho-so/moi"
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("records.createRecord")}
        </Link>
      </div>

      <div className="mt-6 rounded-3xl bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("records.searchPlaceholder")}
              className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
            />
          </div>
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl border border-navy-900/10 px-3 py-2 text-sm font-semibold text-navy-900/70 hover:bg-navy-900/5"
            >
              <X className="h-3.5 w-3.5" />
              {t("records.clearFilters")}
            </button>
          )}
          <div className="text-sm font-semibold text-navy-900/55">
            {t("records.showing", { shown: filtered.length, total: items.length })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/40">
            {t("records.filterStatus")}
          </span>
          <button
            onClick={() => setStatus("ALL")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              status === "ALL" ? "bg-navy-900 text-white" : "bg-navy-900/5 text-navy-900/70 hover:bg-navy-900/10"
            }`}
          >
            {t("records.all")} ({baseFiltered.length})
          </button>
          {STATUS_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setStatus(status === key ? "ALL" : key)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                status === key ? "bg-navy-900 text-white" : "bg-navy-900/5 text-navy-900/70 hover:bg-navy-900/10"
              }`}
            >
              {t(STATUS_LABEL_KEY[key])} ({statusCounts[key]})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-navy-900/5 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/40">
              {t("records.filterStandard")}
            </span>
            {["ALL", "FDA", "GACC"].map((s) => (
              <button
                key={s}
                onClick={() => setStd(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  std === s ? "bg-navy-900 text-white" : "bg-navy-900/5 text-navy-900/70 hover:bg-navy-900/10"
                }`}
              >
                {s === "ALL" ? t("records.all") : s}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/40">
              {t("records.filterTerm")}
            </span>
            <button
              onClick={() => setTerm("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                term === "ALL" ? "bg-navy-900 text-white" : "bg-navy-900/5 text-navy-900/70 hover:bg-navy-900/10"
              }`}
            >
              {t("records.all")}
            </button>
            {terms.map((years) => (
              <button
                key={years}
                onClick={() => setTerm(String(years))}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  term === String(years) ? "bg-navy-900 text-white" : "bg-navy-900/5 text-navy-900/70 hover:bg-navy-900/10"
                }`}
              >
                {years} {years === 1 ? t("common.year") : t("common.years")}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/40">
              {t("records.sortBy")}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-navy-900/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-900 outline-none"
            >
              <option value="expiry">{t("records.sortExpirySoon")}</option>
              <option value="company">{t("records.sortCompany")}</option>
              <option value="newest">{t("records.sortNewest")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">{t("records.certificateNo")}</th>
                <th className="px-4 py-3">{t("records.company")}</th>
                <th className="px-4 py-3">{t("records.standard")}</th>
                <th className="px-4 py-3">{t("records.contract")}</th>
                <th className="px-4 py-3">{t("records.code")}</th>
                <th className="px-4 py-3">{t("records.duns")}</th>
                <th className="px-4 py-3">{t("records.regExpiry")}</th>
                <th className="px-4 py-3">{t("records.remaining")}</th>
                {role === "admin" && <th className="px-4 py-3">{t("records.serviceFee")}</th>}
                <th className="px-4 py-3">{t("records.status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const left = remainingDays(c.expires_at);
                const vy = getValidityYears(c);
                const state = certificateRecordState(c);
                return (
                  <tr key={c.id} className="border-t border-navy-900/5 hover:bg-teal-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/ho-so/${c.id}`} className="font-semibold text-navy-900">
                        {c.certificate_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{c.company_name}</td>
                    <td className="px-4 py-3 font-bold">{c.standard}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-700">
                        {vy} {vy === 1 ? t("common.year") : t("common.years")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.registration_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.duns_code ? formatDuns(c.duns_code) : <span className="text-navy-900/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(c.registered_at)}
                      <div className="text-navy-900/45">→ {formatDate(c.expires_at)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{left < 0 ? "—" : left === 0 ? t("common.today") : `${left} ${t("common.days")}`}</td>
                    {role === "admin" && <td className="px-4 py-3 text-xs">{formatVnd(c.service_price)}</td>}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${STATUS_BADGE_STYLE[state]}`}>
                        {t(STATUS_LABEL_KEY[state])}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={role === "admin" ? 10 : 9} className="px-4 py-10 text-center text-navy-900/45">
                    {t("records.noRecords")}
                    {isFiltered && (
                      <button onClick={clearFilters} className="ml-2 font-semibold text-navy-900 underline">
                        {t("records.clearFilters")}
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-12 text-center text-navy-900/40 shadow-card">…</div>}>
      <CertificatesList />
    </Suspense>
  );
}
