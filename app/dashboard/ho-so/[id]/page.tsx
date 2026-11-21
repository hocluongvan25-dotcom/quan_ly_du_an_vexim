import { notFound } from "next/navigation";
import { CertificateForm } from "@/components/CertificateForm";
import { getCertificate } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditCertificatePage({ params }: { params: { id: string } }) {
  const item = await getCertificate(Number(params.id));
  if (!item) notFound();
  const user = getSession();
  return <CertificateForm key={item.id} initial={item} role={user?.role} />;
}
