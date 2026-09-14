"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function NotFoundCert() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center bg-[#fff8ec] px-6">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy-900">
          {t("verify.notFound")}
        </h1>
        <p className="mt-2 text-sm text-navy-900/60">{t("verify.notFoundDesc")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("verify.goHome")}
        </Link>
      </div>
    </div>
  );
}
