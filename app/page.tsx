import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  Coffee,
  Landmark,
  MessageCircle,
  Share2,
  Sparkles,
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
  },
  {
    icon: Share2,
    title: "Share your link",
    description:
      "Drop it in your bio, stories, or group chat — wherever your people are.",
  },
  {
    icon: Coffee,
    title: "Get coffees & payouts",
    description:
      "Fans send a coffee with a message; withdraw when you are ready.",
  },
];

const perks = [
  {
    icon: Landmark,
    title: "Direct payouts",
    description: "Direct payouts to your bank or mobile money when ready.",
  },
  {
    icon: MessageCircle,
    title: "Supporters, live",
    description: "A live feed of supporters and the messages they send.",
  },
  {
    icon: Sparkles,
    title: "NGN today, more later",
    description: "Prices in NGN today, more currencies later.",
  },
];

/** Static landing page — no data, no hooks, safe to cache. */
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <Badge variant="secondary" className="gap-1.5">
          <Coffee className="size-3.5" />
          Support your favourite creators
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          {APP_TAGLINE}
        </h1>
        <p className="max-w-xl text-lg text-balance text-muted-foreground">
          Fans send you a coffee with a message in a few taps — share one link and
          let your supporters show up for you.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signin?flow=signUp">
              Start my page
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-it-works" className="pb-20">
        <div className="mb-8 flex flex-col gap-2">
          <h2
            id="how-it-works"
            className="text-2xl font-semibold tracking-tight"
          >
            How it works
          </h2>
          <p className="max-w-xl text-muted-foreground">
            From an empty page to your first coffee in three steps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="rounded-2xl">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-4" />
                </div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Built for creators */}
      <section aria-labelledby="built-for-creators" className="pb-20">
        <div className="mb-8 flex flex-col gap-2">
          <h2
            id="built-for-creators"
            className="text-2xl font-semibold tracking-tight"
          >
            Built for creators
          </h2>
          <p className="max-w-xl text-muted-foreground">
            The boring parts handled, so you can get back to making things.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {perks.map((perk) => (
            <div
              key={perk.title}
              className="flex items-start gap-3 rounded-2xl border bg-card p-5"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <perk.icon className="size-4" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-medium">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {perk.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-24">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your first coffee is one link away
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Claim your username, share your page, and let your fans show up for
            you.
          </p>
          <Button asChild size="lg">
            <Link href="/signin?flow=signUp">
              Start my page
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
