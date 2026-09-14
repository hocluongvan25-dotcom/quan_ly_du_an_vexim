import { notFound } from "next/navigation";
import { getCertificateByPublicCode } from "@/lib/db";
import { VerifyView } from "@/components/VerifyView";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const item = await getCertificateByPublicCode(params.code);
  return {
    title: item
      ? `${item.certificate_no} · ${item.company_name} | Vexim Global`
      : "Xác thực chứng chỉ | Vexim Global",
    description: "Xác thực hiệu lực hồ sơ FDA / GACC do Vexim Global cấp.",
  };
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const item = await getCertificateByPublicCode(params.code);
  if (!item || item.status === "draft") notFound();
  const { service_price: _hidden, ...publicCert } = item;
  void _hidden;
  return <VerifyView cert={publicCert} />;
}
