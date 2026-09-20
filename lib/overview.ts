/* ============================================================================
 * TOÀN CẢNH VẬN HÀNH (Admin Overview)
 * Tổng hợp đa nguồn: CRM opportunities + certificates revenue + leads,
 * ra tăng trưởng theo tháng/quý/năm + KPI từng nhân viên theo kỳ.
 * Hàm buildOverview là pure function — cả SQLite và Supabase đều dùng chung.
 * ========================================================================== */

export type OverviewInput = {
  users: Array<{ id: number; name: string; role: string }>;
  opps: Array<{
    id: number;
    owner_id: number | null;
    created_at: string;
    estimated_value: number;
  }>;
  histories: Array<{ opportunity_id: number; to_stage_id: number; created_at: string }>;
  stages: Array<{ id: number; is_won: boolean; is_lost: boolean }>;
  activities: Array<{ created_by: number | null; created_at: string }>;
  certs: Array<{
    created_by: number | null;
    service_price: number;
    published_at: string | null;
    revenue_recorded: unknown;
  }>;
  leads: Array<{ created_at: string }>;
};

export type GrowthBucket = {
  key: string;
  label: string;
  oppsCreated: number;
  won: number;
  wonValue: number;
  lost: number;
  recordedRevenue: number;
  leads: number;
  activities: number;
  conversion: number;
};

export type EmployeeOverview = {
  id: number;
  name: string;
  role: string;
  totals: {
    oppsCreated: number;
    won: number;
    wonValue: number;
    lost: number;
    conversion: number;
    activities: number;
    revenueRecorded: number;
  };
  series: {
    months: GrowthBucket[];
    quarters: GrowthBucket[];
    years: GrowthBucket[];
  };
};

export type OverviewStats = {
  kpis: {
    openOpps: number;
    openValue: number;
    wonValue12m: number;
    recordedRevenue12m: number;
    recordedRevenueTotal: number;
    leads12m: number;
    oppsCreated12m: number;
    conversion12m: number;
    activeEmployees: number;
  };
  funnel12m: { leads: number; opps: number; won: number; leadToOpp: number; oppToWon: number };
  growth: {
    months: GrowthBucket[];
    quarters: GrowthBucket[];
    years: GrowthBucket[];
  };
  employees: EmployeeOverview[];
};

function trailing12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function emptyBucket(key: string, label: string): GrowthBucket {
  return {
    key,
    label,
    oppsCreated: 0,
    won: 0,
    wonValue: 0,
    lost: 0,
    recordedRevenue: 0,
    leads: 0,
    activities: 0,
    conversion: 0,
  };
}

function quarterKey(month: string): { key: string; label: string } {
  const [y, m] = month.split("-");
  const q = Math.floor((Number(m) - 1) / 3) + 1;
  return { key: `${y}-Q${q}`, label: `Q${q}/${y}` };
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

export function buildOverview(input: OverviewInput, openOpps: number, openValue: number): OverviewStats {
  const months = trailing12Months();
  const inRange = new Set(months);

  const stageMap = new Map<number, { is_won: boolean; is_lost: boolean }>();
  for (const s of input.stages) stageMap.set(s.id, { is_won: !!s.is_won, is_lost: !!s.is_lost });

  // Lần chốt/mất gần nhất của mỗi cơ hội (mở lại deal thì không tính)
  const sortedHist = [...input.histories].sort((a, b) =>
    String(a.created_at) < String(b.created_at) ? -1 : 1
  );
  const lastTerminal = new Map<number, { won: boolean; month: string }>();
  for (const h of sortedHist) {
    const st = stageMap.get(h.to_stage_id);
    if (!st) continue;
    if (st.is_won || st.is_lost) {
      lastTerminal.set(h.opportunity_id, { won: st.is_won, month: String(h.created_at).slice(0, 7) });
    } else {
      lastTerminal.delete(h.opportunity_id);
    }
  }
  const oppValue = new Map<number, number>();
  const oppOwner = new Map<number, number | null>();
  for (const o of input.opps) {
    oppValue.set(o.id, o.estimated_value || 0);
    oppOwner.set(o.id, o.owner_id);
  }

  // ---- Buckets tháng toàn cục ----
  const g = new Map<string, GrowthBucket>();
  for (const m of months) g.set(m, emptyBucket(m, monthLabel(m)));

  const bumpMonth = (month: string, fn: (b: GrowthBucket) => void) => {
    const b = g.get(month);
    if (b) fn(b);
  };

  // ---- Buckets tháng từng nhân viên ----
  const emp = new Map<number, Map<string, GrowthBucket>>();
  const empBucket = (userId: number | null, month: string): GrowthBucket | null => {
    if (userId === null || userId === undefined) return null;
    if (!inRange.has(month)) return null;
    let m = emp.get(userId);
    if (!m) {
      m = new Map();
      emp.set(userId, m);
    }
    let b = m.get(month);
    if (!b) {
      b = emptyBucket(month, monthLabel(month));
      m.set(month, b);
    }
    return b;
  };

  // Cơ hội mới
  for (const o of input.opps) {
    const month = String(o.created_at).slice(0, 7);
    bumpMonth(month, (b) => (b.oppsCreated += 1));
    const eb = empBucket(o.owner_id, month);
    if (eb) eb.oppsCreated += 1;
  }

  // Chốt / mất (theo thời điểm chuyển giai đoạn thực tế)
  for (const [oppId, t] of Array.from(lastTerminal.entries())) {
    if (!inRange.has(t.month)) continue;
    const val = oppValue.get(oppId) || 0;
    const owner = oppOwner.get(oppId) ?? null;
    if (t.won) {
      bumpMonth(t.month, (b) => {
        b.won += 1;
        b.wonValue += val;
      });
      const eb = empBucket(owner, t.month);
      if (eb) {
        eb.won += 1;
        eb.wonValue += val;
      }
    } else {
      bumpMonth(t.month, (b) => (b.lost += 1));
      const eb = empBucket(owner, t.month);
      if (eb) eb.lost += 1;
    }
  }

  // Hoạt động chăm sóc
  for (const a of input.activities) {
    const month = String(a.created_at).slice(0, 7);
    bumpMonth(month, (b) => (b.activities += 1));
    const eb = empBucket(a.created_by, month);
    if (eb) eb.activities += 1;
  }

  // Doanh thu ghi nhận (chứng nhận đã xuất bản, có published_at + revenue_recorded)
  let recordedTotal = 0;
  for (const c of input.certs) {
    if (!c.published_at || !c.revenue_recorded) continue;
    const amt = Number(c.service_price || 0);
    recordedTotal += amt;
    const month = String(c.published_at).slice(0, 7);
    bumpMonth(month, (b) => (b.recordedRevenue += amt));
    const eb = empBucket(c.created_by, month);
    if (eb) eb.recordedRevenue += amt;
  }

  // Leads tư vấn
  for (const l of input.leads) {
    bumpMonth(String(l.created_at).slice(0, 7), (b) => (b.leads += 1));
  }

  const finalize = (b: GrowthBucket): GrowthBucket => ({
    ...b,
    conversion: b.won + b.lost > 0 ? Math.round((b.won / (b.won + b.lost)) * 100) : 0,
  });

  const group = (buckets: GrowthBucket[], mode: "quarter" | "year"): GrowthBucket[] => {
    const map = new Map<string, GrowthBucket>();
    for (const b of buckets) {
      const [y] = b.key.split("-");
      const { key, label } = mode === "quarter" ? quarterKey(b.key) : { key: y, label: y };
      const cur = map.get(key) || emptyBucket(key, label);
      cur.oppsCreated += b.oppsCreated;
      cur.won += b.won;
      cur.wonValue += b.wonValue;
      cur.lost += b.lost;
      cur.recordedRevenue += b.recordedRevenue;
      cur.leads += b.leads;
      cur.activities += b.activities;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .sort((a, b2) => a.key.localeCompare(b2.key))
      .map(finalize);
  };

  const growthMonths = months.map((m) => finalize(g.get(m)!));
  const growthQuarters = group(growthMonths, "quarter");
  const growthYears = group(growthMonths, "year");

  const sum = (rows: GrowthBucket[]) =>
    rows.reduce(
      (t, r) => ({
        oppsCreated: t.oppsCreated + r.oppsCreated,
        won: t.won + r.won,
        wonValue: t.wonValue + r.wonValue,
        lost: t.lost + r.lost,
        recordedRevenue: t.recordedRevenue + r.recordedRevenue,
        leads: t.leads + r.leads,
        activities: t.activities + r.activities,
      }),
      { oppsCreated: 0, won: 0, wonValue: 0, lost: 0, recordedRevenue: 0, leads: 0, activities: 0 }
    );
  const gTotal = sum(growthMonths);
  const conversion12m =
    gTotal.won + gTotal.lost > 0 ? Math.round((gTotal.won / (gTotal.won + gTotal.lost)) * 100) : 0;

  // ---- Từng nhân viên ----
  const employees: EmployeeOverview[] = input.users.map((u) => {
    const m = emp.get(u.id);
    const empMonths = months.map((mo) => {
      const b = m?.get(mo);
      return finalize(b ? { ...b } : emptyBucket(mo, monthLabel(mo)));
    });
    const t = sum(empMonths);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      totals: {
        oppsCreated: t.oppsCreated,
        won: t.won,
        wonValue: t.wonValue,
        lost: t.lost,
        conversion: t.won + t.lost > 0 ? Math.round((t.won / (t.won + t.lost)) * 100) : 0,
        activities: t.activities,
        revenueRecorded: t.recordedRevenue,
      },
      series: {
        months: empMonths,
        quarters: group(empMonths, "quarter"),
        years: group(empMonths, "year"),
      },
    };
  });

  employees.sort((a, b) => b.totals.wonValue - a.totals.wonValue || b.totals.won - a.totals.won);

  return {
    kpis: {
      openOpps,
      openValue,
      wonValue12m: gTotal.wonValue,
      recordedRevenue12m: gTotal.recordedRevenue,
      recordedRevenueTotal: recordedTotal,
      leads12m: gTotal.leads,
      oppsCreated12m: gTotal.oppsCreated,
      conversion12m,
      activeEmployees: employees.filter(
        (e) => e.totals.oppsCreated + e.totals.won + e.totals.activities > 0
      ).length,
    },
    funnel12m: {
      leads: gTotal.leads,
      opps: gTotal.oppsCreated,
      won: gTotal.won,
      leadToOpp: gTotal.leads > 0 ? Math.round((gTotal.oppsCreated / gTotal.leads) * 100) : 0,
      oppToWon: gTotal.oppsCreated > 0 ? Math.round((gTotal.won / gTotal.oppsCreated) * 100) : 0,
    },
    growth: { months: growthMonths, quarters: growthQuarters, years: growthYears },
    employees,
  };
}
