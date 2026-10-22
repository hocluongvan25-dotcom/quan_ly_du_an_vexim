import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_VI } from "@/lib/site/faq";
import { COMPANY, SITE_URL } from "@/lib/site/company";
import { HOME_VI } from "@/lib/site/content";
import { renewalSeasonYear } from "@/lib/site/lookup";
import { buildPageSchema } from "@/lib/site/schema";
import { PageShell } from "@/components/site/PageShell";
import { JsonLd } from "@/components/site/JsonLd";
import { Hero } from "@/components/site/home/Hero";
import { ServicesSection } from "@/components/site/home/ServicesSection";
import { SystemSection } from "@/components/site/home/SystemSection";
import { FaqSection } from "@/components/site/home/FaqSection";
import { ContactBanner } from "@/components/site/ContactBanner";

export const metadata: Metadata = {
  title: HOME_VI.meta.title,
  description: HOME_VI.meta.description,
  alternates: {
    canonical: "/",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    url: "/",
    siteName: "Vexim Global",
    title: HOME_VI.meta.ogTitle,
    description: HOME_VI.meta.ogDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tra cứu mã FDA, GACC | Vexim Global",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_VI.meta.ogTitle,
    description: HOME_VI.meta.ogDescription,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  const copy = HOME_VI;
  const seasonYear = renewalSeasonYear();

  const schema = buildPageSchema({
    lang: "vi",
    path: "/",
    title: copy.meta.title,
    description: copy.meta.description,
    crumbs: [
      { name: "Vexim Global", url: `${COMPANY.website}/` },
      { name: "Tra cứu mã FDA, GACC", url: `${SITE_URL}/` },
    ],
    faqIds: FAQ_VI.map((item) => item.id),
    includeServices: true,
  });

  return (
    <PageShell lang="vi" schema={<JsonLd data={schema} id="vexim-home-schema" />}>
      <Hero lang="vi" copy={copy} seasonYear={seasonYear} />

      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-site flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between md:gap-10 md:px-8">
          <p className="flex flex-col gap-1.5 border-l-2 border-brass-300 pl-4 text-[11.5px] leading-6 text-ink-500 sm:flex-row sm:items-start sm:gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-label text-brass-600">
              Lưu ý
            </span>
            <span className="max-w-3xl">{copy.fixedNote}</span>
          </p>
          <nav aria-label="Trang tra cứu" className="flex gap-5 pl-4 text-[11.5px] md:shrink-0 md:pl-0">
            <Link
              href="/tra-cuu-ma-fda"
              className="focus-ring whitespace-nowrap font-medium text-brand-800 decoration-brass-400 underline-offset-4 hover:underline"
            >
              Tra cứu mã FDA
            </Link>
            <Link
              href="/tra-cuu-ma-gacc"
              className="focus-ring whitespace-nowrap font-medium text-brand-800 decoration-brass-400 underline-offset-4 hover:underline"
            >
              Tra cứu mã GACC
            </Link>
          </nav>
        </div>
      </div>

      <ServicesSection lang="vi" copy={copy} />
      <SystemSection lang="vi" copy={copy} />
      <FaqSection lang="vi" copy={copy} />
      <ContactBanner lang="vi" copy={copy} />
    </PageShell>
  );
}
