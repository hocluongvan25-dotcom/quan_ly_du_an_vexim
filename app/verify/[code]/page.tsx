import { cookies, headers } from "next/headers";
import { resolveVerificationLocale, verificationText, VERIFICATION_LOCALE_COOKIE } from "@/lib/verification-i18n";
import { publicCertificate } from "@/lib/certificate-workflow";
import { notFound } from "next/navigation";
import { getCertificateByPublicCode } from "@/lib/db";
import { VerifyView } from "@/components/VerifyView";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = { params: { code: string }; searchParams?: { lang?: string | string[] } };

function pageLocale(searchParams: Props["searchParams"]) {
  return resolveVerificationLocale(searchParams?.lang, cookies().get(VERIFICATION_LOCALE_COOKIE)?.value, headers().get("accept-language") || "");
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const locale = pageLocale(searchParams);
  const item = await getCertificateByPublicCode(params.code);
  return {
    title: item && item.status !== "draft"
      ? `${item.certificate_no} · ${item.company_name} | Vexim Global`
      : verificationText(locale, "metaTitle"),
    description: verificationText(locale, "metaDescription"),
  };
}

export default async function VerifyPage({ params, searchParams }: Props) {
  const item = await getCertificateByPublicCode(params.code);
  if (!item || item.status === "draft") notFound();
  return <VerifyView cert={publicCertificate(item)} checkedAt={new Date().toISOString()} locale={pageLocale(searchParams)} />;
}
