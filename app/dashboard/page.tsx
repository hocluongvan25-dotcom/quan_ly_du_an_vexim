import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { crmStatsFor, listCertificates, revenueStats } from "@/lib/db";
import { scopeFilter } from "@/lib/permissions";
import { formatDate, formatVnd, remainingDays, statusLabel } from "@/lib/utils";
import { STANDARD_YEARS } from "@/lib/types";
import { DbSetupNotice } from "@/components/DbSetupNotice";
import { describeDbError } from "@/lib/db-health";
import { AlertTriangle, FileBadge2, ShieldCheck, Wallet } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = getSession();
  if (!user) redirect("/login");

  let items;
  try {
    items = await listCertificates();
  } catch (e) {
    const problem = describeDbError(e);
    if (problem) return <DbSetupNotice problem={problem} />;
    throw e;
  }
  const published = items.filter((i) => i.status !== "draft");
  const valid = published.filter((i) => remainingDays(i.expires_at) >= 0);
  const expiring = published.filter((i) => {
    const d = remainingDays(i.expires_at);
    return d >= 0 && d <= 90;
  });
  const stats = user.role === "admin" ? await revenueStats() : null;
  const isCrmRole = ["admin", "ae", "sr", "lr"].includes(user.role);
  const crm = isCrmRole ? await crmStatsFor(scopeFilter(user)) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Xin chào, {user.name}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Tổng quan hồ sơ</h1>
        <p className="mt-1 text-sm text-navy-900/60">
          FDA hiệu lực {STANDARD_YEARS.FDA} năm · GACC hiệu lực {STANDARD_YEARS.GACC} năm · gia hạn 1
          lần mỗi chu kỳ
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<FileBadge2 className="h-5 w-5" />}
          label="Tổng hồ sơ"
          value={String(items.length)}
          hint={`${items.filter((i) => i.standard === "FDA").length} FDA · ${items.filter((i) => i.standard === "GACC").length} GACC`}
        />
        <Stat
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Đang VALID"
          value={String(valid.length)}
          hint="Đã xuất bản và còn hiệu lực"
        />
        <Stat
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Sắp hết hạn (90 ngày)"
          value={String(expiring.length)}
          hint="Cần chủ động gia hạn"
        />
        <Stat
          icon={<Wallet className="h-5 w-5" />}
          label={user.role === "admin" ? "Doanh thu đã ghi" : "Vai trò"}
          value={user.role === "admin" ? formatVnd(stats?.total || 0) : "Chuyên môn"}
          hint={user.role === "admin" ? `${stats?.count || 0} hồ sơ đã xuất bản` : "Điền hồ sơ sau khi đăng ký xong"}
        />
      </div>

      {crm && (
        <Link
          href="/dashboard/crm"
          className="block rounded-3xl bg-navy-900 p-5 text-white shadow-card transition hover:bg-navy-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
                VEXIM CRM
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold">
                Pipeline {formatVnd(crm.totals.pipelineValue)} · {crm.totals.openOpportunities} cơ hội mở
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {crm.totals.newLeads30d} lead mới (30 ngày) · expected revenue{" "}
                {formatVnd(crm.totals.expectedRevenue)} · win rate {crm.rates.winRate}%
              </p>
            </div>
            <div className="flex gap-2 text-xs font-bold">
              <span
                className={`rounded-full px-3 py-1.5 ${
                  crm.health.staleCount
                    ? "bg-rose-500/25 text-rose-200"
                    : "bg-emerald-500/25 text-emerald-200"
                }`}
              >
                {crm.health.staleCount} cơ hội ngủ quên
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">
                {crm.health.noActionCount} thiếu next action
              </span>
              <span className="rounded-full bg-teal-500 px-3 py-1.5 text-navy-950">Mở CRM →</span>
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Hồ sơ cần chú ý</h2>
            <Link href="/dashboard/ho-so" className="text-sm font-semibold text-teal-700">
              Xem tất cả
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-navy-900/45">
                <tr>
                  <th className="pb-2">Chứng chỉ</th>
                  <th className="pb-2">Công ty</th>
                  <th className="pb-2">Chuẩn</th>
                  <th className="pb-2">Hết hạn</th>
                  <th className="pb-2">Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((c) => {
                  const left = remainingDays(c.expires_at);
                  return (
                    <tr key={c.id} className="border-t border-navy-900/5">
                      <td className="py-3">
                        <Link href={`/dashboard/ho-so/${c.id}`} className="font-semibold text-navy-900">
                          {c.certificate_no}
                        </Link>
                        <div className="text-[11px] text-navy-900/45">{statusLabel(c.status, left)}</div>
                      </td>
                      <td className="py-3">{c.company_name}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            c.standard === "FDA" ? "bg-navy-900 text-white" : "bg-teal-100 text-teal-700"
                          }`}
                        >
                          {c.standard}
                        </span>
                      </td>
                      <td className="py-3">{formatDate(c.expires_at)}</td>
                      <td className={`py-3 font-semibold ${left < 0 ? "text-rose-600" : left <= 90 ? "text-amber-600" : "text-emerald-600"}`}>
                        {left < 0 ? "Hết hạn" : `${left} ngày`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
          <h2 className="font-display text-lg font-bold">Quy tắc thời hạn</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-teal-300">Mã FDA</div>
              <div className="mt-1 text-2xl font-extrabold">2 năm</div>
              <p className="mt-1 text-sm text-white/65">Phải gia hạn 1 lần mỗi chu kỳ 24 tháng.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-gold-400">Mã GACC</div>
              <div className="mt-1 text-2xl font-extrabold">5 năm</div>
              <p className="mt-1 text-sm text-white/65">Phải gia hạn 1 lần mỗi chu kỳ 60 tháng.</p>
            </div>
          </div>
          <Link
            href="/dashboard/ho-so/moi"
            className="mt-5 block rounded-2xl bg-teal-500 py-3 text-center text-sm font-bold text-navy-950"
          >
            Điền hồ sơ mới
          </Link>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        {icon}
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-900/45">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </div>
  );
}
