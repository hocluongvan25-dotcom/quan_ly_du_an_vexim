import { publicCertificate } from "@/lib/certificate-workflow";
import { notFound } from "next/navigation";
import { getCertificateByPublicCode } from "@/lib/db";
import { VerifyView } from "@/components/VerifyView";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const item = await getCertificateByPublicCode(params.code);
  return {
    title: item && item.status !== "draft"
      ? `${item.certificate_no} · ${item.company_name} | Vexim Global`
      : "Certificate Verification | Vexim Global",
    description: "Verify validity of FDA / GACC records issued by Vexim Global.",
  };
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const item = await getCertificateByPublicCode(params.code);
  if (!item || item.status === "draft") notFound();
  return <VerifyView cert={publicCertificate(item)} />;
}
