import type { Metadata } from "next";
import { FAQ_EN } from "@/lib/site/faq";
import { COMPANY, SITE_URL } from "@/lib/site/company";
import { HOME_EN } from "@/lib/site/content";
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
  title: HOME_EN.meta.title,
  description: HOME_EN.meta.description,
  alternates: {
    canonical: "/en",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["vi_VN"],
    url: "/en",
    siteName: "Vexim Global",
    title: HOME_EN.meta.ogTitle,
    description: HOME_EN.meta.ogDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FDA and GACC code lookup | Vexim Global",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_EN.meta.ogTitle,
    description: HOME_EN.meta.ogDescription,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function HomeEnPage() {
  const copy = HOME_EN;
  const seasonYear = renewalSeasonYear();

  const schema = buildPageSchema({
    lang: "en",
    path: "/en",
    title: copy.meta.title,
    description: copy.meta.description,
    crumbs: [
      { name: "Vexim Global", url: `${COMPANY.website}/` },
      { name: "FDA and GACC code lookup", url: `${SITE_URL}/en` },
    ],
    faqIds: FAQ_EN.map((item) => item.id),
    includeServices: true,
  });

  return (
    <PageShell lang="en" schema={<JsonLd data={schema} id="vexim-home-en-schema" />}>
      <Hero lang="en" copy={copy} seasonYear={seasonYear} />

      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-site px-5 py-5 md:px-8">
          <p className="flex flex-col gap-1.5 border-l-2 border-brass-300 pl-4 text-[11.5px] leading-6 text-ink-500 sm:flex-row sm:items-start sm:gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Note</span>
            <span className="max-w-4xl">{copy.fixedNote}</span>
          </p>
        </div>
      </div>

      <ServicesSection lang="en" copy={copy} />
      <SystemSection lang="en" copy={copy} />
      <FaqSection lang="en" copy={copy} />
      <ContactBanner lang="en" copy={copy} />
    </PageShell>
  );
}
