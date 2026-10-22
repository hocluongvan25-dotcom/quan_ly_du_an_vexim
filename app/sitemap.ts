import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/company";
import { SERVICE_DETAILS } from "@/lib/site/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-10-22");

  const bilingual = [
    { path: "/", en: true },
    { path: "/cau-hoi-thuong-gap", en: false },
    { path: "/chinh-sach-bao-mat", en: false },
    { path: "/dieu-khoan-su-dung", en: false },
    { path: "/lien-he", en: false },
  ];

  const entries: MetadataRoute.Sitemap = bilingual.map((item) => ({
    url: `${SITE_URL}${item.path === "/" ? "/" : item.path}`,
    lastModified: updated,
    changeFrequency: "monthly",
    priority: item.path === "/" ? 1 : 0.6,
    alternates: item.en
      ? { languages: { vi: `${SITE_URL}/`, en: `${SITE_URL}/en`, "x-default": `${SITE_URL}/` } }
      : undefined,
  }));

  entries.push({
    url: `${SITE_URL}/en`,
    lastModified: updated,
    changeFrequency: "monthly",
    priority: 0.9,
    alternates: { languages: { vi: `${SITE_URL}/`, en: `${SITE_URL}/en`, "x-default": `${SITE_URL}/` } },
  });

  for (const path of ["/tra-cuu-ma-fda", "/tra-cuu-ma-gacc"]) {
    entries.push({ url: `${SITE_URL}${path}`, lastModified: updated, changeFrequency: "weekly", priority: 0.9 });
  }

  for (const service of SERVICE_DETAILS) {
    entries.push({
      url: `${SITE_URL}${service.path}`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
