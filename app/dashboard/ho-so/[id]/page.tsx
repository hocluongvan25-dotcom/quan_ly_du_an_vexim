import { notFound } from "next/navigation";
import { CertificateForm } from "@/components/CertificateForm";
import { getCertificate } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function EditCertificatePage({ params }: { params: { id: string } }) {
  const item = getCertificate(Number(params.id));
  if (!item) notFound();
  return <CertificateForm initial={item} />;
}
