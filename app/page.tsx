import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Heart,
  Landmark,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { HeroClaimInput } from "@/components/landing/hero-claim-input";
import { InteractivePlayground } from "@/components/landing/interactive-playground";
import { HowItWorksStepper } from "@/components/landing/how-it-works-stepper";
import { EarningsCalculator } from "@/components/landing/earnings-calculator";
import { UseCasesShowcase } from "@/components/landing/use-cases-showcase";
import { FaqSection } from "@/components/landing/faq-section";

const perks = [
  {
    icon: Landmark,
    title: "Direct bank payouts",
    description: "Withdraw directly to any Nigerian commercial bank or mobile wallet whenever you want.",
  },
  {
    icon: MessageCircle,
    title: "Live supporter wall",
    description: "See every fan's message and encouragement the instant payment clears.",
  },
  {
    icon: Sparkles,
    title: "Zero monthly fee",
    description: "Free forever to create your page, personalize your link, and set fundraising goals.",
  },
  {
    icon: Zap,
    title: "Instant 60s setup",
    description: "Go from signing up to sharing your live page in under two minutes flat.",
  },
  {
    icon: Heart,
    title: "Zero algorithm games",
    description: "No ads, no algorithmic shadow-bans — just real, direct appreciation from your true supporters.",
  },
  {
    icon: Users,
    title: "Transparent dashboard",
    description: "Full visibility over your earnings ledger, supporters list, and automated payout history.",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      {/* Background ambient glowing orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -top-40 left-1/2 h-[500px] w-[350px] sm:w-[700px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="animate-float-delayed absolute top-1/3 -right-20 h-[400px] w-[300px] sm:w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="animate-float absolute bottom-20 -left-20 h-[350px] w-[300px] sm:w-[450px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* ── 1. Hero Section ───────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32">
        <div className="flex flex-col items-center gap-6 sm:gap-8 text-center">
          {/* Top category pill */}
          <Badge
            variant="secondary"
            className="animate-fade-in-up h-auto max-w-full gap-1.5 whitespace-normal border-primary/20 bg-primary/10 px-3.5 py-1.5 text-center text-[11px] font-medium leading-snug text-primary shadow-sm sm:text-sm"
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span>The tipping platform for African creators &amp; builders</span>
          </Badge>

          {/* Descriptive main headline */}
          <h1 className="animate-fade-in-up max-w-4xl text-3xl font-extrabold tracking-tight text-balance animate-delay-100 sm:text-5xl md:text-6xl lg:text-7xl leading-[1.15]">
            <span className="hero-gradient-text">{APP_TAGLINE}</span>
          </h1>

          {/* Descriptive, crystal-clear explanation */}
          <p className="animate-fade-in-up max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-balance text-muted-foreground animate-delay-200 px-2">
            The friction-free way for developers, podcasters, writers, and digital creators to receive direct tips and love from their community. Share one simple link, let fans tear bread in 3 taps, and withdraw straight into your bank account.
          </p>

          {/* Interactive Username Claim Bar right in the Hero */}
          <div className="animate-fade-in-up w-full flex justify-center animate-delay-300 px-2">
            <HeroClaimInput />
          </div>

          {/* Mobile-optimized action buttons */}
          <div className="animate-fade-in-up flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-3 animate-delay-300 pt-2">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Link href="/signin?flow=signUp">
                <span>Start my free page</span>
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-border/80 hover:bg-muted/50"
            >
              <a href="#demo">Try interactive demo ↓</a>
            </Button>
          </div>

          {/* Trust points row */}
          <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground pt-4">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Instant Bachs/Bank Payouts</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>₦ Naira (NGN) Ready</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>No Monthly Subscription</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>No App Required For Fans</span>
            </span>
          </div>

          {/* Floating bread & coffee emojis animation */}
          <div className="pointer-events-none relative mt-2 flex items-center gap-5 sm:gap-8 select-none" aria-hidden="true">
            <span className="animate-bounce-slow text-3xl sm:text-4xl animate-delay-100">🍞</span>
            <span className="animate-bounce-slow text-4xl sm:text-5xl animate-delay-300">🥐</span>
            <span className="animate-bounce-slow text-3xl sm:text-4xl animate-delay-500">🥖</span>
            <span className="animate-bounce-slow text-2xl sm:text-3xl animate-delay-200">☕</span>
          </div>
        </div>
      </section>

      {/* ── 2. Interactive Live Sandbox (Supporter + Creator Mode) ── */}
      <InteractivePlayground />

      {/* ── 3. Interactive How It Works Stepper ─────────────────── */}
      <HowItWorksStepper />

      {/* ── 4. Interactive Earnings & Goals Calculator ─────────── */}
      <EarningsCalculator />

      {/* ── 5. Interactive Use Cases & Persona Showcase ────────── */}
      <UseCasesShowcase />

      {/* ── 6. Built For Creators Feature Grid ─────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="outline" className="mb-1">Platform Highlights</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="max-w-xl text-muted-foreground text-sm sm:text-base">
            Engineered so you spend 99% of your energy creating and 0% worrying about payment collection.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk, i) => (
            <div
              key={perk.title}
              className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 sm:p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <perk.icon className="size-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-foreground text-base">{perk.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Social Proof & Numbers ─────────────────────────── */}
      <section className="border-y border-border/40 bg-muted/20">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:py-18">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "₦0", label: "Monthly subscription fee" },
              { value: "60s", label: "Average setup time" },
              { value: "3 taps", label: "Checkout for your fans" },
              { value: "24/7", label: "Instant bank settlement" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="text-2xl sm:text-4xl font-extrabold tracking-tight text-primary">
                  {stat.value}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Interactive FAQ Accordion ───────────────────────── */}
      <FaqSection />

      {/* ── 9. Final High-Impact CTA ──────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15 px-6 py-14 text-center sm:px-12 sm:py-20 shadow-xl shadow-primary/5">
          {/* Decorative glowing blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-float absolute -left-20 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-2xl" />
            <div className="animate-float-delayed absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-primary/15 blur-2xl" />
          </div>

          <div className="flex flex-col items-center gap-5 sm:gap-6">
            <span className="text-5xl sm:text-6xl animate-bounce-slow">🍞</span>
            <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Your first bread is one link away
            </h2>
            <p className="max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground">
              Claim your permanent username, drop it in your bio or stories, and give your supporters the easiest way to back your work.
            </p>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center justify-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                <Link href="/signin?flow=signUp">
                  <span>Start my page — it&apos;s free</span>
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="size-4 text-primary" />
              <span>No credit card required · Live in 60 seconds</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
