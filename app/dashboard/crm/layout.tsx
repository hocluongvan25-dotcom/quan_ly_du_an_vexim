import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Cổng vào CRM. Theo spec chỉ Founder/Admin, AE, SR, LR có vai trò trong CRM;
 * bộ phận chuyên môn hồ sơ không có, nên không được vào (kể cả gõ thẳng URL).
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
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
  return <>{children}</>;
}
