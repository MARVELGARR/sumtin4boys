"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DonationStatusBadge } from "@/components/donation-status-badge";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime, formatMoney } from "@/lib/format";

const PAGE_SIZE = 20;
const MESSAGE_PREVIEW_LENGTH = 40;

const STATUS_FILTERS = [
  "all",
  "paid",
  "pending",
  "unresolved",
  "refunded",
  "abandoned",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

/** Invalid `?status=` values fall back to "all" instead of throwing. */
const statusParser = parseAsStringEnum<StatusFilter>([...STATUS_FILTERS]).withDefault(
  "all",
);

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  paid: "Paid",
  pending: "Pending",
  unresolved: "Unresolved",
  refunded: "Refunded",
  abandoned: "Abandoned",
};

const EMPTY_COPY: Record<StatusFilter, { title: string; description: string }> = {
  all: {
    title: "No supporters yet",
    description: "Once someone buys you a bread, they'll show up here.",
  },
  paid: {
    title: "No paid supporters yet",
    description: "Completed bread will appear in this tab.",
  },
  pending: {
    title: "No pending bread",
    description: "Payments awaiting confirmation will appear here.",
  },
  unresolved: {
    title: "No unresolved payments",
    description: "Nothing needs a closer look right now.",
  },
  refunded: {
    title: "No refunds",
    description: "Refunded bread will be listed here if any happen.",
  },
  abandoned: {
    title: "No abandoned checkouts",
    description: "Checkouts we stopped reconciling will be listed here.",
  },
};

export function SupportersView() {
  const [status, setStatus] = useQueryState("status", statusParser);
  const stats = useQuery(api.donations.getMyStats, {});
  const list = usePaginatedQuery(
    api.donations.listMine,
    { status: status === "all" ? undefined : status },
    { initialNumItems: PAGE_SIZE },
  );

  function countLabel(filter: StatusFilter): string {
    if (filter === "all" || !stats) return FILTER_LABELS[filter];
    const count = stats.counts[filter];
    // `paid` is the creator's exact lifetime counter; other statuses use a
    // bounded scan and may be truncated.
    const display =
      filter !== "paid" && stats.counts.truncated && count >= 500
        ? "500+"
        : count.toLocaleString();
    return `${FILTER_LABELS[filter]} (${display})`;
  }

  const empty = EMPTY_COPY[status];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Supporters</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every bread someone has sent you, newest first.
        </p>
      </div>

      <Tabs
        value={status}
        onValueChange={(value) => {
          void setStatus(value as StatusFilter);
        }}
      >
        <TabsList className="h-9 w-full max-w-full justify-start overflow-x-auto scrollbar-none sm:h-8 sm:w-fit">
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter} value={filter}>
              {countLabel(filter)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>
            {status === "all" ? "All supporters" : `${FILTER_LABELS[status]} supporters`}
          </CardTitle>
          <CardDescription>
            Showing up to {PAGE_SIZE} at a time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.status === "LoadingFirstPage" ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : list.results.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>{empty.title}</EmptyTitle>
                <EmptyDescription>{empty.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {/* Phones: cards instead of a horizontally scrolling table. */}
              <ul className="flex flex-col gap-3 md:hidden">
                {list.results.map((donation) => (
                  <li
                    key={donation._id}
                    className="rounded-xl border border-border/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {donation.supporterName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {donation.supporterEmail}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium tabular-nums">
                          {formatMoney(donation.amount, donation.currency)}
                        </p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          net {formatMoney(donation.netAmount, donation.currency)}
                        </p>
                      </div>
                    </div>
                    {donation.message ? (
                      <p className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {donation.message}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DonationStatusBadge status={donation.status} />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {donation.quantity}{" "}
                          {donation.quantity === 1 ? "bread" : "breads"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(donation.paidAt ?? donation.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supporter</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="text-right">Bread</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.results.map((donation) => (
                        <TableRow key={donation._id}>
                          <TableCell className="whitespace-normal">
                            <div className="font-medium">{donation.supporterName}</div>
                            <div className="text-xs text-muted-foreground">
                              {donation.supporterEmail}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[18rem] whitespace-normal">
                            {donation.message ? (
                              donation.message.length > MESSAGE_PREVIEW_LENGTH ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block max-w-full cursor-default align-bottom">
                                      {donation.message.slice(0, MESSAGE_PREVIEW_LENGTH)}…
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs whitespace-normal">
                                    {donation.message}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span>{donation.message}</span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {donation.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium tabular-nums">
                              {formatMoney(donation.amount, donation.currency)}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              net {formatMoney(donation.netAmount, donation.currency)}
                            </div>
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
                </TooltipProvider>
              </div>

              <div className="mt-4 flex justify-center">
                {list.status === "CanLoadMore" ? (
                  <Button
                    variant="outline"
                    onClick={() => list.loadMore(PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                ) : null}
                {list.status === "LoadingMore" ? (
                  <Button variant="outline" disabled>
                    <Spinner />
                    Loading…
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SupportersViewSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-8 w-full max-w-96" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  );
}
