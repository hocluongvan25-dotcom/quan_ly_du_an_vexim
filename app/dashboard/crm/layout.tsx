import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/permissions";
import { dbStatus } from "@/lib/db-health";
import { DbSetupNotice } from "@/components/DbSetupNotice";
import { ROLE_LABEL } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cổng vào CRM. Theo spec chỉ Founder/Admin, AE, SR, LR có vai trò trong CRM;
 * bộ phận chuyên môn hồ sơ không có, nên không được vào (kể cả gõ thẳng URL).
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) redirect("/login");
  if (!hasCrmAccess(user)) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-extrabold text-navy-900">
          Bạn không có vai trò trong CRM
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-900/60">
          Tài khoản của bạn là{" "}
          <span className="font-semibold text-navy-900">{ROLE_LABEL[user.role]}</span>. CRM dành cho
          Founder / Admin, AE, SR và LR. Nếu cần truy cập, hãy liên hệ Founder để được gán vai trò.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Về trang tổng quan
          </Link>
          <Link
            href="/dashboard/ho-so"
            className="rounded-xl border border-navy-900/10 px-4 py-2.5 text-sm font-semibold text-navy-900"
          >
            Quản lý hồ sơ FDA / GACC
          </Link>
        </div>
      </div>
    );
  }

  // CRM cần bảng riêng (crm_teams, crm_leads...). Thiếu migration thì chặn tại đây
  // và chỉ đúng file SQL cần chạy, thay vì để từng trang CRM vỡ.
  const db = await dbStatus();
  if (!db.ready && db.problem) {
    return <DbSetupNotice problem={db.problem} />;
  }

  return (
    <>
      {db.warnings.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Database cần đồng bộ thêm
          </p>
          <ul className="mt-1 space-y-1 text-sm text-navy-900/75">
            {db.warnings.map((w) => (
              <li key={w.title}>
                <span className="font-semibold text-navy-900">{w.title}</span> — {w.fix}
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </>
  );
}
