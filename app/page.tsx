import Link from "next/link";
import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ArrowRight, QrCode, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mesh min-h-screen text-navy-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <Link
          href="/login"
          className="rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-gold-400 hover:bg-navy-800"
        >
          Đăng nhập nội bộ
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-700">
          Vexim Certificate Network
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          Xác thực hồ sơ FDA & GACC do Vexim Global cấp
        </h1>
        <p className="mt-5 max-w-xl text-base text-navy-900/70 md:text-lg">
          Quét mã QR trên chứng chỉ để xem hiệu lực, phạm vi và thời hạn còn lại. Giá dịch vụ
          không công khai trên trang xác thực.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-teal-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-lift"
          >
            Vào hệ thống quản lý <ArrowRight className="h-4 w-4" />
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
              title: "Hiệu lực chuẩn",
              desc: "FDA 2 năm / GACC 5 năm. Đồng hồ đếm ngược từ ngày hết hạn.",
            },
            {
              icon: QrCode,
              title: "QR in trên chứng chỉ",
              desc: "Mỗi hồ sơ xuất bản có mã QR riêng, khách hàng tự xác thực.",
            },
            {
              icon: ArrowRight,
              title: "Hai vai trò",
              desc: "Admin điều hành hệ thống. Bộ phận chuyên môn điền hồ sơ sau đăng ký.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-3xl border border-gold-400/40 bg-white/80 p-6 shadow-card"
            >
              <c.icon className="h-6 w-6 text-teal-600" />
              <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-navy-900/65">{c.desc}</p>
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
