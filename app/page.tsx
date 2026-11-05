import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { HOME_FAQS } from "@/lib/faq";
import { SITE_KEYWORDS, faqJsonLd, pageMetadata } from "@/lib/seo";
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

export const metadata: Metadata = pageMetadata({
  title: `Tear small bread. Make somebody's day · ${APP_NAME}`,
  description: APP_DESCRIPTION,
  path: "/",
  keywords: SITE_KEYWORDS,
});

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
      "Free to create your page, set your bread price, and share your link. No subscription — we charge 5% (min ₦20) only when support comes in.",
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

const TRUST_POINTS = [
  "Naira ready",
  "No app for fans",
  "No monthly fee",
  "Bank payouts",
];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      <JsonLd data={faqJsonLd(HOME_FAQS)} />

      {/* ── 1. Hero ───────────────────────────────────────────── */}
      <section className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-8">
          <div className="animate-fade-in-up flex flex-col items-center gap-5 text-center sm:gap-6 lg:items-start lg:text-left">
            <Badge
              variant="secondary"
              className="h-auto max-w-full gap-1.5 whitespace-normal border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-center text-xs font-semibold leading-snug text-foreground sm:text-sm"
            >
              <DanfoBuddy className="size-4 shrink-0" />
              <span>Naija-made · for the boys (and everybody else)</span>
            </Badge>

            <h1 className="font-toy max-w-2xl text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:max-w-3xl lg:text-6xl">
              Tear <span className="text-primary">small bread</span>.
              <span className="block">Make somebody&apos;s day.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
              Support Nigerian creators, artists, writers, cooks, comedians and
              everyday people who make your day sweeter. One link, three taps,
              no app for fans — no wahala.
            </p>

            <div className="flex w-full justify-center lg:justify-start">
              <HeroClaimInput />
            </div>

            <div className="flex w-full flex-wrap items-center justify-center gap-4 sm:w-auto sm:flex-row sm:items-center lg:justify-start">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-6 text-sm font-semibold"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-start">
                {TRUST_POINTS.map((point) => (
                  <span key={point} className="inline-flex items-center gap-1.5">
                    <CheckBuddy className="size-4" />
                    <span>{point}</span>
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              No be by force. Just small bread, if you can.
            </p>
          </div>

          {/* Bread-first hero visual */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative">
              <BreadHeroArt className="w-full drop-shadow-sm" />

              <ToySticker
                tone="ochre"
                className="absolute -left-2 top-7 -rotate-6 px-3 py-2 sm:-left-4"
              >
                <BreadBuddy size={26} />
                <span className="font-toy text-xs font-semibold sm:text-sm">
                  Small bread, soft life
                </span>
              </ToySticker>

              <ToySticker
                tone="cream"
                className="absolute -right-1 bottom-20 rotate-3 px-3 py-2 sm:-right-3"
              >
                <MessageBuddy size={26} />
                <span className="font-toy text-xs font-semibold sm:text-sm">
                  No be by force
                </span>
              </ToySticker>

              <ToySticker
                tone="ochre"
                className="absolute bottom-2 left-4 -rotate-2 px-3 py-2"
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
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Platform highlights
          </p>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Built so you can spend your energy creating — not chasing payments,
            posting ads, or doing account gymnastics.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk) => (
            <div
              key={perk.title}
              className="flex items-start gap-4 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5 transition-colors hover:border-[var(--toy-ink)]/25"
            >
              <ToySticker
                tone="ochre"
                className="size-11 shrink-0 p-0"
              >
                <perk.icon className="size-6" />
              </ToySticker>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-toy text-base font-bold text-foreground">
                  {perk.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. Social proof & numbers ─────────────────────────── */}
      <section className="border-t border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
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
                <span className="font-toy text-4xl font-bold tracking-tight text-primary sm:text-5xl">
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
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="toy-card relative overflow-hidden rounded-3xl bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
          <AnkaraPattern id="landing-cta" opacity={0.12} />

          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
            <ToySticker tone="cream" className="size-16 rotate-3 p-0">
              <BreadBuddy size={48} />
            </ToySticker>
            <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Your first bread is one link away
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Claim your permanent username, drop it in your bio or stories, and
              give your people the easiest way to back your work.{" "}
              <span className="font-medium text-foreground">
                {APP_NAME}
              </span>{" "}
              is built for the small small support that adds up.
            </p>
            <Button
              asChild
              size="lg"
              className="h-11 px-6 text-sm font-semibold"
            >
              <Link href="/signin?flow=signUp">
                <span>Start my page — it&apos;s free</span>
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>No credit card required · Live in 60 seconds</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {APP_TAGLINE}. No pressure, no wahala.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
