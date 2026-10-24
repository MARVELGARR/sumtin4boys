"use client";

import { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Coffee,
  Copy,
  ExternalLink,
  Landmark,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    step: "01",
    icon: AtSign,
    title: "Claim your username",
    shortDesc: "Pick your custom handle in under 60 seconds.",
    fullDesc:
      "Your page goes live instantly at anything4boys.com/yourname. Choose your bread price (e.g. ₦1,000, ₦2,500), set an optional goal, and personalize your bio.",
    preview: {
      tag: "Live Handle",
      headline: "anything4boys.com/amara",
      body: "Amara Okonkwo · UI Designer & Digital Illustrator",
      detail: "Bread price set to ₦1,500 · Goal: New iPad Pro",
    },
  },
  {
    step: "02",
    icon: Share2,
    title: "Drop link in your bio & content",
    shortDesc: "Share wherever your audience hangs out.",
    fullDesc:
      "Paste your link in your Twitter/X bio, Instagram stories, YouTube video descriptions, WhatsApp status, or GitHub README. Fans don't need to install any app.",
    preview: {
      tag: "1-Tap Access",
      headline: "“Enjoyed this thread? Tear small bread 🍞”",
      body: "anything4boys.com/amara",
      detail: "Zero friction · Supporters checkout via Paystack/Bachs in 3 taps",
    },
  },
  {
    step: "03",
    icon: Landmark,
    title: "Get paid & withdraw to your bank",
    shortDesc: "Receive instant notifications & direct payouts.",
    fullDesc:
      "Watch supportive messages and money land in real-time. Request payouts directly to your Nigerian commercial bank account or mobile wallet whenever you want.",
    preview: {
      tag: "Instant Payout",
      headline: "₦45,000 Payout Complete",
      body: "Dispatched to Access Bank · Amara O. (0092****12)",
      detail: "Processed automatically with Bachs payment infrastructure",
    },
  },
];

export function HowItWorksStepper() {
  const [activeStep, setActiveStep] = useState(0);

  const current = STEPS[activeStep];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <Badge
          variant="secondary"
          className="gap-1.5 border-primary/20 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold"
        >
          <Zap className="size-3.5" />
          Simple 3-Step Flow
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Three steps to your first bread
        </h2>
        <p className="max-w-xl text-base sm:text-lg text-muted-foreground">
          From an empty profile to receiving your first direct support in less than two minutes.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
        {/* Step Selector Buttons */}
        <div className="lg:col-span-6 space-y-3">
          {STEPS.map((s, index) => {
            const isActive = activeStep === index;
            const Icon = s.icon;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left rounded-2xl p-4 sm:p-5 border transition-all duration-200 flex items-start gap-4 ${
                  isActive
                    ? "border-primary bg-card shadow-lg shadow-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 bg-card/40 hover:bg-card hover:border-border"
                }`}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary">
                      STEP {s.step}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Viewing
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                    {isActive ? s.fullDesc : s.shortDesc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Visual Mockup Preview */}
        <div className="lg:col-span-6">
          <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 sm:p-8 shadow-xl shadow-primary/10 relative">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
              </div>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                {current.preview.tag}
              </Badge>
            </div>

            <div className="py-8 space-y-4">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl shadow-inner">
                {activeStep === 0 ? "✨" : activeStep === 1 ? "🔗" : "🏦"}
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {current.preview.headline}
                </h4>
                <p className="text-sm font-medium text-primary mt-1">
                  {current.preview.body}
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {current.preview.detail}
                </p>
              </div>

              <div className="pt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Step {current.step} automated &amp; zero-hassle</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
