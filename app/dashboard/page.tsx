import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listCertificates, revenueStats } from "@/lib/db";
import { formatDate, formatVnd, remainingDays, statusLabel, getValidityYears } from "@/lib/utils";
import { VALIDITY_OPTIONS } from "@/lib/types";
import { AlertTriangle, FileBadge2, ShieldCheck, Wallet } from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = getSession();
  if (!user) redirect("/login");
  const items = await listCertificates();
  const published = items.filter((i) => i.status !== "draft");
  const valid = published.filter((i) => remainingDays(i.expires_at) >= 0);
  const expiring = published.filter((i) => {
    const d = remainingDays(i.expires_at);
    return d >= 0 && d <= 90;
  });
  const stats = user.role === "admin" ? await revenueStats() : null;

  // Thống kê theo thời hạn
  const validityStats = VALIDITY_OPTIONS.map((y) => ({
    years: y,
    count: items.filter((c) => getValidityYears(c) === y).length,
  })).filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Xin chào, {user.name}
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">Tổng quan hồ sơ</h1>
        <p className="mt-1 text-sm text-navy-900/60">
          FDA linh hoạt 1-10 năm theo hợp đồng · GACC mặc định 5 năm (tùy chỉnh 1-10 năm) · gia hạn theo chu kỳ hợp đồng
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
                  <th className="pb-2">Hạn HĐ</th>
                  <th className="pb-2">Hết hạn</th>
                  <th className="pb-2">Còn lại</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((c) => {
                  const left = remainingDays(c.expires_at);
                  const vy = getValidityYears(c);
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
                      <td className="py-3">
                        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-700">
                          {vy} năm
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
          <h2 className="font-display text-lg font-bold">Quy tắc thời hạn linh hoạt</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-teal-300">FDA - Linh hoạt</div>
              <div className="mt-1 text-2xl font-extrabold">1-10 năm</div>
              <p className="mt-1 text-sm text-white/65">Theo hợp đồng với khách. Mặc định 2 năm, có thể chọn 1-10 năm.</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {VALIDITY_OPTIONS.map((y) => (
                  <span key={y} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                    {y}N
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-xs uppercase tracking-wider text-gold-400">GACC - Linh hoạt</div>
              <div className="mt-1 text-2xl font-extrabold">1-10 năm</div>
              <p className="mt-1 text-sm text-white/65">Mặc định 5 năm, có thể tùy chỉnh 1-10 năm theo hợp đồng.</p>
            </div>
            {validityStats.length > 0 && (
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wider text-white/60">Thống kê theo hợp đồng</div>
                <div className="mt-2 space-y-1">
                  {validityStats.map((s) => (
                    <div key={s.years} className="flex justify-between text-sm">
                      <span>{s.years} năm</span>
                      <span className="font-bold">{s.count} hồ sơ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
