import type { Metadata } from "next";
import { Suspense } from "react";
import {
  SupportersView,
  SupportersViewSkeleton,
} from "@/components/dashboard/supporters-view";

export const metadata: Metadata = {
  title: "Supporters",
};

export default function SupportersPage() {
  return (
    <Suspense fallback={<SupportersViewSkeleton />}>
      <SupportersView />
    </Suspense>
  );
}
