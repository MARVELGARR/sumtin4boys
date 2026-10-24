import type { Metadata } from "next";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AdminConsole } from "@/components/admin/admin-console";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Creators, payouts and payment-pipeline health.
      </p>
      <div className="mt-8">
        {/* Suspense keeps nuqs' useSearchParams build-safe. */}
        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          <NuqsAdapter>
            <AdminConsole />
          </NuqsAdapter>
        </Suspense>
      </div>
    </div>
  );
}
