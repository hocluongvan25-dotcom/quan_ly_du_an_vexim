"use client";

import { COMPANY, type Certificate } from "@/lib/types";
import {
  daysBetween,
  formatDate,
  isValidNow,
  remainingDays,
  getValidityYears,
  formatDuns,
} from "@/lib/utils";

export function VerifyView({
  cert,
}: {
  cert: Omit<Certificate, "service_price"> & { duns_code?: string };
}) {
  const valid =
    Boolean(cert.validity_confirmed) &&
    isValidNow(cert.expires_at, cert.registered_at);
  const left = remainingDays(cert.expires_at);
  const total = daysBetween(cert.registered_at, cert.expires_at);
  const validityYears = getValidityYears(cert as any);
  const duns = (cert as any).duns_code || "";
  const todayStr = formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900 antialiased">
      {/* Government Header */}
      <header className="border-b-[4px] border-[#0a1931] bg-white">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-6 py-5 sm:px-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {COMPANY.legal}
            </div>
            <div className="mt-1 font-serif text-[15px] font-bold uppercase tracking-[0.04em] text-[#0a1931]">
              Official Certificate Verification System
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Document Verification
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-600">
              VERIFY / {cert.public_code}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 py-8 sm:px-6">
        {/* Title & Status Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-[26px] font-bold leading-none text-[#0a1931] sm:text-[30px]">
              CERTIFICATE VERIFICATION
            </h1>
            <p className="mt-2 max-w-[520px] text-[13px] leading-[1.5] text-slate-600">
              This is an official electronic record issued by {COMPANY.legal}. The information below is extracted
              from the internal certification registry and is valid at the time of verification: {todayStr}.
            </p>
          </div>
          <div className="shrink-0">
            <div
              className={`inline-flex min-w-[132px] justify-center border-2 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] ${
                valid
                  ? "border-[#0a1931] bg-[#0a1931] text-white"
                  : "border-[#b42318] bg-[#fef2f2] text-[#b42318]"
              }`}
            >
              {valid ? "VALID" : cert.validity_confirmed ? "EXPIRED" : "NOT CONFIRMED"}
            </div>
            <div className="mt-1.5 text-center font-mono text-[11px] text-slate-500">
              {left < 0 ? "0 days remaining" : `${left} days remaining`}
            </div>
          </div>
        </div>

        {/* Main Document - Merged 1+3 in one frame */}
        <div className="overflow-hidden border border-slate-300 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          {/* Certificate Holder */}
          <div className="border-b border-slate-200 bg-[#fafaf9] px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Certificate Holder
              </div>
              <div className="font-serif text-[20px] font-bold leading-tight text-[#0a1931] sm:text-[22px]">
                {cert.company_name}
              </div>
              <div className="mt-1 font-mono text-[13px] text-slate-700">
                Certificate No: <span className="font-bold">{cert.certificate_no}</span>
                <span className="mx-2 text-slate-300">|</span>
                Code: <span className="font-bold">{cert.registration_code || "—"}</span>
              </div>
            </div>
          </div>

          {/* Merged Registration + Scope in ONE frame */}
          <div className="px-6 py-6 sm:px-8">
            <h2 className="mb-5 border-l-[3px] border-[#0a1931] pl-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
              Registration Details
            </h2>
            <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:gap-x-8">
              <Field label="Standard" value={cert.standard} />
              <Field label="Registration Code" value={cert.registration_code || "—"} mono />
              <Field label="DUNS Number" value={duns ? formatDuns(duns) : "—"} mono />
              <Field label="Registration Date" value={formatDate(cert.registered_at)} />
              <Field label="Expiry Date" value={formatDate(cert.expires_at)} />
              <Field
                label="Contract Term"
                value={`${validityYears} ${validityYears === 1 ? "Year" : "Years"} (${total} days)`}
              />
            </div>

            {/* Scope inside same frame - divider */}
            <div className="mt-7 border-t border-slate-200 pt-6">
              <h3 className="mb-3 border-l-[3px] border-[#0a1931] pl-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
                Scope of Registration
              </h3>
              <div className="min-h-[64px] border border-slate-200 bg-[#fcfcfc] px-4 py-3.5 text-[13.5px] leading-[1.7] text-slate-800">
                {cert.scope || "— No scope information provided —"}
              </div>
              {duns && cert.standard === "FDA" && (
                <div className="mt-4 border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    DUNS Number (Dun & Bradstreet) — Required for FDA Facility Registration
                  </div>
                  <div className="mt-1 font-mono text-[14px] font-bold text-slate-900">{formatDuns(duns)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Issuing Authority - moved to bottom */}
          <div className="border-t border-slate-200 bg-[#fafaf9] px-6 py-6 sm:px-8">
            <h2 className="mb-4 border-l-[3px] border-[#0a1931] pl-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
              Issuing Authority
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Issued By</div>
                <div className="mt-1 font-serif text-[14px] font-bold text-[#0a1931]">{COMPANY.legal}</div>
                <div className="mt-3 space-y-1.5 text-[12.5px] leading-[1.6] text-slate-700">
                  <div>{COMPANY.address}</div>
                  <div>Phone: {COMPANY.phone}</div>
                  <div>Email: {COMPANY.email}</div>
                  <div>Website: {COMPANY.website.replace("https://", "")}</div>
                </div>
              </div>
              <div className="border border-slate-200 bg-white px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Verification Statement
                </div>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-600">
                  This document was generated electronically through the official verification portal of{" "}
                  {COMPANY.legal}. The public verification page does not display service fees. For any discrepancy,
                  please contact the issuing authority with the certificate number and verification code.
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Verification Code
                  </div>
                  <div className="font-mono text-[12px] font-bold tracking-wide text-[#0a1931]">
                    {cert.public_code}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Strip */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 sm:px-8">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Official Record · {COMPANY.legal} · Generated {todayStr}
            </div>
            <div className="font-mono text-[10px] text-slate-400">veximglobal.com/verify/{cert.public_code}</div>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-[680px] text-center text-[11px] leading-[1.6] text-slate-500">
          This verification result is for reference only. The official printed certificate with stamp and signature
          remains the authoritative document. If this certificate shows EXPIRED, please contact {COMPANY.legal} for
          renewal procedures. Service fees are not disclosed on this public page.
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div
        className={`mt-1 text-[13.5px] leading-[1.5] text-slate-900 ${mono ? "font-mono text-[13px]" : "font-medium"}`}
      >
        {value}
      </div>
    </div>
  );
}
