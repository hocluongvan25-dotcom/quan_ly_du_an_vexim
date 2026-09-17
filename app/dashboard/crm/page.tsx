import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { crmListFollowUps, crmStatsFor, crmListCustomers, listCertificates } from "@/lib/db";
import { scopeFilter, scopeOf } from "@/lib/permissions";
import {
  CRM_STAGES,
  LEAD_SOURCE_LABEL,
  ROLE_DUTY,
  STALE_DAYS,
  type Role,
} from "@/lib/types";
import { compactVnd, formatDate, formatVnd, fromNow } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarClock,
  Coins,
  Filter,
  Handshake,
  RefreshCcw,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { CrmFollowUps, StageStrip } from "@/components/CrmFollowUps";
import { OwnerTag, StaleFlag } from "@/components/CrmBits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  all: "Toàn công ty",
  team: "Team của bạn",
  owned: "Việc của bạn",
};

export default async function CrmOverviewPage() {
  const user = getSession();
  if (!user) redirect("/login");
  const f = scopeFilter(user);
  const stats = await crmStatsFor(f);
  const followUps = await crmListFollowUps(f);
  const customers = user.role === "admin" || user.role === "ae" ? await crmListCustomers(f) : [];
  const certs = user.role === "admin" ? await listCertificates() : [];

  const openStages = CRM_STAGES.filter((s) => !s.closed);
  const maxStageValue = Math.max(1, ...stats.byStage.map((s) => s.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            VEXIM CRM · {SCOPE_LABEL[scopeOf(user)]}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">
            Sales Operation Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-navy-900/60">{ROLE_DUTY[user.role as Role]}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/crm/leads"
            className="rounded-xl border border-navy-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900"
          >
            Leads
          </Link>
          <Link
            href="/dashboard/crm/co-hoi"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Pipeline
          </Link>
        </div>
      </div>

      {/* 6 chỉ số Founder theo spec */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          icon={<Coins className="h-5 w-5" />}
          label="Total Pipeline Value"
          value={formatVnd(stats.totals.pipelineValue)}
          hint={`${stats.totals.openOpportunities} cơ hội đang mở · weighted ${compactVnd(stats.totals.weightedPipeline)} ₫`}
        />
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="New Leads (30 ngày)"
          value={String(stats.totals.newLeads30d)}
          hint={`Tổng ${stats.totals.leads} lead · ${stats.totals.leadsThisMonth} lead trong tháng này`}
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Expected Revenue"
          value={formatVnd(stats.totals.expectedRevenue)}
          hint={`Đã thắng ${formatVnd(stats.totals.wonValue)} + weighted pipeline`}
          tone="good"
        />
        <Kpi
          icon={<Filter className="h-5 w-5" />}
          label="Conversion Rate"
          value={`${stats.rates.conversionRate}%`}
          hint={`Lead → cơ hội ${stats.rates.leadToOpp}% · win rate ${stats.rates.winRate}%`}
        />
        <Kpi
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Stale Opportunities"
          value={String(stats.health.staleCount)}
          hint={`Không cập nhật ≥ ${STALE_DAYS} ngày · ${stats.health.noActionCount} cơ hội thiếu next action`}
          tone={stats.health.staleCount ? "bad" : "good"}
        />
        <Kpi
          icon={<Handshake className="h-5 w-5" />}
          label="Cơ hội theo stage"
          value={`${stats.totals.opportunities}`}
          hint={openStages
            .map((s) => {
              const row = stats.byStage.find((b) => b.stage === s.key);
              return `${s.short} ${row?.count ?? 0}`;
            })
            .join(" · ")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Opportunities by stage */}
        <section className="rounded-3xl bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Opportunities by Stage</h2>
            <Link href="/dashboard/crm/co-hoi" className="text-sm font-semibold text-teal-700">
              Mở pipeline →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.byStage.map((s) => {
              const meta = CRM_STAGES.find((c) => c.key === s.stage)!;
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-navy-900">
                      {meta.label}
                      <span className="ml-2 text-[11px] font-normal text-navy-900/45">
                        xác suất {meta.probability}%
                      </span>
                    </span>
                    <span className="tabular-nums text-navy-900/70">
                      {s.count} deal · {formatVnd(s.value)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-navy-900/5">
                    <div
                      className={`h-full rounded-full ${
                        s.stage === "won"
                          ? "bg-emerald-500"
                          : s.stage === "lost"
                            ? "bg-rose-400"
                            : "bg-gold-400"
                      }`}
                      style={{ width: `${Math.round((s.value / maxStageValue) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniStat label="Lead → cơ hội" value={`${stats.rates.leadToOpp}%`} />
            <MiniStat label="Win rate" value={`${stats.rates.winRate}%`} />
            <MiniStat label="Giá trị deal TB" value={compactVnd(stats.totals.avgDeal) + " ₫"} />
          </div>

          <h3 className="mt-6 font-display text-base font-bold">Chất lượng nguồn lead</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.bySource.length === 0 && (
              <p className="text-sm text-navy-900/50">Chưa có lead nào.</p>
            )}
            {stats.bySource.map((s) => (
              <span
                key={s.source}
                className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-navy-900/75"
              >
                {LEAD_SOURCE_LABEL[s.source as keyof typeof LEAD_SOURCE_LABEL] || s.source}: {s.count}{" "}
                lead · {s.converted} chuyển đổi ({s.rate}%)
              </span>
            ))}
          </div>
        </section>

        {/* Health / không ai bị bỏ quên */}
        <section className="space-y-4">
          <div className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
            <h2 className="font-display text-lg font-bold">Không khách hàng nào bị bỏ quên</h2>
            <p className="mt-1 text-sm text-white/65">
              Hệ thống tự phát hiện cơ hội ngủ quên, thiếu owner và thiếu next action.
            </p>
            <div className="mt-4 space-y-2.5">
              <HealthRow
                icon={<RefreshCcw className="h-4 w-4" />}
                label={`Cơ hội ngủ quên ≥ ${STALE_DAYS} ngày`}
                count={stats.health.staleCount}
              />
              <HealthRow
                icon={<Target className="h-4 w-4" />}
                label="Cơ hội thiếu next action"
                count={stats.health.noActionCount}
              />
              <HealthRow
                icon={<CalendarClock className="h-4 w-4" />}
                label="Follow-up quá hạn"
                count={stats.health.overdueCount}
              />
              <HealthRow
                icon={<UserCheck className="h-4 w-4" />}
                label="Lead chưa ai đụng tới > 7 ngày"
                count={stats.health.untouchedLeadsCount}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Cơ hội cần đánh thức</h2>
            <ul className="mt-3 space-y-2.5">
              {stats.health.stale.length === 0 && (
                <li className="text-sm text-emerald-700">Tốt — pipeline đang được chăm sóc đều.</li>
              )}
              {stats.health.stale.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/crm/co-hoi/${o.id}`}
                    className="block rounded-2xl border border-rose-100 bg-rose-50/60 p-3 hover:border-rose-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-navy-900">{o.company_name}</span>
                      <StaleFlag stale days={Math.max(STALE_DAYS, Math.round(STALE_DAYS))} />
                    </div>
                    <div className="mt-1 text-xs text-navy-900/60">
                      {o.owner_name} · hoạt động cuối {fromNow(o.last_activity_at)}
                    </div>
                  </Link>
                </li>
              ))}
              {stats.health.noAction.map((o) => (
                <li key={`na-${o.id}`}>
                  <Link
                    href={`/dashboard/crm/co-hoi/${o.id}`}
                    className="block rounded-2xl border border-amber-100 bg-amber-50/60 p-3 hover:border-amber-200"
                  >
                    <div className="text-sm font-semibold text-navy-900">{o.company_name}</div>
                    <div className="mt-1 text-xs text-amber-700">
                      Thiếu next action — AE phải đặt việc tiếp theo.
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Follow-up checklist */}
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Follow-up đến hạn</h2>
          <span className="text-xs text-navy-900/50">{followUps.length} việc đang chờ</span>
        </div>
        <CrmFollowUps items={followUps} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Khách hàng đã thắng</h2>
            <Link href="/dashboard/crm/khach-hang" className="text-sm font-semibold text-teal-700">
              Xem tất cả →
            </Link>
          </div>
          {customers.length === 0 ? (
            <p className="text-sm text-navy-900/50">
              Chưa có deal nào đóng. Khi cơ hội chuyển sang Won, khách hàng sẽ xuất hiện ở đây.
            </p>
          ) : (
            <ul className="divide-y divide-navy-900/5">
              {customers.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-semibold text-navy-900">{c.company_name}</div>
                    <div className="text-[11px] text-navy-900/45">
                      {c.opportunity_code} · thắng {fromNow(c.won_at)}
                      {c.certificate_no ? ` · hồ sơ ${c.certificate_no}` : ""}
                    </div>
                  </div>
                  <div className="tabular-nums font-semibold">{formatVnd(c.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Cơ hội gần nhất</h2>
          <ul className="mt-3 space-y-3">
            {stats.recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/crm/co-hoi/${o.id}`}
                  className="block rounded-2xl border border-navy-900/5 p-3 hover:bg-teal-50/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-navy-900">{o.company_name}</span>
                    <span className="text-sm tabular-nums text-navy-900/70">
                      {formatVnd(o.value)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <StageStrip stage={o.stage} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-navy-900/50">
                    <OwnerTag name={o.owner_name} />
                    <span>· cập nhật {fromNow(o.last_activity_at)}</span>
                    {o.next_action_due && <span>· next action hạn {formatDate(o.next_action_due)}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {certs.length > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Từ CRM sang hồ sơ FDA / GACC</h2>
          <p className="mt-1 text-sm text-navy-900/55">
            {certs.length} hồ sơ đang được quản lý. Cơ hội Won nên được gắn với hồ sơ để Founder thấy
            trọn vòng đời lead → doanh thu → hồ sơ.
          </p>
        </section>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        {icon}
      </div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-navy-900/45">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-extrabold ${
          tone === "bad" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-navy-900"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-navy-900/50">{hint}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-teal-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-900/45">
        {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-extrabold text-navy-900">{value}</div>
    </div>
  );
}

function HealthRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-white/80">
        <span className="text-teal-300">{icon}</span>
        {label}
      </span>
      <span
        className={`font-display text-lg font-extrabold ${count ? "text-gold-400" : "text-emerald-300"}`}
      >
        {count}
      </span>
    </div>
  );
}
