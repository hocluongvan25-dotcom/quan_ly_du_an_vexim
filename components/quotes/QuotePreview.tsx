"use client";

import { formatMoney } from "@/lib/accounting";
import { moneyInWords } from "@/lib/money-words";
import { QUOTE_DEFAULTS, quoteRefDate, type QuoteView } from "@/lib/quotes";
import { QUOTE_STRENGTHS } from "@/lib/quote-templates";
import { COMPANY } from "@/lib/types";

/**
 * Bản xem trước báo giá — đúng nội dung sẽ in ra PDF.
 * Chỉ hiển thị dữ liệu đã lưu (không tự tính lại con số).
 */
export function QuotePreview({ quote }: { quote: QuoteView }) {
  const main = quote.items.filter((i) => !i.optional);
  const optional = quote.items.filter((i) => i.optional);
  const [year, month, day] = quote.issue_date.split("-");

  return (
    <div className="rounded-3xl bg-white p-6 shadow-card print:rounded-none print:p-0 print:shadow-none md:p-9">
      <div className="overflow-hidden rounded-2xl bg-navy-900 px-6 py-5 text-white print:rounded-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display text-xl font-extrabold tracking-tight">VEXIM GLOBAL</div>
            <div className="mt-0.5 text-[11px] font-semibold tracking-wide text-gold-400">
              Tận tâm · Nhanh chóng · Chính xác
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg font-extrabold">BÁO GIÁ DỊCH VỤ</div>
            <div className="mt-0.5 font-mono text-xs text-gold-400">Số: {quote.quote_no}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Đơn vị báo giá</div>
          <div className="mt-1 text-sm font-bold text-navy-900">{COMPANY.legal}</div>
          <div className="mt-1 text-xs leading-5 text-navy-900/70">
            Địa chỉ: {COMPANY.address}
            <br />
            Điện thoại: {COMPANY.phone} · Email: {COMPANY.email}
            <br />
            Website: {COMPANY.websiteLabel}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">Kính gửi quý khách hàng</div>
          <div className="mt-1 text-sm font-bold text-navy-900">{quote.company_name}</div>
          <div className="mt-1 text-xs leading-5 text-navy-900/70">
            {quote.company_address && <>Địa chỉ: {quote.company_address}<br /></>}
            {quote.company_tax_code && <>Mã số thuế: {quote.company_tax_code}<br /></>}
            {quote.contact_name && <>Người liên hệ: {quote.contact_name}{quote.contact_title ? ` — ${quote.contact_title}` : ""}<br /></>}
            {quote.contact_phone && <>Điện thoại: {quote.contact_phone}<br /></>}
            {quote.contact_email && <>Email: {quote.contact_email}</>}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-xs">
        <div>
          <div className="font-extrabold uppercase tracking-wider text-navy-900/45">Ngày báo giá</div>
          <div className="mt-0.5 font-bold text-navy-900">{quoteRefDate(quote.issue_date)}</div>
        </div>
        <div>
          <div className="font-extrabold uppercase tracking-wider text-navy-900/45">Hiệu lực đến</div>
          <div className="mt-0.5 font-bold text-navy-900">
            {quote.valid_until ? quoteRefDate(quote.valid_until) : "Theo bảng giá hiện hành"}
          </div>
        </div>
        <div>
          <div className="font-extrabold uppercase tracking-wider text-navy-900/45">Người lập</div>
          <div className="mt-0.5 font-bold text-navy-900">{quote.created_by_name || "Vexim Global"}</div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="font-display text-base font-extrabold text-navy-900">{quote.title}</div>
        <div className="mt-1 text-xs italic text-navy-900/55">Dịch vụ: {quote.service_name}</div>
      </div>

      <SectionTitle>Chi tiết báo giá</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-navy-900 text-white">
              <th className="w-10 px-2 py-2 text-center font-bold">STT</th>
              <th className="px-3 py-2 font-bold">Nội dung</th>
              <th className="w-16 px-2 py-2 text-center font-bold">ĐVT</th>
              <th className="w-12 px-2 py-2 text-center font-bold">SL</th>
              <th className="w-28 px-3 py-2 text-right font-bold">Đơn giá (₫)</th>
              <th className="w-32 px-3 py-2 text-right font-bold">Thành tiền (₫)</th>
            </tr>
          </thead>
          <tbody>
            {main.map((item, index) => (
              <tr key={`main-${index}`} className="border-b border-slate-100 odd:bg-[#fffcf6]">
                <td className="px-2 py-2 text-center">{index + 1}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-navy-900">{item.name}</div>
                  {item.note && <div className="mt-0.5 text-[11px] italic text-navy-900/50">{item.note}</div>}
                </td>
                <td className="px-2 py-2 text-center text-navy-900/70">{item.unit || "—"}</td>
                <td className="px-2 py-2 text-center">{item.qty}</td>
                <td className="px-3 py-2 text-right">{formatMoney(item.unit_price)}</td>
                <td className="px-3 py-2 text-right font-bold">{formatMoney(item.qty * item.unit_price)}</td>
              </tr>
            ))}
            {optional.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="bg-teal-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-navy-900/70">
                    Hạng mục tùy chọn — chưa tính vào tổng, áp dụng khi Quý khách chọn thêm
                  </td>
                </tr>
                {optional.map((item, index) => (
                  <tr key={`opt-${index}`} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-center text-navy-900/40">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-navy-900/80">{item.name}</div>
                      {item.note && <div className="mt-0.5 text-[11px] italic text-navy-900/50">{item.note}</div>}
                    </td>
                    <td className="px-2 py-2 text-center text-navy-900/60">{item.unit || "—"}</td>
                    <td className="px-2 py-2 text-center text-navy-900/60">{item.qty}</td>
                    <td className="px-3 py-2 text-right text-navy-900/60">{formatMoney(item.unit_price)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-navy-900/60">{formatMoney(item.qty * item.unit_price)}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-sm text-xs">
          <div className="flex justify-between px-2 py-1">
            <span className="text-navy-900/70">Tạm tính (chưa VAT)</span>
            <span className="font-bold">{formatMoney(quote.subtotal)}</span>
          </div>
          {quote.discount_amount > 0 && (
            <div className="flex justify-between px-2 py-1">
              <span className="text-navy-900/70">Chiết khấu {quote.discount_percent}%</span>
              <span className="font-bold">-{formatMoney(quote.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between px-2 py-1">
            <span className="text-navy-900/70">Thuế VAT {quote.vat_rate}%</span>
            <span className="font-bold">{formatMoney(quote.vat_amount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between rounded-xl bg-navy-900 px-3 py-2.5 text-white">
            <span className="font-extrabold">TỔNG CỘNG (đã gồm VAT)</span>
            <span className="font-display text-base font-extrabold text-gold-400">{formatMoney(quote.total)}</span>
          </div>
          <div className="mt-1 px-2 text-[11px] italic text-navy-900/55">
            Bằng chữ: {quote.total_in_words || moneyInWords(quote.total)}.
          </div>
          {quote.optional_total > 0 && (
            <div className="mt-0.5 px-2 text-[11px] italic text-navy-900/55">
              Hạng mục tùy chọn (nếu chọn thêm): {formatMoney(quote.optional_total)} ₫ (chưa gồm VAT).
            </div>
          )}
        </div>
      </div>

      {quote.scope.length > 0 && (
        <>
          <SectionTitle>Phạm vi công việc</SectionTitle>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-navy-900/80">
            {quote.scope.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        </>
      )}

      {quote.documents.length > 0 && (
        <>
          <SectionTitle>Hồ sơ Quý khách cần cung cấp</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-xs text-navy-900/80">
            {quote.documents.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {quote.timeline && (
        <>
          <SectionTitle>Tiến độ thực hiện</SectionTitle>
          <p className="whitespace-pre-line text-xs text-navy-900/80">{quote.timeline}</p>
        </>
      )}

      {quote.payment_terms && (
        <>
          <SectionTitle>Điều khoản thanh toán</SectionTitle>
          <p className="whitespace-pre-line text-xs text-navy-900/80">{quote.payment_terms}</p>
        </>
      )}

      {quote.terms.length > 0 && (
        <>
          <SectionTitle>Điều khoản &amp; lưu ý chung</SectionTitle>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-navy-900/80">
            {quote.terms.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
            {quote.valid_until && (
              <li>
                Báo giá có hiệu lực đến hết ngày {quoteRefDate(quote.valid_until)}. Sau thời hạn trên, Vexim Global xin
                phép gửi báo giá mới theo bảng giá hiện hành.
              </li>
            )}
          </ol>
        </>
      )}

      {quote.note && (
        <>
          <SectionTitle>Ghi chú</SectionTitle>
          <p className="whitespace-pre-line text-xs text-navy-900/80">{quote.note}</p>
        </>
      )}

      <div className="mt-8 text-right text-xs italic text-navy-900/60">
        {QUOTE_DEFAULTS.city}, ngày {day} tháng {month} năm {year}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <div className="font-extrabold text-navy-900">ĐẠI DIỆN KHÁCH HÀNG</div>
          <div className="mt-0.5 text-[11px] italic text-navy-900/50">(Ký, ghi rõ họ tên, đóng dấu nếu có)</div>
          <div className="mt-16 border-t border-dashed border-navy-900/20 pt-1 text-[11px] text-navy-900/40">Họ tên &amp; chức danh</div>
        </div>
        <div>
          <div className="font-extrabold text-navy-900">ĐẠI DIỆN VEXIM GLOBAL</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase text-navy-900/60">{QUOTE_DEFAULTS.signer_title}</div>
          <div className="mt-16 border-t border-dashed border-navy-900/20 pt-1 font-extrabold text-navy-900">
            {QUOTE_DEFAULTS.signer_name}
          </div>
        </div>
      </div>

      <SectionTitle>Vì sao chọn Vexim Global</SectionTitle>
      <ul className="list-disc space-y-1 pl-5 text-xs text-navy-900/80">
        {QUOTE_STRENGTHS.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <div className="mt-6 border-t border-slate-100 pt-3 text-[10px] leading-4 text-navy-900/45">
        {COMPANY.legal} · {COMPANY.address} · {COMPANY.phone} · {COMPANY.email} · {COMPANY.websiteLabel}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-center gap-2">
      <span className="h-3.5 w-1 rounded-full bg-teal-500" />
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-navy-900">{children}</span>
    </div>
  );
}
