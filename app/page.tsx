import Link from "next/link";
import { ArrowRight, Coffee, HeartHandshake, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Landing page (placeholder until agent B2 lands the full version).
 * Keep this a server component with static content.
 */
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <Badge variant="secondary" className="gap-1.5">
          <Coffee className="size-3.5" /> Payments powered by Bachs
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {APP_TAGLINE}
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          {APP_NAME} gives you a page where fans can say thanks with a coffee and a
          message — in a couple of taps.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signin?flow=signUp">
              Start my page <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 pb-24 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6">
          <Link2 className="mb-3 size-5 text-primary" />
          <h2 className="mb-1 font-medium">Claim your username</h2>
          <p className="text-sm text-muted-foreground">
            Pick a handle and set the price of one coffee. Your page lives at {" "}
            <span className="font-mono text-xs">/{APP_NAME}/yourname</span> — well,
            just <span className="font-mono text-xs">/yourname</span>.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <Coffee className="mb-3 size-5 text-primary" />
          <h2 className="mb-1 font-medium">Fans buy you coffees</h2>
          <p className="text-sm text-muted-foreground">
            Supporters pay in a few taps with card, bank transfer or mobile money —
            Bachs hosted checkout keeps card data off our servers.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <HeartHandshake className="mb-3 size-5 text-primary" />
          <h2 className="mb-1 font-medium">Track and withdraw</h2>
          <p className="text-sm text-muted-foreground">
            Watch support arrive live, then request payouts to your bank or mobile
            money when you&apos;re ready.
          </p>
        </div>
      </section>
    </div>
  );
}
