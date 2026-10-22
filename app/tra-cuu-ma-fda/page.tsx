import type { Metadata } from "next";
import { LOOKUP_PAGES } from "@/lib/site/pages";
import { LookupPageView } from "@/components/site/LookupPageView";

const page = LOOKUP_PAGES["tra-cuu-ma-fda"];

export const metadata: Metadata = {
  title: page.meta.title,
  description: page.meta.description,
  alternates: { canonical: "/tra-cuu-ma-fda" },
  openGraph: {
    type: "article",
    locale: "vi_VN",
    url: "/tra-cuu-ma-fda",
    siteName: "Vexim Global",
    title: page.meta.title,
    description: page.meta.description,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tra cứu mã FDA | Vexim Global" }],
  },
  robots: { index: true, follow: true },
};

export default function TraCuuMaFdaPage() {
  return <LookupPageView page={page} />;
}
