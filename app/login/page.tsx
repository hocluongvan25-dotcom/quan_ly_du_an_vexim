"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
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
    <div className="site auth-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="auth-top">
        <Link href="/" className="auth-home">
          VEXIM GLOBAL
        </Link>

        <div className="auth-lang" role="group" aria-label={t("common.language")}>
          <button type="button" aria-pressed={locale === "vi"} onClick={() => setLocale("vi")}>
            VI
          </button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
            EN
          </button>
        </div>
      </div>

      <div className="w-full max-w-[430px]">
        <div className="auth-card">
          <div className="auth-card__mark">
            <LogoWordmark size="lg" />
          </div>

          <h1 className="auth-card__title">{t("login.title")}</h1>
          <p className="auth-card__sub">{t("login.subtitle")}</p>

          <form onSubmit={onSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">{t("login.email")}</span>
              <input
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-field__label">{t("login.password")}</span>
              <input
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" disabled={loading}>
              {loading ? t("login.loggingIn") : t("login.loginButton")}
            </button>
          </form>

          <p className="auth-card__foot">
            <span aria-hidden="true" />
            {COMPANY.legal}
          </p>
        </div>

        <Link href="/" className="auth-back">
          {COMPANY.websiteLabel}
        </Link>
      </div>
    </div>
  );
}
