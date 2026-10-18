"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
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
import { appErrorMessage, formatMoney } from "@/lib/format";

type CreatorRow = FunctionReturnType<typeof api.admin.listCreators>[number];

const ONBOARDING_COPY: Record<
  CreatorRow["onboardingStatus"],
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

export function CreatorsTable() {
  const creators = useQuery(api.admin.listCreators, {});

  if (creators === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No creators yet</EmptyTitle>
          <EmptyDescription>
            Creator accounts will show up here once people sign up.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Creator</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Balances</TableHead>
            <TableHead>Onboarding</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creators.map((creator) => (
            <CreatorRowItem key={creator._id} creator={creator} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CreatorRowItem({ creator }: { creator: CreatorRow }) {
  const setCreatorStatus = useMutation(api.admin.setCreatorStatus);
  const recompute = useMutation(api.admin.recomputeCreatorBalances);
  const [busy, setBusy] = useState<"status" | "recompute" | null>(null);

  const onboarding = ONBOARDING_COPY[creator.onboardingStatus];

  async function handleSetStatus(status: "active" | "suspended") {
    setBusy("status");
    try {
      await setCreatorStatus({ creatorId: creator._id, status });
      toast.success(
        status === "suspended"
          ? `@${creator.username} suspended`
          : `@${creator.username} reactivated`,
      );
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleRecompute() {
    setBusy("recompute");
    try {
      const result = await recompute({ creatorId: creator._id });
      toast.success(
        `Balances recomputed for @${creator.username}: pending ${formatMoney(
          result.pending,
          creator.currency,
        )}, available ${formatMoney(result.available, creator.currency)} — ${
          result.entriesScanned
        } ledger entries scanned${result.truncated ? " (capped)" : ""}`,
      );
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-normal">
        <Link
          href={`/${creator.username}`}
          className="font-medium hover:underline"
        >
          @{creator.username}
        </Link>
        <div className="text-xs text-muted-foreground">{creator.displayName}</div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {creator.email ?? "—"}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={
            creator.status === "active"
              ? "border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-0 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }
        >
          {creator.status === "active" ? "Active" : "Suspended"}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">
            Pending{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(creator.balancePending, creator.currency)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Available{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(creator.balanceAvailable, creator.currency)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Paid out{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(creator.balancePaidOut, creator.currency)}
            </span>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={`border-0 ${onboarding.className}`}>
          {onboarding.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 whitespace-nowrap">
          {creator.status === "active" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy !== null}
                >
                  Suspend
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Suspend @{creator.username}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Their page stops accepting support and the donate form is
                    hidden. You can reactivate them at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleSetStatus("suspended")}
                  >
                    Suspend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void handleSetStatus("active")}
            >
              Reactivate
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={() => void handleRecompute()}
          >
            {busy === "recompute" ? <Spinner /> : null}
            Recompute balances
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
