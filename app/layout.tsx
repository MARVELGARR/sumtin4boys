import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Preset font: Inter (variable `--font-sans`). Geist Mono feeds `--font-mono`
// from globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-toy" });

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
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
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={cn(
          "font-sans",
          inter.variable,
          geistMono.variable,
          fredoka.variable,
        )}
      >
        <body className="bg-background text-foreground antialiased">
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
