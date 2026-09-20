import { notFound } from "next/navigation";
import { CertificateForm } from "@/components/CertificateForm";
import InvoiceSection from "@/components/accounting/InvoiceSection";
import { getCertificate } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditCertificatePage({ params }: { params: { id: string } }) {
  const item = await getCertificate(Number(params.id));
  if (!item) notFound();
  const user = getSession();
  return (
    <div className="space-y-5">
      <CertificateForm initial={item} />
      {user?.role === "admin" && <InvoiceSection refType="certificate" refId={Number(params.id)} />}
    </div>
  );
}
