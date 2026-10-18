"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Ensures the signed-in user actually has a creator page before rendering
 * dashboard content. Signed-in non-creators are sent to onboarding.
 *
 * `getMyCreator` is safe to call signed out, so this can mount inside
 * `<RequireAuth>` without throwing. The skeleton is rendered while loading and
 * while redirecting so nothing flashes behind the navigation.
 */
export function CreatorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const data = useQuery(api.creators.getMyCreator, {});

  useEffect(() => {
    if (data && data.creator === null) {
      router.replace("/onboarding");
    }
  }, [data, router]);

  if (data === undefined || data.creator === null) {
    return (
      <div aria-busy="true" aria-label="Loading your creator page">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
