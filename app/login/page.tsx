"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("admin@veximglobal.com");
  const [password, setPassword] = useState("Vexim@Admin2026");
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
    <div className="mesh min-h-screen px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-gold-400/30 bg-white shadow-lift md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-navy-900 p-10 text-white md:flex">
          <Logo invert />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
              Certificate Control
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">
              Centralized FDA & GACC Management
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Track validity, publish QR verification codes and revenue statistics for each registration code.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              {[
                "FDA flexible 1-10 years per contract",
                "GACC flexible 1-10 years per contract",
                "Mobile-optimized verification landing page",
              ].map((txt) => (
                <li key={txt} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" /> {txt}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/45">{COMPANY.legal}</p>
        </div>
        <form onSubmit={onSubmit} className="p-8 md:p-10">
          <div className="md:hidden">
            <Logo />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-navy-900 md:mt-2">
            {t("login.title")}
          </h2>
          <p className="mt-1 text-sm text-navy-900/55">
            {t("login.subtitle")}
          </p>
          <label className="mt-8 block text-xs font-semibold uppercase tracking-wider text-navy-900/60">
            {t("login.email")}
          </label>
          <input
            className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-[#fffaf0] px-3 py-2.5 text-sm outline-none ring-gold-400/40 focus:ring-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
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
            required
          />
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <button
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-gold-400 to-teal-500 py-3 text-sm font-bold text-navy-950 hover:opacity-95 disabled:opacity-60"
          >
            {loading ? t("login.loggingIn") : t("login.loginButton")}
          </button>
          <div className="mt-6 rounded-2xl bg-teal-50 p-4 text-xs leading-relaxed text-navy-900/70">
            <div className="font-semibold text-navy-900">{t("login.demoAccounts")}</div>
            <p className="mt-1">Admin: admin@veximglobal.com / Vexim@Admin2026</p>
            <p>Specialist: chuyenmon@veximglobal.com / Vexim@CM2026</p>
          </div>
        </form>
      </div>
    </div>
  );
}
