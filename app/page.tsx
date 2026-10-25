import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { HeroClaimInput } from "@/components/landing/hero-claim-input";
import { InteractivePlayground } from "@/components/landing/interactive-playground";
import { HowItWorksStepper } from "@/components/landing/how-it-works-stepper";
import { EarningsCalculator } from "@/components/landing/earnings-calculator";
import { UseCasesShowcase } from "@/components/landing/use-cases-showcase";
import { FaqSection } from "@/components/landing/faq-section";
import { SlangMarquee } from "@/components/landing/slang-marquee";
import { SupporterPromise } from "@/components/landing/supporter-promise";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import { BreadHeroArt } from "@/components/brand/bread-hero";
import {
  BreadBuddy,
  CheckBuddy,
  CoinBuddy,
  DanfoBuddy,
  HeartBuddy,
  MessageBuddy,
  SparkBuddy,
  SunBuddy,
  ToySticker,
} from "@/components/brand/toy-icons";

const perks = [
  {
    icon: CoinBuddy,
    title: "Direct bank payouts",
    description:
      "Withdraw to any Nigerian commercial bank or mobile wallet. No PayPal wahala, no long story.",
  },
  {
    icon: MessageBuddy,
    title: "Kind words wall",
    description:
      "Every supporter message lands on your page the moment payment clears — a public wall of love.",
  },
  {
    icon: SparkBuddy,
    title: "Zero monthly fee",
    description:
      "Free to create your page, set your bread price, and share your link. No subscription. Na your money.",
  },
  {
    icon: SunBuddy,
    title: "Instant 60s setup",
    description:
      "Go from signing up to sharing your live page in under two minutes flat.",
  },
  {
    icon: HeartBuddy,
    title: "No gatekeepers",
    description:
      "No ads, no middlemen — just real, direct appreciation from your true supporters.",
  },
  {
    icon: CheckBuddy,
    title: "Transparent dashboard",
    description:
      "See every supporter, kind word, and payout in one clear ledger. No mystery numbers.",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      {/* Background ambient glow + abstract wax-print texture */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnkaraPattern id="landing-hero" opacity={0.08} />
        <div className="animate-float absolute -top-40 left-1/2 h-[500px] w-[350px] -translate-x-1/2 rounded-full bg-[var(--toy-lime)]/35 blur-3xl sm:w-[700px]" />
        <div className="animate-float-delayed absolute top-1/3 -right-20 h-[400px] w-[300px] rounded-full bg-[var(--toy-leaf)]/10 blur-3xl sm:w-[500px]" />
        <div className="animate-float absolute bottom-20 -left-20 h-[350px] w-[300px] rounded-full bg-[var(--toy-bread)]/20 blur-3xl sm:w-[450px]" />
      </div>

      {/* ── 1. Hero ───────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-8">
          <div className="flex flex-col items-center gap-5 text-center sm:gap-6 lg:items-start lg:text-left">
            <Badge
              variant="secondary"
              className="animate-fade-in-up h-auto max-w-full gap-1.5 whitespace-normal border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-foreground shadow-sm sm:text-sm"
            >
              <DanfoBuddy className="size-4 shrink-0" />
              <span>Naija-made · for the boys (and everybody else)</span>
            </Badge>

            <h1 className="font-toy animate-fade-in-up max-w-2xl text-4xl leading-[1.05] font-bold tracking-tight text-balance animate-delay-100 sm:text-6xl lg:max-w-3xl">
              Tear <span className="text-primary">small bread</span>.
              <span className="block">Make somebody&apos;s day.</span>
            </h1>

            <p className="animate-fade-in-up max-w-xl px-2 text-base leading-relaxed text-balance text-muted-foreground animate-delay-200 sm:text-lg lg:px-0">
              Support Nigerian creators, artists, writers, cooks, comedians and
              everyday people who make your day sweeter. One link, three taps,
              no app for fans — no wahala.
            </p>

            <div className="animate-fade-in-up flex w-full animate-delay-300 justify-center px-2 lg:justify-start lg:px-0">
              <HeroClaimInput />
            </div>

            <div className="animate-fade-in-up flex w-full animate-delay-300 flex-col items-stretch justify-center gap-3 pt-1 sm:w-auto sm:flex-row sm:items-center lg:justify-start">
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
                className="h-12 border-2 border-[var(--toy-ink)]/15 bg-background/70 px-8 text-base hover:bg-muted/60"
              >
                <a href="#demo">See supporter flow ↓</a>
              </Button>
            </div>

            <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2 text-xs text-muted-foreground animate-delay-300 sm:text-sm lg:justify-start">
              {[
                "Naira ready",
                "No app for fans",
                "No monthly fee",
                "Bank payouts",
              ].map((point) => (
                <span key={point} className="inline-flex items-center gap-1.5">
                  <CheckBuddy className="size-4" />
                  <span>{point}</span>
                </span>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/80">
              No be by force. Just small bread, if you can.
            </p>
          </div>

          {/* Bread-first hero visual */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute inset-8 rounded-full bg-[var(--toy-lime)]/25 blur-2xl"
              />
              <BreadHeroArt className="relative w-full drop-shadow-sm" />

              <ToySticker
                tone="ochre"
                className="absolute -left-2 top-7 -rotate-6 px-3 py-2 shadow-md sm:-left-4"
              >
                <BreadBuddy size={26} />
                <span className="font-toy text-xs font-semibold sm:text-sm">
                  Small bread, soft life
                </span>
              </ToySticker>

              <ToySticker
                tone="cream"
                className="absolute -right-1 bottom-20 rotate-3 px-3 py-2 shadow-md sm:-right-3"
              >
                <MessageBuddy size={26} />
                <span className="font-toy text-xs font-semibold sm:text-sm">
                  No be by force
                </span>
              </ToySticker>

              <ToySticker
                tone="ochre"
                className="absolute bottom-2 left-4 -rotate-2 px-3 py-2 shadow-md"
              >
                <SunBuddy size={24} />
                <span className="font-toy text-xs font-semibold sm:text-sm">
                  ₦1,000 dey go far
                </span>
              </ToySticker>
            </div>
          </div>
        </div>
      </section>

      <SlangMarquee />

      {/* ── 2. Supporter promise ──────────────────────────────── */}
      <SupporterPromise />

      {/* ── 3. Interactive live sandbox ───────────────────────── */}
      <InteractivePlayground />

      {/* ── 4. How it works ───────────────────────────────────── */}
      <HowItWorksStepper />

      {/* ── 5. Earnings & goals calculator ────────────────────── */}
      <EarningsCalculator />

      {/* ── 6. Use cases ──────────────────────────────────────── */}
      <UseCasesShowcase />

      {/* ── 7. Platform highlights ────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="outline"
            className="mb-1 h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-background/70 px-3 py-1 text-xs font-semibold"
          >
            <SparkBuddy className="size-4" />
            Platform highlights
          </Badge>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Built so you can spend your energy creating — not chasing payments,
            posting ads, or doing account gymnastics.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk, i) => (
            <div
              key={perk.title}
              className="group flex items-start gap-4 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card/90 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-md sm:p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <ToySticker
                tone={i % 2 === 0 ? "ochre" : "cream"}
                className="size-11 shrink-0 p-0"
              >
                <perk.icon className="size-6" />
              </ToySticker>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-toy text-base font-semibold text-foreground">
                  {perk.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Social proof & numbers ─────────────────────────── */}
      <section className="relative overflow-hidden border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/20">
        <AnkaraPattern id="landing-stats" opacity={0.08} />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-14 sm:py-18">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "₦0", label: "Monthly subscription fee" },
              { value: "60s", label: "Average setup time" },
              { value: "3 taps", label: "Checkout for your fans" },
              { value: "1 link", label: "All your support in one place" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span className="font-toy text-3xl font-bold tracking-tight text-primary sm:text-5xl">
                  {stat.value}
                </span>
                <span className="text-xs leading-tight text-muted-foreground sm:text-sm">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── 10. Final CTA ─────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="toy-card relative overflow-hidden rounded-[2rem] bg-[var(--toy-ochre)]/25 px-6 py-14 text-center shadow-xl shadow-primary/5 sm:px-12 sm:py-20">
          <AnkaraPattern id="landing-cta" opacity={0.16} />
          <div className="pointer-events-none absolute inset-0">
            <div className="animate-float absolute -left-20 -top-20 h-44 w-44 rounded-full bg-[var(--toy-lime)]/40 blur-2xl" />
            <div className="animate-float-delayed absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-[var(--toy-bread)]/20 blur-2xl" />
          </div>

          <div className="relative flex flex-col items-center gap-5 sm:gap-6">
            <ToySticker tone="cream" className="size-16 rotate-3 p-0">
              <BreadBuddy size={48} />
            </ToySticker>
            <h2 className="max-w-xl font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Your first bread is one link away
            </h2>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Claim your permanent username, drop it in your bio or stories, and
              give your people the easiest way to back your work.{" "}
              <span className="font-medium text-foreground">
                {APP_NAME}
              </span>{" "}
              is built for the small small support that adds up.
            </p>
            <div className="flex w-full flex-col items-stretch justify-center gap-3 pt-2 sm:w-auto sm:flex-row sm:items-center">
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
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>No credit card required · Live in 60 seconds</span>
            </div>
            <p className="max-w-md text-xs text-muted-foreground/80">
              {APP_TAGLINE}. No pressure, no wahala.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
