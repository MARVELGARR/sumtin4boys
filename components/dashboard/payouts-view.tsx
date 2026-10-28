"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import {
  useAction,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Banknote } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { PayoutRequestForm } from "@/components/dashboard/payout-request-form";
import { PayoutStatusBadge } from "@/components/dashboard/payout-status-badge";
import { Badge } from "@/components/ui/badge";
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
import { appErrorMessage, formatDateTime, formatMoney } from "@/lib/format";

const HISTORY_PAGE_SIZE = 20;

type Balances = FunctionReturnType<typeof api.payouts.getBalances>;
type ConnectStatus = FunctionReturnType<typeof api.sellers.getConnectStatus>;

export function PayoutsView() {
  const balances = useQuery(api.payouts.getBalances, {});

  if (balances === undefined) {
    return <PayoutsViewSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <ConnectReturnHandler />
      </Suspense>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your balances and get your money out.
        </p>
      </div>

      <BalanceCards balances={balances} />

      {balances.connectMode ? (
        <ConnectCard />
      ) : (
        <PayoutRequestForm
          minimum={balances.minimum}
          available={balances.withdrawable}
          currency={balances.currency}
          hasOpenPayout={balances.hasOpenPayout}
        />
      )}

      <PayoutHistory />
    </div>
  );
}

function BalanceCards({ balances }: { balances: Balances }) {
  const cards = [
    {
      label: "Clearing (net)",
      value: balances.pending,
      hint: "After any pending fees or refund clawbacks",
    },
    {
      label: "Available to withdraw",
      value: balances.withdrawable,
      hint: "After open payout reservations and pending deductions",
    },
    {
      label: "Processing (reserved)",
      value: balances.processingTotal,
      hint: `Net ${formatMoney(
        balances.processing,
        balances.currency,
      )} + fee ${formatMoney(balances.processingFees, balances.currency)}`,
    },
    {
      label: "Paid out",
      value: balances.paidOut,
      hint: "Net amount already sent to you",
    },
  ];

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {formatMoney(card.value, balances.currency)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Minimum: {formatMoney(balances.minimum, balances.currency)} · Payout fee
        is added on top.
      </p>
    </div>
  );
}

const CONNECT_COPY: Record<
  ConnectStatus["onboardingStatus"],
  { label: string; className: string; description: string }
> = {
  not_started: {
    label: "Not set up",
    className: "bg-muted text-muted-foreground",
    description:
      "Connect a Bachs account so your supporters' money reaches you directly.",
  },
  pending: {
    label: "Setup incomplete",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    description:
      "Bachs still needs a few details from you before payouts can go through.",
  },
  enabled: {
    label: "Ready",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    description:
      "Ready — payouts go straight to your Bachs account. No manual requests needed.",
  },
  blocked: {
    label: "Action needed",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    description:
      "Bachs flagged your account, so payouts are paused. Continue onboarding to fix it.",
  },
};

function ConnectCard() {
  const status = useQuery(api.sellers.getConnectStatus, {});
  const startOnboarding = useAction(api.sellers.startOnboarding);
  const [starting, setStarting] = useState(false);

  async function handleStartOnboarding() {
    setStarting(true);
    try {
      const { url } = await startOnboarding({});
      // Same-tab navigation: a popup opened after an `await` is blocked by
      // most browsers. Bachs returns to /dashboard/payouts?connect=done.
      window.location.href = url;
    } catch (error) {
      toast.error(appErrorMessage(error));
      setStarting(false);
    }
  }

  if (status === undefined) {
    return <Skeleton className="h-40 w-full" />;
  }

  const copy = CONNECT_COPY[status.onboardingStatus];
  const showButton = status.onboardingStatus !== "enabled";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Payout account
          <Badge variant="secondary" className={copy.className}>
            {copy.label}
          </Badge>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {showButton ? (
          <Button onClick={() => void handleStartOnboarding()} disabled={starting}>
            {starting ? (
              <>
                <Spinner />
                Opening…
              </>
            ) : status.onboardingStatus === "not_started" ? (
              "Set up payouts"
            ) : (
              "Continue setup"
            )}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;re all set — new support is paid out through Bachs.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Balances above are informational; Bachs settles your earnings to your
          own account.
        </p>
      </CardContent>
    </Card>
  );
}

function PayoutHistory() {
  const history = usePaginatedQuery(api.payouts.listMine, {}, {
    initialNumItems: HISTORY_PAGE_SIZE,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout history</CardTitle>
        <CardDescription>Newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {history.status === "LoadingFirstPage" ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : history.results.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Banknote />
              </EmptyMedia>
              <EmptyTitle>No payouts yet</EmptyTitle>
              <EmptyDescription>
                Payouts you request will show up here with their status.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {/* Phones: cards instead of a horizontally scrolling table. */}
            <ul className="flex flex-col gap-3 md:hidden">
              {history.results.map((payout) => (
                <li
                  key={payout._id}
                  className="rounded-xl border border-border/70 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium tabular-nums">
                      {formatMoney(payout.amount, payout.currency)}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        net
                      </span>
                    </span>
                    <PayoutStatusBadge status={payout.status} />
                  </div>
                  {(payout.fee ?? 0) > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Fee {formatMoney(payout.fee ?? 0, payout.currency)} · total
                      reserved{" "}
                      {formatMoney(
                        payout.totalDebited ?? payout.amount,
                        payout.currency,
                      )}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Requested {formatDateTime(payout.requestedAt)}
                    {payout.processedAt
                      ? ` · Processed ${formatDateTime(payout.processedAt)}`
                      : null}
                  </p>
                  {payout.failureReason ? (
                    <p className="mt-1.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {payout.failureReason}
                    </p>
                  ) : payout.reference ? (
                    <p className="mt-1.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      Ref:{" "}
                      <span className="font-mono">{payout.reference}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">Net amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Requested</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.results.map((payout) => (
                    <TableRow key={payout._id}>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(payout.amount, payout.currency)}
                        {(payout.fee ?? 0) > 0 ? (
                          <div className="text-[11px] font-normal text-muted-foreground">
                            fee {formatMoney(payout.fee ?? 0, payout.currency)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <PayoutStatusBadge status={payout.status} />
                      </TableCell>
                      <TableCell className="max-w-[18rem] whitespace-normal text-muted-foreground">
                        {payout.failureReason ? (
                          payout.failureReason
                        ) : payout.reference ? (
                          <span>
                            Ref:{" "}
                            <span className="font-mono text-xs">
                              {payout.reference}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDateTime(payout.requestedAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {payout.processedAt
                          ? formatDateTime(payout.processedAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-center">
              {history.status === "CanLoadMore" ? (
                <Button
                  variant="outline"
                  onClick={() => history.loadMore(HISTORY_PAGE_SIZE)}
                >
                  Load more
                </Button>
              ) : null}
              {history.status === "LoadingMore" ? (
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
  );
}

/**
 * Reads `?connect=done` / `?connect=refresh` from the Bachs onboarding return
 * URL, shows a toast, then clears the param so refreshes don't re-toast.
 * Kept in its own component so `useSearchParams` (inside nuqs) stays inside a
 * Suspense boundary.
 */
function ConnectReturnHandler() {
  const [connect, setConnect] = useQueryState("connect", parseAsString);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (connect === "done") {
      handled.current = true;
      toast.info("Welcome back — we're checking your account status");
      void setConnect(null, { history: "replace" });
    } else if (connect === "refresh") {
      handled.current = true;
      toast.info("Setup incomplete — continue where you left off");
      void setConnect(null, { history: "replace" });
    }
  }, [connect, setConnect]);

  return null;
}

export function PayoutsViewSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="mt-6 h-56 w-full" />
    </div>
  );
}
