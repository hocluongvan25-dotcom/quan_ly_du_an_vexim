"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/accounting";
import { moneyInWords } from "@/lib/money-words";
import { calcQuoteTotals, quoteValidUntil } from "@/lib/quotes";
import {
  QUOTE_TEMPLATES,
  getQuoteTemplate,
  itemsFromTemplate,
  optionLine,
  type QuoteLine,
  type QuoteTemplateDef,
  type QuoteTemplateKey,
} from "@/lib/quote-templates";
import { todayLocalIso } from "@/lib/utils";

/** Dòng hạng mục trên form: thêm `option_key` để biết dòng nào do tùy chọn mà có. */
type EditLine = QuoteLine & { option_key?: string };

/** Doanh nghiệp trong danh mục — dùng để tự điền thông tin khách hàng ở bước 2. */
type CompanyOption = {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  tax_code: string;
  address: string;
  contact_person: string;
};

const emptyLine = (): EditLine => ({ name: "", unit: "Gói", qty: 1, unit_price: 0, note: "", optional: false });

const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function NewQuoteInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const preset = sp.get("template");
  const [templates, setTemplates] = useState<QuoteTemplateDef[]>(QUOTE_TEMPLATES);
  const [priceNote, setPriceNote] = useState("");
  const [customized, setCustomized] = useState<string[]>([]);
  const [templateKey, setTemplateKey] = useState<QuoteTemplateKey>(
    QUOTE_TEMPLATES.find((t) => t.key === preset)?.key || "FDA"
  );
  const [items, setItems] = useState<EditLine[]>(() => itemsFromTemplate(getQuoteTemplate("FDA")!) as EditLine[]);
  const [step, setStep] = useState(1);

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
  const [vatRate, setVatRate] = useState(8);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Danh mục doanh nghiệp để tự mapping thông tin khách hàng.
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [pickedCompany, setPickedCompany] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const companyBox = useRef<HTMLDivElement | null>(null);

  // Bảng giá do Admin chỉnh trong hệ thống (DB) đè giá mặc định.
  useEffect(() => {
    fetch("/api/quote-templates")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items) && d.items.length) {
          setTemplates(d.items);
          setCustomized(d.customized || []);
          setPriceNote(d.price_note || "");
          const current = d.items.find((t: QuoteTemplateDef) => t.key === templateKey);
          if (current) {
            setItems(itemsFromTemplate(current) as EditLine[]);
            setVatRate(current.vat_rate);
            setValidDays(current.validity_days);
          }
        }
      })
      .catch(() => {});

    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        const list: CompanyOption[] = (d.companies || d.items || []).map((c: CompanyOption) => ({
          id: c.id,
          company_name: c.company_name,
          email: c.email || "",
          phone: c.phone || "",
          tax_code: c.tax_code || "",
          address: c.address || "",
          contact_person: c.contact_person || "",
        }));
        setCompanies(list);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đóng gợi ý khi bấm ra ngoài
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (companyBox.current && !companyBox.current.contains(event.target as Node)) setShowSuggest(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const template = useMemo(
    () => templates.find((t) => t.key === templateKey) || QUOTE_TEMPLATES[0],
    [templates, templateKey]
  );

  const totals = calcQuoteTotals(items, discount, vatRate);
  const validUntil = quoteValidUntil(issueDate, validDays);
  const mainItems = items.filter((i) => !i.optional);

  /** Điền thông tin khách hàng từ danh mục doanh nghiệp (chỉ điền ô đang trống hoặc do lần chọn trước). */
  function applyCompany(record: CompanyOption, force = false) {
    const fill = (current: string, next: string, previous: string) =>
      next && (force || !current.trim() || current === previous) ? next : current;
    const previous = companies.find((c) => normalized(c.company_name) === normalized(pickedCompany));
    setCompany(record.company_name);
    setAddress((v) => fill(v, record.address, previous?.address || "") as string);
    setTaxCode((v) => fill(v, record.tax_code, previous?.tax_code || "") as string);
    setContact((v) => fill(v, record.contact_person, previous?.contact_person || "") as string);
    setEmail((v) => fill(v, record.email, previous?.email || "") as string);
    setPhone((v) => fill(v, record.phone, previous?.phone || "") as string);
    setPickedCompany(record.company_name);
    setShowSuggest(false);
  }

  /** Gõ đúng tên công ty đã có trong danh mục → tự mapping. */
  function onCompanyChange(value: string) {
    setCompany(value);
    setShowSuggest(true);
    const match = companies.find((c) => normalized(c.company_name) === normalized(value));
    if (match) applyCompany(match);
    else setPickedCompany("");
  }

  const suggestions = useMemo(() => {
    const key = normalized(company);
    const list = key
      ? companies.filter((c) => normalized(c.company_name).includes(key))
      : companies;
    return list.slice(0, 6);
  }, [company, companies]);

  const mappedFromCatalogue = companies.some(
    (c) => normalized(c.company_name) === normalized(company) && normalized(pickedCompany) === normalized(company)
  );

  function applyTemplate(key: QuoteTemplateKey, keepItems = false) {
    const next = templates.find((t) => t.key === key);
    setTemplateKey(key);
    if (!next) return;
    if (!keepItems) setItems(itemsFromTemplate(next) as EditLine[]);
    setVatRate(next.vat_rate);
    setValidDays(next.validity_days);
  }

  const patchLine = (index: number, patch: Partial<EditLine>) =>
    setItems((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const addLine = () => setItems((prev) => [...prev, emptyLine()]);

  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const toggleOption = (optionKey: string) => {
    setItems((prev) => {
      const existing = prev.findIndex((line) => line.option_key === optionKey);
      if (existing >= 0) return prev.filter((_, i) => i !== existing);
      const option = template.options.find((o) => o.key === optionKey);
      return option ? [...prev, { ...optionLine(option), option_key: option.key }] : prev;
    });
  };

  /** Chuyển bước; chặn khi hạng mục chưa hợp lệ. */
  function goToStep2() {
    setErr("");
    if (mainItems.length === 0) {
      setErr("Báo giá cần ít nhất 01 hạng mục chính (không phải tùy chọn) trước khi sang bước 2.");
      return;
    }
    if (items.some((line) => !line.name.trim())) {
      setErr("Còn hạng mục chưa có nội dung — điền tên hạng mục hoặc xóa dòng đó.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const submit = async () => {
    setErr("");
    if (mainItems.length === 0) {
      setErr("Báo giá cần ít nhất 01 hạng mục chính (không phải tùy chọn).");
      setStep(1);
      return;
    }
    if (!company.trim()) {
      setErr("Nhập tên công ty khách hàng trước khi tạo báo giá.");
      return;
    }
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
          // Hạng mục & đơn giá do nhân viên chỉnh — server vẫn tính lại toàn bộ tiền.
          items: items.map(({ option_key, ...line }) => line),
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
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy-900">Tạo báo giá</h1>
          <p className="mt-1 text-sm text-navy-900/55">
            Chọn dịch vụ → hệ thống điền sẵn hạng mục, đơn giá, điều khoản. Sửa số lượng/đơn giá tuỳ ý —
            <b> thành tiền, VAT và tổng cộng tự tính lại ngay</b>.
          </p>
        </div>
        <Link
          href="/dashboard/bao-gia/bang-gia"
          className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-navy-900 shadow-sm"
        >
          ⚙️ Bảng giá dịch vụ
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
        {[1, 2].map((n) => (
          <button
            key={n}
            onClick={() => (n === 1 ? setStep(1) : goToStep2())}
            className={`rounded-full px-3 py-1.5 ${step === n ? "bg-navy-900 text-white" : "bg-white text-navy-900/60"}`}
          >
            {n === 1 ? "1. Hạng mục & đơn giá" : "2. Thông tin khách hàng & điều kiện"}
          </button>
        ))}
        {priceNote && <span className="ml-1 font-normal text-navy-900/45">{priceNote}</span>}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {/* ------------------ Bước 1: dịch vụ + hạng mục ------------------ */}
          {step === 1 && (
            <div className="rounded-3xl bg-white p-6 shadow-card">
              <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Dịch vụ</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {templates.map((t) => {
                  const active = t.key === templateKey;
                  const from = Math.min(...t.items.map((i) => i.qty * i.unit_price));
                  return (
                    <button
                      key={t.key}
                      onClick={() => applyTemplate(t.key)}
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        active ? "border-teal-500 bg-teal-50" : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-extrabold text-navy-900">{t.name}</span>
                        {active && <Check className="h-4 w-4 text-teal-700" />}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-navy-900/55">{t.tagline}</div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-navy-900/45">
                        {t.items.length} hạng mục chính · từ {formatMoney(from)} ₫
                        {customized.includes(t.key) && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">
                            giá riêng
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
                  Hạng mục báo giá — sửa số lượng &amp; đơn giá
                </div>
                <button
                  onClick={() => applyTemplate(templateKey)}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-2 text-[11px] font-bold text-navy-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Nạp lại giá chuẩn của mẫu
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {items.map((line, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl border p-3 ${line.optional ? "border-dashed border-navy-900/20 bg-[#fffdf7]" : "border-navy-900/10"}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-navy-900/5 px-1.5 py-0.5 text-[10px] font-extrabold text-navy-900/60">
                            {index + 1}
                          </span>
                          {line.optional && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Tùy chọn — không cộng vào tổng
                            </span>
                          )}
                        </div>
                        <input
                          value={line.name}
                          onChange={(e) => patchLine(index, { name: e.target.value })}
                          placeholder="Nội dung hạng mục (VD: Bổ sung 01 nhóm sản phẩm)"
                          className="w-full rounded-xl border border-navy-900/10 px-3 py-2 text-sm"
                        />
                        <input
                          value={line.note}
                          onChange={(e) => patchLine(index, { note: e.target.value })}
                          placeholder="Ghi chú in kèm (không bắt buộc)"
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
                      <div className="flex w-32 flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wide text-navy-900/40">Thành tiền</div>
                          <div className="whitespace-nowrap text-sm font-extrabold text-navy-900">
                            {formatMoney(Math.max(0, (line.qty || 0) * (line.unit_price || 0)))} ₫
                          </div>
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
                          onClick={() => removeLine(index)}
                          disabled={items.length <= 1}
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
                onClick={addLine}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-2 text-[11px] font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm hạng mục khác
              </button>

              {template.options.length > 0 && (
                <div className="mt-4 rounded-2xl bg-teal-50 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-navy-900/60">
                    <Sparkles className="h-3.5 w-3.5" /> Hạng mục tùy chọn của dịch vụ (tick để in kèm báo giá)
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {template.options.map((option) => {
                      const checked = items.some((line) => line.option_key === option.key);
                      return (
                        <label
                          key={option.key}
                          className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-[11px] ${
                            checked ? "border-teal-500 bg-white" : "border-transparent bg-white/70"
                          }`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleOption(option.key)} className="mt-0.5" />
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
              )}

              {/* Nút sang bước 2 ở ngay dưới danh sách hạng mục */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-navy-900/5 pt-4">
                <div className="text-[11px] text-navy-900/50">
                  {mainItems.length} hạng mục chính · tạm tính{" "}
                  <b className="text-navy-900">{formatMoney(totals.subtotal)} ₫</b>
                </div>
                <button
                  onClick={goToStep2}
                  className="inline-flex items-center gap-2 rounded-2xl bg-navy-900 px-5 py-3 text-sm font-extrabold text-white shadow-lift"
                >
                  Tiếp tục: thông tin khách hàng <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ------------- Bước 2: khách hàng + điều kiện ------------- */}
          {step === 2 && (
            <>
              <div className="rounded-3xl bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">
                    Thông tin khách hàng
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-navy-900/45">
                    <Building2 className="h-3.5 w-3.5" />
                    Gõ tên công ty có trong danh mục doanh nghiệp → tự điền địa chỉ, MST, người liên hệ, email, SĐT
                  </div>
                </div>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="relative block text-xs font-bold md:col-span-2" ref={companyBox}>
                    Tên công ty khách hàng *
                    <input
                      value={company}
                      onChange={(e) => onCompanyChange(e.target.value)}
                      onFocus={() => setShowSuggest(true)}
                      placeholder="VD: CÔNG TY TNHH THỰC PHẨM ABC"
                      autoComplete="off"
                      className="mt-1 w-full rounded-xl border border-navy-900/10 px-3 py-2.5 text-sm font-normal"
                    />
                    {mappedFromCatalogue && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Check className="h-3 w-3" /> Đã lấy dữ liệu từ danh mục doanh nghiệp
                      </span>
                    )}
                    {showSuggest && suggestions.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-navy-900/10 bg-white py-1 shadow-lift">
                        {suggestions.map((c) => (
                          <button
                            key={c.id ?? c.company_name}
                            onClick={() => applyCompany(c, true)}
                            className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs font-normal hover:bg-teal-50"
                          >
                            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-900/35" />
                            <span>
                              <b className="text-navy-900">{c.company_name}</b>
                              {(c.tax_code || c.address || c.phone) && (
                                <span className="mt-0.5 block text-[10px] text-navy-900/50">
                                  {[c.tax_code && `MST ${c.tax_code}`, c.phone, c.address].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
              </div>

              {/* Điều kiện báo giá — gộp chung bước 2 cho gọn */}
              <div className="rounded-3xl bg-white p-6 shadow-card">
                <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Điều kiện báo giá</div>
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
                <div className="mt-4 rounded-2xl bg-navy-900/5 px-4 py-3 text-xs">
                  <div className="font-bold text-navy-900">Kiểm tra nhanh trước khi tạo</div>
                  <ul className="mt-1 space-y-0.5 text-navy-900/70">
                    <li>• Dịch vụ: {template.name}</li>
                    <li>• {mainItems.length} hạng mục chính · {items.length - mainItems.length} hạng mục tùy chọn</li>
                    <li>• Khách hàng: {company.trim() ? company : <b className="text-red-600">chưa nhập tên công ty</b>}</li>
                    <li>• Tổng cộng: <b>{formatMoney(totals.total)} ₫</b> (đã gồm VAT {vatRate}%)</li>
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-navy-900/5 pt-4">
                  <button
                    onClick={() => {
                      setErr("");
                      setStep(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-navy-900 shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4" /> Quay lại bước 1
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy || !company.trim() || mainItems.length === 0}
                    className="rounded-2xl bg-teal-500 px-6 py-3 text-sm font-extrabold text-navy-950 shadow-lift disabled:opacity-50"
                  >
                    {busy ? "Đang tạo…" : "Tạo báo giá & xem bản in"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ------------------ Tổng kết tự tính ------------------ */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="text-xs font-extrabold uppercase tracking-wider text-navy-900/60">Tổng kết tự tính</div>
            <div className="mt-2 text-sm font-bold text-navy-900">{template.title}</div>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {items.map((line, index) => (
                <div key={index} className="text-[11px]">
                  <div className="font-semibold text-navy-900">
                    {line.optional && <span className="text-amber-700">[Tùy chọn] </span>}
                    {line.name || "(chưa đặt tên)"}
                  </div>
                  <div className="text-navy-900/50">
                    {line.qty} {line.unit || "đơn vị"} × {formatMoney(line.unit_price)} ₫ ={" "}
                    <b className={line.optional ? "text-navy-900/50" : "text-navy-900"}>
                      {formatMoney(Math.max(0, (line.qty || 0) * (line.unit_price || 0)))} ₫
                    </b>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1 rounded-2xl bg-navy-900/5 px-4 py-3 text-[11px]">
              <div className="flex justify-between"><span>Tạm tính (hạng mục chính)</span><b>{formatMoney(totals.subtotal)} ₫</b></div>
              {totals.discount_amount > 0 && (
                <div className="flex justify-between"><span>Chiết khấu {discount}%</span><b>-{formatMoney(totals.discount_amount)} ₫</b></div>
              )}
              <div className="flex justify-between"><span>VAT {vatRate}%</span><b>{formatMoney(totals.vat_amount)} ₫</b></div>
              <div className="flex justify-between border-t border-navy-900/10 pt-1 text-sm">
                <b>TỔNG CỘNG</b><b className="text-teal-700">{formatMoney(totals.total)} ₫</b>
              </div>
              <div className="pt-0.5 italic text-navy-900/55">Bằng chữ: {moneyInWords(totals.total)}</div>
              {totals.optional_total > 0 && (
                <div className="italic text-navy-900/55">
                  Tùy chọn cộng thêm (khách chọn): {formatMoney(totals.optional_total)} ₫
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-navy-900/45">
              Số tiền được tính lại ở server khi lưu — client không thể gửi sai tổng.
            </div>
          </div>

          {err && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{err}</div>}

          {step === 1 ? (
            <button
              onClick={goToStep2}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3.5 text-sm font-extrabold text-white shadow-lift"
            >
              Tiếp tục: thông tin khách hàng <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={busy || !company.trim() || mainItems.length === 0}
              className="w-full rounded-2xl bg-teal-500 py-3.5 text-sm font-extrabold text-navy-950 shadow-lift disabled:opacity-50"
            >
              {busy ? "Đang tạo…" : "Tạo báo giá & xem bản in"}
            </button>
          )}
          <div className="text-center text-[10px] text-navy-900/45">
            Báo giá lưu ở trạng thái <b>Nháp</b> — chuyển “Đã gửi khách” khi bạn thực sự gửi.
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
