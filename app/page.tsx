import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  Coffee,
  Heart,
  Landmark,
  MessageCircle,
  Share2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_TAGLINE } from "@/lib/constants";

const steps = [
  {
    icon: AtSign,
    title: "Claim your username",
    description:
      "Pick your handle and your page goes live at /yourname straight away.",
    step: "01",
  },
  {
    icon: Share2,
    title: "Share your link",
    description:
      "Drop it in your bio, stories, or group chat — wherever your people are.",
    step: "02",
  },
  {
    icon: Coffee,
    title: "Get coffees & payouts",
    description:
      "Fans send a coffee with a message; withdraw when you are ready.",
    step: "03",
  },
];

const perks = [
  {
    icon: Landmark,
    title: "Direct payouts",
    description: "Withdraw to your bank or mobile money whenever you want.",
  },
  {
    icon: MessageCircle,
    title: "Live supporter feed",
    description: "See every supporter and their message the moment it lands.",
  },
  {
    icon: Sparkles,
    title: "NGN today, more later",
    description: "Prices in Naira today — more currencies on the way.",
  },
  {
    icon: Zap,
    title: "Instant setup",
    description: "Go from zero to a live page in under two minutes.",
  },
  {
    icon: Heart,
    title: "Built for you",
    description: "No ads, no algorithms — just direct support from real fans.",
  },
  {
    icon: Users,
    title: "Know your supporters",
    description: "Dashboard with earnings, supporters, and payout history.",
  },
];

/** Static landing page — no data, no hooks, safe to cache. */
export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        <div className="animate-float-delayed absolute -bottom-40 right-0 h-[400px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4">
        <div className="flex flex-col items-center gap-8 py-24 text-center sm:py-32 lg:py-40">
          <Badge
            variant="secondary"
            className="animate-fade-in-up gap-1.5 border-primary/20 bg-primary/5 px-4 py-1.5 text-primary"
          >
            <Coffee className="size-3.5" />
            Support your favourite creators
          </Badge>

          <h1 className="animate-fade-in-up max-w-4xl text-5xl font-bold tracking-tight text-balance animate-delay-100 sm:text-6xl lg:text-7xl">
            <span className="hero-gradient-text">{APP_TAGLINE}</span>
          </h1>

          <p className="animate-fade-in-up max-w-xl text-lg leading-relaxed text-balance text-muted-foreground animate-delay-200 sm:text-xl">
            Fans send you a coffee with a message in a few taps — share one link
            and let your supporters show up for you.
          </p>

          <div className="animate-fade-in-up flex flex-wrap items-center justify-center gap-3 animate-delay-300">
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
              <Link href="/signin?flow=signUp">
                Start my page
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link href="/signin">Sign in</Link>
            </Button>
          </div>

          {/* Floating coffee emojis */}
          <div className="pointer-events-none relative mt-4 flex items-center gap-6">
            <span className="animate-bounce-slow text-4xl animate-delay-100">☕</span>
            <span className="animate-bounce-slow text-5xl animate-delay-300">☕</span>
            <span className="animate-bounce-slow text-3xl animate-delay-500">☕</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
          <div className="mb-12 flex flex-col items-center gap-3 text-center">
            <Badge variant="outline" className="mb-2">How it works</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps to your first coffee
            </h2>
            <p className="max-w-xl text-muted-foreground">
              From an empty page to your first coffee in under two minutes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <Card
                key={step.title}
                className="group relative overflow-hidden rounded-2xl border-border/50 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader className="space-y-3">
                  <span className="absolute right-4 top-4 font-mono text-4xl font-bold text-muted/50">
                    {step.step}
                  </span>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <step.icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Built for creators */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge variant="outline" className="mb-2">Features</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for creators like you
          </h2>
          <p className="max-w-xl text-muted-foreground">
            The boring parts handled, so you can get back to making things.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk, i) => (
            <div
              key={perk.title}
              className="group flex items-start gap-4 rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card hover:shadow-md"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary/15">
                <perk.icon className="size-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-semibold">{perk.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / stats */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-20">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "Free", label: "to get started" },
              { value: "2min", label: "setup time" },
              { value: "NGN", label: "currency support" },
              { value: "24/7", label: "live dashboard" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="animate-float absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="animate-float-delayed absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          </div>

          <div className="flex flex-col items-center gap-6">
            <span className="text-5xl">☕</span>
            <h2 className="max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">
              Your first coffee is one link away
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Claim your username, share your page, and let your fans show up for
              you. It&apos;s free to start.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                <Link href="/signin?flow=signUp">
                  Start my page — it&apos;s free
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No credit card required · Set up in under 2 minutes
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
