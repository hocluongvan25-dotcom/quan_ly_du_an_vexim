"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Lưới an toàn cho toàn bộ app: thay vì màn hình "Application error" trắng trơn của Next.js,
 * hiển thị mã lỗi (digest) để tra log máy chủ cùng gợi ý nguyên nhân thường gặp nhất
 * — database chưa chạy migration `supabase/schema.sql` + `supabase/schema-crm.sql`.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vexim] lỗi không mong đợi:", error);
  }, [error]);

  return (
    <div className="mesh flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-lift">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">
          Lỗi hệ thống
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-navy-900">
          Trang này không tải được
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-900/65">
          {error.message && !/digest|NEXT_/i.test(error.message)
            ? error.message
            : "Máy chủ gặp lỗi khi xử lý yêu cầu. Nếu bạn vừa cấu hình Supabase, hãy kiểm tra đã chạy đủ hai file SQL chưa."}
        </p>
        {error.digest && (
          <p className="mt-3 rounded-2xl bg-navy-900/5 px-3 py-2 font-mono text-xs text-navy-900/60">
            Digest: {error.digest}
          </p>
        )}
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-navy-900/75">
          <div className="font-semibold text-navy-900">Hay gặp nhất</div>
          <p className="mt-1">
            Database Supabase chưa chạy migration. Mở SQL Editor và chạy lần lượt{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
              supabase/schema.sql
            </code>{" "}
            rồi{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
              supabase/schema-crm.sql
            </code>
            .
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Thử lại
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold text-navy-900"
          >
            Về trang tổng quan
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold text-navy-900"
          >
            Đăng nhập lại
          </Link>
        </div>
      </div>
    </div>
  );
}
