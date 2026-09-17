"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ArrowRight, Bell, KanbanSquare, QrCode, ReceiptText, ShieldCheck, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function HomePage() {
  const { t } = useI18n();
  return (
    <div className="mesh min-h-screen text-navy-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-navy-800"
          >
            {t("home.internalLogin")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-700">
          {t("home.network")}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          {t("home.title")}
        </h1>
        <p className="mt-5 max-w-xl text-base text-navy-900/70 md:text-lg">
          {t("home.description")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-teal-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-lift"
          >
            {t("home.goToSystem")} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={COMPANY.website}
            className="inline-flex items-center gap-2 rounded-full border border-navy-900/15 bg-white/70 px-5 py-3 text-sm font-semibold"
          >
            veximglobal.com
          </a>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              titleKey: "home.features.validity.title",
              descKey: "home.features.validity.desc",
            },
            {
              icon: QrCode,
              titleKey: "home.features.qr.title",
              descKey: "home.features.qr.desc",
            },
            {
              icon: KanbanSquare,
              titleKey: "home.features.crm.title",
              descKey: "home.features.crm.desc",
            },
            {
              icon: FileText,
              titleKey: "home.features.contract.title",
              descKey: "home.features.contract.desc",
            },
            {
              icon: ReceiptText,
              titleKey: "home.features.accounting.title",
              descKey: "home.features.accounting.desc",
            },
            {
              icon: Bell,
              titleKey: "home.features.reminders.title",
              descKey: "home.features.reminders.desc",
            },
          ].map((c) => (
            <div
              key={c.titleKey}
              className="rounded-3xl border border-gold-400/40 bg-white/80 p-6 shadow-card"
            >
              <c.icon className="h-6 w-6 text-teal-600" />
              <h3 className="mt-4 font-display text-lg font-bold">{t(c.titleKey)}</h3>
              <p className="mt-2 text-sm text-navy-900/65">{t(c.descKey)}</p>
            </div>
          ))}
        </div>
        <footer className="mt-16 border-t border-navy-900/10 pt-6 text-sm text-navy-900/60">
          <div className="font-semibold text-navy-900">{COMPANY.legal}</div>
          <div>{COMPANY.address}</div>
          <div>
            Hotline {COMPANY.phone} · {COMPANY.email}
          </div>
        </footer>
      </main>
    </div>
  );
}
