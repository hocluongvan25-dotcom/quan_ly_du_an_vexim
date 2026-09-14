import Link from "next/link";
import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/types";
import { ArrowRight, QrCode, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mesh min-h-screen text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Logo invert />
        <Link
          href="/login"
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
        >
          Đăng nhập nội bộ
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-teal-300">
          Vexim Certificate Network
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-6xl">
          Xác thực hồ sơ FDA & GACC do Vexim Global cấp
        </h1>
        <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
          Quét mã QR trên chứng chỉ để xem hiệu lực, phạm vi và thời hạn còn lại. Giá dịch vụ
          không công khai trên trang xác thực.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-navy-950 hover:bg-teal-400"
          >
            Vào hệ thống quản lý <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={COMPANY.website}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold"
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
            <div key={c.title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <c.icon className="h-6 w-6 text-gold-400" />
              <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-white/65">{c.desc}</p>
            </div>
          ))}
        </div>
        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-white/60">
          <div className="font-semibold text-white">{COMPANY.legal}</div>
          <div>{COMPANY.address}</div>
          <div>
            Hotline {COMPANY.phone} · {COMPANY.email}
          </div>
        </footer>
      </main>
    </div>
  );
}
