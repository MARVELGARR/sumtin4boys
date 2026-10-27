import { afterEach, describe, expect, it, vi } from "vitest";

const FALLBACK = "https://anything4boys.com";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadSeo(appUrl: string) {
  vi.stubEnv("APP_URL", appUrl);
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.resetModules();
  return import("./seo");
}

describe("SEO site URL resolution", () => {
  it("never publishes localhost as the canonical origin", async () => {
    const seo = await loadSeo("http://localhost:3000");

    expect(seo.SITE_URL).toBe(FALLBACK);
    expect(seo.absoluteUrl("/about")).toBe(`${FALLBACK}/about`);
  });

  it("ignores temporary tunnel hosts", async () => {
    const seo = await loadSeo("https://random-words.trycloudflare.com");

    expect(seo.SITE_URL).toBe(FALLBACK);
    expect(seo.absoluteUrl("/sitemap.xml")).toBe(`${FALLBACK}/sitemap.xml`);
  });

  it("never publishes an insecure canonical origin", async () => {
    const seo = await loadSeo("http://anything4boys.com");

    expect(seo.SITE_URL).toBe(FALLBACK);
    expect(seo.absoluteUrl("/about")).toBe(`${FALLBACK}/about`);
  });

  it("keeps a real public origin and drops paths", async () => {
    const seo = await loadSeo("https://anything4boys.com/preview?x=1");

    expect(seo.SITE_URL).toBe(FALLBACK);
    expect(seo.absoluteUrl("/contact")).toBe(`${FALLBACK}/contact`);
  });

  it("builds page metadata with an absolute canonical and social image", async () => {
    const seo = await loadSeo("https://anything4boys.com");
    const meta = seo.pageMetadata({
      title: "About",
      path: "/about",
    });

    expect(meta.alternates?.canonical).toBe(`${FALLBACK}/about`);
    expect(meta.openGraph?.url).toBe(`${FALLBACK}/about`);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
