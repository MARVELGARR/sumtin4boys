import {
  BreadBuddy,
  CoinBuddy,
  MessageBuddy,
  SunBuddy,
  ToySticker,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: SunBuddy,
    title: "Find your person",
    copy: "You're already on their page. No sign-up, no app, no long talk.",
  },
  {
    icon: BreadBuddy,
    title: "Choose your bread",
    copy: "From ₦1,000. Any amount wey you fit — small small is enough.",
  },
  {
    icon: MessageBuddy,
    title: "Drop kind words",
    copy: "Make them smile out loud, or keep your support private.",
  },
];

/** Supporter-first section that explains "tearing small bread" in context. */
export function SupporterPromise() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="toy-card relative rounded-3xl bg-card p-6 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Supporter side
            </p>
            <h2 className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Anything for the boys?
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              You don enjoy the skit? The recipe? The podcast? Tear small
              bread. Na the small small support dey keep the work going — and
              the kind words dey make the late nights worth it.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-background p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--toy-ochre)]/25">
                      <step.icon size={24} />
                    </span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-3 font-toy text-base font-bold">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 text-sm font-semibold"
              >
                <a href="#demo">See the supporter flow</a>
              </Button>
              <span className="text-xs text-muted-foreground">
                No pressure. No wahala. Private support stays private.
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              &ldquo;Boys&rdquo; here means your people — the crew, the gang,
              everybody. All genders welcome.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="toy-card rounded-2xl bg-[var(--toy-cream)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ToySticker tone="ochre" className="size-14 p-0">
                    <BreadBuddy size={38} />
                  </ToySticker>
                  <div>
                    <p className="font-toy text-lg font-bold">1 bread</p>
                    <p className="text-sm text-muted-foreground">₦1,000</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-[var(--toy-ink)]/15 text-[11px] font-semibold"
                >
                  Kind word
                </Badge>
              </div>

              <p className="mt-5 text-lg leading-relaxed font-medium text-balance">
                &ldquo;Take small something for the late nights. You too
                much.&rdquo;
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Ada from Lagos</span>
                <span>just now</span>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--toy-ink)]/10 bg-background px-3 py-2 text-xs text-muted-foreground">
                <CoinBuddy size={20} />
                Secure checkout · no account needed
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
