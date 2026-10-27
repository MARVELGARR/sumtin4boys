import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import { BreadBuddy, CheckBuddy, HeartBuddy } from "@/components/brand/toy-icons";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const LAST_REVIEWED = "2026-10-25";

export const metadata: Metadata = pageMetadata({
  title: "About — small bread for Nigerian creators",
  description:
    "Why anything4boys exists, what “tear small bread” means, how creator payouts work, and who writes and maintains this Nigerian creator-support platform.",
  path: "/about",
  keywords: [
    "about anything4boys",
    "Nigerian creator support platform",
    "tear small bread meaning",
    "support Naija creators",
    "creator tipping Nigeria",
  ],
  type: "article",
});

const VALUES = [
  {
    icon: Heart,
    title: "Support stays voluntary",
    body: "Nobody owes anybody bread. Supporters give because they want to, and creators never have to chase, guilt-trip, or beg. If it is not from the heart, it is not support.",
  },
  {
    icon: Scale,
    title: "Dignity is the default",
    body: "A creator page should feel like a front door, not a charity bucket. Creators set the tone, write their own story, and choose what to share publicly.",
  },
  {
    icon: Wallet,
    title: "The money should make sense",
    body: "Every support is recorded in minor units, every payout is traceable, and the dashboard shows the same numbers our team sees. No mystery deductions.",
  },
  {
    icon: ShieldCheck,
    title: "Small is not careless",
    body: "We would rather ship a careful payment flow than a flashy one. Card details stay with the payment provider; account security and payout checks are not optional.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "A supporter picks a creator",
    body: "They open a creator link from a bio, a group chat, or a friend. No account, app, or password is needed to support.",
  },
  {
    number: "02",
    title: "They choose their bread",
    body: "The supporter selects how many loaves to tear, adds an optional kind word, and pays securely through Bachs.",
  },
  {
    number: "03",
    title: "The creator requests a payout",
    body: "Confirmed support lands in the creator dashboard. When they are ready, the creator requests a payout to their linked Nigerian bank account or mobile wallet.",
  },
];

export default function AboutPage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About anything4boys",
          url: absoluteUrl("/about"),
          description:
            "The story, values, and money flow behind anything4boys, a Nigerian creator-support platform built around the idea of tearing small bread.",
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          about: { "@id": `${absoluteUrl("/")}#organization` },
          author: {
            "@type": "Organization",
            name: `${APP_NAME} team`,
            url: absoluteUrl("/about/author"),
          },
          dateModified: LAST_REVIEWED,
          inLanguage: "en-NG",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnkaraPattern id="about-hero" opacity={0.06} />
        <div className="absolute -top-32 right-0 h-[420px] w-[320px] rounded-full bg-[var(--toy-lime)]/30 blur-3xl sm:w-[560px]" />
        <div className="absolute top-1/3 -left-24 h-[320px] w-[280px] rounded-full bg-[var(--toy-bread)]/20 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
          <div className="flex flex-col items-center gap-5 text-center sm:gap-6 lg:items-start lg:text-left">
            <Badge
              variant="secondary"
              className="h-auto max-w-full gap-1.5 whitespace-normal border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-foreground shadow-sm sm:text-sm"
            >
              <BreadBuddy className="size-4 shrink-0" />
              <span>About the bread · made in Nigeria</span>
            </Badge>

            <h1 className="max-w-2xl font-toy text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Small bread.
              <span className="block text-primary">Real people.</span>
              <span className="block">No wahala.</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
              {APP_NAME} is a simple way for people to support Nigerian
              creators, artists, writers, cooks, students, and everyday people
              they love. One link. A few taps. A small, voluntary gift that says:
              <span className="font-medium text-foreground">
                {" "}
                “I see you, and I appreciate you.”
              </span>
            </p>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              It is not a loan, an investment, or a charity drive. It is a tip
              jar with manners — built so supporters can give without pressure
              and creators can receive without wahala.
            </p>

            <div className="flex w-full flex-col items-stretch gap-3 pt-1 sm:w-auto sm:flex-row sm:items-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 text-base font-semibold shadow-lg shadow-primary/20"
              >
                <Link href="/signin?flow=signUp">
                  Start my free page
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-2 border-[var(--toy-ink)]/15 bg-background/70 px-7 text-base"
              >
                <Link href="/support">How support works</Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground/80">
              No monthly fee · Naira-ready · No app for fans
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-[2rem] border-2 border-[var(--toy-ink)]/10 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-[var(--toy-bread)]/35">
                  <BreadBuddy size={34} />
                </span>
                <div className="min-w-0">
                  <p className="font-toy text-lg font-bold">The bread test</p>
                  <p className="text-xs text-muted-foreground">
                    What “tear small bread” means here
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  {
                    title: "Small is enough",
                    body: "A little support still counts. No amount is too small to matter.",
                  },
                  {
                    title: "Sharing is not owing",
                    body: "Support is a gift, not a subscription, levy, or debt.",
                  },
                  {
                    title: "The person stays human",
                    body: "Behind every page is a real person with a real story.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <CheckBuddy className="mt-0.5 size-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[var(--toy-ochre)]/15 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    In Pidgin:
                  </span>{" "}
                  “Tear small bread” is a playful way of saying “share a small
                  portion.” We borrowed it because it feels like the way real
                  support should feel — warm, optional, and human.
                </p>
              </div>
            </div>

            <div className="absolute -right-3 -bottom-4 hidden rotate-3 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)] px-4 py-2 font-toy text-sm font-bold shadow-md sm:block">
              No pressure. No wahala.
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="story-heading"
        className="border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Why we exist
            </p>
            <h2
              id="story-heading"
              className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Support should feel like a handshake, not a hustle.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              Nigerian creators build worlds with their phones, their voices,
              their cameras, their kitchens, and their patience. Too often, the
              tools to get paid are built somewhere else, for somebody else,
              with fees and payout rules that were never designed for this
              place.
            </p>
            <p>
              We wanted something simpler: a page that loads fast, a supporter
              flow that takes seconds, and a payout path that a creator can
              understand without a finance degree. No bloated dashboard. No
              “growth hacks.” No pressure to turn every kind word into a sales
              pitch.
            </p>
            <p>
              The name comes from the way friends here ask for a small share —
              <span className="font-medium text-foreground">
                {" "}
                “anything for the boys?”
              </span>{" "}
              We flipped it into something generous. The boys are your people.
              Everybody is welcome. The bread is whatever you can share.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="values-heading"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            What we stand for
          </p>
          <h2
            id="values-heading"
            className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Four rules we try not to break
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            These are product rules as much as they are values. If a feature
            cannot pass them, it does not ship.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <article
              key={value.title}
              className="rounded-3xl border-2 border-[var(--toy-ink)]/10 bg-card p-5 shadow-sm sm:p-6"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--toy-lime)]/25">
                <value.icon className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-toy text-lg font-bold">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="money-heading"
        className="border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              How the money moves
            </p>
            <h2
              id="money-heading"
              className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              A support, from tap to bank account
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Clear steps, honest status. If something is pending, the dashboard
              should say so — and our support page explains what to do next.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 lg:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="relative rounded-3xl border-2 border-[var(--toy-ink)]/10 bg-card p-6"
              >
                <span className="font-toy text-3xl font-bold text-primary/30">
                  {step.number}
                </span>
                <h3 className="mt-3 font-toy text-lg font-bold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
            Payouts are reviewed by the {APP_NAME} team before they are sent.
            That review is a deliberate safety step, not a reason to hide
            numbers: creators can see their available balance and every payout
            status in the dashboard. Read more on{" "}
            <Link
              href="/support#creators"
              className="font-medium text-foreground underline underline-offset-4"
            >
              creator support
            </Link>
            .
          </p>
        </div>
      </section>

      <section
        id="author"
        aria-labelledby="author-heading"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20"
      >
        <div className="grid gap-8 rounded-[2rem] border-2 border-[var(--toy-ink)]/10 bg-card p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <HeartBuddy className="size-7" />
              <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                About the author
              </p>
            </div>
            <h2
              id="author-heading"
              className="mt-3 font-toy text-2xl font-bold tracking-tight text-balance sm:text-3xl"
            >
              Written and maintained by the {APP_NAME} team
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              This site and its support articles are written by the small
              independent team that designs, builds, and operates{" "}
              {APP_NAME}. We are based in Nigeria, and we use the product
              ourselves. When we write about payments, payouts, or account
              safety, we describe the system we actually run — not a generic
              template.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              We do not publish invented author bios or fake credentials. If you
              spot something inaccurate, tell us and we will correct it. The
              fastest route is the contact form.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Last reviewed: {LAST_REVIEWED} ·{" "}
              <Link
                href="/about/author"
                className="font-medium text-foreground underline underline-offset-4"
              >
                More about our editorial approach
              </Link>
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--toy-lime)]/15 px-4 py-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary font-toy text-lg font-bold text-primary-foreground">
                a4b
              </span>
              <div>
                <p className="font-toy text-sm font-bold">{APP_NAME} team</p>
                <p className="text-xs text-muted-foreground">
                  Product · Support · Payments
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/contact">
                Contact the team
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-[2rem] border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/20 p-6 text-center sm:p-10">
          <Sparkles
            className="mx-auto size-7 text-primary"
            aria-hidden="true"
          />
          <h2 className="mt-3 font-toy text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Your people are already here.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Claim your link, set your bread price, and give your supporters a
            simple way to say thank you.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-6">
              <Link href="/signin?flow=signUp">
                Start my free page
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link href="/support">Visit support</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
