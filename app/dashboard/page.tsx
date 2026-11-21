"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, formatVnd, remainingDays, statusLabel, getValidityYears } from "@/lib/utils";
import { FDA_FIXED_YEARS, GACC_FIXED_YEARS } from "@/lib/types";
import { certificateRecordState } from "@/lib/certificate-workflow";
import { AlertTriangle, FileBadge2, ShieldCheck, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { Certificate } from "@/lib/types";

type Stats = {
  total: number;
  count: number;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [role, setRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    fetch("/api/certificates")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
    fetch("/api/revenue")
      .then((r) => r.json())
      .then((d) => {
        if (d.total !== undefined) setStats(d);
      })
      .catch(() => {});
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setRole(d.user?.role || "");
        setUserName(d.user?.name || "");
      });
  }, []);

  // Cùng định nghĩa với bộ lọc ở trang danh sách hồ sơ (certificateRecordState)
  const valid = items.filter((i) => certificateRecordState(i) === "valid");
  const expiring = items.filter((i) => certificateRecordState(i) === "expiring");

  const validityStats = Array.from(new Set(items.map((c) => getValidityYears(c))))
    .filter((years) => years >= 1 && years <= 10)
    .sort((a, b) => a - b)
    .map((y) => ({
      years: y,
      count: items.filter((c) => getValidityYears(c) === y).length,
    }))
    .filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          {t("nav.hello")}, {userName}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">{t("dashboard.overview")}</h1>
        <p className="mt-1 text-sm text-navy-900/60">{t("dashboard.flexibleDesc")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<FileBadge2 className="h-5 w-5" />}
          label={t("dashboard.totalRecords")}
          value={String(items.length)}
          hint={t("dashboard.totalHint", {
            fda: items.filter((i) => i.standard === "FDA").length,
            gacc: items.filter((i) => i.standard === "GACC").length,
          })}
          href="/dashboard/ho-so"
        />
        <Stat
          icon={<ShieldCheck className="h-5 w-5" />}
          label={t("dashboard.valid")}
          value={String(valid.length)}
          hint={t("dashboard.validHint")}
          href="/dashboard/ho-so?status=valid"
        />
        <Stat
          icon={<AlertTriangle className="h-5 w-5" />}
          label={t("dashboard.expiring")}
          value={String(expiring.length)}
          hint={t("dashboard.expiringHint")}
          href="/dashboard/ho-so?status=expiring"
        />
        <Stat
          icon={<Wallet className="h-5 w-5" />}
          label={role === "admin" ? t("dashboard.recordedRevenue") : t("dashboard.role")}
          value={role === "admin" ? formatVnd(stats?.total || 0) : t("dashboard.specialist")}
          hint={role === "admin" ? t("dashboard.publishedRecords", { count: stats?.count || 0 }) : t("dashboard.specialistHint")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t("dashboard.needsAttention")}</h2>
            <Link href="/dashboard/ho-so" className="text-sm font-semibold text-teal-700">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-navy-900/45">
                <tr>
                  <th className="pb-2">{t("dashboard.certificate")}</th>
                  <th className="pb-2">{t("dashboard.company")}</th>
                  <th className="pb-2">{t("dashboard.standard")}</th>
                  <th className="pb-2">{t("dashboard.contract")}</th>
                  <th className="pb-2">{t("dashboard.expiry")}</th>
                  <th className="pb-2">{t("dashboard.remaining")}</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((c) => {
                  const left = remainingDays(c.expires_at);
                  const vy = getValidityYears(c);
                  return (
                    <tr key={c.id} className="border-t border-navy-900/5">
                      <td className="py-3">
                        <Link href={`/dashboard/ho-so/${c.id}`} className="font-semibold text-navy-900">
                          {c.certificate_no}
                        </Link>
                        <div className="text-[11px] text-navy-900/45">{statusLabel(c.status, left)}</div>
                      </td>
                      <td className="py-3">{c.company_name}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            c.standard === "FDA" ? "bg-navy-900 text-white" : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          {c.standard}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-700">
                          {vy} {vy === 1 ? t("common.year") : t("common.years")}
                        </span>
                      </td>
                      <td className="py-3">{formatDate(c.expires_at)}</td>
                      <td className={`py-3 font-semibold ${left < 0 ? "text-rose-600" : left <= 90 ? "text-amber-600" : "text-emerald-600"}`}>
                        {left < 0 ? t("dashboard.expired") : `${left} ${t("common.days")}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
          <h2 className="font-display text-lg font-bold">{t("dashboard.flexibleRules")}</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-teal-300">{t("dashboard.fdaFlexible")}</div>
              <div className="mt-1 text-2xl font-extrabold">{t("dashboard.fdaYears")}</div>
              <p className="mt-1 text-sm text-white/65">{t("dashboard.fdaDesc")}</p>
              <div className="mt-2">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold">
                  {t("dashboard.flexibleYears")}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-gold-400">{t("dashboard.gaccFlexible")}</div>
              <div className="mt-1 text-2xl font-extrabold">{t("dashboard.gaccYears")}</div>
              <p className="mt-1 text-sm text-white/65">{t("dashboard.gaccDesc")}</p>
              <div className="mt-2">
                <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold text-gold-300">
                  {t("dashboard.fixedYears", { years: GACC_FIXED_YEARS })}
                </span>
              </div>
            </div>
            {validityStats.length > 0 && (
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wider text-white/60">{t("dashboard.statsByContract")}</div>
                <div className="mt-2 space-y-1">
                  {validityStats.map((s) => (
                    <div key={s.years} className="flex justify-between text-sm">
                      <span>
                        {s.years} {t("common.years")}
                      </span>
                      <span className="font-bold">
                        {s.count} {t("dashboard.records")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link
            href="/dashboard/ho-so/moi"
            className="mt-5 block rounded-2xl bg-teal-500 py-3 text-center text-sm font-bold text-navy-950"
          >
            {t("dashboard.createNew")}
          </Link>
          <Link href="/dashboard/doanh-nghiep" className="mt-3 block rounded-2xl bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/15">
            Mở hành trình doanh nghiệp
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  /** Bấm vào ô thống kê để mở danh sách hồ sơ đã lọc sẵn theo con số này. */
  href?: string;
}) {
  const body = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        {icon}
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </>
  );
  if (!href) return <div className="rounded-3xl bg-white p-5 shadow-card">{body}</div>;
  return (
    <Link href={href} className="rounded-3xl bg-white p-5 shadow-card transition hover:shadow-lg hover:ring-1 hover:ring-navy-900/10">
      {body}
    </Link>
  );
}
