import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listCertificates } from "@/lib/db";
import InvoiceWorkspace, { type InvoiceCertificate } from "@/components/accounting/InvoiceWorkspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { searchParams?: { certificate_id?: string } };

export default async function NewInvoicePage({ searchParams }: Props) {
  const user = getSession();
  if (user?.role !== "admin") {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-card">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-2 font-display text-xl font-extrabold text-navy-900">Chỉ Admin (kế toán) mới được lập hóa đơn</h1>
      </div>
    );
  }

  const records = await listCertificates();
  const certificates: InvoiceCertificate[] = records.map((record) => ({
    id: record.id,
    certificate_no: record.certificate_no,
    standard: record.standard,
    company_name: record.company_name,
    status: record.status,
    service_price: record.service_price,
  }));
  const requestedId = Number(searchParams?.certificate_id);
  const selectedId = certificates.some((certificate) => certificate.id === requestedId) ? requestedId : null;

  return <InvoiceWorkspace certificates={certificates} initialCertificateId={selectedId} />;
}
