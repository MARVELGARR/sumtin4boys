import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/seo/json-ld";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import {
  DEFAULT_OG_IMAGE,
  SITE_URL,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { cn } from "@/lib/utils";

// Preset font: Inter (variable `--font-sans`). Geist Mono feeds `--font-mono`
// from globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-toy" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: `${APP_NAME} team`, url: `${SITE_URL}/about/author` }],
  creator: `${APP_NAME} team`,
  publisher: APP_NAME,
  category: "creator support",
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  keywords: [
    "tear small bread",
    "anything for the boys",
    "support Nigerian creators",
    "tip Nigerian creators",
    "creator support Nigeria",
    "small bread",
    "Naija creators",
    "buy me bread",
  ],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    locale: "en_NG",
    type: "website",
    url: SITE_URL,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f7d75",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en-NG"
        className={cn(
          "font-sans",
          inter.variable,
          geistMono.variable,
          fredoka.variable,
        )}
      >
        <body className="bg-background text-foreground antialiased">
          <JsonLd data={organizationJsonLd()} />
          <JsonLd data={websiteJsonLd()} />
          <ConvexClientProvider>
            <div className="flex min-h-dvh flex-col overflow-x-clip">
              <SiteHeader />
              <main className="min-w-0 flex-1">{children}</main>
              <SiteFooter />
            </div>
            <Toaster position="top-center" richColors />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
