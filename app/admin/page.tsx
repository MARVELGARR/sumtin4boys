import type { Metadata } from "next";
import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Lock } from "lucide-react";
import { AdminConsole } from "@/components/admin/admin-console";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Lock className="size-3" />
          Restricted
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Creators, held funds, payouts and payment health.
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
