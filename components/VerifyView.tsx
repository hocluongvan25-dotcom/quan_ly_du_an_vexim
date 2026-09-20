"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, Building2, CheckCircle2, ChevronDown, Clock3, Copy,
  FileCheck2, Globe2, Info, Link2, Mail, Phone, RefreshCw, ShieldCheck, ShieldX, X,
} from "lucide-react";
import type { publicCertificate } from "@/lib/certificate-workflow";
import { COMPANY } from "@/lib/types";
import { formatDuns } from "@/lib/utils";
import { formatCheckedAt, formatRegistrationDate, verificationResult } from "@/lib/verification-view";
import { verificationText, verificationLanguageUrl, VERIFICATION_LOCALE_COOKIE, type VerificationLocale, type VerificationTextKey } from "@/lib/verification-i18n";
import styles from "./VerifyView.module.css";

type Props = { cert: ReturnType<typeof publicCertificate>; checkedAt: string; locale: VerificationLocale };
type Service = "sales" | "amazon";
const serviceLinks = {
  sales: {
    url: "https://veximtrade.com", website: "veximtrade.com",
  },
  amazon: {
    url: "https://veximops.com", website: "veximops.com",
  },
};

export function VerifyView({ cert, checkedAt, locale }: Props) {
  const t = (key: VerificationTextKey, params?: Record<string, string | number>) => verificationText(locale, key, params);
  const services = {
    sales: { ...serviceLinks.sales, title: t("salesTitle"), description: t("salesDescription") },
    amazon: { ...serviceLinks.amazon, title: t("amazonTitle"), description: t("amazonDescription") },
  };
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [switchingLanguage, startLanguageSwitch] = useTransition();

  function switchLanguage(next: VerificationLocale) {
    if (switchingLanguage || next === locale) return;
    // Optional preference storage: an explicit link works even when cookies are blocked.
    try {
      document.cookie = `${VERIFICATION_LOCALE_COOKIE}=${next}; Path=/verify; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* Language switching must not depend on storage permission. */ }
    const url = verificationLanguageUrl(window.location.href, next);
    startLanguageSwitch(() => router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false }));
  }
  const [toast, setToast] = useState<VerificationTextKey | "">("");
  const [modal, setModal] = useState<Service | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [formError, setFormError] = useState<VerificationTextKey | "">("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const result = verificationResult(cert, checkedAt, locale);
  const isGacc = cert.standard === "GACC";
  const StateIcon = result.state === "valid" ? ShieldCheck : result.state === "expired" ? ShieldX : Info;
  const authority = isGacc
    ? "General Administration of Customs of China (GACC)"
    : "U.S. Food and Drug Administration (FDA)";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  async function copy(text: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        try {
          input.select();
          if (!document.execCommand("copy")) throw new Error("Copy failed");
        } finally { input.remove(); }
      }
      setToast("copySuccess");
    } catch { setToast("copyFailure"); }
  }

  async function submitConsultation(event: FormEvent) {
    event.preventDefault();
    if (!modal || submitting) return;
    if (!contact.name.trim() || contact.phone.replace(/\D/g, "").length < 9) {
      setFormError("invalidContact");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/consultation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: modal, name: contact.name.trim(), phone: contact.phone.trim(),
          company_name: cert.company_name, certificate_no: cert.certificate_no,
          public_code: cert.public_code, source_url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error("CONSULTATION_FAILED");
      setContact({ name: "", phone: "" });
      setModal(null);
      setToast("consultationSuccess");
    } catch {
      setFormError("sendFailed");
    } finally { setSubmitting(false); }
  }

  const badge = (
    <span className={styles.statusBadge} data-state={result.state}>
      {result.state === "valid" ? <CheckCircle2 size={15} aria-hidden="true" /> : <StateIcon size={15} aria-hidden="true" />}
      {result.label}
    </span>
  );

  return (
    <div className={styles.page} lang={locale}>
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <a href={COMPANY.website} className={styles.brand} aria-label={t("home")}>
            <span className={styles.brandMark}><ShieldCheck size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span>VEXIM <span className={styles.brandLight}>GLOBAL</span><small>CERTIFICATE VERIFICATION</small></span>
          </a>
          <div className={styles.headerTools}>
            <span className={styles.mastheadNote}><Globe2 size={15} aria-hidden="true" /> {t("lookup")}</span>
            <div className={styles.languageSwitch} role="group" aria-label={t("language")} aria-busy={switchingLanguage}>
              <button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed={locale === "vi"} disabled={switchingLanguage} onClick={() => switchLanguage("vi")}>VI</button>
              <span aria-hidden="true">|</span>
              <button type="button" lang="en" aria-label="English" aria-pressed={locale === "en"} disabled={switchingLanguage} onClick={() => switchLanguage("en")}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.documentHeading}>
          <span><span className={styles.goldLine} /> {t("documentHeading")}</span>
          <span>{cert.standard} / {t("countryHeading")}</span>
        </div>

        <article className={styles.document} aria-label={t("articleLabel")}>
          <section className={styles.result} aria-labelledby="verification-title" data-state={result.state}>
            <div className={styles.resultTop}>
              <div className={styles.resultText}>
                <p className={styles.eyebrow}>{t("resultHeading")}</p>
                <h1 id="verification-title">{result.title}</h1>
                <p className={styles.resultDescription}>{result.description}</p>
                {badge}
              </div>
              <div className={styles.seal} data-state={result.state} aria-label={result.label}>
                <div className={styles.sealInner}>
                  <StateIcon size={42} strokeWidth={1.5} aria-hidden="true" />
                  <span>{result.state === "valid" ? "VERIFIED" : result.state === "expired" ? "EXPIRED" : "UNCONFIRMED"}</span>
                  <small>VEXIM GLOBAL</small>
                </div>
              </div>
            </div>
            <div className={styles.resultMeta}>
              <div>
                <span className={styles.metaLabel}>{t("verificationId")}</span>
                <div className={styles.metaValue}>
                  <strong className={styles.mono}>{cert.certificate_no}</strong>
                  <button type="button" className={styles.iconButton} onClick={() => copy(cert.certificate_no)} aria-label={t("copyId")}><Copy size={15} /></button>
                </div>
              </div>
              <div>
                <span className={styles.metaLabel}>{t("lastChecked")} <span>· {t("checkedHint")}</span></span>
                <div className={styles.metaValue}>
                  <Clock3 size={15} className={styles.mutedIcon} aria-hidden="true" />
                  <time dateTime={checkedAt}>{formatCheckedAt(checkedAt)}</time>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.documentBody}>
            <section aria-labelledby="company-details">
              <SectionHeading number="01" title={t("companyTitle")} subtitle={t("companySubtitle")} id="company-details" icon={<Building2 size={19} />} />
              <table className={styles.table} aria-labelledby="company-details">
                <tbody>
                  <DetailRow label={t("company")}><strong className={styles.companyName}>{cert.company_name}</strong></DetailRow>
                  <DetailRow label={t("certificateType")}><span className={styles.standardTag}>{cert.standard}</span><span>{t("registrationType", { standard: cert.standard })}</span></DetailRow>
                  <DetailRow label={t("authority")}>{authority}</DetailRow>
                  <DetailRow label={t("registrationCountry")}><span className={styles.countryCode}>VN</span> {t("country")}</DetailRow>
                  <DetailRow label={t("verifier")}>{COMPANY.legal}</DetailRow>
                </tbody>
              </table>
            </section>

            <section aria-labelledby="registration-details" className={styles.registrationSection}>
              <SectionHeading number="02" title={t("registrationTitle")} subtitle={t("registrationSubtitle", { standard: cert.standard })} id="registration-details" icon={<FileCheck2 size={19} />} />
              <table className={styles.table} aria-labelledby="registration-details">
                <tbody>
                  <DetailRow label={t("registrationCode", { standard: cert.standard })}>
                    <div className={styles.codeValue}>
                      <strong className={styles.mono}>{cert.registration_code || "—"}</strong>
                      {cert.registration_code && <button type="button" className={styles.iconButton} onClick={() => copy(cert.registration_code)} aria-label={t("copyRegistration", { standard: cert.standard })}><Copy size={15} /></button>}
                    </div>
                  </DetailRow>
                  <DetailRow label={t(isGacc ? "gaccMarket" : "fdaMarket")}>{t(isGacc ? "china" : "usa")}</DetailRow>
                  <DetailRow label={t(isGacc ? "gaccScope" : "fdaScope")}><span className={styles.preserveLines}>{cert.scope || t("noScope")}</span></DetailRow>
                  {!isGacc && <DetailRow label={t("duns")}><span className={styles.mono}>{cert.duns_code ? formatDuns(cert.duns_code) : t("unavailable")}</span></DetailRow>}
                  {!isGacc && <DetailRow label={t("usAgent")}>{cert.us_agent || t("unavailable")}</DetailRow>}
                  <DetailRow label={t("registrationDate")}>{formatRegistrationDate(cert.registered_at, locale)}</DetailRow>
                  <DetailRow label={t("expiryDate")}><strong className={result.state === "expired" ? styles.expiredDate : undefined}>{formatRegistrationDate(cert.expires_at, locale)}</strong></DetailRow>
                  <DetailRow label={t("term")}>{t("termValue", { count: cert.validity_years })}</DetailRow>
                  <DetailRow label={t("validity")}>
                    <div className={styles.validityValue}>
                      {badge}
                      {result.state === "valid" && <span>{result.left === 0 ? t("lastValidDay") : t("daysLeft", { count: result.left ?? 0 })}</span>}
                    </div>
                  </DetailRow>
                  {cert.renewal_count > 0 && <DetailRow label={t("lastRenewal")}>{formatRegistrationDate(cert.last_renewed_at, locale)} <span className={styles.inlineNote}>· {t("renewals", { count: cert.renewal_count })}</span></DetailRow>}
                  <DetailRow label={t("qrCode")}><span className={styles.mono}>{cert.public_code}</span></DetailRow>
                </tbody>
              </table>
            </section>

            <aside className={styles.verificationNote} aria-label={t("scopeLabel")}>
              <Info size={18} aria-hidden="true" />
              <div>
                <strong>{t("aboutResult")}</strong>
                <p>{t("verificationNote", { standard: cert.standard })} {t(isGacc ? "gaccNote" : "fdaNote")}</p>
              </div>
            </aside>
          </div>

          <footer className={styles.documentFooter}>
            <div><ShieldCheck size={17} aria-hidden="true" /><span>{t("verifiedBy")} <strong>Vexim Global</strong></span></div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
                <RefreshCw size={15} className={refreshing ? styles.spinning : undefined} aria-hidden="true" /> {refreshing ? t("checking") : t("refresh")}
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => copy(verificationLanguageUrl(window.location.href, locale).href)}><Link2 size={15} aria-hidden="true" /> {t("share")}</button>
            </div>
          </footer>
        </article>

        <section className={styles.support} aria-label={t("supportLabel")}>
          <div><p className={styles.supportLabel}>{t("supportTitle")}</p><p>{t("supportContact")}</p></div>
          <a href={COMPANY.phoneHref}><Phone size={15} aria-hidden="true" />{COMPANY.phone}</a>
          <a href={`mailto:${COMPANY.email}`}><Mail size={15} aria-hidden="true" />{COMPANY.email}</a>
        </section>

        <details className={styles.services}>
          <summary><span>{t("servicesTitle")}<small>{t("servicesSubtitle")}</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div className={styles.serviceGrid}>
            {(Object.keys(services) as Service[]).map((key) => (
              <div className={styles.serviceCard} key={key}>
                <h3>{services[key].title}</h3><p>{services[key].description}</p>
                <div><button type="button" className={styles.secondaryButton} onClick={() => { setFormError(""); setModal(key); }}>{t("consult")}</button><a href={services[key].url} target="_blank" rel="noopener noreferrer">{services[key].website}<ArrowUpRight size={14} aria-hidden="true" /></a></div>
              </div>
            ))}
          </div>
        </details>

        <footer className={styles.pageFooter}><span>© {new Date(checkedAt).getUTCFullYear()} Vexim Global</span><span>{t("footer")}</span></footer>
      </main>

      {toast && <div className={styles.toast} role="status">{t(toast)}</div>}
      {modal && (
        <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="consultation-title" onCancel={(e) => { if (submitting) e.preventDefault(); else setModal(null); }} onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModal(null); }}>
          <div className={styles.dialogBody}>
            <button type="button" className={styles.closeButton} onClick={() => setModal(null)} disabled={submitting} aria-label={t("close")}><X size={20} /></button>
            <p className={styles.eyebrow}>{t("consultationHeading")}</p>
            <h2 id="consultation-title">{services[modal].title}</h2>
            <p>{services[modal].description}</p>
            <form onSubmit={submitConsultation}>
              <label htmlFor="consultation-name">{t("contactName")}</label>
              <input id="consultation-name" autoComplete="name" required maxLength={150} value={contact.name} disabled={submitting} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <label htmlFor="consultation-phone">{t("contactPhone")}</label>
              <input id="consultation-phone" type="tel" autoComplete="tel" required maxLength={30} value={contact.phone} disabled={submitting} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              {formError && <p className={styles.formError} role="alert">{t(formError)}</p>}
              <button type="submit" className={styles.primaryButton} disabled={submitting}>{submitting ? t("sending") : t("send")}<ArrowUpRight size={16} aria-hidden="true" /></button>
            </form>
          </div>
        </dialog>
      )}
    </div>
  );
}

function SectionHeading({ number, title, subtitle, id, icon }: { number: string; title: string; subtitle: string; id: string; icon: ReactNode }) {
  return <div className={styles.sectionHeading}><span className={styles.sectionNumber}>{number}</span><div><h2 id={id}>{title}</h2><p>{subtitle}</p></div><span className={styles.sectionIcon} aria-hidden="true">{icon}</span></div>;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <tr><th scope="row">{label}</th><td>{children}</td></tr>;
}
