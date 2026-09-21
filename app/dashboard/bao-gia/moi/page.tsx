"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/accounting";
import { calcQuoteTotals, quoteValidUntil } from "@/lib/quotes";
import { QUOTE_TEMPLATES, getQuoteTemplate, templateItems, type QuoteTemplateKey } from "@/lib/quote-templates";
import { todayLocalIso } from "@/lib/utils";

function NewQuoteInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const preset = sp.get("template");
  const presetKey = QUOTE_TEMPLATES.find((t) => t.key === preset)?.key;
  const [templateKey, setTemplateKey] = useState<QuoteTemplateKey>(presetKey || "FDA");
  const template = getQuoteTemplate(templateKey)!;

  const [company, setCompany] = useState(sp.get("company") || "");
  const [address, setAddress] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [contact, setContact] = useState(sp.get("name") || "");
  const [contactTitle, setContactTitle] = useState("");
  const [phone, setPhone] = useState(sp.get("phone") || "");
  const [email, setEmail] = useState(sp.get("email") || "");
  const [issueDate, setIssueDate] = useState(todayLocalIso());
  const [validDays, setValidDays] = useState(15);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(template.vat_rate);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const items = useMemo(() => {
    const base = templateItems(templateKey);
    const options = template.options
      .filter((option) => selectedOptions.includes(option.key))
      .map((option) => ({
        name: option.label,
        unit: option.unit,
        qty: option.qty,
        unit_price: option.unit_price,
        note: option.note,
        optional: true,
      }));
    return [...base, ...options];
  }, [templateKey, template, selectedOptions]);

  const totals = calcQuoteTotals(items, discount, vatRate);
  const validUntil = quoteValidUntil(issueDate, validDays);

  const onTemplateChange = (key: QuoteTemplateKey) => {
    const next = getQuoteTemplate(key);
    setTemplateKey(key);
    setSelectedOptions([]);
    if (next) setVatRate(next.vat_rate);
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: templateKey,
          company_name: company,
          company_address: address,
          company_tax_code: taxCode,
          contact_name: contact,
          contact_title: contactTitle,
          contact_phone: phone,
          contact_email: email,
          items,
          discount_percent: discount,
          vat_rate: vatRate,
          issue_date: issueDate,
          valid_until: validUntil,
          opportunity_id: sp.get("opportunity") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tạo báo giá thất bại.");
      router.push(`/dashboard/bao-gia/${data.id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div>
      <Link href="/dashboard/bao-gia" className="inline-flex items-center gap-1 text-sm font-bold text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Về danh sách báo giá
      </Link>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-navy-900">Tạo báo giá</h1>
      <p className="mt-1 text-sm text-navy-900/55">
        Chọn dịch vụ — hệ thống điền sẵn hạng mục, đơn giá, phạm vi công việc và điều khoản. Sau đó chỉ cần nhập
        thông tin khách hàng.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">1. Dịch vụ</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {QUOTE_TEMPLATES.map((t) => {
                const active = t.key === templateKey;
                const from = Math.min(...t.items.map((i) => i.qty * i.unit_price));
                return (
                  <button
                    key={t.key}
                    onClick={() => onTemplateChange(t.key)}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      active ? "border-teal-500 bg-teal-50" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-extrabold text-navy-900">{t.name}</span>
                      {active && <Check className="h-4 w-4 text-teal-700" />}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-navy-900/55">{t.tagline}</div>
                    <div className="mt-2 text-[11px] text-navy-900/45">
                      {t.items.length} hạng mục chính · từ {formatMoney(from)} ₫
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
              2. Thông tin khách hàng
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-bold md:col-span-2">
                Tên công ty khách hàng *
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="VD: CÔNG TY TNHH THỰC PHẨM ABC"
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold md:col-span-2">
                Địa chỉ
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Mã số thuế
                <input
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Người liên hệ
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Chức danh người liên hệ
                <input
                  value={contactTitle}
                  onChange={(e) => setContactTitle(e.target.value)}
                  placeholder="VD: Giám đốc / Trưởng phòng XNK"
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Số điện thoại
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold md:col-span-2">
                Email nhận báo giá
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
            </div>

            <div className="mt-5 text-xs font-extrabold uppercase tracking-wider text-navy-900/60">3. Điều kiện báo giá</div>
            <div className="mt-3 grid gap-4 md:grid-cols-4">
              <label className="block text-xs font-bold">
                Ngày báo giá
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-bold">
                Hiệu lực (ngày)
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
                <span className="mt-1 block text-[10px] font-normal text-navy-900/45">
                  Đến {validUntil.split("-").reverse().join("/")}
                </span>
              </label>
              <label className="block text-xs font-bold">
                Chiết khấu (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
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
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl bg-teal-50 p-4">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-navy-900/60">
                <Sparkles className="h-3.5 w-3.5" /> Hạng mục tùy chọn (tick để đưa vào báo giá, khách chọn sau)
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {template.options.map((option) => {
                  const checked = selectedOptions.includes(option.key);
                  return (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-[11px] ${
                        checked ? "border-teal-500 bg-white" : "border-transparent bg-white/70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelectedOptions((prev) =>
                            e.target.checked ? [...prev, option.key] : prev.filter((k) => k !== option.key)
                          )
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <b className="text-navy-900">{option.label}</b>
                        <span className="mt-0.5 block text-navy-900/50">
                          {formatMoney(option.qty * option.unit_price)} ₫ · {option.group}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Xem nhanh báo giá</div>
            <div className="mt-2 text-sm font-bold text-navy-900">{template.title}</div>
            <div className="mt-3 space-y-2">
              {items.filter((i) => !i.optional).map((item, index) => (
                <div key={`m-${index}`} className="text-[11px]">
                  <div className="font-semibold text-navy-900">{item.name}</div>
                  <div className="text-navy-900/50">
                    {item.qty} {item.unit} × {formatMoney(item.unit_price)} ₫ ={" "}
                    <b>{formatMoney(item.qty * item.unit_price)} ₫</b>
                  </div>
                </div>
              ))}
              {items.some((i) => i.optional) && (
                <div className="border-t border-dashed border-navy-900/10 pt-2 text-[11px]">
                  <div className="font-bold text-navy-900/60">Tùy chọn (chưa tính vào tổng):</div>
                  {items.filter((i) => i.optional).map((item, index) => (
                    <div key={`o-${index}`} className="text-navy-900/50">
                      {item.name} — {formatMoney(item.qty * item.unit_price)} ₫
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 space-y-1 rounded-2xl bg-navy-900/5 px-4 py-3 text-[11px]">
              <div className="flex justify-between"><span>Tạm tính</span><b>{formatMoney(totals.subtotal)} ₫</b></div>
              {totals.discount_amount > 0 && (
                <div className="flex justify-between"><span>Chiết khấu {discount}%</span><b>-{formatMoney(totals.discount_amount)} ₫</b></div>
              )}
              <div className="flex justify-between"><span>VAT {vatRate}%</span><b>{formatMoney(totals.vat_amount)} ₫</b></div>
              <div className="flex justify-between border-t border-navy-900/10 pt-1 text-sm">
                <b>Tổng cộng</b><b className="text-teal-700">{formatMoney(totals.total)} ₫</b>
              </div>
            </div>
            <div className="mt-3 text-[10px] italic text-navy-900/50">
              Giá theo mẫu chuẩn của Vexim Global. Sau khi tạo, có thể vào chi tiết để chỉnh đơn giá từng hạng mục.
            </div>
          </div>

          {err && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{err}</div>}

          <button
            onClick={submit}
            disabled={busy || !company.trim()}
            className="w-full rounded-2xl bg-teal-500 py-3.5 text-sm font-extrabold text-navy-950 shadow-lift disabled:opacity-50"
          >
            {busy ? "Đang tạo…" : "Tạo báo giá & xem bản in"}
          </button>
          <div className="text-center text-[10px] text-navy-900/45">
            Báo giá được lưu ở trạng thái <b>Nháp</b> — chỉ chuyển “Đã gửi khách” khi bạn thực sự gửi.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-card">Đang tải…</div>}>
      <NewQuoteInner />
    </Suspense>
  );
}
