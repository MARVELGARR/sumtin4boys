"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleX,
  PartyPopper,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  MAX_COFFEE_PRICE_MINOR,
  MIN_COFFEE_PRICE_MINOR,
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

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        <span
          className={cn(
            "h-1.5 flex-1 rounded-full",
            step >= 1 ? "bg-primary" : "bg-muted",
          )}
        />
        <span
          className={cn(
            "h-1.5 flex-1 rounded-full",
            step >= 2 ? "bg-primary" : "bg-muted",
          )}
        />
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        Step {step} of 2
      </p>
    </div>
  );
}

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
      description="Create an account, claim your username, and start receiving coffees."
    >
      <OnboardingFlowInner />
    </RequireAuth>
  );
}

function OnboardingFlowInner() {
  const router = useRouter();
  const my = useQuery(api.creators.getMyCreator, {});
  const claimUsername = useMutation(api.creators.claimUsername);

  const [step, setStep] = useState<1 | 2>(1);
  // After claiming, a creator exists but the wizard must stay put — only
  // creators who ALREADY had a page when the page loaded get redirected.
  const [claimedInSession, setClaimedInSession] = useState(false);

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
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-72" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const normalized = normalizeUsername(trimmed);

  let usernameStatus: ReactNode = (
    <FieldDescription>
      {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} characters: lowercase letters,
      numbers, and underscores.
    </FieldDescription>
  );
  if (trimmed.length > 0) {
    if (checking) {
      usernameStatus = (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Spinner className="size-3" />
          Checking availability…
        </p>
      );
    } else if (check?.available) {
      usernameStatus = (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <CircleCheck className="size-3.5" />
          /{check.normalized} is available
        </p>
      );
    } else if (check && !check.available) {
      usernameStatus = (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleX className="size-3.5" />
          {check.reason
            ? USERNAME_REASON_MESSAGES[check.reason]
            : "That username is not available."}
        </p>
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <div className="mb-6">
        <StepIndicator step={step} />
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Claim your username
            </CardTitle>
            <CardDescription>
              This becomes the link you share with supporters. Usernames are
              first come, first served.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClaim}>
              <FieldGroup>
                <Field data-invalid={check !== undefined && !check.available}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value.toLowerCase())
                    }
                    placeholder="yourname"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={USERNAME_MAX_LENGTH}
                    disabled={claiming}
                    aria-invalid={check !== undefined && !check.available}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your page will live at{" "}
                    <span className="font-mono text-xs font-medium text-foreground">
                      /{normalized.length > 0 ? normalized : "yourname"}
                    </span>
                  </p>
                  {usernameStatus}
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  disabled={claiming || checking || !check?.available}
                >
                  {claiming ? <Spinner /> : null}
                  Claim username
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : creator ? (
        <ProfileStep
          key={creator._id}
          username={creator.username}
          defaultDisplayName={
            viewerName.length > 0 ? viewerName : creator.displayName
          }
          defaultPrice={fromMinorUnits(creator.coffeePrice, creator.currency)}
          defaultCurrency={creator.currency}
          defaultGoal={
            creator.goalAmount !== undefined
              ? fromMinorUnits(creator.goalAmount, creator.currency)
              : ""
          }
          onBack={() => setStep(1)}
        />
      ) : (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-72" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Step 2 — amounts are kept as raw input strings and parsed with
 * `parseMajorAmount` on submit, never as floats.
 */
function ProfileStep({
  username,
  defaultDisplayName,
  defaultPrice,
  defaultCurrency,
  defaultGoal,
  onBack,
}: {
  username: string;
  defaultDisplayName: string;
  defaultPrice: string;
  defaultCurrency: string;
  defaultGoal: string;
  onBack: () => void;
}) {
  const updateProfile = useMutation(api.creators.updateProfile);

  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [price, setPrice] = useState(defaultPrice);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [goal, setGoal] = useState(defaultGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmedName = displayName.trim();
    if (trimmedName.length < 1) {
      const message =
        "Add a display name so supporters know who they are supporting.";
      setNameError(message);
      toast.error(message);
      return;
    }
    if (trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
      const message = `Display name can be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
      setNameError(message);
      toast.error(message);
      return;
    }
    setNameError(null);

    const priceMinor = parseMajorAmount(price, currency);
    if (priceMinor === null) {
      const message = "Enter a valid coffee price, for example 1000.";
      setPriceError(message);
      toast.error(message);
      return;
    }
    if (
      priceMinor < MIN_COFFEE_PRICE_MINOR ||
      priceMinor > MAX_COFFEE_PRICE_MINOR
    ) {
      const message = `Coffee price must be between ${formatMoney(
        MIN_COFFEE_PRICE_MINOR,
        currency,
      )} and ${formatMoney(MAX_COFFEE_PRICE_MINOR, currency)}.`;
      setPriceError(message);
      toast.error(message);
      return;
    }
    setPriceError(null);

    const goalText = goal.trim();
    let goalMinor: number | null = null;
    if (goalText.length > 0) {
      goalMinor = parseMajorAmount(goalText, currency);
      if (goalMinor === null || goalMinor < MIN_COFFEE_PRICE_MINOR) {
        const message = `Goal must be at least ${formatMoney(
          MIN_COFFEE_PRICE_MINOR,
          currency,
        )}, or leave it empty.`;
        setGoalError(message);
        toast.error(message);
        return;
      }
    }
    setGoalError(null);

    setSaving(true);
    try {
      await updateProfile({
        displayName: trimmedName,
        coffeePrice: priceMinor,
        currency,
        ...(goalMinor !== null ? { goalAmount: goalMinor } : {}),
      });
      setSaved(true);
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="size-5" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Your page is live
          </CardTitle>
          <CardDescription>
            Share /{username} with your fans — the coffees can start rolling in.
            You can fine-tune everything from the dashboard.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${username}`}>
              View my page
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Set up your page
        </CardTitle>
        <CardDescription>
          Choose how supporters see you and what one coffee costs.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                disabled={saving}
                aria-invalid={nameError !== null}
              />
              {nameError ? (
                <FieldError>{nameError}</FieldError>
              ) : (
                <FieldDescription>
                  The name supporters see on your page.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={priceError !== null}>
              <FieldLabel htmlFor="coffeePrice">Coffee price</FieldLabel>
              <Input
                id="coffeePrice"
                name="coffeePrice"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  setPriceError(null);
                }}
                inputMode="decimal"
                placeholder="1000"
                disabled={saving}
                aria-invalid={priceError !== null}
              />
              {priceError ? (
                <FieldError>{priceError}</FieldError>
              ) : (
                <FieldDescription>
                  At least {formatMoney(MIN_COFFEE_PRICE_MINOR, currency)} per
                  coffee — you can change it later.
                </FieldDescription>
              )}
            </Field>

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
                <SelectTrigger id="currency" className="w-full">
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

            <Field data-invalid={goalError !== null}>
              <FieldLabel htmlFor="goalAmount">Goal (optional)</FieldLabel>
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
              />
              {goalError ? (
                <FieldError>{goalError}</FieldError>
              ) : (
                <FieldDescription>
                  An optional target in {currency}. Leave it empty for no goal.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={saving}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button type="submit" form="onboarding-profile-form" disabled={saving}>
          {saving ? <Spinner /> : null}
          Finish setup
        </Button>
      </CardFooter>
    </Card>
  );
}
