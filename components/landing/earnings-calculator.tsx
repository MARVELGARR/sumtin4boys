"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  BowlBuddy,
  BreadBuddy,
  CoinBuddy,
  DrumBuddy,
  SparkBuddy,
  SunBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PRICE_TIERS = [
  { value: 1000, label: "₦1,000", tag: "Small bread" },
  { value: 2500, label: "₦2,500", tag: "Standard bread" },
  { value: 5000, label: "₦5,000", tag: "Big bread" },
  { value: 10000, label: "₦10,000", tag: "VIP bread" },
];

function getMilestone(monthly: number) {
  if (monthly < 50000) {
    return {
      icon: BowlBuddy,
      text: "Covers monthly data, small chops & transport",
    };
  }
  if (monthly < 150000) {
    return {
      icon: SunBuddy,
      text: "Covers generator fuel, internet & a few subscriptions",
    };
  }
  if (monthly < 350000) {
    return {
      icon: DrumBuddy,
      text: "Upgrades your camera, laptop, or shop setup",
    };
  }
  return {
    icon: SparkBuddy,
    text: "Full-time creator freedom — rent, equipment, and small savings",
  };
}

export function EarningsCalculator() {
  const [supporters, setSupporters] = useState(50);
  const [breadPrice, setBreadPrice] = useState(2500);

  const monthlyTotal = supporters * breadPrice;
  const yearlyTotal = monthlyTotal * 12;
  const milestone = getMilestone(monthlyTotal);
  const MilestoneIcon = milestone.icon;

  return (
    <section className="border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30 px-3.5 py-1 text-xs font-semibold text-foreground"
          >
            <CoinBuddy className="size-4" />
            Check your bread money
          </Badge>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            How much could you earn?
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            You don&apos;t need millions of followers. Even a small, dedicated
            audience tearing small bread creates dependable income.
          </p>
        </div>

        <Card className="toy-card relative mx-auto max-w-4xl overflow-hidden bg-card shadow-xl shadow-primary/5">
          <AnkaraPattern id="calculator-pattern" opacity={0.07} />
          <CardContent className="relative p-5 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Controls column */}
              <div className="space-y-6 lg:col-span-7">
                {/* Supporters slider */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="text-sm font-semibold">
                      Monthly supporters
                    </label>
                    <span className="font-toy text-base font-bold text-primary sm:text-lg">
                      {supporters}{" "}
                      {supporters === 1 ? "supporter" : "supporters"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="500"
                    step="5"
                    value={supporters}
                    onChange={(e) => setSupporters(Number(e.target.value))}
                    className="range-input w-full cursor-pointer"
                    aria-label="Supporter count slider"
                  />
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>5 fans</span>
                    <span>100 fans</span>
                    <span>250 fans</span>
                    <span>500 fans</span>
                  </div>
                </div>

                {/* Bread price selector */}
                <div>
                  <label className="mb-2.5 block text-sm font-semibold">
                    Price per bread
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRICE_TIERS.map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setBreadPrice(tier.value)}
                        aria-pressed={breadPrice === tier.value}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 text-center transition-all ${
                          breadPrice === tier.value
                            ? "border-primary bg-[var(--toy-ochre)]/30 font-bold ring-2 ring-primary/20"
                            : "border-[var(--toy-ink)]/10 bg-card text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <BreadBuddy size={22} />
                        <div className="text-sm font-semibold">{tier.label}</div>
                        <div className="text-[10px]">{tier.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-world impact callout */}
                <div className="flex items-start gap-3 rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/20 p-3.5">
                  <MilestoneIcon className="mt-0.5 size-5 shrink-0" />
                  <p className="text-xs font-medium text-foreground sm:text-sm">
                    {milestone.text}
                  </p>
                </div>
              </div>

              {/* Earnings outcome column */}
              <div className="space-y-5 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-gradient-to-br from-[var(--toy-ochre)]/30 via-[var(--toy-ochre)]/10 to-transparent p-6 text-center lg:col-span-5">
                <div>
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Estimated monthly payout
                  </span>
                  <div className="mt-1 font-toy text-3xl font-extrabold tracking-tight text-primary tabular-nums sm:text-4xl">
                    ₦{monthlyTotal.toLocaleString()}
                  </div>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Straight to your Nigerian bank account
                  </span>
                </div>

                <div className="rounded-xl border-2 border-[var(--toy-ink)]/10 bg-background/80 p-3 backdrop-blur-sm">
                  <span className="text-xs text-muted-foreground">
                    Annualised potential
                  </span>
                  <div className="font-toy text-lg font-bold text-foreground tabular-nums sm:text-xl">
                    ₦{yearlyTotal.toLocaleString()} / year
                  </div>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="h-11 w-full text-sm font-semibold shadow-md shadow-primary/25"
                >
                  <Link href="/signin?flow=signUp">
                    <span>Start my page now</span>
                    <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>

                <p className="text-[11px] text-muted-foreground">
                  Free to set up · Withdraw when you&apos;re ready
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
