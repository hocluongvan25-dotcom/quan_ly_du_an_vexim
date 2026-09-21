"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Download, Pencil, Printer, Send, X } from "lucide-react";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuotePreview } from "@/components/quotes/QuotePreview";
import { formatMoney } from "@/lib/accounting";
import { QUOTE_STATE_LABELS, buildQuoteMessage, type QuoteStatus, type QuoteView } from "@/lib/quotes";
import { getQuoteTemplate } from "@/lib/quote-templates";

const STATE_STYLES: Record<string, string> = {
  draft: "bg-slate-200 text-slate-600",
  sent: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  expired: "bg-navy-900/10 text-navy-900/60",
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    const res = await fetch(`/api/quotes/${id}`);
    const data = await res.json();
    if (res.ok && data.item) setQuote(data.item);
    else setErr(data.error || "Không tìm thấy báo giá.");
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setRole(d.user?.role || "");
        setUserId(d.user?.id ?? null);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  async function changeStatus(status: QuoteStatus) {
    if (!quote) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không đổi được trạng thái.");
      await load();
      flash(`Đã chuyển trạng thái: ${QUOTE_STATE_LABELS[status]}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    if (!quote) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không nhân bản được báo giá.");
      router.push(`/dashboard/bao-gia/${data.id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!quote) return;
    if (!confirm(`Xóa báo giá ${quote.quote_no}? Hành động không thể hoàn tác.`)) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xóa thất bại.");
      router.push("/dashboard/bao-gia");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function copyMessage() {
    if (!quote) return;
    const text = buildQuoteMessage(quote);
    try {
      await navigator.clipboard.writeText(text);
      flash("Đã copy nội dung báo giá — dán vào Zalo/Email để gửi khách.");
    } catch {
      window.prompt("Copy nội dung dưới đây để gửi khách:", text);
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải báo giá…</div>;
  }

  if (!quote) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-card">
        <div className="font-bold text-rose-600">{err || "Không tìm thấy báo giá."}</div>
        <Link href="/dashboard/bao-gia" className="mt-3 inline-block text-sm font-bold text-teal-700">
          ← Về danh sách báo giá
        </Link>
      </div>
    );
  }

  const canManage = role === "admin" || (userId !== null && quote.created_by === userId);
  const isDraft = quote.status === "draft";

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link href="/dashboard/bao-gia" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700">
          <ArrowLeft className="h-4 w-4" /> Về danh sách báo giá
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-navy-900 md:text-3xl">{quote.quote_no}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_STYLES[quote.state] || STATE_STYLES.draft}`}>
                {QUOTE_STATE_LABELS[quote.state]}
              </span>
              <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[11px] font-bold text-navy-900">
                {getQuoteTemplate(quote.template_key)?.name || quote.template_key}
              </span>
            </div>
            <div className="mt-1 text-sm text-navy-900/60">
              {quote.company_name} · {formatMoney(quote.total)} ₫ · hiệu lực đến{" "}
              {quote.valid_until ? quote.valid_until.split("-").reverse().join("/") : "—"}
              {quote.valid_until && quote.state === "sent" && quote.days_left >= 0 && ` (còn ${quote.days_left} ngày)`}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 py-2.5 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5" /> Tải PDF
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-navy-900 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> In
            </button>
            <button
              onClick={copyMessage}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-navy-900 shadow-sm"
            >
              <Copy className="h-3.5 w-3.5" /> Copy nội dung gửi khách
            </button>
            {isDraft ? (
              <button
                onClick={() => changeStatus("sent")}
                disabled={busy || !canManage}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2.5 text-xs font-extrabold text-navy-950 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Đã gửi khách
              </button>
            ) : (
              <>
                {quote.status !== "accepted" && (
                  <button
                    onClick={() => changeStatus("accepted")}
                    disabled={busy || !canManage}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Khách đồng ý
                  </button>
                )}
                {quote.status !== "rejected" && (
                  <button
                    onClick={() => changeStatus("rejected")}
                    disabled={busy || !canManage}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-red-600 shadow-sm disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Khách từ chối
                  </button>
                )}
              </>
            )}
            {isDraft && canManage && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-navy-900 shadow-sm"
              >
                <Pencil className="h-3.5 w-3.5" /> Sửa
              </button>
            )}
            {!isDraft && canManage && (
              <button
                onClick={duplicate}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-navy-900 shadow-sm disabled:opacity-50"
              >
                Nhân bản để sửa
              </button>
            )}
            {(isDraft ? canManage : role === "admin") && (
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-red-600 shadow-sm disabled:opacity-50"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {toast && (
          <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">{toast}</div>
        )}
        {err && <div className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600">{err}</div>}
        {!isDraft && canManage && (
          <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
            Báo giá đã gửi khách nên không sửa trực tiếp (giữ đúng bản đã gửi). Cần chỉnh thì bấm <b>“Nhân bản để sửa”</b>.
          </div>
        )}
      </div>

      {editing ? (
        <QuoteForm
          quote={quote}
          onSaved={(item) => {
            setQuote(item);
            setEditing(false);
            flash("Đã lưu thay đổi.");
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <QuotePreview quote={quote} />
      )}
    </div>
  );
}
