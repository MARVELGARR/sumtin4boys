"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  BreadBuddy,
  SearchBuddy,
} from "@/components/brand/toy-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { appErrorMessage, formatMoney } from "@/lib/format";

type Outcome = "paid" | "failed" | "expire";

/**
 * Fake checkout used when `PAYMENTS_DRIVER=simulated`.
 *
 * It must be impossible to mistake for a real payment: the amber banner is
 * always visible, and the page refuses to render the buttons when a real
 * driver is configured.
 */
export function SimulatedCheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = (searchParams.get("ref") ?? "").trim();

  const mode = useQuery(api.payments.mode, {});
  const donation = useQuery(
    api.donations.getByReference,
    reference.length > 0 ? { reference } : "skip",
  );
  const completeCheckout = useMutation(
    api.bachs.simulated.completeSimulatedCheckout,
  );
  const [pending, setPending] = useState<Outcome | null>(null);

  async function handleOutcome(outcome: Outcome) {
    if (reference.length === 0 || pending !== null) return;
    setPending(outcome);
    try {
      const result = await completeCheckout({ reference, outcome });
      if (result.ok) {
        router.replace(`/thanks?ref=${encodeURIComponent(reference)}`);
        return;
      }
      toast.error("This simulated checkout was already resolved.");
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setPending(null);
    }
  }

  if (mode === undefined) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="mt-6 h-80 w-full" />
      </div>
    );
  }

  if (mode.driver !== "simulated") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <Empty className="rounded-2xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck className="size-4" />
            </EmptyMedia>
            <EmptyTitle>Not available</EmptyTitle>
            <EmptyDescription>
              Not available — real payments are configured on this deployment.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100">
        <TriangleAlert className="text-amber-600 dark:text-amber-400" />
        <AlertTitle>Simulated payment — no real money moves</AlertTitle>
        <AlertDescription className="text-amber-800/90 dark:text-amber-200/80">
          This page stands in for Bachs hosted checkout because no Bachs API
          key is configured on this deployment.
        </AlertDescription>
      </Alert>

      <div className="mt-6">
        {reference.length === 0 || donation === null ? (
          <Empty className="rounded-2xl border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchBuddy className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Checkout not found</EmptyTitle>
              <EmptyDescription>
                This link is invalid or the checkout no longer exists. Head back
                home and try again from the creator&apos;s page.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/">Go home</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : donation === undefined ? (
          <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-64 max-w-full" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-9 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : (
          <Card className="toy-card relative overflow-hidden rounded-2xl">
            <div className="ankara-ribbon absolute inset-x-0 top-0 h-1.5" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-toy text-xl">
                <BreadBuddy size={26} />
                Review your bread
              </CardTitle>
              <CardDescription>
                This is a simulated checkout — nothing leaves your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Creator</span>
                <span className="text-right font-medium">
                  {donation.creator
                    ? donation.creator.displayName
                    : "Unknown creator"}
                  {donation.creator ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      @{donation.creator.username}
                    </span>
                  ) : null}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <BreadBuddy size={18} />
                  Breads
                </span>
                <span className="font-medium tabular-nums">
                  {donation.quantity} × bread
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl bg-[var(--toy-ochre)]/20 px-3 py-2">
                <span className="text-muted-foreground">Total</span>
                <span className="font-toy text-lg font-bold tabular-nums">
                  {formatMoney(donation.amount, donation.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">{donation.supporterName}</span>
              </div>
              {donation.message ? (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm text-balance">{donation.message}</p>
                </div>
              ) : null}
              {donation.status !== "pending" ? (
                <p className="text-sm text-muted-foreground">
                  This checkout has already been resolved — the status page
                  shows what happened.
                </p>
              ) : null}
              <p className="break-all text-center font-mono text-xs text-muted-foreground">
                Ref: {donation.reference}
              </p>
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <Button
                size="lg"
                onClick={() => void handleOutcome("paid")}
                disabled={pending !== null}
              >
                {pending === "paid" ? <Spinner /> : null}
                <BreadBuddy size={19} />
                Pay {formatMoney(donation.amount, donation.currency)}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleOutcome("failed")}
                disabled={pending !== null}
              >
                {pending === "failed" ? <Spinner /> : null}
                Simulate a failed payment
              </Button>
              <Button
                variant="ghost"
                onClick={() => void handleOutcome("expire")}
                disabled={pending !== null}
              >
                {pending === "expire" ? <Spinner /> : null}
                Let the checkout expire
              </Button>
              <Button asChild variant="link" className="mx-auto">
                <Link href={`/thanks?ref=${encodeURIComponent(reference)}`}>
                  Cancel
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
