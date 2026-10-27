import type { Metadata } from "next";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CreatorGuard } from "@/components/dashboard/creator-guard";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { RequireAuth } from "@/components/require-auth";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Dashboard shell: auth gate -> URL-state adapter -> creator gate -> page.
 * The Suspense boundary keeps `useSearchParams` (inside nuqs) build-safe.
 */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-6 h-64 w-full" />
          </div>
        }
      >
        <NuqsAdapter>
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
            <DashboardNav />
            <div className="mt-6 sm:mt-8">
              <CreatorGuard>{children}</CreatorGuard>
            </div>
          </div>
        </NuqsAdapter>
      </Suspense>
    </RequireAuth>
  );
}
