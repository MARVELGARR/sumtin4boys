import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import {
  CreatorPage,
  CreatorPageSkeleton,
} from "@/components/creator/creator-page";
import { APP_NAME } from "@/lib/constants";

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
    };
  }

  const description =
    creator.bio?.trim() ||
    `Support ${creator.displayName} on ${APP_NAME} — buy them a coffee.`;

  return {
    title: `${creator.displayName} (@${creator.username})`,
    description,
    openGraph: {
      title: `${creator.displayName} (@${creator.username})`,
      description,
      ...(creator.avatarUrl ? { images: [{ url: creator.avatarUrl }] } : {}),
    },
  };
}

export default async function CreatorProfilePage({ params }: CreatorPageProps) {
  const { username } = await params;
  const preloaded = await preloadQuery(api.creators.getByUsername, { username });

  return (
    <Suspense fallback={<CreatorPageSkeleton />}>
      <CreatorPage preloaded={preloaded} />
    </Suspense>
  );
}
