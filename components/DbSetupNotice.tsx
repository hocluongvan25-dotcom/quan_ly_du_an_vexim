import type { DbProblem } from "@/lib/db-health";
import { MIGRATION_FIX } from "@/lib/db-health";

/**
 * Thông báo "database chưa sẵn sàng" — thay vì để trang trắng / lỗi 500 khó hiểu,
 * nói rõ đang thiếu gì và cần chạy file SQL nào.
 */
export function DbSetupNotice({
  problem,
  compact = false,
}: {
  problem: DbProblem;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-amber-200 bg-amber-50 p-4"
          : "mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-card"
      }
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
        Cơ sở dữ liệu chưa sẵn sàng
      </p>
      <h2
        className={
          compact
            ? "mt-1 font-display text-base font-extrabold text-navy-900"
            : "mt-2 font-display text-2xl font-extrabold text-navy-900"
        }
      >
        {problem.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-900/70">{problem.fix || MIGRATION_FIX}</p>
      {problem.detail && (
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-navy-900/90 p-3 text-[11px] leading-relaxed text-amber-100">
          {problem.code ? `[${problem.code}] ` : ""}
          {problem.detail}
        </pre>
      )}
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-navy-900/70">
        <li>
          Supabase → <span className="font-semibold">SQL Editor</span> → dán toàn bộ{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">supabase/schema.sql</code> →{" "}
          <span className="font-semibold">Run</span>.
        </li>
        <li>
          Dán tiếp{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px]">
            supabase/schema-crm.sql
          </code>{" "}
          → <span className="font-semibold">Run</span>.
        </li>
        <li>
          Tải lại trang: hệ thống tự tạo tài khoản demo &amp; dữ liệu mẫu ở lần đăng nhập kế tiếp.
        </li>
      </ol>
    </div>
  );
}
