"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, FileText } from "lucide-react";
import { formatMoney } from "@/lib/accounting";
import { QUOTE_STATE_LABELS, type QuoteView } from "@/lib/quotes";
import { QUOTE_TEMPLATES, getQuoteTemplate } from "@/lib/quote-templates";

const STATE_STYLES: Record<string, string> = {
  draft: "bg-slate-200 text-slate-600",
  sent: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-navy-900/10 text-navy-900/60",
};

function QuotesListInner() {
  const sp = useSearchParams();
  const [items, setItems] = useState<QuoteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(sp.get("q") || "");
  const [template, setTemplate] = useState(sp.get("template") || "ALL");
  const [status, setStatus] = useState("ALL");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    fetch("/api/quotes")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setWarning(d.warning || "");
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (template !== "ALL" && item.template_key !== template) return false;
      if (status !== "ALL" && item.state !== status) return false;
      const hay = `${item.quote_no} ${item.company_name} ${item.contact_name} ${item.title}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [items, q, template, status]);

  const totalsByState = useMemo(() => {
    const sent = items.filter((i) => i.state === "sent");
    const accepted = items.filter((i) => i.state === "accepted");
    return {
      draft: items.filter((i) => i.state === "draft").length,
      sent: sent.length,
      accepted: accepted.length,
      acceptedValue: accepted.reduce((sum, i) => sum + i.total, 0),
      pipelineValue: [...sent, ...accepted].reduce((sum, i) => sum + i.total, 0),
    };
  }, [items]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Báo giá dịch vụ</h1>
          <p className="mt-1 text-sm text-navy-900/55">
            Mẫu báo giá dựng sẵn theo dịch vụ — nhân viên chỉ cần nhập thông tin khách hàng rồi tải PDF gửi khách.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/bao-gia/bang-gia"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 shadow-sm"
          >
            ⚙️ Bảng giá dịch vụ
          </Link>
          <Link
            href="/dashboard/bao-gia/moi"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Tạo báo giá
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <KpiCard label="Bản nháp" value={String(totalsByState.draft)} hint="Chưa gửi khách" />
        <KpiCard label="Đã gửi khách" value={String(totalsByState.sent)} hint="Đang chờ phản hồi" />
        <KpiCard label="Khách đồng ý" value={String(totalsByState.accepted)} hint={`${formatMoney(totalsByState.acceptedValue)} ₫`} />
        <KpiCard label="Giá trị đang chào" value={`${formatMoney(totalsByState.pipelineValue)} ₫`} hint="Đã gửi + đã đồng ý" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm mã báo giá, công ty, người liên hệ…"
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <button
          onClick={() => setTemplate("ALL")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${template === "ALL" ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
        >
          Tất cả dịch vụ
        </button>
        {QUOTE_TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplate(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${template === t.key ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
          >
            {t.short_name}
          </button>
        ))}
        {(["ALL", "draft", "sent", "accepted", "rejected", "expired"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${status === s ? "bg-teal-500 text-navy-950" : "bg-white text-navy-900"}`}
          >
            {s === "ALL" ? "Mọi trạng thái" : QUOTE_STATE_LABELS[s]}
          </button>
        ))}
      </div>

      {warning && (
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{warning}</div>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
              <tr>
                <th className="px-4 py-3">Mã báo giá</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Dịch vụ</th>
                <th className="px-4 py-3 text-right">Tổng cộng</th>
                <th className="px-4 py-3">Ngày báo giá</th>
                <th className="px-4 py-3">Hiệu lực</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Đang tải…</td>
                </tr>
              )}
              {!loading && filtered.map((item) => (
                <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/bao-gia/${item.id}`} className="inline-flex items-center gap-1.5 font-mono font-bold text-teal-700">
                      <FileText className="h-3.5 w-3.5" /> {item.quote_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{item.company_name}</div>
                    {item.contact_name && <div className="text-[11px] text-navy-900/45">{item.contact_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[11px] font-bold text-navy-900">
                      {QUOTE_TEMPLATES.find((t) => t.key === item.template_key)?.short_name || item.template_key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatMoney(item.total)} ₫</td>
                  <td className="px-4 py-3 text-xs text-navy-900/60">{item.issue_date.split("-").reverse().join("/")}</td>
                  <td className="px-4 py-3 text-xs text-navy-900/60">
                    {item.valid_until ? `${item.valid_until.split("-").reverse().join("/")}${
                      item.state === "sent" && item.days_left >= 0 ? ` (còn ${item.days_left} ngày)` : ""
                    }` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATE_STYLES[item.state] || STATE_STYLES.draft}`}>
                      {QUOTE_STATE_LABELS[item.state]}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    Chưa có báo giá nào phù hợp. Bấm <b>“+ Tạo báo giá”</b> để lập báo giá đầu tiên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-card">
      <div className="text-[11px] font-extrabold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-navy-900/50">{hint}</div>
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải…</div>}>
      <QuotesListInner />
    </Suspense>
  );
}
