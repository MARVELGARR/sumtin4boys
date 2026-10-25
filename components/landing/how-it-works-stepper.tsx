"use client";

import { useState } from "react";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  CheckBuddy,
  CoinBuddy,
  DrumBuddy,
  SparkBuddy,
  SunBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const STEPS = [
  {
    step: "01",
    icon: SunBuddy,
    title: "Claim your username",
    shortDesc: "Pick your custom handle in under 60 seconds.",
    fullDesc:
      "Your page goes live instantly at anything4boys.com/yourname. Choose your bread price (e.g. ₦1,000, ₦2,500), set an optional goal, and personalise your bio.",
    preview: {
      tag: "Live handle",
      headline: "anything4boys.com/amara",
      body: "Amara Okonkwo · Food storyteller & content creator",
      detail: "Bread price set to ₦1,500 · Goal: new camera for market stories",
    },
  },
  {
    step: "02",
    icon: DrumBuddy,
    title: "Drop link in your bio & content",
    shortDesc: "Share wherever your audience hangs out.",
    fullDesc:
      "Paste your link in your Twitter/X bio, Instagram stories, TikTok captions, WhatsApp status, or anywhere your people dey. Fans don't need to install any app.",
    preview: {
      tag: "1-tap access",
      headline: "“This one sweet you? Tear small bread.”",
      body: "anything4boys.com/amara",
      detail: "Zero friction · supporters check out with Bachs in 3 taps",
    },
  },
  {
    step: "03",
    icon: CoinBuddy,
    title: "Get paid & withdraw to your bank",
    shortDesc: "Receive instant notifications & direct payouts.",
    fullDesc:
      "Watch supportive messages and money land in real-time. Request payouts directly to your Nigerian commercial bank account or mobile wallet whenever you want.",
    preview: {
      tag: "Instant payout",
      headline: "₦45,000 payout complete",
      body: "Dispatched to Access Bank · Amara O. (0092****12)",
      detail: "Processed with Bachs payment infrastructure",
    },
  },
] as const;

const PREVIEW_ICONS = [SunBuddy, DrumBuddy, CoinBuddy] as const;

export function HowItWorksStepper() {
  const [activeStep, setActiveStep] = useState(0);

  const current = STEPS[activeStep];
  const PreviewIcon = PREVIEW_ICONS[activeStep] ?? SunBuddy;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <Badge
          variant="secondary"
          className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30 px-3.5 py-1 text-xs font-semibold text-foreground"
        >
          <SparkBuddy className="size-4" />
          No long talk · 3 steps
        </Badge>
        <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Three steps to your first bread
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          From an empty profile to receiving your first direct support in less
          than two minutes.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Step selector buttons */}
        <div className="space-y-3 lg:col-span-6">
          {STEPS.map((s, index) => {
            const isActive = activeStep === index;
            const Icon = s.icon;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(index)}
                aria-pressed={isActive}
                className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 sm:p-5 ${
                  isActive
                    ? "border-primary bg-card shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                    : "border-[var(--toy-ink)]/10 bg-card/40 hover:border-[var(--toy-ink)]/20 hover:bg-card"
                }`}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                    isActive
                      ? "border-primary/30 bg-[var(--toy-ochre)]/45"
                      : "border-[var(--toy-ink)]/10 bg-muted/60"
                  }`}
                >
                  <Icon className="size-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary">
                      STEP {s.step}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                        Viewing
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-0.5 font-toy text-base font-bold text-foreground sm:text-lg">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {isActive ? s.fullDesc : s.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic visual mockup preview */}
        <div className="lg:col-span-6">
          <Card className="toy-card relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-[var(--toy-ochre)]/15 p-6 shadow-xl shadow-primary/5 sm:p-8">
            <AnkaraPattern id="how-it-works-preview" opacity={0.1} />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-[var(--toy-ink)]/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[var(--toy-coral)]" />
                  <span className="size-3 rounded-full bg-[var(--toy-ochre)]" />
                  <span className="size-3 rounded-full bg-[var(--toy-leaf)]" />
                </div>
                <Badge
                  variant="outline"
                  className="h-auto border-[var(--toy-ink)]/10 bg-background/60 font-mono text-xs text-foreground"
                >
                  {current.preview.tag}
                </Badge>
              </div>

              <div className="space-y-4 py-8">
                <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 shadow-inner">
                  <PreviewIcon size={40} />
                </div>

                <div>
                  <h4 className="font-toy text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {current.preview.headline}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {current.preview.body}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {current.preview.detail}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-4 text-xs text-muted-foreground">
                  <CheckBuddy className="size-5 shrink-0" />
                  <span>Step {current.step} automated &amp; no wahala.</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
