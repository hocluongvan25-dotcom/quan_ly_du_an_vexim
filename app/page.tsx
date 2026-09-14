"use client";

import Link from "next/link";
import { COMPANY } from "@/lib/types";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900 antialiased">
      <header className="border-b-[4px] border-[#0a1931] bg-white">
        <div className="mx-auto flex max-w-[860px] items-center justify-between px-6 py-5 sm:px-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {COMPANY.legal}
            </div>
            <div className="mt-1 font-serif text-[14px] font-bold uppercase tracking-[0.04em] text-[#0a1931]">
              Official Certificate Verification Portal
            </div>
          </div>
          <Link
            href="/login"
            className="border border-[#0a1931] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#0a1931] hover:bg-[#0a1931] hover:text-white"
          >
            Internal Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 py-10 sm:px-6">
        <div className="border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-8 sm:px-10 sm:py-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Vexim Certificate Network
            </div>
            <h1 className="mt-3 max-w-[560px] font-serif text-[28px] font-bold leading-[1.15] text-[#0a1931] sm:text-[36px]">
              Verify FDA & GACC Certificates Issued by Vexim Global
            </h1>
            <p className="mt-4 max-w-[560px] text-[14px] leading-[1.7] text-slate-600">
              This portal allows importers, partners, and regulatory authorities to verify the authenticity and
              validity of FDA and GACC certificates issued by {COMPANY.legal}. Scan the QR code printed on the
              certificate to access the official verification record. Service fees are not disclosed on the public
              verification page.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/login"
                className="bg-[#0a1931] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-black"
              >
                Go to Management System
              </Link>
              <a
                href={COMPANY.website}
                className="border border-slate-300 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
              >
                veximglobal.com
              </a>
            </div>
          </div>

          <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-6 py-6 sm:px-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
                01 — Standard Validity
              </div>
              <p className="mt-3 text-[13px] leading-[1.6] text-slate-600">
                FDA: Flexible 1-10 years per client contract (default 2 years). GACC: Fixed 5 years, not selectable.
                Validity is counted from registration date to expiry date.
              </p>
            </div>
            <div className="px-6 py-6 sm:px-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
                02 — QR on Certificate
              </div>
              <p className="mt-3 text-[13px] leading-[1.6] text-slate-600">
                Each published record generates a unique verification code and QR. The QR links directly to the
                official verification page at veximglobal.com/verify/[code].
              </p>
            </div>
            <div className="px-6 py-6 sm:px-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
                03 — Roles
              </div>
              <p className="mt-3 text-[13px] leading-[1.6] text-slate-600">
                Administrator manages system and revenue. Specialists fill records after registration is complete.
                All actions are logged internally.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-[#fafaf9] px-6 py-6 sm:px-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a1931]">
              How Verification Works
            </div>
            <div className="mt-4 grid gap-4 text-[12.5px] leading-[1.7] text-slate-700 sm:grid-cols-2">
              <div className="border border-slate-200 bg-white px-4 py-3">
                <span className="font-bold">Step 1:</span> Locate the QR code printed on the bottom right of the
                certificate issued by Vexim Global.
              </div>
              <div className="border border-slate-200 bg-white px-4 py-3">
                <span className="font-bold">Step 2:</span> Scan with any camera app. You will be redirected to
                /verify/[code] — no login required.
              </div>
              <div className="border border-slate-200 bg-white px-4 py-3">
                <span className="font-bold">Step 3:</span> Check VALID / EXPIRED status, registration details, scope,
                and remaining days.
              </div>
              <div className="border border-slate-200 bg-white px-4 py-3">
                <span className="font-bold">Step 4:</span> For renewal or discrepancy, contact {COMPANY.legal} with
                certificate number.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 sm:px-10">
            <div className="text-[11px] text-slate-500">
              <span className="font-bold text-slate-700">{COMPANY.legal}</span> · {COMPANY.address} · {COMPANY.phone}{" "}
              · {COMPANY.email}
            </div>
            <div className="hidden font-mono text-[10px] text-slate-400 sm:block">
              OFFICIAL PORTAL · SERVICE FEES HIDDEN FROM PUBLIC
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] leading-[1.6] text-slate-500">
          This is the official verification portal. The public page displays only non-sensitive information. Internal
          service fees and revenue data are restricted to authorized personnel.
        </div>
      </main>
    </div>
  );
}
