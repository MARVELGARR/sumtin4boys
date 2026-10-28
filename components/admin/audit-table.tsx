"use client";

import { useQuery } from "convex/react";
import { ScrollText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
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

const ID_PREVIEW_LENGTH = 16;

function truncateId(value: string): string {
  return value.length > ID_PREVIEW_LENGTH
    ? `${value.slice(0, ID_PREVIEW_LENGTH)}…`
    : value;
}

export function AuditTable() {
  const entries = useQuery(api.admin.listAuditLog, {});

  if (entries === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScrollText />
          </EmptyMedia>
          <EmptyTitle>No audit events yet</EmptyTitle>
          <EmptyDescription>
            Privileged actions like suspensions, balance recomputes and payout
            decisions will be recorded here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Audit log</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The last {entries.length.toLocaleString()} privileged actions, newest
          first.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto border-y sm:mx-0 sm:rounded-xl sm:border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry._id}>
                <TableCell className="whitespace-normal">
                  <span className="font-mono text-xs">{entry.action}</span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <Badge variant="secondary" className="border-0">
                    {entry.targetType}
                  </Badge>
                  {entry.targetId ? (
                    <div
                      className="mt-1 font-mono text-xs text-muted-foreground"
                      title={entry.targetId}
                    >
                      {truncateId(entry.targetId)}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell
                  className="font-mono text-xs text-muted-foreground"
                  title={entry.actorUserId}
                >
                  {truncateId(entry.actorUserId)}
                </TableCell>
                <TableCell className="max-w-80 whitespace-normal text-muted-foreground">
                  {entry.metadata ? (
                    <span className="line-clamp-2" title={entry.metadata}>
                      {entry.metadata}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
