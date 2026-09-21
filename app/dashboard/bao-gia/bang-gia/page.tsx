"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/accounting";
import { calcQuoteTotals } from "@/lib/quotes";
import {
  QUOTE_PRICE_NOTE,
  type QuoteOptionDef,
  type QuoteTemplateDef,
  type QuoteTemplateItem,
  type QuoteTemplateKey,
} from "@/lib/quote-templates";

type EditableTemplate = QuoteTemplateDef & { scopeText: string; documentsText: string; termsText: string };

const toLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

const emptyItem = (): QuoteTemplateItem => ({ name: "", unit: "Gói", qty: 1, unit_price: 0, note: "" });
const emptyOption = (): QuoteOptionDef => ({ key: "", label: "", unit: "Lần", qty: 1, unit_price: 0, note: "", group: "Khác" });

function toEditable(template: QuoteTemplateDef): EditableTemplate {
  return {
    ...template,
    items: template.items.map((i) => ({ ...i, note: i.note || "" })),
    options: template.options.map((o) => ({ ...o })),
    scopeText: template.scope.join("\n"),
    documentsText: template.documents.join("\n"),
    termsText: template.terms.join("\n"),
  };
}

export default function PriceBookPage() {
  const [templates, setTemplates] = useState<QuoteTemplateDef[]>([]);
  const [customized, setCustomized] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<QuoteTemplateKey>("FDA");
  const [draft, setDraft] = useState<EditableTemplate | null>(null);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const isAdmin = role === "admin";

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.user?.role || ""))
      .catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(key: QuoteTemplateKey = activeKey) {
    setLoading(true);
    try {
      const res = await fetch("/api/quote-templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tải được bảng giá.");
      setTemplates(data.items || []);
      setCustomized(data.customized || []);
      const found = (data.items as QuoteTemplateDef[]).find((t) => t.key === key) || data.items?.[0];
      if (found) {
        setActiveKey(found.key);
        setDraft(toEditable(found));
      }
      if (data.warning) setErr(data.warning);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  const patch = (value: Partial<EditableTemplate>) => setDraft((prev) => (prev ? { ...prev, ...value } : prev));

  const patchItem = (index: number, value: Partial<QuoteTemplateItem>) =>
    setDraft((prev) => (prev ? { ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...value } : item)) } : prev));

  const patchOption = (index: number, value: Partial<QuoteOptionDef>) =>
    setDraft((prev) => (prev ? { ...prev, options: prev.options.map((o, i) => (i === index ? { ...o, ...value } : o)) } : prev));

  const preview = useMemo(() => {
    if (!draft) return null;
    const main = draft.items.map((i) => ({ ...i, note: i.note || "", optional: false }));
    return calcQuoteTotals(main, 0, draft.vat_rate);
  }, [draft]);

  async function save() {
    if (!draft) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quote-templates/${draft.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          scope: toLines(draft.scopeText),
          documents: toLines(draft.documentsText),
          terms: toLines(draft.termsText),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu bảng giá thất bại.");
      flash("Đã lưu bảng giá. Báo giá tạo mới sẽ dùng giá này.");
      await load(draft.key);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetDefault() {
    if (!draft) return;
    if (!confirm(`Trả “${draft.name}” về giá mặc định của hệ thống? Các chỉnh sửa giá sẽ bị xoá.`)) return;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quote-templates/${draft.key}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không khôi phục được giá mặc định.");
      flash("Đã trả về giá mặc định.");
      await load(draft.key);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải bảng giá…</div>;
  }

  if (!draft) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-card">
        <div className="font-bold text-rose-600">{err || "Không tải được bảng giá dịch vụ."}</div>
        <Link href="/dashboard/bao-gia" className="mt-3 inline-block text-sm font-bold text-teal-700">
          ← Về danh sách báo giá
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/dashboard/bao-gia" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Về danh sách báo giá
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Bảng giá dịch vụ</h1>
          <p className="mt-1 text-sm text-navy-900/55">
            Nơi duy nhất để chỉnh đơn giá dịch vụ. Sửa ở đây rồi lưu — mọi báo giá tạo mới sẽ dùng giá mới;
            báo giá đã lập vẫn giữ nguyên con số tại thời điểm lập.
          </p>
        </div>
        {!isAdmin && (
          <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
            Chỉ Admin được sửa bảng giá — bạn đang xem ở chế độ chỉ đọc.
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => load(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeKey === t.key ? "bg-navy-900 text-white" : "bg-white text-navy-900"}`}
          >
            {t.short_name}
            {customized.includes(t.key) && <span className="ml-2 text-[10px] font-bold text-emerald-500">● giá riêng</span>}
          </button>
        ))}
      </div>

      {toast && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{toast}</div>}
      {err && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{err}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Thông tin dịch vụ</div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-bold">
                Tên dịch vụ (in trên báo giá)
                <input
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Tên ngắn (nút lọc, menu)
                <input
                  value={draft.short_name}
                  onChange={(e) => patch({ short_name: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Mô tả ngắn
                <input
                  value={draft.tagline}
                  onChange={(e) => patch({ tagline: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Tiêu đề báo giá
                <input
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Hiệu lực mặc định (ngày)
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={draft.validity_days}
                  onChange={(e) => patch({ validity_days: Number(e.target.value) })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                VAT mặc định (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={draft.vat_rate}
                  onChange={(e) => patch({ vat_rate: Number(e.target.value) })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal disabled:bg-slate-50"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
                Hạng mục chính ({draft.items.length})
              </div>
              {isAdmin && (
                <button
                  onClick={() => patch({ items: [...draft.items, emptyItem()] })}
                  className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-2 text-[11px] font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm hạng mục chính
                </button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {draft.items.map((item, index) => (
                <div key={index} className="rounded-2xl border border-navy-900/10 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={item.name}
                        onChange={(e) => patchItem(index, { name: e.target.value })}
                        placeholder="Nội dung hạng mục in trên báo giá"
                        disabled={!isAdmin}
                        className="w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <input
                        value={item.note || ""}
                        onChange={(e) => patchItem(index, { note: e.target.value })}
                        placeholder="Ghi chú in kèm (không bắt buộc)"
                        disabled={!isAdmin}
                        className="w-full rounded-xl border border-navy-900/10 px-3 py-1.5 text-xs italic disabled:bg-slate-50"
                      />
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Đơn vị tính
                          <input
                            value={item.unit}
                            onChange={(e) => patchItem(index, { unit: e.target.value })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Số lượng gợi ý
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => patchItem(index, { qty: Number(e.target.value) })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Đơn giá (₫)
                          <input
                            type="number"
                            min={0}
                            step={100000}
                            value={item.unit_price}
                            onChange={(e) => patchItem(index, { unit_price: Number(e.target.value) })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex w-28 flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-[9px] font-bold uppercase tracking-wide text-navy-900/40">Thành tiền</div>
                        <div className="whitespace-nowrap text-sm font-extrabold text-navy-900">
                          {formatMoney(item.qty * item.unit_price)} ₫
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => patch({ items: draft.items.filter((_, i) => i !== index) })}
                          disabled={draft.items.length <= 1}
                          aria-label="Xóa hạng mục"
                          className="rounded-lg bg-red-50 p-2 text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
                Hạng mục tùy chọn ({draft.options.length})
              </div>
              {isAdmin && (
                <button
                  onClick={() => patch({ options: [...draft.options, emptyOption()] })}
                  className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-2 text-[11px] font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm hạng mục tùy chọn
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-navy-900/50">
              Hạng mục tùy chọn in kèm báo giá nhưng <b>không cộng vào tổng</b> — khách chọn thêm thì mới tính.
            </p>
            <div className="mt-3 space-y-3">
              {draft.options.map((option, index) => (
                <div key={index} className="rounded-2xl border border-dashed border-navy-900/15 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        value={option.label}
                        onChange={(e) => patchOption(index, { label: e.target.value })}
                        placeholder="Tên hạng mục tùy chọn"
                        disabled={!isAdmin}
                        className="w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Mã (a-z, 0-9, _)
                          <input
                            value={option.key}
                            onChange={(e) => patchOption(index, { key: e.target.value })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Nhóm
                          <input
                            value={option.group}
                            onChange={(e) => patchOption(index, { group: e.target.value })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-navy-900/60">
                          SL / Đơn vị
                          <div className="mt-1 flex gap-1">
                            <input
                              type="number"
                              min={1}
                              value={option.qty}
                              onChange={(e) => patchOption(index, { qty: Number(e.target.value) })}
                              disabled={!isAdmin}
                              className="w-16 rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                            />
                            <input
                              value={option.unit}
                              onChange={(e) => patchOption(index, { unit: e.target.value })}
                              disabled={!isAdmin}
                              className="min-w-0 flex-1 rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                            />
                          </div>
                        </label>
                        <label className="text-[10px] font-bold text-navy-900/60">
                          Đơn giá (₫)
                          <input
                            type="number"
                            min={0}
                            step={100000}
                            value={option.unit_price}
                            onChange={(e) => patchOption(index, { unit_price: Number(e.target.value) })}
                            disabled={!isAdmin}
                            className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal disabled:bg-slate-50"
                          />
                        </label>
                      </div>
                      <input
                        value={option.note}
                        onChange={(e) => patchOption(index, { note: e.target.value })}
                        placeholder="Ghi chú (VD: chưa gồm ngân sách quảng cáo)"
                        disabled={!isAdmin}
                        className="w-full rounded-xl border border-navy-900/10 px-3 py-1.5 text-xs italic disabled:bg-slate-50"
                      />
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => patch({ options: draft.options.filter((_, i) => i !== index) })}
                        aria-label="Xóa hạng mục tùy chọn"
                        className="rounded-lg bg-red-50 p-2 text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {draft.options.length === 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                  Dịch vụ này chưa có hạng mục tùy chọn.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
              Nội dung in kèm (mỗi dòng 1 mục)
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="block text-xs font-bold">
                Phạm vi công việc
                <textarea
                  rows={7}
                  value={draft.scopeText}
                  onChange={(e) => patch({ scopeText: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Hồ sơ khách cần cung cấp
                <textarea
                  rows={7}
                  value={draft.documentsText}
                  onChange={(e) => patch({ documentsText: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold">
                Điều khoản &amp; lưu ý
                <textarea
                  rows={7}
                  value={draft.termsText}
                  onChange={(e) => patch({ termsText: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold md:col-span-1">
                Tiến độ thực hiện
                <textarea
                  rows={3}
                  value={draft.timeline}
                  onChange={(e) => patch({ timeline: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold md:col-span-2">
                Điều khoản thanh toán
                <textarea
                  rows={3}
                  value={draft.payment_terms}
                  onChange={(e) => patch({ payment_terms: e.target.value })}
                  disabled={!isAdmin}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal disabled:bg-slate-50"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Tự tính theo giá đang sửa</div>
            <div className="mt-2 text-[11px] text-navy-900/55">{draft.title}</div>
            <div className="mt-3 space-y-1 text-[11px]">
              {draft.items.map((item, index) => (
                <div key={index} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-navy-900/70">{item.name || "(chưa đặt tên)"}</span>
                  <b className="whitespace-nowrap">{formatMoney(item.qty * item.unit_price)} ₫</b>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 rounded-2xl bg-navy-900/5 px-4 py-3 text-[11px]">
              <div className="flex justify-between"><span>Tạm tính</span><b>{formatMoney(preview?.subtotal || 0)} ₫</b></div>
              <div className="flex justify-between"><span>VAT {draft.vat_rate}%</span><b>{formatMoney(preview?.vat_amount || 0)} ₫</b></div>
              <div className="flex justify-between border-t border-navy-900/10 pt-1 text-sm">
                <b>Tổng 1 báo giá chuẩn</b><b className="text-teal-700">{formatMoney(preview?.total || 0)} ₫</b>
              </div>
              {draft.options.length > 0 && (
                <div className="pt-0.5 italic text-navy-900/55">
                  {draft.options.length} hạng mục tùy chọn — không cộng vào tổng.
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] italic text-navy-900/45">{QUOTE_PRICE_NOTE}</div>
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-500 py-3.5 text-sm font-extrabold text-navy-950 shadow-lift disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {busy ? "Đang lưu…" : "Lưu bảng giá"}
              </button>
              <button
                onClick={resetDefault}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs font-bold text-navy-900 shadow-sm disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Trả về giá mặc định
              </button>
              <div className="text-center text-[10px] text-navy-900/45">
                Báo giá đã lập trước đây không thay đổi theo bảng giá này.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
