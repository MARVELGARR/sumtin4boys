"use client";

import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  BreadBuddy,
  HeartBuddy,
  MessageBuddy,
} from "@/components/brand/toy-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney, formatRelativeTime } from "@/lib/format";

type PublicDonation =
  FunctionReturnType<typeof api.creators.getByUsername>["recentDonations"][number];

const INITIAL_VISIBLE = 6;

/**
 * The public "kind words" wall on a creator page. Shows recent paid, public
 * donations — messages, bread counts and small amounts — with a local
 * "show all" control so the wall stays scannable on mobile.
 */
export function SupportersFeed({
  donations,
  displayName,
}: {
  donations: PublicDonation[];
  displayName: string;
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const sorted = [...donations].sort(
    (a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0),
  );
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <Card className="toy-card relative overflow-hidden">
      <AnkaraPattern id="kind-words-wall" opacity={0.1} />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-toy text-xl">
              <HeartBuddy size={24} />
              Kind words
            </CardTitle>
            <CardDescription>
              Small breads and messages from {displayName}&apos;s people.
            </CardDescription>
          </div>
          {sorted.length > 0 ? (
            <Badge
              variant="secondary"
              className="h-auto shrink-0 gap-1 border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-2.5 py-1 text-[10px] font-semibold text-foreground"
            >
              <MessageBuddy className="size-3.5" />
              {sorted.length}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="relative">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--toy-ink)]/20 bg-background/60 p-6 text-center">
            <BreadBuddy size={48} className="mx-auto" />
            <p className="mt-3 font-toy text-base font-semibold">
              No bread torn yet — be the first.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your kind word could be the one that makes their day.
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {visible.map((donation) => (
                <KindWordCard key={donation._id} donation={donation} />
              ))}
            </ul>

            <div className="mt-4 flex flex-col items-center gap-2">
              {sorted.length > INITIAL_VISIBLE ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-2 border-[var(--toy-ink)]/10 bg-background/70"
                  onClick={() =>
                    setVisibleCount(hasMore ? sorted.length : INITIAL_VISIBLE)
                  }
                >
                  {hasMore
                    ? `Show all ${sorted.length} kind words`
                    : "Show fewer kind words"}
                </Button>
              ) : null}
              <p className="text-center text-[11px] text-muted-foreground">
                Only public, paid messages appear here. Private support stays
                private.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function KindWordCard({ donation }: { donation: PublicDonation }) {
  const initial = donation.supporterName.trim().charAt(0).toUpperCase() || "?";

  return (
    <li className="flex h-full flex-col rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-background/75 p-4 shadow-[0_3px_0_rgba(42,23,15,0.06)]">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9 border-2 border-[var(--toy-ochre)]/50">
          <AvatarFallback className="bg-[var(--toy-ochre)]/35 text-xs font-bold text-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold [overflow-wrap:anywhere]">
            {donation.supporterName}
          </p>
          {donation.paidAt !== undefined ? (
            <p className="text-[11px] text-muted-foreground">
              {formatRelativeTime(donation.paidAt)}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className="h-auto shrink-0 gap-1 border-[var(--toy-ink)]/10 bg-[var(--toy-cream)]/70 px-2 py-1 text-[10px] font-semibold text-foreground"
        >
          <BreadBuddy className="size-3.5" />
          {donation.quantity}
        </Badge>
      </div>

      {donation.message ? (
        <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
          &ldquo;{donation.message}&rdquo;
        </blockquote>
      ) : (
        <p className="mt-3 flex-1 text-sm italic text-muted-foreground">
          No message — just pure love.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--toy-ink)]/10 pt-2.5 text-[11px] text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">
          {formatMoney(donation.amount, donation.currency)}
        </span>
        <span>
          {donation.quantity} {donation.quantity === 1 ? "bread" : "breads"}
        </span>
      </div>
    </li>
  );
}
