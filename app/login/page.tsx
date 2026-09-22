"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ShieldCheck } from "lucide-react";
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
    <div className="mesh relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[430px]">
        <div className="rounded-[32px] border border-gold-400/30 bg-white p-8 shadow-lift md:p-10">
          {/* Logo dùng chữ của hệ thống, không dùng ảnh */}
          <div className="flex justify-center">
            <LogoWordmark size="lg" />
          </div>

          <h1 className="mt-6 text-center font-display text-2xl font-bold text-navy-900">
            {t("login.title")}
          </h1>
          <p className="mt-1 text-center text-sm text-navy-900/55">{t("login.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-8">
            <label className="block text-xs font-semibold uppercase tracking-wider text-navy-900/60">
              {t("login.email")}
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-[#fffaf0] px-3 py-2.5 text-sm outline-none ring-gold-400/40 focus:ring-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-navy-900/60">
              {t("login.password")}
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-[#fffaf0] px-3 py-2.5 text-sm outline-none ring-gold-400/40 focus:ring-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            <button
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-gold-400 to-teal-500 py-3 text-sm font-bold text-navy-950 hover:opacity-95 disabled:opacity-60"
            >
              {loading ? t("login.loggingIn") : t("login.loginButton")}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center gap-1 border-t border-navy-900/5 pt-4 text-center text-[11px] text-navy-900/45">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              {t("login.companyInfo")}
            </span>
            <span className="text-[10px] text-navy-900/35">{COMPANY.legal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
