"use client";

import Link from "next/link";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  BreadBuddy,
  HeartBuddy,
  SearchBuddy,
} from "@/components/brand/toy-icons";
import { DonateCard } from "@/components/creator/donate-card";
import { SupportersFeed } from "@/components/creator/supporters-feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        <Empty className="toy-card border-2 border-[var(--toy-ink)]/10 bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchBuddy className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="font-toy text-2xl">
              This page doesn&apos;t exist
            </EmptyTitle>
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
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-10">
      {/* Profile header */}
      <header className="toy-card relative overflow-hidden rounded-[2rem] bg-card/90 p-5 sm:p-7">
        <AnkaraPattern id="creator-profile" opacity={0.12} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <Avatar className="size-20 border-4 border-[var(--toy-ochre)] shadow-md sm:size-24">
            {creator.avatarUrl ? (
              <AvatarImage src={creator.avatarUrl} alt={creator.displayName} />
            ) : null}
            <AvatarFallback className="bg-[var(--toy-ochre)] text-2xl font-bold text-[var(--toy-ink)] sm:text-3xl">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-toy text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
                {creator.displayName}
              </h1>
              <Badge
                variant="secondary"
                className="h-auto gap-1 border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-2.5 py-1 text-[10px] font-semibold text-foreground"
              >
                <BreadBuddy className="size-3.5" />
                Small bread welcome
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              @{creator.username}
            </p>
            {creator.bio ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {creator.bio}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <HeartBuddy className="size-4" />
                <span className="tabular-nums font-semibold text-foreground">
                  {creator.totalSupporters}
                </span>{" "}
                {creator.totalSupporters === 1 ? "supporter" : "supporters"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BreadBuddy className="size-4" />
                <span className="tabular-nums font-semibold text-foreground">
                  {formatMoney(creator.totalRaised, creator.currency)}
                </span>{" "}
                raised
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Goal progress */}
      {goalPercent !== null && goalAmount !== null ? (
        <section
          className="mt-5 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card/75 p-4 sm:p-5"
          aria-label="Support goal progress"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-toy text-base font-semibold">
              Goal: {formatMoney(goalAmount, creator.currency)}
            </span>
            <Badge
              variant="secondary"
              className="h-auto gap-1 border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-2.5 py-1 text-[10px] font-semibold text-foreground"
            >
              <span className="tabular-nums">{goalPercent}%</span>
            </Badge>
          </div>
          <Progress
            value={goalPercent}
            className="mt-2.5 h-3 bg-[var(--toy-ochre)]/25"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              <span className="tabular-nums font-semibold text-foreground">
                {formatMoney(creator.totalRaised, creator.currency)}
              </span>{" "}
              raised so far · small small dey go far
            </span>
          </div>
        </section>
      ) : null}

      {/* Two columns on desktop, stacked on mobile. The donate card comes first
          on mobile so the primary action is never buried under the wall. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="lg:order-2">
          {creator.status === "suspended" ? (
            <Card className="toy-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-toy text-xl">
                  <BreadBuddy size={26} />
                  Support is resting
                </CardTitle>
                <CardDescription>
                  {creator.displayName} has paused new support on this page. You
                  can still read the kind words — check back soon.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <DonateCard
              username={creator.username}
              displayName={creator.displayName}
              breadPrice={creator.breadPrice}
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
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mt-6 max-w-2xl">
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Skeleton className="h-96 w-full lg:order-2" />
        <Skeleton className="h-72 w-full lg:order-1" />
      </div>
    </div>
  );
}
