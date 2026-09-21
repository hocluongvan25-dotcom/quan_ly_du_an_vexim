"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { calcQuoteTotals, quoteValidUntil, type QuoteView } from "@/lib/quotes";
import {
  QUOTE_TEMPLATES,
  getQuoteTemplate,
  type QuoteLine,
  type QuoteTemplateDef,
  type QuoteTemplateKey,
} from "@/lib/quote-templates";
import { formatMoney } from "@/lib/accounting";

type FormState = {
  template_key: QuoteTemplateKey;
  title: string;
  company_name: string;
  company_address: string;
  company_tax_code: string;
  contact_name: string;
  contact_title: string;
  contact_phone: string;
  contact_email: string;
  items: QuoteLine[];
  scopeText: string;
  documentsText: string;
  termsText: string;
  timeline: string;
  payment_terms: string;
  note: string;
  discount_percent: number;
  vat_rate: number;
  issue_date: string;
  valid_until: string;
};

const emptyLine = (): QuoteLine => ({ name: "", unit: "Gói", qty: 1, unit_price: 0, note: "", optional: false });

function toLines(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function QuoteForm({
  quote,
  templates = QUOTE_TEMPLATES,
  onSaved,
  onCancel,
}: {
  quote: QuoteView;
  /** Bảng giá hiện hành (DB đè giá mặc định) — do trang chi tiết truyền xuống */
  templates?: QuoteTemplateDef[];
  onSaved: (item: QuoteView) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    template_key: quote.template_key,
    title: quote.title,
    company_name: quote.company_name,
    company_address: quote.company_address,
    company_tax_code: quote.company_tax_code,
    contact_name: quote.contact_name,
    contact_title: quote.contact_title,
    contact_phone: quote.contact_phone,
    contact_email: quote.contact_email,
    items: quote.items.length ? quote.items : [emptyLine()],
    scopeText: quote.scope.join("\n"),
    documentsText: quote.documents.join("\n"),
    termsText: quote.terms.join("\n"),
    timeline: quote.timeline,
    payment_terms: quote.payment_terms,
    note: quote.note,
    discount_percent: quote.discount_percent,
    vat_rate: quote.vat_rate,
    issue_date: quote.issue_date,
    valid_until: quote.valid_until,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const patchLine = (index: number, patch: Partial<QuoteLine>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));

  const totals = calcQuoteTotals(form.items, form.discount_percent, form.vat_rate);

  /** Đổi mẫu dịch vụ → nạp lại hạng mục/phạm vi/điều khoản chuẩn của mẫu đó. */
  function applyTemplate(key: QuoteTemplateKey, keepItems = false) {
    const template = templates.find((t) => t.key === key) || getQuoteTemplate(key);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      template_key: key,
      title: template.title,
      items: keepItems ? prev.items : template.items.map((item) => ({ ...item, note: item.note || "", optional: false })),
      scopeText: template.scope.join("\n"),
      documentsText: template.documents.join("\n"),
      termsText: template.terms.join("\n"),
      timeline: template.timeline,
      payment_terms: template.payment_terms,
      vat_rate: template.vat_rate,
    }));
  }

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scope: toLines(form.scopeText),
          documents: toLines(form.documentsText),
          terms: toLines(form.termsText),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lưu báo giá thất bại.");
      onSaved(data.item as QuoteView);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-display text-lg font-extrabold text-navy-900">Sửa báo giá {quote.quote_no}</div>
          <button onClick={onCancel} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-navy-900">
            Hủy
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-bold">
            Dịch vụ (nạp lại hạng mục chuẩn của mẫu)
            <select
              value={form.template_key}
              onChange={(e) => applyTemplate(e.target.value as QuoteTemplateKey)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Tiêu đề báo giá
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Tên công ty khách hàng *
            <input
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Địa chỉ khách hàng
            <input
              value={form.company_address}
              onChange={(e) => set("company_address", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Mã số thuế
            <input
              value={form.company_tax_code}
              onChange={(e) => set("company_tax_code", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Email nhận báo giá
            <input
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Người liên hệ
            <input
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Chức danh người liên hệ
            <input
              value={form.contact_title}
              onChange={(e) => set("contact_title", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            Số điện thoại
            <input
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold">
              Ngày báo giá
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  issue_date: e.target.value,
                  valid_until: quoteValidUntil(e.target.value, 15),
                }))}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Hiệu lực đến
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) => set("valid_until", e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
            Hạng mục &amp; đơn giá
          </div>
          <button
            onClick={() => applyTemplate(form.template_key)}
            className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-bold text-navy-900"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Nạp lại giá chuẩn của mẫu
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {form.items.map((line, index) => (
            <div key={index} className="rounded-2xl border border-navy-900/10 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    value={line.name}
                    onChange={(e) => patchLine(index, { name: e.target.value })}
                    placeholder="Nội dung hạng mục"
                    className="w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                  />
                  <input
                    value={line.note}
                    onChange={(e) => patchLine(index, { note: e.target.value })}
                    placeholder="Ghi chú (không bắt buộc)"
                    className="w-full rounded-xl border border-navy-900/10 px-3 py-1.5 text-xs italic"
                  />
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <label className="text-[10px] font-bold text-navy-900/60">
                      Đơn vị tính
                      <input
                        value={line.unit}
                        onChange={(e) => patchLine(index, { unit: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal"
                      />
                    </label>
                    <label className="text-[10px] font-bold text-navy-900/60">
                      Số lượng
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => patchLine(index, { qty: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal"
                      />
                    </label>
                    <label className="col-span-2 text-[10px] font-bold text-navy-900/60">
                      Đơn giá (₫)
                      <input
                        type="number"
                        min={0}
                        step={100000}
                        value={line.unit_price}
                        onChange={(e) => patchLine(index, { unit_price: Number(e.target.value) })}
                        className="mt-1 w-full rounded-lg border border-navy-900/10 px-2 py-1.5 text-xs font-normal"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="whitespace-nowrap text-xs font-bold text-navy-900">
                    {formatMoney((line.qty || 0) * (line.unit_price || 0))} ₫
                  </div>
                  <label className="flex items-center gap-1 text-[10px] font-bold text-navy-900/60">
                    <input
                      type="checkbox"
                      checked={line.optional}
                      onChange={(e) => patchLine(index, { optional: e.target.checked })}
                    />
                    Tùy chọn
                  </label>
                  <button
                    onClick={() => set("items", form.items.filter((_, i) => i !== index))}
                    disabled={form.items.length <= 1}
                    aria-label="Xóa hạng mục"
                    className="rounded-lg bg-red-50 p-2 text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => set("items", [...form.items, emptyLine()])}
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-2 text-[11px] font-bold text-white"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm hạng mục
        </button>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block text-xs font-bold">
            Chiết khấu (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.discount_percent}
              onChange={(e) => set("discount_percent", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-bold">
            VAT (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.vat_rate}
              onChange={(e) => set("vat_rate", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
            />
          </label>
          <div className="rounded-xl bg-teal-50 px-4 py-3 text-xs">
            <div className="flex justify-between"><span>Tạm tính</span><b>{formatMoney(totals.subtotal)} ₫</b></div>
            {totals.discount_amount > 0 && (
              <div className="flex justify-between text-navy-900/70">
                <span>Chiết khấu</span><b>-{formatMoney(totals.discount_amount)} ₫</b>
              </div>
            )}
            <div className="flex justify-between"><span>VAT</span><b>{formatMoney(totals.vat_amount)} ₫</b></div>
            <div className="mt-1 flex justify-between border-t border-navy-900/10 pt-1 text-sm">
              <b>Tổng cộng</b><b className="text-teal-700">{formatMoney(totals.total)} ₫</b>
            </div>
            {totals.optional_total > 0 && (
              <div className="mt-1 text-[10px] italic text-navy-900/60">
                Tùy chọn cộng thêm: {formatMoney(totals.optional_total)} ₫
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block text-xs font-bold md:col-span-1">
            Phạm vi công việc (mỗi dòng 1 mục)
            <textarea
              rows={7}
              value={form.scopeText}
              onChange={(e) => set("scopeText", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
            />
          </label>
          <label className="block text-xs font-bold md:col-span-1">
            Hồ sơ khách cần cung cấp (mỗi dòng 1 mục)
            <textarea
              rows={7}
              value={form.documentsText}
              onChange={(e) => set("documentsText", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
            />
          </label>
          <label className="block text-xs font-bold md:col-span-1">
            Điều khoản &amp; lưu ý (mỗi dòng 1 mục)
            <textarea
              rows={7}
              value={form.termsText}
              onChange={(e) => set("termsText", e.target.value)}
              className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
            />
          </label>
          <div className="space-y-3 md:col-span-1">
            <label className="block text-xs font-bold">
              Tiến độ thực hiện
              <textarea
                rows={2}
                value={form.timeline}
                onChange={(e) => set("timeline", e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Điều khoản thanh toán
              <textarea
                rows={2}
                value={form.payment_terms}
                onChange={(e) => set("payment_terms", e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
              />
            </label>
            <label className="block text-xs font-bold">
              Ghi chú thêm
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2 text-xs font-normal"
              />
            </label>
          </div>
        </div>
      </div>

      {err && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">{err}</div>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={submit}
          disabled={busy || !form.company_name.trim()}
          className="rounded-xl bg-teal-500 px-5 py-3 text-sm font-extrabold text-navy-950 disabled:opacity-50"
        >
          {busy ? "Đang lưu…" : "Lưu báo giá"}
        </button>
        <button onClick={onCancel} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-navy-900 shadow-sm">
          Hủy
        </button>
      </div>
    </div>
  );
}
