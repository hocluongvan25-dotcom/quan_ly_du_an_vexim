"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
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
      setError(data.error || "Đăng nhập thất bại");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="mesh min-h-screen px-4 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-gold-400/30 bg-white shadow-lift md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-navy-900 p-10 text-white md:flex">
          <Logo invert />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
              VEXIM CRM · Certificate Control
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">
              Sales operation &amp; hồ sơ FDA / GACC tập trung
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Lead → opportunity → customer trên một pipeline, kèm thời hạn hồ sơ, mã QR xác thực và
              doanh thu từng mã đăng ký.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              {[
                "Pipeline có owner và next action cho từng cơ hội",
                "FDA gia hạn 2 năm / GACC gia hạn 5 năm",
                "Landing page xác thực tối ưu mobile",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-400" /> {t}
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
            Đăng nhập nội bộ
          </h2>
          <p className="mt-1 text-sm text-navy-900/55">
            CRM sales operation &amp; quản lý hồ sơ FDA / GACC của Vexim Global.
          </p>
          <label className="mt-8 block text-xs font-semibold uppercase tracking-wider text-navy-900/60">
            Email
          </label>
          <input
            className="mt-1.5 w-full rounded-xl border border-navy-900/10 bg-[#fffaf0] px-3 py-2.5 text-sm outline-none ring-gold-400/40 focus:ring-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-navy-900/60">
            Mật khẩu
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
            {loading ? "Đang xác thực..." : "Vào hệ thống"}
          </button>
          <div className="mt-6 rounded-2xl bg-teal-50 p-4 text-xs leading-relaxed text-navy-900/70">
            <div className="font-semibold text-navy-900">Tài khoản demo</div>
            <p className="mt-1">Founder / Admin: admin@veximglobal.com / Vexim@Admin2026</p>
            <p>AE (Sales Leader): ae@veximglobal.com / Vexim@AE2026</p>
            <p>SR (Sales Research): sr@veximglobal.com / Vexim@SR2026</p>
            <p>LR (Lead Research): lr@veximglobal.com / Vexim@LR2026</p>
            <p>Chuyên môn hồ sơ: chuyenmon@veximglobal.com / Vexim@CM2026</p>
          </div>
        </form>
      </div>
    </div>
  );
}
