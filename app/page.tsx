import type { Metadata } from "next";
import "./site.css";
import { siteCopy } from "@/lib/public-content";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { HomeBody } from "@/components/public/HomeBody";
import { JsonLd } from "@/components/public/JsonLd";
import { HtmlLang } from "@/components/public/HtmlLang";

const c = siteCopy("vi");

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
  alternates: {
    canonical: "/",
    languages: { vi: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    siteName: "Vexim Global",
    title: c.meta.title,
    description: c.meta.description,
    url: "/",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
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

export default function HomePage() {
  return (
    <div className="site" lang="vi">
      <HtmlLang lang="vi" />
      <JsonLd lang="vi" />
      <a className="skip-link" href="#main">
        {c.a11y.skip}
      </a>
      <SiteHeader lang="vi" />
      <main id="main" className="site-main">
        <HomeBody lang="vi" />
      </main>
      <SiteFooter lang="vi" />
    </div>
  );
}
