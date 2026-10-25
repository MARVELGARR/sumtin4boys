import type { Metadata } from "next";
import { Suspense } from "react";
import { SimulatedCheckoutView } from "@/components/checkout/simulated-checkout-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Simulated checkout",
  description:
    "A clearly-labelled stand-in for Bachs hosted checkout on deployments without a Bachs API key.",
};

export default function SimulatedCheckoutPage() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-x-clip bg-background text-foreground">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-xl px-4 py-10">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="mt-6 h-80 w-full" />
          </div>
        }
      >
        <SimulatedCheckoutView />
      </Suspense>
    </div>
  );
}
