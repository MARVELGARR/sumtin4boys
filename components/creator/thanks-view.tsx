"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  BreadBuddy,
  CheckBuddy,
  MessageBuddy,
  SearchBuddy,
} from "@/components/brand/toy-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Donation = NonNullable<
  FunctionReturnType<typeof api.donations.getByReference>
>;

/** Reactive status view for `/thanks?ref=...` — the supporter's tracking page. */
export function ThanksView() {
  const searchParams = useSearchParams();
  const reference = (searchParams.get("ref") ?? "").trim();
  const donation = useQuery(
    api.donations.getByReference,
    reference ? { reference } : "skip",
  );

  return reference === "" ? (
    <ReferenceNotFound />
  ) : donation === undefined ? (
    <ThanksViewSkeleton />
  ) : donation === null ? (
    <ReferenceNotFound />
  ) : (
    <DonationStatus donation={donation} />
  );
}

function DonationStatus({ donation }: { donation: Donation }) {
  const creatorHref = donation.creator
    ? `/${donation.creator.username}`
    : "/";

  return (
    <div className="relative">
      <AnkaraPattern id="thanks-pattern" opacity={0.08} />
      <div className="relative flex flex-col gap-6">
        <StatusCard donation={donation} />

        <Card className="toy-card relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-toy text-xl">
              <MessageBuddy size={24} />
              Support details
            </CardTitle>
            <CardDescription className="[overflow-wrap:anywhere]">
              Reference:{" "}
              <span className="font-mono text-xs">{donation.reference}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-2 text-sm">
              <SummaryRow
                label="Amount"
                value={
                  <span className="tabular-nums font-medium">
                    {formatMoney(donation.amount, donation.currency)}
                  </span>
                }
              />
              <SummaryRow
                label={donation.quantity === 1 ? "Bread" : "Breads"}
                value={<span className="tabular-nums">{donation.quantity}</span>}
              />
              <SummaryRow label="From" value={donation.supporterName} />
              {donation.paidAt !== undefined ? (
                <SummaryRow
                  label="Paid"
                  value={
                    <span className="tabular-nums">
                      {formatDateTime(donation.paidAt)}
                    </span>
                  }
                />
              ) : null}
            </dl>
            {donation.message ? (
              <blockquote className="mt-4 rounded-r-xl border-l-2 border-[var(--toy-leaf)] bg-[var(--toy-ochre)]/15 py-2 pl-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                &ldquo;{donation.message}&rdquo;
              </blockquote>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {donation.creator ? (
            <Button asChild variant="outline">
              <Link href={creatorHref}>
                <ArrowLeft />
                Back to {donation.creator.displayName}
              </Link>
            </Button>
          ) : null}
          <Button asChild className="gap-2">
            <Link href={creatorHref}>
              <BreadBuddy size={18} />
              {donation.creator ? "Tear bread again" : "Back to home"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ donation }: { donation: Donation }) {
  switch (donation.status) {
    case "pending":
      return (
        <Card className="toy-card relative overflow-hidden">
          <CardHeader>
            <StatusIcon className="bg-[var(--toy-lime)]/45">
              <BreadBuddy />
            </StatusIcon>
            <CardTitle className="font-toy text-2xl">
              Your bread is on the way
            </CardTitle>
            <CardDescription>
              We&apos;re waiting for the payment provider to confirm. This page
              updates automatically — no need to refresh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Keep this reference:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground [overflow-wrap:anywhere]">
                {donation.reference}
              </code>
            </p>
          </CardContent>
        </Card>
      );

    case "paid":
      return (
        <Card className="toy-card relative overflow-hidden">
          <AnkaraPattern id="thanks-paid" opacity={0.1} />
          <CardHeader className="relative">
            <StatusIcon className="bg-[var(--toy-leaf)]/15">
              <CheckBuddy />
            </StatusIcon>
            <CardTitle className="font-toy text-2xl">
              Your bread landed!
            </CardTitle>
            <CardDescription>
              Your {formatMoney(donation.amount, donation.currency)} support for{" "}
              {donation.creator?.displayName ?? "this creator"} went through.
              You too much.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "unresolved":
      return (
        <Card className="toy-card">
          <CardHeader>
            <StatusIcon className="bg-muted">
              <SearchBuddy />
            </StatusIcon>
            <CardTitle className="font-toy text-2xl">
              We couldn&apos;t confirm this payment
            </CardTitle>
            <CardDescription>
              The payment provider didn&apos;t send us a final result. If you
              were charged, it will be reconciled automatically — keep your
              reference handy and reach out to support if this doesn&apos;t
              update within a day.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "refunded":
      return (
        <Card className="toy-card">
          <CardHeader>
            <StatusIcon className="bg-[var(--toy-bread)]/25">
              <BreadBuddy />
            </StatusIcon>
            <CardTitle className="font-toy text-2xl">
              This bread came back
            </CardTitle>
            <CardDescription>
              {formatMoney(donation.amount, donation.currency)} was refunded, so
              this support didn&apos;t go through. Thanks anyway — you can try
              again below.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "abandoned":
      return (
        <Card className="toy-card">
          <CardHeader>
            <StatusIcon className="bg-muted">
              <BreadBuddy />
            </StatusIcon>
            <CardTitle className="font-toy text-2xl">
              This checkout wasn&apos;t completed
            </CardTitle>
            <CardDescription>
              We stopped checking this payment after a few days and nothing was
              charged. You can start a fresh support checkout below.
            </CardDescription>
          </CardHeader>
        </Card>
      );
  }
}

function StatusIcon({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div
      className={cn(
        "mb-1 flex size-12 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 [&_svg]:size-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function ReferenceNotFound() {
  return (
    <Empty className="toy-card border-2 border-[var(--toy-ink)]/10 bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchBuddy className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="font-toy text-2xl">
          We couldn&apos;t find that reference
        </EmptyTitle>
        <EmptyDescription>
          This link may be incomplete or expired. If you just paid, check your
          email for the receipt, or ask the creator to look it up.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

/** Loading placeholder for both the Suspense boundary and the live query. */
export function ThanksViewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="toy-card">
        <CardHeader>
          <Skeleton className="mb-1 size-12 rounded-2xl" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
      </Card>
      <Card className="toy-card">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Skeleton className="h-9 w-full sm:mx-auto sm:w-48" />
    </div>
  );
}
