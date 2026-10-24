"use client";

import Link from "next/link";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { SearchX } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { DonateCard } from "@/components/creator/donate-card";
import { SupportersFeed } from "@/components/creator/supporters-feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";

/** Client view of the public creator page, fed by a server `preloadQuery`. */
export function CreatorPage({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.creators.getByUsername>;
}) {
  const { creator, recentDonations } = usePreloadedQuery(preloaded);

  if (creator === null) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{"This page doesn't exist"}</EmptyTitle>
            <EmptyDescription>
              There is no creator with this username. Double-check the link, or
              head back to the homepage to find someone to support.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const initial =
    creator.displayName.trim().charAt(0).toUpperCase() ||
    creator.username.charAt(0).toUpperCase();

  const goalAmount =
    creator.goalAmount !== undefined && creator.goalAmount > 0
      ? creator.goalAmount
      : null;
  const goalPercent =
    goalAmount === null
      ? null
      : Math.min(100, Math.round((creator.totalRaised / goalAmount) * 100));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      {/* Profile header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-16">
          {creator.avatarUrl ? (
            <AvatarImage src={creator.avatarUrl} alt={creator.displayName} />
          ) : null}
          <AvatarFallback className="text-xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            {creator.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">@{creator.username}</p>
          {creator.bio ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {creator.bio}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="tabular-nums font-medium text-foreground">
              {creator.totalSupporters}
            </span>{" "}
            {creator.totalSupporters === 1 ? "supporter" : "supporters"}
            {" · "}
            <span className="tabular-nums font-medium text-foreground">
              {formatMoney(creator.totalRaised, creator.currency)}
            </span>{" "}
            raised
          </p>
        </div>
      </header>

      {/* Goal progress */}
      {goalPercent !== null && goalAmount !== null ? (
        <section className="mt-6 max-w-2xl" aria-label="Support goal progress">
          <Progress value={goalPercent} className="h-2" />
          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              <span className="tabular-nums font-medium text-foreground">
                {formatMoney(creator.totalRaised, creator.currency)}
              </span>{" "}
              of {formatMoney(goalAmount, creator.currency)} goal
            </span>
            <span className="tabular-nums font-medium text-foreground">
              {goalPercent}%
            </span>
          </div>
        </section>
      ) : null}

      {/* Two columns on desktop, stacked on mobile */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="lg:order-2">
          {creator.status === "suspended" ? (
            <Card>
              <CardHeader>
                <CardTitle>Not accepting support right now</CardTitle>
                <CardDescription>
                  {creator.displayName} has paused new support on this page.
                  You can still read the messages below — check back soon.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <DonateCard
              username={creator.username}
              displayName={creator.displayName}
              coffeePrice={creator.coffeePrice}
              currency={creator.currency}
            />
          )}
        </div>
        <div className="lg:order-1">
          <SupportersFeed
            donations={recentDonations}
            displayName={creator.displayName}
          />
        </div>
      </div>
    </div>
  );
}

/** Loading placeholder used while the preloaded payload streams in. */
export function CreatorPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mt-6 max-w-2xl">
        <Skeleton className="h-2 w-full" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Skeleton className="h-96 w-full lg:order-2" />
        <Skeleton className="h-72 w-full lg:order-1" />
      </div>
    </div>
  );
}
