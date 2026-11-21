"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ReceiptText,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/accounting";

type Company = {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  tax_code: string;
  address: string;
  contact_person: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type Opportunity = {
  id: number;
  pipeline_key: string;
  pipeline_name: string;
  stage_name: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  estimated_value: number;
  next_action: string;
  next_action_date: string | null;
  is_won: boolean;
  is_lost: boolean;
  updated_at: string;
};

type Quote = {
  id: number;
  quote_no: string;
  template_key: string;
  service_name: string;
  company_name: string;
  contact_name: string;
  total: number;
  status: string;
  issue_date: string;
  valid_until: string;
};

type Certificate = {
  id: number;
  certificate_no: string;
  standard: string;
  registration_code: string;
  registered_at: string;
  expires_at: string;
  status: string;
};

type Invoice = {
  id: number;
  invoice_no: string;
  title: string;
  total: number;
  remaining: number;
  state: string;
  due_date: string | null;
};

type CompanyStats = {
  certificates: Certificate[];
  services: string[];
  quotes: Quote[];
  opportunities: Opportunity[];
  invoices: Invoice[];
};

const JOURNEY = ["Hồ sơ", "Tiếp nhận", "Báo giá", "Chứng nhận", "Duy trì"];

export default function CompanyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (id < 0) {
          const name = searchParams.get("name") || "";
          if (!name) {
            const listResponse = await fetch("/api/companies");
            const listData = await listResponse.json();
            const found = (listData.companies || []).find((item: Company) => item.id === id);
            if (!found) throw new Error("Không tìm thấy doanh nghiệp.");
            const statsResponse = await fetch(`/api/companies/stats?name=${encodeURIComponent(found.company_name)}`);
            const statsData = statsResponse.ok ? await statsResponse.json() : { stats: null };
            if (!cancelled) {
              setCompany(found);
              setStats(statsData.stats);
            }
          } else {
            const statsResponse = await fetch(`/api/companies/stats?name=${encodeURIComponent(name)}`);
            const statsData = statsResponse.ok ? await statsResponse.json() : { stats: null };
            if (!cancelled) {
              setCompany({
                id,
                company_name: name,
                email: "",
                phone: "",
                tax_code: "",
                address: "",
                contact_person: "",
                notes: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              setStats(statsData.stats);
            }
          }
        } else {
          const response = await fetch(`/api/companies/${id}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Không tìm thấy doanh nghiệp.");
          if (!cancelled) {
            setCompany(data.company);
            setStats(data.stats);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được hồ sơ doanh nghiệp.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id, router, searchParams]);

  const opportunities = stats?.opportunities || [];
  const quotes = stats?.quotes || [];
  const certificates = stats?.certificates || [];
  const invoices = stats?.invoices || [];
  const latestOpportunity = useMemo(
    () => [...opportunities].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0],
    [opportunities]
  );
  const latestQuote = useMemo(() => quotes[0], [quotes]);
  const acceptedQuote = useMemo(() => quotes.find((quote) => quote.status === "accepted"), [quotes]);
  const issuedCertificates = certificates.filter((certificate) => ["published", "expired"].includes(certificate.status));

  let currentStep = 1;
  if (id < 0) currentStep = 0;
  else if (issuedCertificates.length) currentStep = 4;
  else if (acceptedQuote || certificates.length) currentStep = 3;
  else if (opportunities.length || quotes.length) currentStep = 2;

  const openQuotes = quotes.filter((quote) => ["draft", "sent"].includes(quote.status));
  const nextAction = currentStep === 0
    ? "Hoàn thiện thông tin doanh nghiệp"
    : currentStep === 1
      ? "Tạo yêu cầu tiếp nhận"
      : currentStep === 2
        ? openQuotes.length ? "Theo dõi và cập nhật báo giá" : "Tạo báo giá FDA hoặc GACC"
        : currentStep === 3
          ? "Tạo hồ sơ chứng nhận"
          : "Kiểm tra thời hạn và duy trì chứng nhận";

  if (loading) {
    return <div className="records-page"><div className="records-page__inner"><div className="rec-fallback">Đang tải hồ sơ doanh nghiệp</div></div></div>;
  }
  if (!company) {
    return <div className="records-page"><div className="records-page__inner"><div className="rec-fallback text-[#b3261e]">{error || "Không tìm thấy doanh nghiệp."}</div></div></div>;
  }

  const intakeHref = (standard: string) => {
    const query = new URLSearchParams({
      pipeline: standard,
      company: company.company_name,
      ...(company.contact_person ? { contact: company.contact_person } : {}),
      ...(company.phone ? { phone: company.phone } : {}),
      ...(company.email ? { email: company.email } : {}),
      source: "Hồ sơ doanh nghiệp",
    });
    return `/dashboard/crm/co-hoi/moi?${query.toString()}`;
  };
  const quoteHref = (opportunity?: Opportunity) => {
    const standard = opportunity?.pipeline_key === "GACC" ? "GACC" : "FDA";
    const query = new URLSearchParams({
      template: standard,
      company: company.company_name,
      ...(opportunity?.contact_name ? { name: opportunity.contact_name } : company.contact_person ? { name: company.contact_person } : {}),
      ...(opportunity?.contact_phone ? { phone: opportunity.contact_phone } : company.phone ? { phone: company.phone } : {}),
      ...(opportunity?.contact_email ? { email: opportunity.contact_email } : company.email ? { email: company.email } : {}),
      ...(opportunity ? { opportunity: String(opportunity.id) } : {}),
    });
    return `/dashboard/bao-gia/moi?${query.toString()}`;
  };
  const certificateHref = (standard: string) => {
    const query = new URLSearchParams({
      standard,
      company: company.company_name,
      ...(company.email ? { email: company.email } : {}),
    });
    return `/dashboard/ho-so/moi?${query.toString()}`;
  };

  return (
    <div className="records-page">
      <main className="records-page__inner">
        <Link href="/dashboard/doanh-nghiep" className="inline-flex items-center gap-2 text-sm font-medium text-[#6e6e73] transition hover:text-[#0071e3]">
          <ArrowLeft className="h-4 w-4" /> Tất cả doanh nghiệp
        </Link>

        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Hành trình doanh nghiệp</p>
            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-[#1d1d1f]">{company.company_name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#6e6e73]">
              {company.contact_person && <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{company.contact_person}</span>}
              {company.email && <a className="inline-flex items-center gap-1.5 hover:text-[#0071e3]" href={`mailto:${company.email}`}><Mail className="h-4 w-4" />{company.email}</a>}
              {company.phone && <a className="inline-flex items-center gap-1.5 hover:text-[#0071e3]" href={`tel:${company.phone}`}><Phone className="h-4 w-4" />{company.phone}</a>}
              {company.tax_code && <span>MST {company.tax_code}</span>}
              {company.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{company.address}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...((stats?.services || []) as string[]), ...certificates.map((certificate) => certificate.standard)])).map((standard) => (
              <span key={standard} className={`rec-standard ${standard === "GACC" ? "rec-standard--gacc" : ""}`}>{standard}</span>
            ))}
            {id < 0 && <span className="rec-badge rec-badge--draft">Chưa hoàn thiện</span>}
          </div>
        </header>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

        <section className="mt-7 rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,.04)] sm:p-7" aria-label="Các bước xử lý">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#1d1d1f]">Một hành trình, năm bước</h2>
              <p className="mt-1 text-sm text-[#6e6e73]">Bước đang xử lý: <span className="font-semibold text-[#1d1d1f]">{JOURNEY[currentStep]}</span></p>
            </div>
            <span className="rounded-full bg-[#f2f2f7] px-3 py-1.5 text-xs font-medium text-[#6e6e73]">Bước {currentStep + 1} trên 5</span>
          </div>
          <ol className="company-journey mt-7">
            {JOURNEY.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <li key={step} className={`company-journey__step ${done ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
                  <span className="company-journey__node">{done ? <Check className="h-4 w-4" /> : index + 1}</span>
                  <span className="company-journey__label">{step}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[22px] bg-[#1d1d1f] p-5 text-white sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Việc tiếp theo</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{nextAction}</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/70">{stepDescription(currentStep, company.company_name)}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {currentStep === 0 && (
                <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href="/dashboard/doanh-nghiep">
                  Hoàn thiện hồ sơ <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {currentStep === 1 && (
                <>
                  <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href={intakeHref("FDA")}>
                    <Plus className="h-4 w-4" /> Tiếp nhận FDA
                  </Link>
                  <Link className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10" href={intakeHref("GACC")}>
                    <Plus className="h-4 w-4" /> Tiếp nhận GACC
                  </Link>
                </>
              )}
              {currentStep === 2 && openQuotes.length === 0 && (
                <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href={quoteHref(latestOpportunity)}>
                  <Plus className="h-4 w-4" /> Tạo báo giá
                </Link>
              )}
              {currentStep === 2 && openQuotes.length > 0 && (
                <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href={`/dashboard/bao-gia/${openQuotes[0].id}`}>
                  Mở báo giá <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {currentStep === 3 && (
                <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href={certificateHref(acceptedQuote?.template_key === "GACC" ? "GACC" : latestOpportunity?.pipeline_key === "GACC" ? "GACC" : "FDA")}>
                  <Plus className="h-4 w-4" /> Tạo hồ sơ chứng nhận
                </Link>
              )}
              {currentStep === 4 && issuedCertificates[0] && (
                <Link className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1d1d1f]" href={`/dashboard/ho-so/${issuedCertificates[0].id}`}>
                  Xem chứng nhận <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard icon={<Users className="h-4 w-4" />} label="Tiếp nhận" value={opportunities.length} href="/dashboard/crm" />
            <SummaryCard icon={<FileText className="h-4 w-4" />} label="Báo giá" value={quotes.length} href="/dashboard/bao-gia" />
            <SummaryCard icon={<FileCheck2 className="h-4 w-4" />} label="Chứng nhận" value={certificates.length} href="/dashboard/ho-so" />
            <SummaryCard icon={<ReceiptText className="h-4 w-4" />} label="Hóa đơn còn lại" value={formatMoney(invoices.reduce((sum, invoice) => sum + (invoice.remaining || 0), 0))} href="/dashboard/ke-toan" />
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 sm:p-6">
            <SectionHeading icon={<Users className="h-4 w-4" />} title="Tiếp nhận" count={opportunities.length} href="/dashboard/crm" />
            {opportunities.length ? (
              <div className="mt-4 divide-y divide-black/[0.07]">
                {opportunities.map((opportunity) => (
                  <Link key={opportunity.id} href={`/dashboard/crm/co-hoi/${opportunity.id}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rec-standard ${opportunity.pipeline_key === "GACC" ? "rec-standard--gacc" : ""}`}>{opportunity.pipeline_key}</span>
                        <span className="text-sm font-medium text-[#1d1d1f]">{opportunity.stage_name}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#6e6e73]">{opportunity.contact_name || "Chưa có người liên hệ"}{opportunity.next_action ? `, tiếp theo: ${opportunity.next_action}` : ""}</div>
                    </div>
                    <span className="shrink-0 text-xs text-[#86868b]">{formatDate(opportunity.updated_at)}</span>
                  </Link>
                ))}
              </div>
            ) : <EmptyLine text="Chưa có yêu cầu tiếp nhận." />}
          </div>

          <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 sm:p-6">
            <SectionHeading icon={<FileText className="h-4 w-4" />} title="Báo giá" count={quotes.length} href="/dashboard/bao-gia" />
            {quotes.length ? (
              <div className="mt-4 divide-y divide-black/[0.07]">
                {quotes.map((quote) => (
                  <Link key={quote.id} href={`/dashboard/bao-gia/${quote.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#1d1d1f]">{quote.quote_no}</span>
                        <StatusPill status={quote.status} />
                      </div>
                      <div className="mt-1 text-xs text-[#6e6e73]">{quote.service_name || quote.template_key}, tạo ngày {formatDate(quote.issue_date)}</div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#1d1d1f]">{formatMoney(quote.total)}</span>
                  </Link>
                ))}
              </div>
            ) : <EmptyLine text="Chưa có báo giá." />}
          </div>

          <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 sm:p-6">
            <SectionHeading icon={<FileCheck2 className="h-4 w-4" />} title="Chứng nhận và duy trì" count={certificates.length} href="/dashboard/ho-so" />
            {certificates.length ? (
              <div className="mt-4 divide-y divide-black/[0.07]">
                {certificates.map((certificate) => {
                  const remaining = daysRemaining(certificate.expires_at);
                  const expired = remaining < 0 || certificate.status === "expired";
                  const soon = !expired && remaining <= 90;
                  return (
                    <Link key={certificate.id} href={`/dashboard/ho-so/${certificate.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rec-standard ${certificate.standard === "GACC" ? "rec-standard--gacc" : ""}`}>{certificate.standard}</span>
                          <span className="font-mono text-xs font-medium text-[#1d1d1f]">{certificate.certificate_no}</span>
                          <StatusPill status={certificate.status} />
                        </div>
                        <div className="mt-1 text-xs text-[#6e6e73]">Mã đăng ký {certificate.registration_code || "chưa có"}</div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-xs ${expired ? "text-[#b3261e]" : soon ? "text-[#075fbd]" : "text-[#6e6e73]"}`}>
                        {expired ? <RefreshCw className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                        {expired ? "Cần gia hạn" : `Còn ${remaining} ngày`}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : <EmptyLine text="Chưa có chứng nhận." />}
          </div>

          <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 sm:p-6">
            <SectionHeading icon={<ReceiptText className="h-4 w-4" />} title="Hóa đơn" count={invoices.length} href="/dashboard/ke-toan" />
            {invoices.length ? (
              <div className="mt-4 divide-y divide-black/[0.07]">
                {invoices.map((invoice) => (
                  <Link key={invoice.id} href={`/dashboard/ke-toan/hoa-don/${invoice.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-[#1d1d1f]">{invoice.invoice_no}</div>
                      <div className="mt-1 text-xs text-[#6e6e73]">{invoice.title || "Chứng nhận"}{invoice.due_date ? `, hạn ${formatDate(invoice.due_date)}` : ""}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-[#1d1d1f]">{formatMoney(invoice.remaining)}</div>
                      <div className="text-[11px] text-[#86868b]">còn phải thu</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <EmptyLine text="Chưa có hóa đơn." />}
          </div>
        </section>

        {company.notes && (
          <section className="mt-4 rounded-[20px] border border-black/[0.08] bg-white p-5">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">Ghi chú</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#6e6e73]">{company.notes}</p>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | number; href: string }) {
  return (
    <Link href={href} className="flex min-h-[110px] flex-col justify-between rounded-[20px] border border-black/[0.08] bg-white p-4 transition hover:border-black/[0.15]">
      <div className="flex items-center justify-between text-[#6e6e73]">{icon}<ExternalLink className="h-3.5 w-3.5" /></div>
      <div>
        <div className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{value}</div>
        <div className="mt-0.5 text-xs text-[#6e6e73]">{label}</div>
      </div>
    </Link>
  );
}

function SectionHeading({ icon, title, count, href }: { icon: React.ReactNode; title: string; count: number; href: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#1d1d1f]">{icon}{title}<span className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-xs font-medium text-[#6e6e73]">{count}</span></h2>
      <Link href={href} className="text-xs font-medium text-[#0071e3]">Mở danh sách</Link>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl bg-[#f5f5f7] px-4 py-5 text-center text-sm text-[#6e6e73]">{text}</div>;
}

function StatusPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    draft: "Đang soạn",
    sent: "Đã gửi",
    accepted: "Đã duyệt",
    rejected: "Không tiếp tục",
    published: "Đang hiệu lực",
    expired: "Hết hạn",
    pending: "Chờ duyệt",
  };
  const style = status === "accepted" || status === "published"
    ? "rec-badge--valid"
    : status === "expired" || status === "rejected"
      ? "rec-badge--expired"
      : status === "sent" || status === "pending"
        ? "rec-badge--pending"
        : "rec-badge--draft";
  return <span className={`rec-badge ${style}`}>{label[status] || status}</span>;
}

function stepDescription(step: number, companyName: string) {
  if (step === 0) return `Lưu thông tin liên hệ của ${companyName} để bắt đầu.`;
  if (step === 1) return "Ghi nhận nhu cầu của khách hàng và chọn FDA hoặc GACC.";
  if (step === 2) return "Tạo báo giá phù hợp và theo dõi phản hồi của khách hàng.";
  if (step === 3) return "Khi báo giá được duyệt, tạo hồ sơ chứng nhận để triển khai.";
  return "Theo dõi ngày hết hạn, thanh toán và các việc cần làm tiếp theo.";
}

function daysRemaining(date: string) {
  const target = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  const today = new Date();
  const current = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((target - current) / 86400000);
}
