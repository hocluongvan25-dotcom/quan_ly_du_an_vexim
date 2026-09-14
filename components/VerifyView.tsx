"use client";

import { COMPANY, type Certificate } from "@/lib/types";
import { daysBetween, formatDate, isValidNow, remainingDays, getValidityYears, formatDuns } from "@/lib/utils";
import { CountdownRing } from "./CountdownRing";
import { Logo } from "./Logo";
import { ValiditySeal } from "./ValiditySeal";
import { Mail, MapPin, Phone, ShieldCheck, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function VerifyView({ cert }: { cert: Omit<Certificate, "service_price"> & { duns_code?: string } }) {
  const { t } = useI18n();
  const valid = Boolean(cert.validity_confirmed) && isValidNow(cert.expires_at, cert.registered_at);
  const left = remainingDays(cert.expires_at);
  const total = daysBetween(cert.registered_at, cert.expires_at);
  const validityYears = getValidityYears(cert as any);
  const duns = (cert as any).duns_code || "";

  return (
    <div className="min-h-screen bg-[#fff8ec] text-navy-900">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Logo invert markClassName="h-11 w-11" />
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="light" size="sm" />
            <div className="text-right text-[10px] uppercase tracking-[0.22em] text-teal-300">
              {t("verify.certificateVerification")}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <div className="paper-card relative overflow-hidden rounded-[32px] border border-white/80 p-6 shadow-lift">
          <div className="pointer-events-none absolute inset-3 rounded-[24px] border border-gold-500/35" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-100/80" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-gold-100/50" />

          <div className="relative flex flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-700">{t("verify.officialRecord")}</p>
            <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{cert.company_name}</h1>
            <p className="mt-1 text-sm text-navy-900/55">{cert.certificate_no}</p>
            <div className="my-6">
              <ValiditySeal valid={valid} confirmed={Boolean(cert.validity_confirmed)} size="lg" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-navy-900/70">
              {valid
                ? t("verify.validDesc", {
                    years: validityYears,
                    yearLabel: validityYears === 1 ? t("common.year") : t("common.years"),
                  })
                : t("verify.expiredDesc")}
            </p>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <Info label={t("verify.standard")} value={cert.standard} strong />
            <Info label={t("verify.code")} value={cert.registration_code} mono />
            <Info label={t("verify.dunsNumber")} value={duns ? formatDuns(duns) : "—"} mono strong={!!duns} />
            <Info
              label={t("verify.contractTerm")}
              value={`${validityYears} ${validityYears === 1 ? t("common.year") : t("common.years")}`}
              strong
            />
            <Info label={t("verify.registrationDate")} value={formatDate(cert.registered_at)} />
            <Info label={t("verify.expiryDate")} value={formatDate(cert.expires_at)} />
            <Info label={t("verify.daysRemaining")} value={left < 0 ? "0" : String(left)} strong />
            <Info
              label={t("verify.validityCycle")}
              value={t("verify.yearsCycle", {
                years: validityYears,
                yearLabel: validityYears === 1 ? t("common.year") : t("common.years"),
                days: total,
              })}
            />
            <Info
              label={t("verify.renewal")}
              value={t("verify.yearsPerCycle", {
                years: validityYears,
                yearLabel: validityYears === 1 ? t("common.year") : t("common.years"),
              })}
            />
          </div>

          <div className="relative mt-4 rounded-2xl bg-[#fff6df] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-900/45">{t("verify.scope")}</div>
            <p className="mt-1 text-sm leading-relaxed">{cert.scope || "—"}</p>
          </div>

          {duns && (
            <div className="relative mt-4">
              <div className="flex items-center gap-3 rounded-2xl border border-navy-900/10 bg-white px-4 py-3">
                <Building2 className="h-5 w-5 shrink-0 text-navy-900/40" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-900/40">{t("verify.dunsDun")}</div>
                  <div className="font-mono text-sm font-bold">{formatDuns(duns)}</div>
                  <div className="text-[11px] text-navy-900/50">{t("verify.requiredFDA")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[32px] bg-white p-6 shadow-card">
          <CountdownRing registeredAt={cert.registered_at} expiresAt={cert.expires_at} running={Boolean(cert.validity_confirmed)} />
          <p className="mt-3 text-center text-xs text-navy-900/50">
            {t("verify.contractYears", {
              years: validityYears,
              yearLabel: validityYears === 1 ? t("common.year") : t("common.years"),
              from: formatDate(cert.registered_at),
              to: formatDate(cert.expires_at),
            })}
          </p>
        </div>

        <section className="mt-4 rounded-[32px] bg-navy-900 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-teal-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">{t("verify.verifiedBy")}</span>
          </div>
          <h2 className="mt-3 font-display text-xl font-bold">{COMPANY.legal}</h2>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              {COMPANY.address}
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <a href={COMPANY.phoneHref} className="underline-offset-2 hover:underline">
                {COMPANY.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </li>
          </ul>
          <a href={COMPANY.website} className="mt-5 block rounded-2xl bg-teal-500 py-3 text-center text-sm font-bold text-navy-950">
            {COMPANY.websiteLabel}
          </a>
          <p className="mt-3 text-center text-[11px] text-white/45">{t("verify.publicNoFee")}</p>
        </section>
      </main>
    </div>
  );
}

function Info({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#fff6df] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-900/40">{label}</div>
      <div className={`mt-1 text-sm ${strong ? "font-extrabold" : "font-semibold"} ${mono ? "font-mono text-[12px]" : ""}`}>{value}</div>
    </div>
  );
}
