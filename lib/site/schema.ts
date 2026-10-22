import { COMPANY, SITE_URL } from "./company";
import { faqById, type FaqItem } from "./faq";
import type { Lang } from "./content";
import { serviceSummaries } from "./content";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_VI_ID = `${SITE_URL}/#website`;

type Crumb = { name: string; url: string };

function organizationNode(lang: Lang) {
  return {
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORGANIZATION_ID,
    name: COMPANY.name,
    alternateName: COMPANY.legalName,
    url: COMPANY.website,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/og-image.png`,
    description:
      lang === "en"
        ? "Advisory firm for FDA food facility registration, GACC registration for exports to China and export record management for Vietnamese food and agricultural companies."
        : "Đơn vị tư vấn đăng ký cơ sở thực phẩm với FDA Hoa Kỳ, đăng ký mã GACC xuất khẩu sang Trung Quốc và quản lý hồ sơ xuất khẩu cho doanh nghiệp thực phẩm, nông sản Việt Nam.",
    telephone: "+84373685634",
    email: COMPANY.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.streetAddress,
      addressLocality: COMPANY.locality,
      addressRegion: COMPANY.region,
      addressCountry: COMPANY.country,
    },
    areaServed: "VN",
    knowsAbout:
      lang === "en"
        ? [
            "FDA food facility registration",
            "U.S. Agent",
            "FSVP",
            "Prior Notice",
            "FCE/SID",
            "GACC registration",
            "Order 280",
            "CIFER system",
          ]
        : [
            "Đăng ký cơ sở thực phẩm FDA",
            "U.S. Agent",
            "FSVP",
            "Prior Notice",
            "FCE/SID",
            "Đăng ký mã GACC",
            "Lệnh 280 GACC",
            "Hệ thống CIFER",
          ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+84373685634",
      email: COMPANY.email,
      contactType: "customer service",
      availableLanguage: ["vi", "en"],
    },
    sameAs: [COMPANY.website],
  };
}

function websiteNode(lang: Lang) {
  const url = lang === "en" ? `${SITE_URL}/en` : `${SITE_URL}/`;
  return {
    "@type": "WebSite",
    "@id": lang === "en" ? `${SITE_URL}/en#website` : WEBSITE_VI_ID,
    url,
    name: lang === "en" ? "Vexim Global - FDA and GACC code lookup" : "Vexim Global - Tra cứu mã FDA, GACC",
    inLanguage: lang,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/tra-cuu?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function breadcrumbNode(id: string, crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

function faqNode(lang: Lang, items: FaqItem[], pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    inLanguage: lang,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export type PageSchemaInput = {
  lang: Lang;
  /** Đường dẫn tương đối, ví dụ "/tra-cuu-ma-fda". Trang chủ dùng "/". */
  path: string;
  title: string;
  description: string;
  crumbs: Crumb[];
  faqIds?: string[];
  includeServices?: boolean;
  service?: { name: string; description: string; serviceType?: string };
};

export function buildPageSchema(input: PageSchemaInput) {
  const { lang, path, title, description, crumbs } = input;
  const pageUrl = `${SITE_URL}${path === "/" ? "/" : path}`;
  const websiteId = lang === "en" ? `${SITE_URL}/en#website` : WEBSITE_VI_ID;
  const faqItems = input.faqIds ? faqById(input.faqIds, lang) : [];

  const graph: Array<Record<string, unknown>> = [
    organizationNode(lang),
    websiteNode(lang),
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: lang,
      isPartOf: { "@id": websiteId },
      about: { "@id": ORGANIZATION_ID },
      breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
      ...(faqItems.length ? { mainEntity: { "@id": `${pageUrl}#faq` } } : {}),
    },
    breadcrumbNode(`${pageUrl}#breadcrumb`, crumbs),
  ];

  if (input.includeServices) {
    const services = serviceSummaries(lang);
    for (const service of services) {
      graph.push({
        "@type": "Service",
        "@id": `${SITE_URL}${service.href}#service`,
        name: service.title,
        description: service.lead,
        provider: { "@id": ORGANIZATION_ID },
        areaServed: "VN",
        audience: {
          "@type": "BusinessAudience",
          audienceType:
            lang === "en"
              ? "Food and agricultural exporters"
              : "Doanh nghiệp xuất khẩu thực phẩm, nông sản",
        },
        url: lang === "en" ? `${SITE_URL}/en#dich-vu` : `${SITE_URL}${service.href}`,
        ...(service.slug === "niem-yet-vexim-trade"
          ? { offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } }
          : {}),
      });
    }
  }

  if (input.service && !input.includeServices) {
    graph.push({
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: input.service.name,
      description: input.service.description,
      ...(input.service.serviceType ? { serviceType: input.service.serviceType } : {}),
      provider: { "@id": ORGANIZATION_ID },
      areaServed: "VN",
      url: pageUrl,
    });
  }

  if (faqItems.length) graph.push(faqNode(lang, faqItems, pageUrl));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
