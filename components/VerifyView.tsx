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
import styles from "./VerifyView.module.css";

type Props = { cert: ReturnType<typeof publicCertificate>; checkedAt: string };
type Service = "sales" | "amazon";
const services = {
  sales: {
    title: "Phòng Sale Xuất Khẩu Mỹ",
    description: "Kết nối buyer B2B, phát triển hệ thống phân phối và hỗ trợ chứng từ xuất khẩu.",
    url: "https://veximtrade.com", website: "veximtrade.com",
  },
  amazon: {
    title: "Vận Hành Amazon US",
    description: "Hỗ trợ Brand Registry, nội dung sản phẩm, quảng cáo PPC và vận hành FBA.",
    url: "https://veximops.com", website: "veximops.com",
  },
};

export function VerifyView({ cert, checkedAt }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<Service | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const result = verificationResult(cert, checkedAt);
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
      setToast("Đã sao chép vào bộ nhớ tạm.");
    } catch { setToast("Không thể sao chép. Vui lòng sao chép trực tiếp từ thanh địa chỉ hoặc hồ sơ."); }
  }

  async function submitConsultation(event: FormEvent) {
    event.preventDefault();
    if (!modal || submitting) return;
    if (!contact.name.trim() || contact.phone.replace(/\D/g, "").length < 9) {
      setFormError("Vui lòng nhập họ tên và số điện thoại hợp lệ.");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi yêu cầu thất bại.");
      setContact({ name: "", phone: "" });
      setModal(null);
      setToast("Đã gửi yêu cầu tư vấn. Vexim Global sẽ liên hệ với bạn.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally { setSubmitting(false); }
  }

  const badge = (
    <span className={styles.statusBadge} data-state={result.state}>
      {result.state === "valid" ? <CheckCircle2 size={15} aria-hidden="true" /> : <StateIcon size={15} aria-hidden="true" />}
      {result.label}
    </span>
  );

  return (
    <div className={styles.page} lang="vi">
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <a href={COMPANY.website} className={styles.brand} aria-label="Vexim Global — trang chủ">
            <span className={styles.brandMark}><ShieldCheck size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span>VEXIM <span className={styles.brandLight}>GLOBAL</span><small>CERTIFICATE VERIFICATION</small></span>
          </a>
          <span className={styles.mastheadNote}><Globe2 size={15} aria-hidden="true" /> Tra cứu hồ sơ đăng ký</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.documentHeading}>
          <span><span className={styles.goldLine} /> HỒ SƠ XÁC MINH ĐĂNG KÝ</span>
          <span>{cert.standard} / VIỆT NAM</span>
        </div>

        <article className={styles.document} aria-label="Kết quả xác minh chứng nhận">
          <section className={styles.result} aria-labelledby="verification-title" data-state={result.state}>
            <div className={styles.resultTop}>
              <div className={styles.resultText}>
                <p className={styles.eyebrow}>Verification result</p>
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
                <span className={styles.metaLabel}>Verification ID</span>
                <div className={styles.metaValue}>
                  <strong className={styles.mono}>{cert.certificate_no}</strong>
                  <button type="button" className={styles.iconButton} onClick={() => copy(cert.certificate_no)} aria-label="Sao chép Verification ID"><Copy size={15} /></button>
                </div>
              </div>
              <div>
                <span className={styles.metaLabel}>Last checked <span>· Thời điểm tra cứu</span></span>
                <div className={styles.metaValue}>
                  <Clock3 size={15} className={styles.mutedIcon} aria-hidden="true" />
                  <time dateTime={checkedAt}>{formatCheckedAt(checkedAt)}</time>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.documentBody}>
            <section aria-labelledby="company-details">
              <SectionHeading number="01" title="Thông tin doanh nghiệp" subtitle="Company information" id="company-details" icon={<Building2 size={19} />} />
              <table className={styles.table} aria-labelledby="company-details">
                <tbody>
                  <DetailRow label="Doanh nghiệp"><strong className={styles.companyName}>{cert.company_name}</strong></DetailRow>
                  <DetailRow label="Loại chứng nhận"><span className={styles.standardTag}>{cert.standard}</span><span>Đăng ký {cert.standard}</span></DetailRow>
                  <DetailRow label="Cơ quan quản lý đăng ký">{authority}</DetailRow>
                  <DetailRow label="Quốc gia đăng ký"><span className={styles.countryCode}>VN</span> Việt Nam</DetailRow>
                  <DetailRow label="Đơn vị xác minh">{COMPANY.legal}</DetailRow>
                </tbody>
              </table>
            </section>

            <section aria-labelledby="registration-details" className={styles.registrationSection}>
              <SectionHeading number="02" title="Chi tiết đăng ký" subtitle={`${cert.standard} registration details`} id="registration-details" icon={<FileCheck2 size={19} />} />
              <table className={styles.table} aria-labelledby="registration-details">
                <tbody>
                  <DetailRow label={`Mã đăng ký ${cert.standard}`}>
                    <div className={styles.codeValue}>
                      <strong className={styles.mono}>{cert.registration_code || "—"}</strong>
                      {cert.registration_code && <button type="button" className={styles.iconButton} onClick={() => copy(cert.registration_code)} aria-label={`Sao chép mã đăng ký ${cert.standard}`}><Copy size={15} /></button>}
                    </div>
                  </DetailRow>
                  <DetailRow label={isGacc ? "Thị trường đăng ký" : "Thị trường quản lý"}>{isGacc ? "Trung Quốc (China)" : "Hoa Kỳ (United States)"}</DetailRow>
                  <DetailRow label={isGacc ? "Ngành hàng / Phạm vi đăng ký" : "Phạm vi đăng ký FDA"}><span className={styles.preserveLines}>{cert.scope || "Chưa có thông tin trong hồ sơ."}</span></DetailRow>
                  {!isGacc && <DetailRow label="Mã số DUNS®"><span className={styles.mono}>{cert.duns_code ? formatDuns(cert.duns_code) : "Chưa có thông tin"}</span></DetailRow>}
                  {!isGacc && <DetailRow label="Đại diện tại Hoa Kỳ (US Agent)">{cert.us_agent || "Chưa có thông tin"}</DetailRow>}
                  <DetailRow label="Ngày đăng ký">{formatRegistrationDate(cert.registered_at)}</DetailRow>
                  <DetailRow label="Ngày hết hiệu lực"><strong className={result.state === "expired" ? styles.expiredDate : undefined}>{formatRegistrationDate(cert.expires_at)}</strong></DetailRow>
                  <DetailRow label="Kỳ hạn đăng ký">{cert.validity_years} năm / kỳ đăng ký</DetailRow>
                  <DetailRow label="Trạng thái hiệu lực">
                    <div className={styles.validityValue}>
                      {badge}
                      {result.state === "valid" && <span>{result.left === 0 ? "Ngày hiệu lực cuối cùng" : `Còn ${result.left} ngày`}</span>}
                    </div>
                  </DetailRow>
                  {cert.renewal_count > 0 && <DetailRow label="Lần gia hạn gần nhất">{formatRegistrationDate(cert.last_renewed_at)} <span className={styles.inlineNote}>· Đã gia hạn {cert.renewal_count} lần</span></DetailRow>}
                  <DetailRow label="Mã tra cứu QR"><span className={styles.mono}>{cert.public_code}</span></DetailRow>
                </tbody>
              </table>
            </section>

            <aside className={styles.verificationNote} aria-label="Phạm vi xác minh">
              <Info size={18} aria-hidden="true" />
              <div>
                <strong>Về kết quả xác minh</strong>
                <p>Kết quả đối chiếu với hồ sơ đã được duyệt trên hệ thống Vexim Global tại thời điểm tra cứu; không phải kết nối xác nhận trực tiếp từ {cert.standard}. {isGacc ? "Thông tin đăng ký GACC cần được đối chiếu với cơ quan quản lý khi cần thiết." : "Đăng ký FDA không đồng nghĩa với việc FDA phê duyệt hoặc chứng nhận chất lượng sản phẩm."}</p>
              </div>
            </aside>
          </div>

          <footer className={styles.documentFooter}>
            <div><ShieldCheck size={17} aria-hidden="true" /><span>Hồ sơ xác minh bởi <strong>Vexim Global</strong></span></div>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
                <RefreshCw size={15} className={refreshing ? styles.spinning : undefined} aria-hidden="true" /> {refreshing ? "Đang kiểm tra…" : "Kiểm tra lại"}
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => copy(window.location.href)}><Link2 size={15} aria-hidden="true" /> Chia sẻ kết quả</button>
            </div>
          </footer>
        </article>

        <section className={styles.support} aria-label="Hỗ trợ xác minh">
          <div><p className={styles.supportLabel}>CẦN HỖ TRỢ XÁC MINH?</p><p>Liên hệ đơn vị thực hiện đăng ký</p></div>
          <a href={COMPANY.phoneHref}><Phone size={15} aria-hidden="true" />{COMPANY.phone}</a>
          <a href={`mailto:${COMPANY.email}`}><Mail size={15} aria-hidden="true" />{COMPANY.email}</a>
        </section>

        <details className={styles.services}>
          <summary><span>Dịch vụ hỗ trợ xuất khẩu của Vexim Global<small>Tư vấn thị trường & vận hành kinh doanh</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div className={styles.serviceGrid}>
            {(Object.keys(services) as Service[]).map((key) => (
              <div className={styles.serviceCard} key={key}>
                <h3>{services[key].title}</h3><p>{services[key].description}</p>
                <div><button type="button" className={styles.secondaryButton} onClick={() => { setFormError(""); setModal(key); }}>Đăng ký tư vấn</button><a href={services[key].url} target="_blank" rel="noopener noreferrer">{services[key].website}<ArrowUpRight size={14} aria-hidden="true" /></a></div>
              </div>
            ))}
          </div>
        </details>

        <footer className={styles.pageFooter}><span>© {new Date(checkedAt).getUTCFullYear()} Vexim Global</span><span>Registration verification · FDA & GACC</span></footer>
      </main>

      {toast && <div className={styles.toast} role="status">{toast}</div>}
      {modal && (
        <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="consultation-title" onCancel={(e) => { if (submitting) e.preventDefault(); else setModal(null); }} onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModal(null); }}>
          <div className={styles.dialogBody}>
            <button type="button" className={styles.closeButton} onClick={() => setModal(null)} disabled={submitting} aria-label="Đóng hộp thoại"><X size={20} /></button>
            <p className={styles.eyebrow}>VEXIM GLOBAL · TƯ VẤN</p>
            <h2 id="consultation-title">{services[modal].title}</h2>
            <p>{services[modal].description}</p>
            <form onSubmit={submitConsultation}>
              <label htmlFor="consultation-name">Họ tên / Tên doanh nghiệp</label>
              <input id="consultation-name" autoComplete="name" required maxLength={150} value={contact.name} disabled={submitting} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <label htmlFor="consultation-phone">Số điện thoại / Zalo</label>
              <input id="consultation-phone" type="tel" autoComplete="tel" required maxLength={30} value={contact.phone} disabled={submitting} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              {formError && <p className={styles.formError} role="alert">{formError}</p>}
              <button type="submit" className={styles.primaryButton} disabled={submitting}>{submitting ? "Đang gửi…" : "Gửi yêu cầu tư vấn"}<ArrowUpRight size={16} aria-hidden="true" /></button>
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
