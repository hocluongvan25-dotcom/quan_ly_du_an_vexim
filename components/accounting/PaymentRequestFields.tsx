"use client";

import { PAYMENT_REQUEST_DEFAULTS, REQUEST_TEXT_FIELDS, type PaymentRequest } from "@/lib/payment-request";

export default function PaymentRequestFields({ value, onChange, defaults, locked = false }: {
  value: PaymentRequest | null;
  onChange: (value: PaymentRequest | null) => void;
  defaults?: Partial<PaymentRequest>;
  locked?: boolean;
}) {
  return <fieldset className="mt-4 min-w-0 rounded-xl border border-navy-900/15 bg-white p-4">
    <legend className="px-1 text-sm font-extrabold text-navy-900">Giấy đề nghị thanh toán</legend>
    <label className="flex items-center gap-2 text-sm font-bold">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked ? { ...PAYMENT_REQUEST_DEFAULTS, ...defaults } : null)} />
      Lập giấy đề nghị thanh toán kèm hóa đơn
    </label>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Ngày văn bản và đợt thanh toán lấy từ ngày xuất, đợt thu của hóa đơn. Thông tin được lưu riêng cho từng hóa đơn. Kiểm tra điều khoản hợp đồng, chủ tài khoản và tài khoản nhận tiền trước khi gửi khách. Đây không phải hóa đơn điện tử thuế.</p>
    {value && <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
      <label className="min-w-0 text-xs font-bold">Ngày ký hợp đồng *
        <input type="date" value={value.contract_date} onChange={e => onChange({ ...value, contract_date: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border p-2 font-normal" />
      </label>
      <label className="min-w-0 text-xs font-bold">Tổng giá trị hợp đồng chưa VAT (₫) *
        <input type="number" min={1} max={1e12} step={1} disabled={locked} value={value.contract_value || ""} onChange={e => onChange({ ...value, contract_value: Number(e.target.value) })} className="mt-1 w-full min-w-0 rounded-lg border p-2 font-normal disabled:bg-slate-100" />
      </label>
      <label className="min-w-0 text-xs font-bold md:col-span-2">Tỷ lệ thanh toán đợt (%) — để trống nếu nhập tiền trực tiếp
        <input type="number" min={0.01} max={100} step={0.01} disabled={locked} value={value.percentage ?? ""} placeholder="VD: 50" onChange={e => onChange({ ...value, percentage: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2 font-normal disabled:bg-slate-100" />
        <span className="mt-1 block font-normal text-slate-500">Nếu nhập tỷ lệ, số tiền chưa VAT được tự tính từ tổng giá trị hợp đồng; VAT tiếp tục tính theo hóa đơn.</span>
      </label>
      {REQUEST_TEXT_FIELDS.map(([key, label, max, required]) => <label key={key} className="min-w-0 text-xs font-bold">
        {label}{required ? " *" : ""}
        <input type="text" maxLength={max} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })} className="mt-1 w-full min-w-0 rounded-lg border p-2 font-normal" />
      </label>)}
      <p className="text-xs font-normal text-slate-500 md:col-span-2">* Bắt buộc khi lập đề nghị. Số văn bản mặc định: ĐNTT-[số hóa đơn]. Nội dung chuyển khoản mặc định ghép từ dịch vụ, đợt thu và số hợp đồng. Người ký chỉ được in họ tên; không tự tạo chữ ký hoặc con dấu.</p>
    </div>}
  </fieldset>;
}
