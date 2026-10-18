"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Activity, Webhook } from "lucide-react";
import { api } from "@/convex/_generated/api";
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
import { formatDateTime } from "@/lib/format";

const MAX_ID_LENGTH = 16;

function truncateId(value: string): string {
  return value.length > MAX_ID_LENGTH
    ? `${value.slice(0, MAX_ID_LENGTH)}…`
    : value;
}

const SOURCE_LABELS: Record<
  FunctionReturnType<typeof api.admin.listWebhookEvents>[number]["source"],
  string
> = {
  webhook: "Webhook",
  reconcile: "Reconcile",
  simulated: "Simulated",
};

const OP_STATUS_MAP: Record<
  FunctionReturnType<typeof api.admin.listApiOperations>[number]["status"],
  { label: string; className: string }
> = {
  started: {
    label: "Started",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  succeeded: {
    label: "Succeeded",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  outcome_unknown: {
    label: "Unknown",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
};

export function EventsTables() {
  const events = useQuery(api.admin.listWebhookEvents, {});
  const operations = useQuery(api.admin.listApiOperations, {});

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhook events</CardTitle>
          <CardDescription>
            The last 100 events received from Bachs, reconciliation, and the
            simulated driver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events === undefined ? (
            <Skeleton className="h-56 w-full" />
          ) : events.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Webhook />
                </EmptyMedia>
                <EmptyTitle>No events yet</EmptyTitle>
                <EmptyDescription>
                  Webhook and reconcile events will land here as payments flow.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl border">
              <Table>
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead>Checkout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell className="whitespace-normal font-mono text-xs">
                        {event.type}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {SOURCE_LABELS[event.source]}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {event.outcome}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDateTime(event.eventCreatedAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {event.checkoutId ? (
                          <span title={event.checkoutId}>
                            {truncateId(event.checkoutId)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API operations</CardTitle>
          <CardDescription>
            Provider calls with their idempotency state — “Unknown” means the
            outcome was never learned and reconciliation will retry it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operations === undefined ? (
            <Skeleton className="h-56 w-full" />
          ) : operations.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Activity />
                </EmptyMedia>
                <EmptyTitle>No operations yet</EmptyTitle>
                <EmptyDescription>
                  Checkout and payout calls will be logged here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl border">
              <Table>
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((operation) => {
                    const status = OP_STATUS_MAP[operation.status];
                    return (
                      <TableRow key={operation._id}>
                        <TableCell className="whitespace-normal font-mono text-xs">
                          {operation.kind}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`border-0 ${status.className}`}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {operation.attempts}
                        </TableCell>
                        <TableCell className="max-w-[20rem] whitespace-normal text-muted-foreground">
                          {operation.errorCode || operation.errorMessage ? (
                            <span>
                              {operation.errorCode ? (
                                <span className="font-mono text-xs">
                                  {operation.errorCode}
                                </span>
                              ) : null}
                              {operation.errorCode && operation.errorMessage
                                ? " — "
                                : null}
                              {operation.errorMessage ? (
                                <span
                                  title={operation.errorMessage}
                                  className="break-words"
                                >
                                  {operation.errorMessage.length > 80
                                    ? `${operation.errorMessage.slice(0, 80)}…`
                                    : operation.errorMessage}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDateTime(operation.updatedAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
