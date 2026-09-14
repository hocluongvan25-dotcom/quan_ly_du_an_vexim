"use client";

import { COMPANY, STANDARD_YEARS, type Certificate } from "@/lib/types";
import { daysBetween, formatDate, isValidNow, remainingDays } from "@/lib/utils";
import { CountdownRing } from "./CountdownRing";
import { Logo } from "./Logo";
import { ValiditySeal } from "./ValiditySeal";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

export function VerifyView({ cert }: { cert: Omit<Certificate, "service_price"> }) {
  const valid =
    Boolean(cert.validity_confirmed) && isValidNow(cert.expires_at, cert.registered_at);
  const left = remainingDays(cert.expires_at);
  const total = daysBetween(cert.registered_at, cert.expires_at);

  return (
    <div className="min-h-screen bg-[#eef6f6] text-navy-900">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Logo invert markClassName="h-11 w-11" />
          <div className="text-right text-[10px] uppercase tracking-[0.22em] text-teal-300">
            Certificate
            <br />
            Verification
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <div className="paper-card relative overflow-hidden rounded-[32px] border border-white/80 p-6 shadow-lift">
          <div className="pointer-events-none absolute inset-3 rounded-[24px] border border-gold-500/35" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-100/80" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-gold-100/50" />

          <div className="relative flex flex-col items-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-teal-700">
              Official record
            </p>
            <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight">
              {cert.company_name}
            </h1>
            <p className="mt-1 text-sm text-navy-900/55">{cert.certificate_no}</p>
            <div className="my-6">
              <ValiditySeal valid={valid} confirmed={Boolean(cert.validity_confirmed)} size="lg" />
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-navy-900/70">
              {valid
                ? "Chứng chỉ còn hiệu lực. Thời gian còn lại được đếm từ ngày hết hạn về ngày đăng ký."
                : "Chứng chỉ đã hết hiệu lực. Vui lòng liên hệ Vexim Global để gia hạn."}
            </p>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3">
            <Info label="Standards" value={cert.standard} strong />
            <Info label="Mã số" value={cert.registration_code} mono />
            <Info label="Ngày đăng ký" value={formatDate(cert.registered_at)} />
            <Info label="Ngày hết hạn" value={formatDate(cert.expires_at)} />
            <Info
              label="Số ngày còn lại"
              value={left < 0 ? "0" : String(left)}
              strong
            />
            <Info
              label="Chu kỳ hiệu lực"
              value={`${STANDARD_YEARS[cert.standard]} năm · ${total} ngày`}
            />
          </div>

          <div className="relative mt-4 rounded-2xl bg-[#f4fbfb] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-900/45">
              Scope
            </div>
            <p className="mt-1 text-sm leading-relaxed">{cert.scope || "—"}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[32px] bg-white p-6 shadow-card">
          <CountdownRing
            registeredAt={cert.registered_at}
            expiresAt={cert.expires_at}
            running={Boolean(cert.validity_confirmed)}
          />
        </div>

        <section className="mt-4 rounded-[32px] bg-navy-900 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-teal-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">
              Verified by Vexim Global
            </span>
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
          <a
            href={COMPANY.website}
            className="mt-5 block rounded-2xl bg-teal-500 py-3 text-center text-sm font-bold text-navy-950"
          >
            {COMPANY.websiteLabel}
          </a>
          <p className="mt-3 text-center text-[11px] text-white/45">
            Trang xác thực công khai không hiển thị giá dịch vụ.
          </p>
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
    <div className="rounded-2xl bg-[#f4f8fa] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-900/40">
        {label}
      </div>
      <div
        className={`mt-1 text-sm ${strong ? "font-extrabold" : "font-semibold"} ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
