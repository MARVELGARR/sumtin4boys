"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  AtSign,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  Eye,
  Link2,
  PartyPopper,
  Pencil,
  Sparkles,
  Target,
  Wallet,
  Wheat,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/require-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  appErrorCode,
  appErrorMessage,
  DISPLAY_NAME_MAX_LENGTH,
  formatMoney,
  fromMinorUnits,
  MAX_BREAD_PRICE_MINOR,
  MIN_BREAD_PRICE_MINOR,
  normalizeUsername,
  parseMajorAmount,
  SUPPORTED_CURRENCIES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const USERNAME_REASON_MESSAGES: Record<string, string> = {
  too_short: `Use at least ${USERNAME_MIN_LENGTH} characters.`,
  too_long: `Use at most ${USERNAME_MAX_LENGTH} characters.`,
  invalid_characters: "Only lowercase letters, numbers, and underscores.",
  reserved: "That username is reserved — try another.",
  taken: "That username is already taken.",
};

type Step = 1 | 2 | 3;

const STEPS = [
  {
    title: "Claim your link",
    description: "Choose the username fans will visit.",
    icon: AtSign,
  },
  {
    title: "Make it yours",
    description: "Set your name, bread price, and goal.",
    icon: Sparkles,
  },
  {
    title: "Go live",
    description: "Share your page and get your first bread.",
    icon: PartyPopper,
  },
] as const;

/**
 * Creator onboarding: claim a username, then set up the public page.
 *
 * `/signin` sends freshly signed-up users here; creators who already have a
 * page are bounced straight to the dashboard.
 */
export function OnboardingFlow() {
  return (
    <RequireAuth
      title="Sign in to set up your page"
      description="Create an account, claim your username, and start receiving bread."
    >
      <OnboardingFlowInner />
    </RequireAuth>
  );
}

function OnboardingFlowInner() {
  const router = useRouter();
  const my = useQuery(api.creators.getMyCreator, {});
  const claimUsername = useMutation(api.creators.claimUsername);

  const [step, setStep] = useState<Step>(1);
  // After claiming, a creator exists but the wizard must stay put — only
  // creators who ALREADY had a page when the page loaded get redirected.
  const [claimedInSession, setClaimedInSession] = useState(false);
  const [finalName, setFinalName] = useState("");

  const [username, setUsername] = useState("");
  const [debounced, setDebounced] = useState("");
  const [claiming, setClaiming] = useState(false);

  const creator = my?.creator ?? null;
  const redirecting = creator !== null && !claimedInSession;
  const viewerName = my?.viewer.name?.trim() ?? "";

  useEffect(() => {
    if (redirecting) router.replace("/dashboard");
  }, [redirecting, router]);

  // Debounce the live availability check.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(username), 300);
    return () => window.clearTimeout(handle);
  }, [username]);

  const trimmed = username.trim();
  const debouncedValue = debounced.trim();
  const stale = trimmed !== debouncedValue;
  const check = useQuery(
    api.creators.checkUsername,
    debouncedValue.length > 0 ? { username: debouncedValue } : "skip",
  );
  const checking = trimmed.length > 0 && (stale || check === undefined);

  async function handleClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (claiming || checking) return;
    if (!check?.available) {
      toast.error("Pick an available username first.");
      return;
    }
    setClaiming(true);
    try {
      await claimUsername({ username: normalizeUsername(username) });
      setClaimedInSession(true);
      setStep(2);
      toast.success("Username claimed");
    } catch (error) {
      if (appErrorCode(error) === "already_a_creator") {
        router.replace("/dashboard");
        return;
      }
      toast.error(appErrorMessage(error));
    } finally {
      setClaiming(false);
    }
  }

  // Loading (or redirecting an existing creator) — skeleton, never a flash.
  if (my === undefined || redirecting) {
    return <OnboardingSkeleton />;
  }

  const normalized = normalizeUsername(trimmed);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-12">
        <WizardRail step={step} />

        <div className="min-w-0">
          {step === 1 ? (
            <ClaimStep
              viewerName={viewerName}
              username={username}
              onUsernameChange={(value) => setUsername(value.toLowerCase())}
              normalized={normalized}
              trimmed={trimmed}
              check={check}
              checking={checking}
              claiming={claiming}
              onSubmit={handleClaim}
            />
          ) : null}

          {step === 2 && creator ? (
            <ProfileStep
              username={creator.username}
              defaultDisplayName={
                viewerName.length > 0 ? viewerName : creator.displayName
              }
              defaultPrice={fromMinorUnits(
                creator.breadPrice,
                creator.currency,
              )}
              defaultCurrency={creator.currency}
              defaultGoal={
                creator.goalAmount !== undefined
                  ? fromMinorUnits(creator.goalAmount, creator.currency)
                  : ""
              }
              onDone={(displayName) => {
                setFinalName(displayName);
                setStep(3);
              }}
            />
          ) : null}

          {step === 3 && creator ? (
            <SuccessStep
              username={creator.username}
              displayName={finalName || creator.displayName}
            />
          ) : null}

          {step === 2 && !creator ? <StepSkeleton /> : null}
          {step === 3 && !creator ? <StepSkeleton /> : null}
        </div>
      </div>
    </div>
  );
}

/** Progress rail: horizontal on mobile, a vertical checklist on desktop. */
function WizardRail({ step }: { step: Step }) {
  const current = STEPS[step - 1];

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      {/* Mobile */}
      <div className="lg:hidden">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-foreground">{current.title}</span>
          <span className="tabular-nums text-muted-foreground">
            Step {step} of {STEPS.length}
          </span>
        </div>
        <Progress value={(step / STEPS.length) * 100} className="h-1.5" />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <Badge
          variant="secondary"
          className="gap-1.5 border-primary/15 bg-primary/5 text-primary"
        >
          <Wheat className="size-3.5" />
          Creator setup
        </Badge>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance">
          Three small steps to your first bread
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You can change everything later from your dashboard.
        </p>

        <ol className="mt-8 flex flex-col gap-1">
          {STEPS.map((item, index) => {
            const number = (index + 1) as Step;
            const done = step > number || step === STEPS.length;
            const active = !done && step === number;
            return (
              <li
                key={item.title}
                className={cn(
                  "flex gap-3 rounded-xl px-3 py-3 transition-colors",
                  active && "bg-primary/5 ring-1 ring-primary/10",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary text-primary",
                    !done &&
                      !active &&
                      "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : number}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Free to start
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            No credit card, no subscription. We only take a small fee when you
            get paid.
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Step 1 — pick and claim the public username. */
function ClaimStep({
  viewerName,
  username,
  onUsernameChange,
  normalized,
  trimmed,
  check,
  checking,
  claiming,
  onSubmit,
}: {
  viewerName: string;
  username: string;
  onUsernameChange: (value: string) => void;
  normalized: string;
  trimmed: string;
  check:
    | { available: boolean; normalized: string; reason?: string }
    | undefined;
  checking: boolean;
  claiming: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const unavailable = check !== undefined && !check.available;

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 overflow-hidden py-0 shadow-xl shadow-primary/5">
        <div className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AtSign className="size-5" />
            </span>
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                Claim your link
              </CardTitle>
              <CardDescription className="mt-1">
                This is the address you will share everywhere. Usernames are
                first come, first served.
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <form onSubmit={onSubmit}>
            <FieldGroup className="gap-5">
              <Field data-invalid={unavailable}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <InputGroup className="h-12">
                  <InputGroupAddon className="pl-4">
                    <span className="text-base font-medium text-muted-foreground">
                      /
                    </span>
                  </InputGroupAddon>
                  <InputGroupInput
                    id="username"
                    name="username"
                    value={username}
                    onChange={(event) =>
                      onUsernameChange(event.target.value)
                    }
                    placeholder="yourname"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={USERNAME_MAX_LENGTH}
                    disabled={claiming}
                    aria-invalid={unavailable}
                    className="h-full px-1 text-base font-medium"
                  />
                  <InputGroupAddon align="inline-end" className="pr-3">
                    {checking ? (
                      <Spinner className="size-4 text-muted-foreground" />
                    ) : check?.available ? (
                      <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : check && !check.available ? (
                      <CircleX className="size-4 text-destructive" />
                    ) : null}
                  </InputGroupAddon>
                </InputGroup>

                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters:
                    lowercase letters, numbers, and underscores.
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {trimmed.length}/{USERNAME_MAX_LENGTH}
                  </span>
                </div>

                <div className="min-h-5" aria-live="polite">
                  {trimmed.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Short and memorable works best.
                    </p>
                  ) : checking ? (
                    <p className="text-xs text-muted-foreground">
                      Checking availability…
                    </p>
                  ) : check?.available ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CircleCheck className="size-3.5" />
                      /{check.normalized} is available
                    </p>
                  ) : check ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <CircleX className="size-3.5" />
                      {check.reason
                        ? USERNAME_REASON_MESSAGES[check.reason]
                        : "That username is not available."}
                    </p>
                  ) : null}
                </div>
              </Field>

              <Button
                type="submit"
                size="lg"
                className="h-11 w-full text-sm"
                disabled={claiming || checking || !check?.available}
              >
                {claiming ? <Spinner /> : null}
                Claim my link
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </FieldGroup>
          </form>
        </div>
      </Card>

      <PagePreview
        displayName={viewerName || "Your name"}
        username={normalized || "yourname"}
        price="1000"
        currency="NGN"
      />
    </div>
  );
}

/** Step 2 — profile details, with a live preview that updates as you type. */
function ProfileStep({
  username,
  defaultDisplayName,
  defaultPrice,
  defaultCurrency,
  defaultGoal,
  onDone,
}: {
  username: string;
  defaultDisplayName: string;
  defaultPrice: string;
  defaultCurrency: string;
  defaultGoal: string;
  onDone: (displayName: string) => void;
}) {
  const updateProfile = useMutation(api.creators.updateProfile);

  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [price, setPrice] = useState(defaultPrice);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [goal, setGoal] = useState(defaultGoal);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1) {
      setNameError(
        "Add a display name so supporters know who they are supporting.",
      );
      return;
    }
    if (trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
      setNameError(
        `Display name can be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
      );
      return;
    }
    setNameError(null);

    const priceMinor = parseMajorAmount(price, currency);
    if (priceMinor === null) {
      setPriceError("Enter a valid bread price, for example 1000.");
      return;
    }
    if (
      priceMinor < MIN_BREAD_PRICE_MINOR ||
      priceMinor > MAX_BREAD_PRICE_MINOR
    ) {
      setPriceError(
        `Bread price must be between ${formatMoney(
          MIN_BREAD_PRICE_MINOR,
          currency,
        )} and ${formatMoney(MAX_BREAD_PRICE_MINOR, currency)}.`,
      );
      return;
    }
    setPriceError(null);

    const goalText = goal.trim();
    let goalMinor: number | null = null;
    if (goalText.length > 0) {
      goalMinor = parseMajorAmount(goalText, currency);
      if (goalMinor === null || goalMinor < MIN_BREAD_PRICE_MINOR) {
        setGoalError(
          `Goal must be at least ${formatMoney(
            MIN_BREAD_PRICE_MINOR,
            currency,
          )}, or leave it empty.`,
        );
        return;
      }
    }
    setGoalError(null);

    setSaving(true);
    try {
      await updateProfile({
        displayName: trimmedName,
        breadPrice: priceMinor,
        currency,
        goalAmount: goalMinor,
      });
      onDone(trimmedName);
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 overflow-hidden py-0 shadow-xl shadow-primary/5">
        <div className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">
                Make it yours
              </CardTitle>
              <CardDescription className="mt-1">
                Your page lives at{" "}
                <span className="font-mono text-xs font-medium text-foreground">
                  /{username}
                </span>
                . Set the details fans see when they land.
              </CardDescription>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <form id="onboarding-profile-form" onSubmit={handleSave}>
            <FieldGroup className="gap-5">
              <Field data-invalid={nameError !== null}>
                <FieldLabel htmlFor="displayName">Display name</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setNameError(null);
                  }}
                  placeholder="Your name"
                  autoComplete="name"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  disabled={saving}
                  aria-invalid={nameError !== null}
                  className="h-10"
                />
                {nameError ? (
                  <FieldError>{nameError}</FieldError>
                ) : (
                  <FieldDescription>
                    The name supporters see on your page.
                  </FieldDescription>
                )}
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="currency">Currency</FieldLabel>
                  <Select
                    value={currency}
                    onValueChange={(value) => {
                      setCurrency(value);
                      setPriceError(null);
                      setGoalError(null);
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger id="currency" className="h-10 w-full">
                      <SelectValue placeholder="NGN" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Supporters pay you in this currency.
                  </FieldDescription>
                </Field>

                <Field data-invalid={priceError !== null}>
                  <FieldLabel htmlFor="breadPrice">Bread price</FieldLabel>
                  <Input
                    id="breadPrice"
                    name="breadPrice"
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value);
                      setPriceError(null);
                    }}
                    inputMode="decimal"
                    placeholder="1000"
                    disabled={saving}
                    aria-invalid={priceError !== null}
                    className="h-10"
                  />
                  {priceError ? (
                    <FieldError>{priceError}</FieldError>
                  ) : (
                    <FieldDescription>
                      At least {formatMoney(MIN_BREAD_PRICE_MINOR, currency)}{" "}
                      per bread.
                    </FieldDescription>
                  )}
                </Field>
              </div>

              <Field data-invalid={goalError !== null}>
                <FieldLabel htmlFor="goalAmount">
                  Support goal (optional)
                </FieldLabel>
                <Input
                  id="goalAmount"
                  name="goalAmount"
                  value={goal}
                  onChange={(event) => {
                    setGoal(event.target.value);
                    setGoalError(null);
                  }}
                  inputMode="decimal"
                  placeholder="100000"
                  disabled={saving}
                  aria-invalid={goalError !== null}
                  className="h-10"
                />
                {goalError ? (
                  <FieldError>{goalError}</FieldError>
                ) : (
                  <FieldDescription className="flex items-start gap-1.5">
                    <Target className="mt-0.5 size-3.5 shrink-0" />
                    A target shown on your page. Leave it empty for no goal.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </form>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted-foreground">
            You can change these any time.
          </p>
          <Button
            type="submit"
            form="onboarding-profile-form"
            size="lg"
            className="h-11 w-full sm:h-10 sm:w-auto"
            disabled={saving}
          >
            {saving ? <Spinner /> : null}
            Finish setup
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </Card>

      <PagePreview
        displayName={displayName}
        username={username}
        price={price}
        currency={currency}
        goal={goal}
      />
    </div>
  );
}

/** Shared live preview of the public page. */
function PagePreview({
  displayName,
  username,
  price,
  currency,
  goal,
}: {
  displayName: string;
  username: string;
  price: string;
  currency: string;
  goal?: string;
}) {
  const initial = (
    displayName.trim().charAt(0) ||
    username.charAt(0) ||
    "A"
  ).toUpperCase();
  const priceMinor = parseMajorAmount(price, currency);
  const goalMinor = goal?.trim() ? parseMajorAmount(goal, currency) : null;

  return (
    <section
      aria-label="Live page preview"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Eye className="size-3.5" />
          Live preview
        </p>
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/20 bg-emerald-500/5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Updates live
        </Badge>
      </div>

      <div className="relative h-16 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />

      <div className="px-4 pb-4">
        <div className="-mt-7 flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary/10 text-lg font-semibold text-primary">
          {initial}
        </div>
        <p className="mt-2 font-semibold">
          {displayName.trim() || "Your name"}
        </p>
        <p className="text-xs text-muted-foreground">
          @{username || "yourname"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Wheat className="size-3" />
            {priceMinor !== null
              ? formatMoney(priceMinor, currency)
              : "One bread"}
          </Badge>
          {goalMinor !== null && goalMinor > 0 ? (
            <Badge variant="outline" className="gap-1">
              <Target className="size-3" />
              Goal {formatMoney(goalMinor, currency)}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          <Wheat className="size-4" />
          Buy a bread
        </div>
      </div>
    </section>
  );
}

/** Step 3 — celebrate, copy the link, and point at the next actions. */
function SuccessStep({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`,
      );
      setCopied(true);
      toast.success("Link copied — go share it!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. You can copy it from your page.");
    }
  }

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xl shadow-primary/5">
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 py-10 text-center">
        <div
          aria-hidden
          className="animate-float pointer-events-none absolute -left-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
        />
        <div
          aria-hidden
          className="animate-float-delayed pointer-events-none absolute -bottom-12 -right-8 size-32 rounded-full bg-primary/10 blur-2xl"
        />

        <div className="animate-fade-in-up relative mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <PartyPopper className="size-7" />
        </div>
        <h2 className="animate-fade-in-up animate-delay-100 relative mt-5 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {displayName}&apos;s page is live
        </h2>
        <p className="animate-fade-in-up animate-delay-200 relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Share your link with your people — the first bread is closer than
          you think.
        </p>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-sm">/{username}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild size="lg" className="h-10">
            <Link href={`/${username}`}>
              View my page
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-10">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next up
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <NextStep
              href="/dashboard/page"
              icon={Pencil}
              title="Polish your page"
              description="Add a bio and a profile photo."
            />
            <NextStep
              href="/dashboard/payouts"
              icon={Wallet}
              title="Set up payouts"
              description="Choose where your earnings go."
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function NextStep({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Pencil;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 transition-colors hover:border-primary/20 hover:bg-muted/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function StepSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b px-6 py-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="flex flex-col gap-4 px-6 py-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-36" />
      </div>
    </Card>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-12">
        <div className="hidden flex-col gap-3 lg:flex">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-3 h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-6 h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-20 w-full lg:hidden" />
          <Skeleton className="rounded-xl h-72 w-full" />
          <Skeleton className="rounded-xl h-52 w-full" />
        </div>
      </div>
    </div>
  );
}
