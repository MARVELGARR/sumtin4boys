"use client";

import { useState } from "react";
import {
  CheckBuddy,
  CoinBuddy,
  DrumBuddy,
  SunBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";

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
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          No long talk · 3 steps
        </p>
        <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Three steps to your first bread
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          From an empty profile to receiving your first direct support in less
          than two minutes.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
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
                className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition-colors sm:p-5 ${
                  isActive
                    ? "border-primary bg-card"
                    : "border-[var(--toy-ink)]/10 bg-background hover:border-[var(--toy-ink)]/30 hover:bg-card"
                }`}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isActive
                      ? "border-primary/30 bg-[var(--toy-ochre)]/25"
                      : "border-[var(--toy-ink)]/10 bg-muted/60"
                  }`}
                >
                  <Icon className="size-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-primary">
                      STEP {s.step}
                    </span>
                    {isActive ? (
                      <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">
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
          <div className="toy-card overflow-hidden rounded-3xl bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[var(--toy-ink)]/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-[var(--toy-coral)]" />
                <span className="size-3 rounded-full bg-[var(--toy-ochre)]" />
                <span className="size-3 rounded-full bg-[var(--toy-leaf)]" />
              </div>
              <Badge
                variant="outline"
                className="h-auto border-[var(--toy-ink)]/10 bg-background font-mono text-xs text-foreground"
              >
                {current.preview.tag}
              </Badge>
            </div>

            <div className="space-y-4 py-8">
              <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
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
        </div>
      </div>
    </section>
  );
}
