import type { Metadata } from "next";
import "../site.css";
import { siteCopy } from "@/lib/public-content";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { HomeBody } from "@/components/public/HomeBody";
import { JsonLd } from "@/components/public/JsonLd";
import { HtmlLang } from "@/components/public/HtmlLang";

const c = siteCopy("en");

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
  alternates: {
    canonical: "/en",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Vexim Global",
    title: c.meta.title,
    description: c.meta.description,
    url: "/en",
    locale: "en_US",
    alternateLocale: ["vi_VN"],
    images: [{ url: "/logo.png", width: 824, height: 543, alt: "Vexim Global" }],
  },
  twitter: {
    card: "summary_large_image",
    title: c.meta.title,
    description: c.meta.description,
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function HomePageEn() {
  return (
    <div className="site" lang="en">
      <HtmlLang lang="en" />
      <JsonLd lang="en" />
      <a className="skip-link" href="#main">
        {c.a11y.skip}
      </a>
      <SiteHeader lang="en" />
      <main id="main" className="site-main">
        <HomeBody lang="en" />
      </main>
      <SiteFooter lang="en" />
    </div>
  );
}
