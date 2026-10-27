import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/onboarding",
        "/signin",
        "/simulated-checkout",
        "/thanks",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    // Yandex's Host directive wants a bare hostname, not a full URL.
    host: new URL(SITE_URL).host,
  };
}
