import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { fetchQuery, preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import {
  CreatorPage,
  CreatorPageSkeleton,
} from "@/components/creator/creator-page";
import { JsonLd } from "@/components/seo/json-ld";
import { APP_NAME } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";

type CreatorPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { username } = await params;
  const { creator } = await fetchQuery(api.creators.getByUsername, { username });

  if (!creator) {
    return {
      title: "Page not found",
      description: `We couldn't find a creator with that username on ${APP_NAME}.`,
      robots: { index: false, follow: false },
    };
  }

  const description =
    creator.bio?.trim() ||
    `Support ${creator.displayName} on ${APP_NAME} — tear them small bread. No app, no account, no wahala.`;
  const title = `${creator.displayName} (@${creator.username})`;
  const canonical = absoluteUrl(`/${creator.username}`);
  const ogImage = absoluteUrl(`/${creator.username}/opengraph-image`);

  return {
    title,
    description,
    alternates: { canonical },
    robots:
      creator.status === "active"
        ? { index: true, follow: true }
        : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: APP_NAME,
      locale: "en_NG",
      type: "profile",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function CreatorProfilePage({ params }: CreatorPageProps) {
  const { username } = await params;
  const preloaded = await preloadQuery(api.creators.getByUsername, { username });
  const { creator } = preloadedQueryResult(preloaded);
  if (!creator) notFound();

  const description =
    creator.bio?.trim() ||
    `Support ${creator.displayName} on ${APP_NAME} — tear them small bread.`;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-x-clip bg-background text-foreground">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: absoluteUrl(`/${creator.username}`),
          name: `${creator.displayName} (@${creator.username})`,
          description,
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          mainEntity: {
            "@type": "Person",
            name: creator.displayName,
            alternateName: `@${creator.username}`,
            url: absoluteUrl(`/${creator.username}`),
            description,
            ...(creator.avatarUrl ? { image: creator.avatarUrl } : {}),
            interactionStatistic: {
              "@type": "InteractionCounter",
              interactionType: "https://schema.org/DonateAction",
              userInteractionCount: creator.totalSupporters,
            },
          },
        }}
      />
      <Suspense fallback={<CreatorPageSkeleton />}>
        <CreatorPage preloaded={preloaded} />
      </Suspense>
    </div>
  );
}
