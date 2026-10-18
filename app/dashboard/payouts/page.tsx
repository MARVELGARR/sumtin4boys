import type { Metadata } from "next";
import { Suspense } from "react";
import { PayoutsView, PayoutsViewSkeleton } from "@/components/dashboard/payouts-view";

export const metadata: Metadata = {
  title: "Payouts",
};

export default function PayoutsPage() {
  return (
    <Suspense fallback={<PayoutsViewSkeleton />}>
      <PayoutsView />
    </Suspense>
  );
}
