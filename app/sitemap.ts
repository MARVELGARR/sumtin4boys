import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3_600;

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl("/"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: absoluteUrl("/about"),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: absoluteUrl("/support"),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: absoluteUrl("/contact"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const creators = await fetchQuery(api.creators.listForSitemap, {});
    return [
      ...STATIC_ROUTES,
      ...creators.map((creator) => ({
        url: absoluteUrl(`/${creator.username}`),
        lastModified: new Date(creator.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    // A transient Convex outage must not turn sitemap.xml into a 500. The
    // static marketing routes are still useful to crawlers.
    console.warn("[sitemap] creator directory unavailable", error);
    return STATIC_ROUTES;
  }
}
