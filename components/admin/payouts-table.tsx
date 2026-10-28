"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { PayoutStatusBadge } from "@/components/dashboard/payout-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

type PayoutRow = FunctionReturnType<typeof api.admin.listPayouts>[number];

const FILTERS = ["all", "requested", "processing", "paid", "failed"] as const;
type PayoutFilter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<PayoutFilter, string> = {
  all: "All",
  requested: "Requested",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
};

export function PayoutsTable() {
  const [filter, setFilter] = useState<PayoutFilter>("all");
  const payouts = useQuery(
    api.admin.listPayouts,
    filter === "all" ? {} : { status: filter },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((value) => (
          <Button
            key={value}
            variant={filter === value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {FILTER_LABELS[value]}
          </Button>
        ))}
      </div>

      {payouts === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptText />
            </EmptyMedia>
            <EmptyTitle>No payouts here</EmptyTitle>
            <EmptyDescription>
              {filter === "all"
                ? "Payout requests will appear here once creators make them."
                : `No payouts are currently ${FILTER_LABELS[filter].toLowerCase()}.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="-mx-4 overflow-x-auto border-y sm:mx-0 sm:rounded-xl sm:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Net amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Processed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <PayoutRowItem key={payout._id} payout={payout} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PayoutRowItem({ payout }: { payout: PayoutRow }) {
  const markPaid = useMutation(api.admin.markPayoutPaid);
  const markFailed = useMutation(api.admin.markPayoutFailed);
  const [paidOpen, setPaidOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const actionable = payout.status === "requested" || payout.status === "processing";

  async function handleMarkPaid() {
    const trimmed = reference.trim();
    if (trimmed === "") {
      toast.error("Record the transfer reference you used.");
      return;
    }
    setBusy(true);
    try {
      await markPaid({ payoutId: payout._id, reference: trimmed });
      toast.success(`Payout marked as paid for @${payout.creatorUsername}`);
      setPaidOpen(false);
      setReference("");
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkFailed() {
    const trimmed = reason.trim();
    if (trimmed === "") {
      toast.error("Add a reason for the failure.");
      return;
    }
    setBusy(true);
    try {
      await markFailed({ payoutId: payout._id, reason: trimmed });
      toast.success(`Payout marked as failed for @${payout.creatorUsername}`);
      setFailedOpen(false);
      setReason("");
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <Link
          href={`/${payout.creatorUsername}`}
          className="font-medium hover:underline"
        >
          @{payout.creatorUsername}
        </Link>
        <div className="text-xs text-muted-foreground">
          {payout.creatorDisplayName}
        </div>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        {formatMoney(payout.amount, payout.currency)}
        {(payout.fee ?? 0) > 0 ? (
          <div className="text-[11px] font-normal text-muted-foreground">
            fee {formatMoney(payout.fee ?? 0, payout.currency)} · reserved{" "}
            {formatMoney(
              payout.totalDebited ?? payout.amount,
              payout.currency,
            )}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <PayoutStatusBadge status={payout.status} />
      </TableCell>
      <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
        {payout.failureReason ? (
          payout.failureReason
        ) : payout.reference ? (
          <span className="font-mono text-xs">{payout.reference}</span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {formatDateTime(payout.requestedAt)}
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {payout.processedAt ? formatDateTime(payout.processedAt) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {actionable ? (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            <Button size="sm" onClick={() => setPaidOpen(true)} disabled={busy}>
              Mark paid
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setFailedOpen(true)}
              disabled={busy}
            >
              Mark failed
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}

        <Dialog
          open={paidOpen}
          onOpenChange={(open) => {
            setPaidOpen(open);
            if (!open) setReference("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark payout as paid</DialogTitle>
              <DialogDescription>
                Confirm you&apos;ve sent{" "}
                {formatMoney(payout.amount, payout.currency)} to{" "}
                @{payout.creatorUsername}, then record the bank/transfer
                reference.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`payout-ref-${payout._id}`}>
                Transfer reference
              </FieldLabel>
              <Input
                id={`payout-ref-${payout._id}`}
                value={reference}
                placeholder="e.g. TRF-19283746"
                disabled={busy}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPaidOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={busy || reference.trim() === ""}
                onClick={() => void handleMarkPaid()}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Saving…
                  </>
                ) : (
                  "Mark paid"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={failedOpen}
          onOpenChange={(open) => {
            setFailedOpen(open);
            if (!open) setReason("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark payout as failed</DialogTitle>
              <DialogDescription>
                This releases the reserved amount back to{" "}
                @{payout.creatorUsername}&apos;s available balance. Add a short
                reason — it shows in their payout history.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor={`payout-reason-${payout._id}`}>
                Failure reason
              </FieldLabel>
              <Input
                id={`payout-reason-${payout._id}`}
                value={reason}
                placeholder="e.g. Wrong bank details"
                disabled={busy}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setFailedOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy || reason.trim() === ""}
                onClick={() => void handleMarkFailed()}
              >
                {busy ? (
                  <>
                    <Spinner />
                    Saving…
                  </>
                ) : (
                  "Mark failed"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
