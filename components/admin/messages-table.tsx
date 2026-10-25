"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appErrorMessage } from "@/lib/format";

type MessageRow = FunctionReturnType<typeof api.contact.listMessages>[number];

const TOPIC_LABEL: Record<MessageRow["topic"], string> = {
  support: "Supporter",
  creator: "Creator",
  payment: "Payment",
  press: "Press",
  other: "Other",
};

const STATUS_STYLE: Record<MessageRow["status"], string> = {
  new: "bg-primary/10 text-primary",
  read: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground line-through",
};

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function MessagesTable() {
  const messages = useQuery(api.contact.listMessages, {});
  const setStatus = useMutation(api.contact.setStatus);

  async function updateStatus(
    messageId: MessageRow["_id"],
    status: MessageRow["status"],
  ) {
    try {
      await setStatus({ messageId, status });
    } catch (error) {
      toast.error(appErrorMessage(error));
    }
  }

  if (messages === undefined) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Mail />
          </EmptyMedia>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyDescription>
            Contact-form submissions will show up here. Support email is optional;
            messages are always stored in this inbox.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="-mx-4 overflow-hidden border-y sm:mx-0 sm:rounded-xl sm:border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead className="hidden md:table-cell">Message</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => (
            <TableRow key={message._id}>
              <TableCell className="min-w-44">
                <div className="font-medium">{message.name}</div>
                <a
                  href={`mailto:${message.email}`}
                  className="break-all text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {message.email}
                </a>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="whitespace-nowrap">
                  {TOPIC_LABEL[message.topic]}
                </Badge>
              </TableCell>
              <TableCell className="hidden max-w-md md:table-cell">
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {message.message}
                </p>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {dateFormatter.format(new Date(message.createdAt))}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`whitespace-nowrap ${STATUS_STYLE[message.status]}`}
                >
                  {message.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {message.status !== "archived" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void updateStatus(
                        message._id,
                        message.status === "new" ? "read" : "archived",
                      )
                    }
                  >
                    {message.status === "new" ? "Mark read" : "Archive"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void updateStatus(message._id, "new")}
                  >
                    Restore
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
