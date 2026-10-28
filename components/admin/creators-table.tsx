"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Search, Users } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { CreatorDetailSheet } from "@/components/admin/creator-detail-sheet";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn } from "@/lib/utils";

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

const STATUS_FILTERS = ["all", "active", "suspended"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  active: "Active",
  suspended: "Suspended",
};

const ONBOARDING_FILTERS = [
  "all",
  "not_started",
  "pending",
  "enabled",
  "blocked",
] as const;
type OnboardingFilter = (typeof ONBOARDING_FILTERS)[number];

const ONBOARDING_FILTER_LABELS: Record<OnboardingFilter, string> = {
  all: "All onboarding",
  not_started: "Not started",
  pending: "Pending",
  enabled: "Enabled",
  blocked: "Blocked",
};

export function CreatorsTable() {
  const creators = useQuery(api.admin.listCreators, {});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [onboarding, setOnboarding] = useState<OnboardingFilter>("all");
  const [selectedCreatorId, setSelectedCreatorId] =
    useState<Id<"creators"> | null>(null);

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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCreators = creators.filter((creator) => {
    if (status !== "all" && creator.status !== status) return false;
    if (onboarding !== "all" && creator.onboardingStatus !== onboarding) {
      return false;
    }
    if (normalizedSearch === "") return true;

    return (
      creator.username.toLowerCase().includes(normalizedSearch) ||
      creator.displayName.toLowerCase().includes(normalizedSearch) ||
      (creator.email?.toLowerCase().includes(normalizedSearch) ?? false)
    );
  });

  const filtersActive =
    normalizedSearch !== "" || status !== "all" || onboarding !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setOnboarding("all");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search username, name or email"
            aria-label="Search creators"
            className="pl-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as StatusFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-36"
              aria-label="Filter creators by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_FILTER_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={onboarding}
            onValueChange={(value) => setOnboarding(value as OnboardingFilter)}
          >
            <SelectTrigger
              className="w-full sm:w-40"
              aria-label="Filter creators by onboarding status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ONBOARDING_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {ONBOARDING_FILTER_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {filteredCreators.length.toLocaleString()} of{" "}
          {creators.length.toLocaleString()} creators
        </p>
      </div>

      {creators.length >= 100 ? (
        <p className="text-xs text-muted-foreground">
          Showing up to the 100 most recent creators. Older creator accounts are
          not included in this list.
        </p>
      ) : null}

      {filteredCreators.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No creators match these filters</EmptyTitle>
            <EmptyDescription>
              Try a different username, display name, email or status.
            </EmptyDescription>
          </EmptyHeader>
          {filtersActive ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="-mx-4 overflow-x-auto border-y sm:mx-0 sm:rounded-xl sm:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Balances</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreators.map((creator) => (
                <CreatorRowItem
                  key={creator._id}
                  creator={creator}
                  onManage={setSelectedCreatorId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatorDetailSheet
        creatorId={selectedCreatorId}
        open={selectedCreatorId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCreatorId(null);
        }}
      />
    </div>
  );
}

function CreatorRowItem({
  creator,
  onManage,
}: {
  creator: CreatorRow;
  onManage: (creatorId: Id<"creators">) => void;
}) {
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
        <div className="text-xs text-muted-foreground">
          {creator.displayName}
        </div>
      </TableCell>
      <TableCell className="max-w-56 break-all whitespace-normal text-muted-foreground">
        {creator.email ?? "—"}
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={cn(
            "border-0",
            creator.status === "active"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
          )}
        >
          {creator.status === "active" ? "Active" : "Suspended"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={cn("border-0", onboarding.className)}
        >
          {onboarding.label}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-col gap-0.5 text-xs">
          <BalanceLine
            label="Pending / held"
            value={formatMoney(creator.balancePending, creator.currency)}
          />
          <span className="text-muted-foreground">
            Next unlock{" "}
            <span className="font-medium text-foreground">
              {creator.nextSettlementAt
                ? formatDateTime(creator.nextSettlementAt)
                : "—"}
            </span>
          </span>
          <BalanceLine
            label="Available"
            value={formatMoney(creator.balanceAvailable, creator.currency)}
          />
          <BalanceLine
            label="Paid out"
            value={formatMoney(creator.balancePaidOut, creator.currency)}
          />
          <BalanceLine
            label="Awaiting"
            value={formatMoney(creator.payoutsAwaiting, creator.currency)}
          />
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        <div className="font-medium tabular-nums">
          {formatMoney(creator.totalRaised, creator.currency)}
        </div>
        <div className="text-xs text-muted-foreground">
          {creator.totalSupporters.toLocaleString()}{" "}
          {creator.totalSupporters === 1 ? "supporter" : "supporters"}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManage(creator._id)}
          >
            Manage
          </Button>
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
                    Their page stops accepting bread and the donate form is
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
            Recompute
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function BalanceLine({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-muted-foreground">
      {label}{" "}
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </span>
  );
}
