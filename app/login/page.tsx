"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoWordmark } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || t("login.invalidCredentials"));
      return;
    }
    router.replace("/dashboard");
  }

  return (
    /* Form nằm giữa màn hình theo cả chiều ngang lẫn chiều dọc */
    <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-10 font-sans">
      <div className="absolute inset-x-0 top-0 h-1 bg-brand-950" aria-hidden="true" />

      <div className="absolute left-5 top-6">
        <Link
          href="/"
          className="focus-ring text-[11.5px] text-ink-400 underline-offset-4 hover:text-brand-900 hover:underline"
        >
          Về trang chủ
        </Link>
      </div>

      <div className="absolute right-5 top-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[430px]">
        <div className="border border-line bg-white p-8 shadow-panel md:p-10">
          {/* Logo dùng chữ của hệ thống, không dùng ảnh */}
          <div className="flex justify-center">
            <LogoWordmark size="lg" />
          </div>

          <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-label text-brass-600">
            {t("home.internalLogin")}
          </p>

          <h1 className="mt-2 text-center font-serif text-2xl text-brand-950">{t("login.title")}</h1>
          <p className="mt-1 text-center text-sm text-ink-500">{t("login.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8">
            <label
              htmlFor="login-email"
              className="block text-[10px] font-semibold uppercase tracking-label text-ink-400"
            >
              {t("login.email")}
            </label>
            <input
              id="login-email"
              className="focus-ring mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 text-sm text-ink outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
            <label
              htmlFor="login-password"
              className="mt-4 block text-[10px] font-semibold uppercase tracking-label text-ink-400"
            >
              {t("login.password")}
            </label>
            <input
              id="login-password"
              className="focus-ring mt-1.5 w-full border border-line-strong bg-paper px-3 py-2.5 text-sm text-ink outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
            {error && <p className="mt-3 text-sm text-fail">{error}</p>}
            <button
              disabled={loading}
              className="mt-6 w-full border border-brand-900 bg-brand-900 py-3 text-[13px] font-semibold text-white transition-colors hover:border-brand-800 hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? t("login.loggingIn") : t("login.loginButton")}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center gap-1 border-t border-line pt-4 text-center text-[11px] text-ink-400">
            <span>{t("login.companyInfo")}</span>
            <span className="text-[10px] text-ink-300">{COMPANY.legal}</span>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] leading-5 text-ink-300">
          {COMPANY.phone} · {COMPANY.email}
        </p>
      </div>
    </div>
  );
}
