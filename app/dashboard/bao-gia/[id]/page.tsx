"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Copy,
  Download,
  Pencil,
  Printer,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuotePreview } from "@/components/quotes/QuotePreview";
import { formatMoney } from "@/lib/accounting";
import { QUOTE_STATE_LABELS, buildQuoteMessage, type QuoteStatus, type QuoteView } from "@/lib/quotes";
import { getQuoteTemplate, type QuoteTemplateDef } from "@/lib/quote-templates";

const STATE_STYLES: Record<string, string> = {
  draft: "quote-detail__status--draft",
  sent: "quote-detail__status--sent",
  accepted: "quote-detail__status--accepted",
  rejected: "quote-detail__status--rejected",
  expired: "quote-detail__status--expired",
};

function dateLabel(value: string) {
  return value ? value.split("-").reverse().join("/") : "—";
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [templates, setTemplates] = useState<QuoteTemplateDef[]>([]);
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
    fetch("/api/quote-templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.items || []))
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
    return (
      <div className="quote-detail-page">
        <div className="quote-detail__inner">
          <div className="quote-detail__message-card" role="status">
            <span className="quote-detail__loader" aria-hidden="true" />
            <span>Đang tải báo giá…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="quote-detail-page">
        <div className="quote-detail__inner">
          <div className="quote-detail__message-card quote-detail__message-card--error">
            <div>
              <strong>{err || "Không tìm thấy báo giá."}</strong>
              <p>Kiểm tra lại liên kết hoặc quay về danh sách báo giá.</p>
            </div>
            <Link href="/dashboard/bao-gia" className="quote-detail__button quote-detail__button--quiet">
              <ArrowLeft aria-hidden="true" /> Danh sách báo giá
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canManage = role === "admin" || (userId !== null && quote.created_by === userId);
  const isDraft = quote.status === "draft";
  const customerName = quote.company_name.trim() || quote.contact_name.trim() || "Khách hàng";
  const customerMeta = quote.company_name.trim()
    ? quote.contact_name.trim()
    : [quote.contact_phone, quote.contact_email].filter(Boolean).join(" · ");
  const serviceName = quote.service_name || getQuoteTemplate(quote.template_key)?.name || quote.template_key;
  const validity = quote.valid_until ? dateLabel(quote.valid_until) : "Theo bảng giá hiện hành";

  return (
    <div className="quote-detail-page">
      <div className="quote-detail__inner">
        <nav className="quote-detail__back-row print:hidden" aria-label="Điều hướng">
          <Link href="/dashboard/bao-gia" className="quote-detail__back">
            <ArrowLeft aria-hidden="true" />
            Danh sách báo giá
          </Link>
        </nav>

        <header className="quote-detail__hero print:hidden">
          <div className="quote-detail__hero-copy">
            <div className="quote-detail__eyebrow"><span aria-hidden="true" /> CHI TIẾT BÁO GIÁ</div>
            <div className="quote-detail__title-row">
              <h1>{quote.quote_no}</h1>
              <span className={`quote-detail__status ${STATE_STYLES[quote.state] || STATE_STYLES.draft}`}>
                {QUOTE_STATE_LABELS[quote.state]}
              </span>
            </div>
            <p className="quote-detail__subtitle">{quote.title || serviceName}</p>
          </div>
          <div className="quote-detail__primary-actions">
            <a href={`/api/quotes/${quote.id}/pdf`} className="quote-detail__button quote-detail__button--primary">
              <Download aria-hidden="true" />
              Tải PDF
            </a>
            <button onClick={() => window.print()} className="quote-detail__button quote-detail__button--quiet">
              <Printer aria-hidden="true" />
              In
            </button>
          </div>
        </header>

        <section className="quote-detail__facts print:hidden" aria-label="Thông tin chính">
          <Fact icon={<Building2 aria-hidden="true" />} label="Khách hàng" value={customerName} detail={customerMeta} />
          <Fact icon={<Briefcase aria-hidden="true" />} label="Dịch vụ" value={serviceName} />
          <Fact icon={<CircleDollarSign aria-hidden="true" />} label="Tổng giá trị" value={`${formatMoney(quote.total)} ₫`} />
          <Fact
            icon={<CalendarDays aria-hidden="true" />}
            label="Hiệu lực đến"
            value={validity}
            detail={quote.valid_until && quote.state === "sent" && quote.days_left >= 0 ? `Còn ${quote.days_left} ngày` : undefined}
          />
        </section>

        <section className="quote-detail__toolbar print:hidden" aria-label="Thao tác báo giá">
          <div className="quote-detail__toolbar-label">
            <span className="quote-detail__section-kicker">THAO TÁC</span>
            <span>Quản lý báo giá</span>
          </div>
          <div className="quote-detail__toolbar-actions">
            <button onClick={copyMessage} className="quote-detail__button quote-detail__button--tool">
              <Copy aria-hidden="true" /> Copy nội dung
            </button>
            {isDraft ? (
              <button
                onClick={() => changeStatus("sent")}
                disabled={busy || !canManage}
                className="quote-detail__button quote-detail__button--send"
              >
                <Send aria-hidden="true" /> Đã gửi khách
              </button>
            ) : (
              <>
                {quote.status !== "accepted" && (
                  <button
                    onClick={() => changeStatus("accepted")}
                    disabled={busy || !canManage}
                    className="quote-detail__button quote-detail__button--accept"
                  >
                    <Check aria-hidden="true" /> Khách đồng ý
                  </button>
                )}
                {quote.status !== "rejected" && (
                  <button
                    onClick={() => changeStatus("rejected")}
                    disabled={busy || !canManage}
                    className="quote-detail__button quote-detail__button--danger"
                  >
                    <X aria-hidden="true" /> Khách từ chối
                  </button>
                )}
              </>
            )}
            {isDraft && canManage && !editing && (
              <button onClick={() => setEditing(true)} className="quote-detail__button quote-detail__button--tool">
                <Pencil aria-hidden="true" /> Sửa
              </button>
            )}
            {!isDraft && canManage && (
              <button
                onClick={duplicate}
                disabled={busy}
                className="quote-detail__button quote-detail__button--tool"
              >
                <Copy aria-hidden="true" /> Nhân bản để sửa
              </button>
            )}
            {(isDraft ? canManage : role === "admin") && (
              <button
                onClick={remove}
                disabled={busy}
                className="quote-detail__button quote-detail__button--delete"
              >
                <Trash2 aria-hidden="true" /> Xóa
              </button>
            )}
          </div>
        </section>

        {toast && <div className="quote-detail__notice quote-detail__notice--success print:hidden" role="status">{toast}</div>}
        {err && <div className="quote-detail__notice quote-detail__notice--error print:hidden" role="alert">{err}</div>}
        {!isDraft && canManage && (
          <div className="quote-detail__notice quote-detail__notice--info print:hidden">
            Báo giá đã gửi khách được khóa để giữ nguyên phiên bản. Cần chỉnh sửa thì chọn <b>“Nhân bản để sửa”</b>.
          </div>
        )}

        {editing ? (
          <div className="quote-detail__edit print:hidden">
            <QuoteForm
              quote={quote}
              templates={templates}
              onSaved={(item) => {
                setQuote(item);
                setEditing(false);
                flash("Đã lưu thay đổi.");
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <section className="quote-detail__document" aria-label="Bản xem trước báo giá">
            <div className="quote-detail__document-heading print:hidden">
              <div>
                <span className="quote-detail__section-kicker">TÀI LIỆU</span>
                <h2>Bản xem trước báo giá</h2>
              </div>
              <p>Nội dung bên dưới sẽ được dùng khi tải PDF hoặc in.</p>
            </div>
            <div className="quote-detail__paper">
              <QuotePreview quote={quote} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="quote-detail__fact">
      <div className="quote-detail__fact-icon">{icon}</div>
      <div className="quote-detail__fact-copy">
        <span>{label}</span>
        <strong title={value}>{value}</strong>
        {detail && <small title={detail}>{detail}</small>}
      </div>
    </div>
  );
}
