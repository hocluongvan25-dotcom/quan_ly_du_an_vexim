import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl();
  const lastModified = new Date("2026-10-22T00:00:00.000Z");
  const languages = { vi: `${base}/`, en: `${base}/en`, "x-default": `${base}/` };

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${base}/en`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages },
    },
  ];
}
