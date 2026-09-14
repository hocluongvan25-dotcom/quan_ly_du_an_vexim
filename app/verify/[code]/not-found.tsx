import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFoundCert() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#fff8ec] px-6">
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-navy-900">
          Không tìm thấy chứng chỉ
        </h1>
        <p className="mt-2 text-sm text-navy-900/60">
          Mã QR không hợp lệ hoặc hồ sơ chưa được xuất bản.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
