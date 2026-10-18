"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowLeft,
  CircleCheck,
  CircleQuestionMark,
  Clock,
  RotateCcw,
  SearchX,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
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
    <div className="flex flex-col gap-6">
      <StatusCard donation={donation} />

      <Card>
        <CardHeader>
          <CardTitle>Support details</CardTitle>
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
              label={donation.quantity === 1 ? "Coffee" : "Coffees"}
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
            <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {donation.message}
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
        <Button asChild>
          <Link href={creatorHref}>
            {donation.creator ? "Support again" : "Back to home"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatusCard({ donation }: { donation: Donation }) {
  switch (donation.status) {
    case "pending":
      return (
        <Card>
          <CardHeader>
            <StatusIcon className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock />
            </StatusIcon>
            <CardTitle>Waiting for confirmation</CardTitle>
            <CardDescription>
              Your payment hasn&apos;t been confirmed yet. This page updates
              automatically — no need to refresh.
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
        <Card>
          <CardHeader>
            <StatusIcon className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CircleCheck />
            </StatusIcon>
            <CardTitle>Thank you for your support!</CardTitle>
            <CardDescription>
              Your {formatMoney(donation.amount, donation.currency)} support for{" "}
              {donation.creator?.displayName ?? "this creator"} went through.
            </CardDescription>
          </CardHeader>
        </Card>
      );

    case "unresolved":
      return (
        <Card>
          <CardHeader>
            <StatusIcon className="bg-muted text-muted-foreground">
              <CircleQuestionMark />
            </StatusIcon>
            <CardTitle>We couldn&apos;t confirm this payment</CardTitle>
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
        <Card>
          <CardHeader>
            <StatusIcon className="bg-muted text-muted-foreground">
              <RotateCcw />
            </StatusIcon>
            <CardTitle>Payment refunded</CardTitle>
            <CardDescription>
              {formatMoney(donation.amount, donation.currency)} was refunded, so
              this support didn&apos;t go through. Thanks anyway — you can try
              again below.
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
        "mb-1 flex size-10 items-center justify-center rounded-full [&_svg]:size-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function ReferenceNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{"We couldn't find that reference"}</EmptyTitle>
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
      <Card>
        <CardHeader>
          <Skeleton className="mb-1 size-10 rounded-full" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
      </Card>
      <Card>
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
