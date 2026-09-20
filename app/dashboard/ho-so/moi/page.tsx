import { getSession } from "@/lib/auth";
import { CertificateForm } from "@/components/CertificateForm";

export const runtime = "nodejs";

export default function NewCertificatePage({
  searchParams,
}: {
  searchParams?: { standard?: string; company?: string; email?: string; price?: string };
}) {
  return (
    <CertificateForm
      role={getSession()?.role}
      prefill={{
        standard: searchParams?.standard,
        company: searchParams?.company,
        email: searchParams?.email,
        price: searchParams?.price,
      }}
    />
  );
}
