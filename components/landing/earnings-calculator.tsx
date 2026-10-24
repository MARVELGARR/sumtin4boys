"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Check, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PRICE_TIERS = [
  { value: 1000, label: "₦1,000", tag: "Small Bread 🍞" },
  { value: 2500, label: "₦2,500", tag: "Standard Bread 🥖" },
  { value: 5000, label: "₦5,000", tag: "Big Bread 🥐" },
  { value: 10000, label: "₦10,000", tag: "VIP Bread 🥪" },
];

export function EarningsCalculator() {
  const [supporters, setSupporters] = useState(50);
  const [breadPrice, setBreadPrice] = useState(2500);

  const monthlyTotal = supporters * breadPrice;
  const yearlyTotal = monthlyTotal * 12;

  // Real world milestone comparison
  function getMilestone(monthly: number) {
    if (monthly < 50000) {
      return "☕ Covers monthly coffee, energy drinks & server hosting bills";
    } else if (monthly < 150000) {
      return "⚡ Covers monthly generator fuel, 5G fiber internet & subscriptions";
    } else if (monthly < 350000) {
      return "🎙️ Upgrades your camera, podcast mic, and desk workspace setup";
    } else {
      return "🚀 Full-time creator freedom! Covers rent, equipment, and savings";
    }
  }

  return (
    <section className="border-y border-border/40 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="gap-1.5 border-primary/20 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold"
          >
            <Calculator className="size-3.5" />
            Earnings Simulator
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            How much could you earn?
          </h2>
          <p className="max-w-xl text-base sm:text-lg text-muted-foreground">
            You don&apos;t need millions of followers. Even a small, dedicated audience tearing small bread creates dependable income.
          </p>
        </div>

        <Card className="mx-auto max-w-4xl overflow-hidden border-border/80 bg-card shadow-xl shadow-primary/5">
          <CardContent className="p-5 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Controls Column */}
              <div className="space-y-6 lg:col-span-7">
                {/* Supporters Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">
                      Monthly Supporters
                    </label>
                    <span className="font-mono text-base sm:text-lg font-bold text-primary">
                      {supporters} {supporters === 1 ? "supporter" : "supporters"}
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
                  <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                    <span>5 fans</span>
                    <span>100 fans</span>
                    <span>250 fans</span>
                    <span>500 fans</span>
                  </div>
                </div>

                {/* Bread Price Selector */}
                <div>
                  <label className="text-sm font-semibold block mb-2.5">
                    Price per Bread
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRICE_TIERS.map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => setBreadPrice(tier.value)}
                        className={`rounded-xl p-2.5 text-center border transition-all ${
                          breadPrice === tier.value
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm font-bold"
                            : "border-border/70 bg-card hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="text-sm font-semibold">{tier.label}</div>
                        <div className="text-[10px] mt-0.5">{tier.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-world Impact Callout */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
                  <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm font-medium text-foreground">
                    {getMilestone(monthlyTotal)}
                  </p>
                </div>
              </div>

              {/* Earnings Outcome Column */}
              <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center space-y-5">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estimated Monthly Payout
                  </span>
                  <div className="mt-1 font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">
                    ₦{monthlyTotal.toLocaleString()}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 block">
                    Straight to your Nigerian bank account
                  </span>
                </div>

                <div className="rounded-xl bg-background/80 p-3 border border-border/50 backdrop-blur-sm">
                  <span className="text-xs text-muted-foreground">Annualized potential</span>
                  <div className="font-mono text-lg sm:text-xl font-bold text-foreground">
                    ₦{yearlyTotal.toLocaleString()} / year
                  </div>
                </div>

                <Button asChild size="lg" className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/25">
                  <Link href="/signin?flow=signUp">
                    <span>Start my page now</span>
                    <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>

                <p className="text-[11px] text-muted-foreground">
                  Free to set up · Withdraw anytime with zero holding periods
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
