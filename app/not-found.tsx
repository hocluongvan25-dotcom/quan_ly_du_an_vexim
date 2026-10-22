import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center bg-paper font-sans text-ink">
      <div className="mx-auto max-w-site px-5 py-16 md:px-8">
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-brass-600">Lỗi 404</p>
        <h1 className="mt-4 max-w-2xl font-serif text-[30px] leading-tight text-brand-950 md:text-[40px]">
          Không tìm thấy trang Quý khách yêu cầu
        </h1>
        <p className="mt-4 max-w-xl text-[13.5px] leading-7 text-ink-500">
          Đường dẫn có thể đã thay đổi. Quý khách quay về trang chủ hoặc dùng chức năng tra cứu mã đăng ký.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/"
            className="border border-brand-900 bg-brand-900 px-5 py-3 text-[13px] font-medium text-white hover:border-brand-800 hover:bg-brand-800"
          >
            Về trang chủ
          </Link>
          <Link
            href="/tra-cuu"
            className="border border-line-strong px-5 py-3 text-[13px] font-medium text-brand-900 hover:border-brand-900"
          >
            Tra cứu mã đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}
