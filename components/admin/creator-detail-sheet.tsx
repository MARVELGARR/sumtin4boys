"use client";

import { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ExternalLink,
  Info,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { PayoutStatusBadge } from "@/components/dashboard/payout-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  appErrorMessage,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelativeTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type CreatorDetail = FunctionReturnType<
  typeof api.adminTelemetry.creatorDetail
>;
type DetailCreator = CreatorDetail["creator"];
type HeldEntry = CreatorDetail["held"]["entries"][number];
type DonationRow = CreatorDetail["recentDonations"][number];
type PayoutRow = CreatorDetail["recentPayouts"][number];
type LedgerRow = CreatorDetail["recentLedger"][number];

const ONBOARDING_STYLE: Record<
  DetailCreator["onboardingStatus"],
  { label: string; className: string }
> = {
  not_started: {
    label: "Not started",
    className: "bg-muted text-muted-foreground",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  enabled: {
    label: "Enabled",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  blocked: {
    label: "Blocked",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
};

const DONATION_STYLE: Record<
  DonationRow["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  unresolved: {
    label: "Unresolved",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  refunded: {
    label: "Refunded",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  abandoned: {
    label: "Abandoned",
    className: "bg-muted text-muted-foreground",
  },
};

const LEDGER_TYPE_LABELS: Record<LedgerRow["type"], string> = {
  donation: "Donation",
  fee: "Platform fee",
  refund: "Refund",
  fee_reversal: "Fee reversal",
  payout: "Payout",
  payout_reversal: "Payout reversal",
  adjustment: "Adjustment",
};

const PAYOUT_METHOD_LABELS: Record<PayoutRow["method"], string> = {
  manual: "Manual",
  bachs: "Bachs",
};

export function CreatorDetailSheet({
  creatorId,
  open,
  onOpenChange,
}: {
  creatorId: Id<"creators"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-xl data-[side=right]:w-full! data-[side=right]:sm:max-w-xl!"
        style={{ gap: 0 }}
      >
        <DetailErrorBoundary key={creatorId ?? "none"}>
          <CreatorDetailContent creatorId={creatorId} />
        </DetailErrorBoundary>
      </SheetContent>
    </Sheet>
  );
}

function CreatorDetailContent({
  creatorId,
}: {
  creatorId: Id<"creators"> | null;
}) {
  const detail = useQuery(
    api.adminTelemetry.creatorDetail,
    creatorId ? { creatorId } : "skip",
  );
  const setCreatorStatus = useMutation(api.admin.setCreatorStatus);
  const recompute = useMutation(api.admin.recomputeCreatorBalances);
  const [busy, setBusy] = useState<"status" | "recompute" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!creatorId) {
    return (
      <>
        <SheetHeader className="shrink-0 border-b pr-12">
          <SheetTitle>Creator detail</SheetTitle>
          <SheetDescription>No creator selected.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>No creator selected</EmptyTitle>
              <EmptyDescription>
                Open a creator from the Creators tab to see their money and
                recent activity.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </>
    );
  }

  if (detail === undefined) {
    return (
      <>
        <SheetHeader className="shrink-0 border-b pr-12">
          <SheetTitle>Creator detail</SheetTitle>
          <SheetDescription>Loading money and activity…</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  const { creator, held, recentDonations, recentPayouts, recentLedger } =
    detail;
  const onboarding = ONBOARDING_STYLE[creator.onboardingStatus];
  const isActive = creator.status === "active";

  async function handleSetStatus(status: "active" | "suspended") {
    if (!creatorId) return;
    setBusy("status");
    try {
      await setCreatorStatus({ creatorId, status });
      toast.success(
        status === "suspended"
          ? `@${creator.username} suspended`
          : `@${creator.username} reactivated`,
      );
      setConfirmOpen(false);
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleRecompute() {
    if (!creatorId) return;
    setBusy("recompute");
    try {
      const result = await recompute({ creatorId });
      toast.success(
        `Balances recomputed for @${creator.username}: pending ${formatMoney(
          result.pending,
          creator.currency,
        )}, available ${formatMoney(
          result.available,
          creator.currency,
        )} — ${result.entriesScanned} ledger entries scanned${
          result.truncated ? " (capped)" : ""
        }`,
      );
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SheetHeader className="shrink-0 border-b pr-12">
        <SheetTitle className="break-words">{creator.displayName}</SheetTitle>
        <SheetDescription>
          @{creator.username} · joined {formatDate(creator.createdAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "border-0",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                )}
              >
                {isActive ? "Active" : "Suspended"}
              </Badge>
              <Badge
                variant="secondary"
                className={cn("border-0", onboarding.className)}
              >
                Onboarding: {onboarding.label}
              </Badge>
              <Badge variant="outline">{creator.currency}</Badge>
            </div>

            <dl className="grid gap-3 rounded-xl border p-3 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="break-all font-medium">
                  {creator.email ?? "—"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Public page</dt>
                <dd>
                  <Link
                    href={`/${creator.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    /{creator.username}
                    <ExternalLink className="size-3" />
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bread price</dt>
                <dd className="font-medium tabular-nums">
                  {formatMoney(creator.breadPrice, creator.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {formatDateTime(creator.createdAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeading title="Money" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-3">
              <SummaryStat
                label="Pending / held"
                value={formatMoney(held.amount, creator.currency)}
                hint={
                  held.nextSettlementAt
                    ? `Next unlock ${formatDateTime(
                        held.nextSettlementAt,
                      )} (${formatRelativeTime(held.nextSettlementAt)})`
                    : "No pending unlock"
                }
              />
              <SummaryStat
                label="Available"
                value={formatMoney(creator.balanceAvailable, creator.currency)}
                hint="Ready to withdraw"
              />
              <SummaryStat
                label="Payouts awaiting"
                value={formatMoney(creator.payoutsAwaiting, creator.currency)}
                hint={
                  creator.payoutsSampled
                    ? "Requested or processing; count may be partial"
                    : "Requested or processing"
                }
              />
              <SummaryStat
                label="Paid out"
                value={formatMoney(creator.balancePaidOut, creator.currency)}
                hint="Lifetime"
              />
              <SummaryStat
                label="Total raised"
                value={formatMoney(creator.totalRaised, creator.currency)}
                hint="All-time bread"
              />
              <SummaryStat
                label="Supporters"
                value={creator.totalSupporters.toLocaleString()}
                hint="All-time"
              />
            </div>
            {held.sampled ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                The held-entry list is bounded; the pending amount above is
                still the creator&apos;s full balance.
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeading
              title="Held for settlement"
              count={held.entries.length}
            />
            {held.entries.length === 0 ? (
              <EmptyNote>No pending ledger entries.</EmptyNote>
            ) : (
              <ul className="divide-y rounded-xl border">
                {held.entries.map((entry) => (
                  <HeldEntryItem key={entry._id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeading
              title="Recent donations"
              count={recentDonations.length}
            />
            {recentDonations.length === 0 ? (
              <EmptyNote>No donations yet.</EmptyNote>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
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
                    {recentDonations.map((donation) => {
                      const status = DONATION_STYLE[donation.status];
                      return (
                        <TableRow key={donation._id}>
                          <TableCell className="whitespace-normal">
                            <div className="font-medium">
                              {donation.supporterName}
                            </div>
                            <div className="break-all text-xs text-muted-foreground">
                              {donation.supporterEmail}
                            </div>
                            {donation.message ? (
                              <p className="mt-1 line-clamp-2 text-xs break-words text-muted-foreground">
                                {donation.message}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoney(donation.amount, donation.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("border-0", status.className)}
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatDateTime(donation.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeading
              title="Recent payouts"
              count={recentPayouts.length}
            />
            {recentPayouts.length === 0 ? (
              <EmptyNote>No payouts yet.</EmptyNote>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayouts.map((payout) => (
                      <TableRow key={payout._id}>
                        <TableCell>
                          <PayoutStatusBadge status={payout.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(payout.amount, payout.currency)}
                        </TableCell>
                        <TableCell className="max-w-48 whitespace-normal text-muted-foreground">
                          <div className="text-xs">
                            {PAYOUT_METHOD_LABELS[payout.method]}
                          </div>
                          {payout.failureReason ? (
                            <div className="text-xs text-rose-600 dark:text-rose-400">
                              {payout.failureReason}
                            </div>
                          ) : payout.reference ? (
                            <div className="font-mono text-xs break-all">
                              {payout.reference}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateTime(payout.requestedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <SectionHeading title="Recent ledger" count={recentLedger.length} />
            {recentLedger.length === 0 ? (
              <EmptyNote>No ledger entries yet.</EmptyNote>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Settlement</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLedger.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell className="whitespace-normal">
                          <div>{LEDGER_TYPE_LABELS[entry.type]}</div>
                          {entry.note ? (
                            <div className="line-clamp-2 text-xs break-words text-muted-foreground">
                              {entry.note}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            entry.amount < 0 &&
                              "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {formatMoney(entry.amount, entry.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "border-0",
                              entry.settlementStatus === "pending"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                            )}
                          >
                            {entry.settlementStatus === "pending"
                              ? "Pending"
                              : "Settled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Balances are denormalized from the ledger. Recompute if a
            creator&apos;s numbers look out of sync.
          </p>
        </div>
      </div>

      <SheetFooter className="shrink-0 border-t bg-muted/30">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            variant="ghost"
            disabled={busy !== null}
            onClick={() => void handleRecompute()}
          >
            {busy === "recompute" ? <Spinner /> : <RefreshCw />}
            Recompute balances
          </Button>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant={isActive ? "destructive" : "outline"}
                disabled={busy !== null}
              >
                {isActive ? "Suspend creator" : "Reactivate creator"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isActive
                    ? `Suspend @${creator.username}?`
                    : `Reactivate @${creator.username}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isActive
                    ? "Their page stops accepting bread and the donate form is hidden. You can reactivate them at any time."
                    : "Their page starts accepting bread again and the donate form becomes visible."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant={isActive ? "destructive" : "default"}
                  onClick={() =>
                    void handleSetStatus(isActive ? "suspended" : "active")
                  }
                >
                  {busy === "status" ? <Spinner /> : null}
                  {isActive ? "Suspend" : "Reactivate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetFooter>
    </>
  );
}

function HeldEntryItem({ entry }: { entry: HeldEntry }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="border-0">
            {LEDGER_TYPE_LABELS[entry.type]}
          </Badge>
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              entry.amount < 0 && "text-rose-600 dark:text-rose-400",
            )}
          >
            {formatMoney(entry.amount, entry.currency)}
          </span>
        </div>
        <p className="mt-1 text-xs break-words text-muted-foreground">
          Held since {formatDateTime(entry.createdAt)}
          {entry.note ? ` · ${entry.note}` : ""}
        </p>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">Unlocks</div>
        <div className="text-sm font-medium">
          {formatDateTime(entry.settlesAt)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatRelativeTime(entry.settlesAt)}
        </div>
      </div>
    </li>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {count !== undefined ? (
        <Badge variant="outline">{count.toLocaleString()}</Badge>
      ) : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

class DetailErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <SheetHeader className="shrink-0 border-b pr-12">
            <SheetTitle>Creator detail</SheetTitle>
            <SheetDescription>Could not load this creator.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>Could not load this creator</AlertTitle>
              <AlertDescription>
                The creator may have been removed, or the admin query failed.
                Close the panel and try again.
              </AlertDescription>
            </Alert>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}
