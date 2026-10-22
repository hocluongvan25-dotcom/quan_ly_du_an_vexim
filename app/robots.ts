import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/login", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
