"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck2, FileText } from "lucide-react";
import InvoiceSection from "@/components/accounting/InvoiceSection";
import { formatMoney } from "@/lib/accounting";

type Standard = "FDA" | "GACC";
export type InvoiceCertificate = {
  id: number;
  certificate_no: string;
  standard: Standard;
  company_name: string;
  status: string;
  service_price: number;
};

export default function InvoiceWorkspace({
  certificates,
  initialCertificateId,
}: {
  certificates: InvoiceCertificate[];
  initialCertificateId: number | null;
}) {
  const [selectedId, setSelectedId] = useState(initialCertificateId ? String(initialCertificateId) : "");
  const selected = useMemo(
    () => certificates.find((certificate) => String(certificate.id) === selectedId),
    [certificates, selectedId]
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/ke-toan/hoa-don" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
            <ArrowLeft className="h-4 w-4" /> Tất cả hóa đơn
          </Link>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-navy-900">Lập và quản lý hóa đơn</h1>
          <p className="mt-1 max-w-2xl text-sm text-navy-900/55">
            Hóa đơn và các đợt thu được quản lý riêng trong Kế toán, không nằm trong màn hình lưu hồ sơ chứng nhận.
          </p>
        </div>
      </header>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
        <label htmlFor="invoice-certificate" className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <FileCheck2 className="h-4 w-4 text-teal-700" /> Chọn hồ sơ chứng nhận
        </label>
        <select
          id="invoice-certificate"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-3 w-full rounded-xl border border-navy-900/10 bg-white px-3 py-3 text-sm text-navy-900 outline-none focus:border-teal-600 sm:max-w-2xl"
        >
          <option value="">Chọn doanh nghiệp / hồ sơ…</option>
          {certificates.map((certificate) => (
            <option key={certificate.id} value={certificate.id}>
              {certificate.company_name} · {certificate.standard} · {certificate.certificate_no}
            </option>
          ))}
        </select>

        {certificates.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">Chưa có hồ sơ chứng nhận để lập hóa đơn.</p>
        )}

        {selected && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-navy-900">{selected.company_name}</div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500">
                  <span>{selected.standard}</span><span>·</span><span>{selected.certificate_no}</span><span>·</span><span>{selected.status === "published" ? "Đang hiệu lực" : selected.status === "expired" ? "Hết hiệu lực" : "Bản nháp"}</span>
                  {selected.service_price > 0 && <><span>·</span><span>Phí dịch vụ tham chiếu {formatMoney(selected.service_price)}</span></>}
                </div>
              </div>
            </div>
            <Link href={`/dashboard/ho-so/${selected.id}`} className="shrink-0 text-xs font-semibold text-teal-700 hover:underline">
              Xem hồ sơ gốc
            </Link>
          </div>
        )}
      </section>

      {selected ? (
        <InvoiceSection
          key={selected.id}
          refType="certificate"
          refId={selected.id}
          defaultCompanyName={selected.company_name}
          defaultServiceDescription={`Dịch vụ đăng ký ${selected.standard}`}
          defaultContractValue={selected.service_price}
        />
      ) : (
        <div className="rounded-3xl border border-dashed border-navy-900/15 bg-white px-5 py-10 text-center text-sm text-navy-900/55">
          Chọn một hồ sơ ở trên để xem hóa đơn hiện có hoặc lập đợt thu mới.
        </div>
      )}
    </div>
  );
}
