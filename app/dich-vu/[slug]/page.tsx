import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICE_DETAILS, serviceDetail } from "@/lib/site/pages";
import { ServicePageView } from "@/components/site/ServicePageView";

export function generateStaticParams() {
  return SERVICE_DETAILS.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const service = serviceDetail(params.slug);
  if (!service) return { title: "Dịch vụ | Vexim Global" };
  return {
    title: service.meta.title,
    description: service.meta.description,
    alternates: { canonical: `/dich-vu/${service.slug}` },
    openGraph: {
      type: "article",
      locale: "vi_VN",
      url: `/dich-vu/${service.slug}`,
      siteName: "Vexim Global",
      title: service.meta.title,
      description: service.meta.description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: service.h1 }],
    },
    robots: { index: true, follow: true },
  };
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = serviceDetail(params.slug);
  if (!service) notFound();
  return <ServicePageView service={service} />;
}
