"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Hourglass, Timer, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type HeldFunds = FunctionReturnType<typeof api.adminTelemetry.heldFunds>;
type HeldEntry = HeldFunds["entries"][number];
type CurrencyTotal = HeldFunds["totals"][number];

const LEDGER_TYPE_LABELS: Record<HeldEntry["type"], string> = {
  donation: "Donation",
  fee: "Platform fee",
  refund: "Refund",
  fee_reversal: "Fee reversal",
  payout: "Payout",
  payout_reversal: "Payout reversal",
  adjustment: "Adjustment",
};

const TIME_REFRESH_MS = 30_000;

/** Re-render at a bounded cadence so countdown labels stay accurate. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TIME_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function formatTimeRemaining(settlesAt: number, now: number): string {
  const diff = settlesAt - now;
  if (diff <= 0) return "Due now";

  const totalMinutes = Math.floor(diff / 60_000);
  if (totalMinutes < 1) return "Less than a minute";

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  if (hours > 0)
    return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  return `in ${minutes}m`;
}

export function HeldFundsTable() {
  const held = useQuery(api.adminTelemetry.heldFunds, { limit: 100 });
  const now = useNow();

  if (held === undefined) {
    return <HeldFundsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Held funds</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pending ledger entries waiting out the {held.settlementHoldHours}-hour
          settlement hold. Each currency has its own pending total.
        </p>
      </div>

      {held.sampled ? (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Held totals are based on a bounded sample</AlertTitle>
          <AlertDescription>
            There are more pending entries than the scan cap. The rows and
            per-currency totals below may be incomplete.
          </AlertDescription>
        </Alert>
      ) : null}

      {held.totals.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Hourglass />
            </EmptyMedia>
            <EmptyTitle>Nothing held right now</EmptyTitle>
            <EmptyDescription>
              Bread payments and fees will appear here while they wait out the
              settlement hold. Everything has cleared.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {held.totals.map((total) => (
              <CurrencyTotalCard key={total.currency} total={total} />
            ))}
          </div>

          <div className="-mx-4 overflow-x-auto border-y sm:mx-0 sm:rounded-xl sm:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creator</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Held since</TableHead>
                  <TableHead>Unlocks at</TableHead>
                  <TableHead className="text-right">Time remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {held.entries.map((entry) => (
                  <HeldEntryRow key={entry._id} entry={entry} now={now} />
                ))}
              </TableBody>
            </Table>
          </div>

          {held.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No individual held entries were returned.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function CurrencyTotalCard({ total }: { total: CurrencyTotal }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{total.currency} pending</CardTitle>
          <Badge variant="outline">
            {total.count.toLocaleString()}{" "}
            {total.count === 1 ? "entry" : "entries"}
          </Badge>
        </div>
        <CardDescription>
          {total.nextSettlementAt
            ? `Next unlock ${formatDateTime(total.nextSettlementAt)}`
            : "No unlock scheduled."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold tabular-nums">
          {formatMoney(total.amount, total.currency)}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Net pending balance: credits minus fees and deductions, before the
          hold ends.
        </p>
      </CardContent>
    </Card>
  );
}

function HeldEntryRow({ entry, now }: { entry: HeldEntry; now: number }) {
  const remaining = formatTimeRemaining(entry.settlesAt, now);

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        {entry.username === "(deleted)" ? (
          <span className="font-medium text-muted-foreground">
            {entry.username}
          </span>
        ) : (
          <>
            <Link
              href={`/${entry.username}`}
              className="font-medium hover:underline"
            >
              @{entry.username}
            </Link>
            {entry.displayName ? (
              <div className="text-xs text-muted-foreground">
                {entry.displayName}
              </div>
            ) : null}
          </>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="border-0">
          {LEDGER_TYPE_LABELS[entry.type]}
        </Badge>
      </TableCell>
      <TableCell
        className={cn(
          "text-right font-medium tabular-nums",
          entry.amount < 0 && "text-rose-600 dark:text-rose-400",
        )}
      >
        {formatMoney(entry.amount, entry.currency)}
      </TableCell>
      <TableCell className="whitespace-normal text-muted-foreground">
        <div>{formatDateTime(entry.createdAt)}</div>
        <div className="text-xs">{formatRelativeTime(entry.createdAt)}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDateTime(entry.settlesAt)}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums",
            remaining === "Due now"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-foreground",
          )}
        >
          {remaining === "Due now" ? <Timer className="size-3.5" /> : null}
          {remaining}
        </span>
      </TableCell>
    </TableRow>
  );
}

function HeldFundsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
