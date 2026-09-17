import { notFound } from "next/navigation";
import { CertificateForm } from "@/components/CertificateForm";
import { DbSetupNotice } from "@/components/DbSetupNotice";
import { getCertificate } from "@/lib/db";
import { describeDbError } from "@/lib/db-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditCertificatePage({ params }: { params: { id: string } }) {
  let item;
  try {
    item = await getCertificate(Number(params.id));
  } catch (e) {
    const problem = describeDbError(e);
    if (problem) return <DbSetupNotice problem={problem} />;
    throw e;
  }
  if (!item) notFound();
  return <CertificateForm initial={item} />;
}
