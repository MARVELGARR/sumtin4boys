import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ThanksView,
  ThanksViewSkeleton,
} from "@/components/creator/thanks-view";

export const metadata: Metadata = {
  title: "Support status",
  // Reference URLs are private tracking links — keep them out of search.
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-xl">
        <Suspense fallback={<ThanksViewSkeleton />}>
          <ThanksView />
        </Suspense>
      </div>
    </div>
  );
}
