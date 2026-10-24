"use client";

import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Copy, ExternalLink, Info, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { DonationStatusBadge } from "@/components/donation-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";

const RECENT_SUPPORTERS_PAGE_SIZE = 8;

export default function DashboardOverviewPage() {
  const stats = useQuery(api.donations.getMyStats, {});
  const balances = useQuery(api.payouts.getBalances, {});
  const mode = useQuery(api.payments.mode, {});
  const myCreator = useQuery(api.creators.getMyCreator, {});
  const recent = usePaginatedQuery(api.donations.listMine, {}, {
    initialNumItems: RECENT_SUPPORTERS_PAGE_SIZE,
  });

  const creator = myCreator?.creator ?? null;

  async function handleCopyLink() {
    if (!creator) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${creator.username}`,
      );
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy the link — copy it from your page instead.");
    }
  }

  const showConnectBanner =
    mode?.connectEnabled === true &&
    creator !== null &&
    creator.onboardingStatus !== "enabled";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {creator ? (
            <>
              Everything happening on{" "}
              <span className="font-medium text-foreground">
                /{creator.username}
              </span>
            </>
          ) : (
            "Everything happening on your page"
          )}
        </p>
      </div>

      {showConnectBanner ? (
        <Alert>
          <Info />
          <AlertTitle>Finish payout setup to receive money</AlertTitle>
          <AlertDescription>
            Your Bachs payout account isn&apos;t ready yet.{" "}
            <Link
              href="/dashboard/payouts"
              className="font-medium underline underline-offset-4"
            >
              Complete setup
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total raised"
          value={stats ? formatMoney(stats.totals.raised, stats.currency) : null}
          hint="All-time, before fees"
        />
        <StatCard
          label="Supporters"
          value={
            stats
              ? stats.counts.truncated
                ? "500+"
                : stats.totals.supporters.toLocaleString()
              : null
          }
          hint="People who supported you"
        />
        <StatCard
          label="Available balance"
          value={
            balances
              ? formatMoney(balances.available, balances.currency)
              : null
          }
          hint="Ready to withdraw"
        />
        <StatCard
          label="Paid out"
          value={
            balances ? formatMoney(balances.paidOut, balances.currency) : null
          }
          hint="Sent to you so far"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent supporters</CardTitle>
          <CardDescription>Your latest coffees.</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/supporters">View all</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {recent.status === "LoadingFirstPage" ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.results.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Info />
                </EmptyMedia>
                <EmptyTitle>No supporters yet</EmptyTitle>
                <EmptyDescription>
                  Share your link to get your first coffee.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Phones: stacked rows instead of a horizontally scrolling table. */}
              <ul className="flex flex-col divide-y divide-border md:hidden">
                {recent.results.slice(0, RECENT_SUPPORTERS_PAGE_SIZE).map((donation) => (
                  <li key={donation._id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate font-medium">
                        {donation.supporterName}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatMoney(donation.amount, donation.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <DonationStatusBadge status={donation.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(donation.paidAt ?? donation.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supporter</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.results.slice(0, RECENT_SUPPORTERS_PAGE_SIZE).map((donation) => (
                      <TableRow key={donation._id}>
                        <TableCell className="font-medium">
                          {donation.supporterName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatMoney(donation.amount, donation.currency)}
                        </TableCell>
                        <TableCell>
                          <DonationStatusBadge status={donation.status} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDateTime(donation.paidAt ?? donation.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>Share your page or tweak how it looks.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/page">
              <Pencil />
              Edit page
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCopyLink()}
            disabled={!creator}
          >
            <Copy />
            Copy my link
          </Button>
          {creator ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/${creator.username}`}>
                <ExternalLink />
                View my page
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {value === null ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <CardTitle className="text-xl font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
            {value}
          </CardTitle>
        )}
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardHeader>
    </Card>
  );
}
