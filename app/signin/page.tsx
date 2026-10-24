import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Check,
  Coffee,
  Heart,
  Share2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { SignInForm } from "@/components/auth/signin-form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in or create an account to start your creator page on ${APP_NAME}.`,
};

const perks = [
  { icon: Share2, text: "Claim your link in seconds" },
  { icon: Heart, text: "Fans support in a few taps" },
  { icon: Zap, text: "Watch it land, live" },
];

type Flow = "signIn" | "signUp";

export default async function SignInPage(props: {
  searchParams: Promise<{ flow?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const rawFlow = Array.isArray(searchParams.flow)
    ? searchParams.flow[0]
    : searchParams.flow;
  const initialFlow: Flow = rawFlow === "signUp" ? "signUp" : "signIn";

  return (
    <div className="relative overflow-hidden">
      {/* Soft background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-float absolute -left-40 top-0 size-[30rem] rounded-full bg-primary/8 blur-3xl" />
        <div className="animate-float-delayed absolute -bottom-56 right-0 size-[26rem] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-6 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-14">
        {/* Story panel — desktop only */}
        <aside className="hidden flex-col gap-7 lg:flex">
          <Badge
            variant="secondary"
            className="w-fit gap-1.5 border-primary/15 bg-primary/5 px-3 py-1 text-primary"
          >
            <Sparkles className="size-3.5" />
            For creators of every size
          </Badge>

          <div>
            <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance xl:text-5xl">
              Your work deserves more than{" "}
              <span className="hero-gradient-text">just likes.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              Give your fans a simple way to say thank you — tear small bread,
              leave a message, share one link in your bio. You keep making
              things; we handle the rest.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {perks.map((perk) => (
              <li
                key={perk.text}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <perk.icon className="size-3.5" />
                </span>
                {perk.text}
              </li>
            ))}
          </ul>

          <CreatorPreview />
        </aside>

        {/* Auth column */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Badge
              variant="secondary"
              className="gap-1.5 border-primary/15 bg-primary/5 text-primary"
            >
              <Sparkles className="size-3.5" />
              Free to start
            </Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-balance">
              Your page. Your people.{" "}
              <span className="text-primary">Your bread.</span>
            </h1>
          </div>

          <Suspense fallback={<SignInFallback />}>
            <SignInForm initialFlow={initialFlow} />
          </Suspense>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Secure sign-in · No credit card required
          </p>
        </div>
      </div>
    </div>
  );
}

/** A small, static peek at what a creator page looks like. */
function CreatorPreview() {
  return (
    <div className="relative mt-1 max-w-md">
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary/8 blur-2xl"
      />

      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur">
        <div className="h-20 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />

        <div className="px-5 pb-5">
          <div className="-mt-7 flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary text-xl font-semibold text-primary-foreground">
            A
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Ada Creates</p>
              <p className="text-xs text-muted-foreground">
                @ada · Illustrator
              </p>
            </div>
            <Badge variant="secondary" className="gap-1 whitespace-nowrap">
              <span>🍞</span>
              12 breads
            </Badge>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            “Keep making the good stuff. Here&apos;s small bread from me 🍞”
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl border bg-background px-3.5 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span>🍞</span>
              Tear small bread
            </span>
            <span className="text-sm font-semibold tabular-nums">₦1,000</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex -space-x-1.5">
              {["T", "K", "M"].map((initial) => (
                <span
                  key={initial}
                  className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-foreground"
                >
                  {initial}
                </span>
              ))}
            </span>
            <span>
              <span className="font-medium text-foreground">3 people</span>{" "}
              supported this week
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 top-24 hidden items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-lg shadow-primary/10 sm:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" />
        </span>
        <div>
          <p className="text-xs font-medium">Bread received 🍞</p>
          <p className="text-[11px] text-muted-foreground">₦1,000 from Tunde</p>
        </div>
      </div>
    </div>
  );
}

function SignInFallback() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="border-b bg-muted/30 px-6 py-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="px-6 py-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-6 h-10 w-full" />
      </div>
    </div>
  );
}
