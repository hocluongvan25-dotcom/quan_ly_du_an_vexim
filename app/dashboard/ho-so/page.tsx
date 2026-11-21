"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, remainingDays, getValidityYears } from "@/lib/utils";
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
/** DUNS hiển thị trong bảng dạng 9 chữ số liền, bỏ dấu gạch và khoảng trắng. */
function dunsDigits(code: string | null | undefined) {
  return String(code || "").replace(/\D/g, "");
}

/** Nhãn ngắn cho huy hiệu trong bảng; bộ lọc phía trên vẫn dùng nhãn đầy đủ. */
const STATUS_BADGE_KEY: Record<CertificateRecordState, string> = {
  valid: "records.statusValid",
  expiring: "records.statusExpiringShort",
  expired: "records.statusExpired",
  pending: "records.statusPending",
  draft: "records.statusDraft",
};

const SORTS = ["expiry", "company", "newest"] as const;
type SortKey = (typeof SORTS)[number];

function CertificatesList() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="records-page">
      <div className="records-page__inner">
        <div className="rec-head">
          <div>
            <h1 className="rec-head__title">{t("records.title")}</h1>
            <p className="rec-head__sub">{t("records.subtitle")}</p>
          </div>
          <div className="rec-head__actions">
            <Link href="/dashboard/ho-so/moi" className="rec-btn-primary">
              {t("records.createRecord")}
            </Link>
          </div>
        </div>

        <section className="rec-toolbar" aria-label={t("records.filterStatus")}>
          <div className="rec-toolbar__row">
            <div className="rec-search">
              <Search className="rec-search__icon" aria-hidden="true" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("records.searchPlaceholder")}
                className="rec-search__input"
                type="search"
                aria-label={t("records.searchPlaceholder")}
                enterKeyHint="search"
              />
              {q !== "" && (
                <button
                  type="button"
                  className="rec-search__clear"
                  onClick={() => setQ("")}
                  aria-label={t("records.clearFilters")}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <span className="rec-count">
              {t("records.showing", { shown: filtered.length, total: items.length })}
            </span>

            {isFiltered && (
              <button type="button" onClick={clearFilters} className="rec-btn-quiet">
                <X className="h-3 w-3" aria-hidden="true" />
                {t("records.clearFilters")}
              </button>
            )}
          </div>

          <div className="rec-toolbar__row">
            <div className="rec-group">
              <span className="rec-group__label">{t("records.filterStatus")}</span>
              <div className="rec-seg rec-seg--status" role="group" aria-label={t("records.filterStatus")}>
                <button
                  type="button"
                  className="rec-seg__btn"
                  aria-pressed={status === "ALL"}
                  onClick={() => setStatus("ALL")}
                >
                  {t("records.all")}{" "}
                  <span className="rec-seg__count">({baseFiltered.length})</span>
                </button>
                {STATUS_FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="rec-seg__btn"
                    aria-pressed={status === key}
                    onClick={() => setStatus(status === key ? "ALL" : key)}
                  >
                    {t(STATUS_LABEL_KEY[key])}{" "}
                    <span className="rec-seg__count">({statusCounts[key]})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rec-toolbar__row">
            <div className="rec-group">
              <span className="rec-group__label">{t("records.filterStandard")}</span>
              <div className="rec-seg" role="group" aria-label={t("records.filterStandard")}>
                {["ALL", "FDA", "GACC"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rec-seg__btn"
                    aria-pressed={std === s}
                    onClick={() => setStd(s)}
                  >
                    {s === "ALL" ? t("records.all") : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="rec-group">
              <span className="rec-group__label">{t("records.filterTerm")}</span>
              <div className="rec-seg" role="group" aria-label={t("records.filterTerm")}>
                <button
                  type="button"
                  className="rec-seg__btn"
                  aria-pressed={term === "ALL"}
                  onClick={() => setTerm("ALL")}
                >
                  {t("records.all")}
                </button>
                {terms.map((years) => (
                  <button
                    key={years}
                    type="button"
                    className="rec-seg__btn"
                    aria-pressed={term === String(years)}
                    onClick={() => setTerm(String(years))}
                  >
                    {years} {years === 1 ? t("common.year") : t("common.years")}
                  </button>
                ))}
              </div>
            </div>

            <div className="rec-group" style={{ marginLeft: "auto" }}>
              <span className="rec-group__label">{t("records.sortBy")}</span>
              <span className="rec-select-wrap">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rec-select"
                  aria-label={t("records.sortBy")}
                >
                  <option value="expiry">{t("records.sortExpirySoon")}</option>
                  <option value="company">{t("records.sortCompany")}</option>
                  <option value="newest">{t("records.sortNewest")}</option>
                </select>
              </span>
            </div>
          </div>
        </section>

        <section className="rec-card" aria-label={t("records.title")}>
          {(loading || filtered.length > 0) && (
            <div className="rec-scroll">
              <table className="rec-table">
                <thead>
                  <tr>
                    <th scope="col">{t("records.certificateNo")}</th>
                    <th scope="col">{t("records.company")}</th>
                    <th scope="col">{t("records.standard")}</th>
                    <th scope="col">{t("records.contract")}</th>
                    <th scope="col">{t("records.code")}</th>
                    <th scope="col">{t("records.duns")}</th>
                    <th scope="col">{t("records.regExpiry")}</th>
                    <th scope="col">{t("records.remaining")}</th>
                    <th scope="col" className="rec-th-status">
                      {t("records.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`}>
                        {Array.from({ length: 9 }).map((__, cell) => (
                          <td key={cell}>
                            <span
                              className={`rec-skeleton ${
                                cell === 1 ? "rec-skeleton--wide" : cell === 0 ? "rec-skeleton--mid" : "rec-skeleton--narrow"
                              }`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}

                  {!loading &&
                    filtered.map((c) => {
                      const left = remainingDays(c.expires_at);
                      const vy = getValidityYears(c);
                      const state = certificateRecordState(c);
                      return (
                        <tr key={c.id}>
                          <td>
                            <Link href={`/dashboard/ho-so/${c.id}`} className="rec-no">
                              {c.certificate_no}
                            </Link>
                          </td>
                          <td>
                            <span className="rec-company" title={c.company_name}>
                              {c.company_name}
                            </span>
                          </td>
                          <td>
                            <span className={`rec-standard${c.standard === "GACC" ? " rec-standard--gacc" : ""}`}>
                              {c.standard}
                            </span>
                          </td>
                          <td>
                            <span className="rec-term">
                              {vy} {vy === 1 ? t("common.year") : t("common.years")}
                            </span>
                          </td>
                          <td>
                            <span className="rec-code">{c.registration_code}</span>
                          </td>
                          <td>
                            <span className="rec-duns">
                              {dunsDigits(c.duns_code) || <span className="text-navy-900/30">—</span>}
                            </span>
                          </td>
                          <td>
                            <span className="rec-dates">
                              {formatDate(c.registered_at)}
                              <br />
                              <span className="rec-dates__to">
                                <span aria-hidden="true">→</span>
                                {formatDate(c.expires_at)}
                              </span>
                            </span>
                          </td>
                          <td>
                            <span
                              className={`rec-remaining${
                                left < 0 ? " rec-remaining--past" : left <= 90 ? " rec-remaining--soon" : ""
                              }`}
                            >
                              {left < 0 ? "—" : left === 0 ? t("common.today") : `${left} ${t("common.days")}`}
                            </span>
                          </td>
                          <td className="rec-td-status">
                            <span className={`rec-badge rec-badge--${state}`}>{t(STATUS_BADGE_KEY[state])}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          <ul className="rec-cards">
            {!loading &&
              filtered.map((c) => {
                const left = remainingDays(c.expires_at);
                const vy = getValidityYears(c);
                const state = certificateRecordState(c);
                return (
                  <li className="rec-item" key={`card-${c.id}`}>
                    <div className="rec-item__head">
                      <Link href={`/dashboard/ho-so/${c.id}`} className="rec-item__no">
                        {c.certificate_no}
                      </Link>
                      <span className={`rec-badge rec-badge--${state}`}>{t(STATUS_LABEL_KEY[state])}</span>
                    </div>
                    <p className="rec-item__company">{c.company_name}</p>
                    <dl className="rec-item__grid">
                      <div className="rec-item__pair">
                        <dt className="rec-item__key">{t("records.standard")}</dt>
                        <dd className="rec-item__val">
                          <span className={`rec-standard${c.standard === "GACC" ? " rec-standard--gacc" : ""}`}>
                            {c.standard}
                          </span>
                          <span className="rec-term" style={{ marginLeft: 8 }}>
                            {vy} {vy === 1 ? t("common.year") : t("common.years")}
                          </span>
                        </dd>
                      </div>
                      <div className="rec-item__pair">
                        <dt className="rec-item__key">{t("records.code")}</dt>
                        <dd className="rec-item__val">{c.registration_code}</dd>
                      </div>
                      <div className="rec-item__pair">
                        <dt className="rec-item__key">{t("records.duns")}</dt>
                        <dd className="rec-item__val rec-duns">{dunsDigits(c.duns_code) || "—"}</dd>
                      </div>
                      <div className="rec-item__pair">
                        <dt className="rec-item__key">{t("records.remaining")}</dt>
                        <dd
                          className={`rec-item__val rec-remaining${
                            left < 0 ? " rec-remaining--past" : left <= 90 ? " rec-remaining--soon" : ""
                          }`}
                        >
                          {left < 0 ? "—" : left === 0 ? t("common.today") : `${left} ${t("common.days")}`}
                        </dd>
                      </div>
                      <div className="rec-item__pair">
                        <dt className="rec-item__key">{t("records.regExpiry")}</dt>
                        <dd className="rec-item__val rec-dates">
                          {formatDate(c.registered_at)}
                          <br />
                          <span className="rec-dates__to">
                            <span aria-hidden="true">→</span>
                            {formatDate(c.expires_at)}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
          </ul>

          {!loading && filtered.length === 0 && (
            <div className="rec-empty">
              <span className="rec-empty__icon" aria-hidden="true">
                <Search className="h-4 w-4" />
              </span>
              <p className="rec-empty__title">{t("records.noRecords")}</p>
              {isFiltered && (
                <p className="rec-empty__text">
                  <button type="button" className="rec-btn-link" onClick={clearFilters}>
                    {t("records.clearFilters")}
                  </button>
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="records-page"><div className="records-page__inner"><div className="rec-fallback">…</div></div></div>}>
      <CertificatesList />
    </Suspense>
  );
}
