import type { Metadata } from "next";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "./constants";

/**
 * Canonical site origin.
 *
 * `APP_URL` is already the canonical public origin used by Convex emails and
 * checkout redirects. Localhost values are deliberately ignored so a local
 * `.env` can never publish localhost canonicals or sitemap URLs. Vercel's
 * production hostname is used as a fallback before the brand domain.
 */
const FALLBACK_SITE_URL = "https://anything4boys.com";

function resolveSiteUrl(): string {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const configured =
    process.env.APP_URL ??
    (vercelHost ? `https://${vercelHost}` : undefined);

  if (!configured) return FALLBACK_SITE_URL;
  try {
    const url = new URL(configured);
    const host = url.hostname.toLowerCase();
    // Public canonicals must be HTTPS. Fall back rather than publishing an
    // insecure or non-web scheme if the env is misconfigured.
    if (url.protocol !== "https:") return FALLBACK_SITE_URL;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".trycloudflare.com") ||
      host.endsWith(".loca.lt") ||
      host.endsWith(".ngrok-free.app") ||
      host.endsWith(".ngrok.io")
    ) {
      return FALLBACK_SITE_URL;
    }
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, SITE_URL).toString();
}

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export const DEFAULT_OG_IMAGE: OgImage = {
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${APP_NAME} — ${APP_TAGLINE}`,
};

type PageMetadataInput = {
  title: string;
  description?: string;
  /** Canonical path, e.g. `/about`. */
  path: string;
  keywords?: string[];
  type?: "website" | "article" | "profile";
  image?: OgImage;
  robots?: Metadata["robots"];
};

/** Build complete, page-specific Open Graph + Twitter + canonical metadata. */
export function pageMetadata({
  title,
  description = APP_DESCRIPTION,
  path,
  keywords,
  type = "website",
  image = DEFAULT_OG_IMAGE,
  robots,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_NAME,
      locale: "en_NG",
      type,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
    ...(robots ? { robots } : {}),
  };
}

export const SITE_KEYWORDS = [
  "tear small bread",
  "support Nigerian creators",
  "tip Nigerian creators",
  "creator support Nigeria",
  "buy me bread",
  "Naija creators",
  "creator page Nigeria",
  "small bread",
  "Naira creator support",
];

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: APP_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/apple-icon"),
      width: 180,
      height: 180,
    },
    description: APP_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Nigeria",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: absoluteUrl("/contact"),
      availableLanguage: ["en", "en-NG"],
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: APP_NAME,
    description: APP_DESCRIPTION,
    inLanguage: "en-NG",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
