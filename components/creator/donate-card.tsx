"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  BreadBuddy,
  CheckBuddy,
} from "@/components/brand/toy-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/creator/turnstile-widget";
import {
  MAX_QUANTITY,
  MESSAGE_MAX_LENGTH,
  SUPPORTER_NAME_MAX_LENGTH,
  appErrorCode,
  appErrorMessage,
  appErrorRetryAfterMs,
  formatMoney,
  isValidEmail,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type DonateCardProps = {
  username: string;
  displayName: string;
  /** Price of one bread in integer minor units. */
  breadPrice: number;
  currency: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  quantity?: string;
  captcha?: string;
};

const QUANTITY_PRESETS = [1, 3, 5, 10] as const;

const QUICK_MESSAGES = [
  "Take data 🌐",
  "Fuel for the gen ⛽",
  "For the late nights 🌙",
  "You too much 🔥",
  "Small something 💛",
];

/** UUID v4 for the checkout attempt; stable for the life of this form. */
function newAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The support form on a public creator page. Honours the deployment's payment
 * mode: never pretends real payments exist when checkout isn't ready.
 */
export function DonateCard({
  username,
  displayName,
  breadPrice,
  currency,
}: DonateCardProps) {
  const mode = useQuery(api.payments.mode);
  const createCheckout = useAction(api.donations.createCheckout);
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [supporterName, setSupporterName] = useState("");
  const [supporterEmail, setSupporterEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  // One stable attempt per creator form. Retries (double-clicks, flaky data)
  // reuse it; only a definitive no-checkout failure rotates it.
  const attemptIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  useEffect(() => {
    attemptIdRef.current = newAttemptId();
  }, [username]);

  function getAttemptId(): string {
    if (!attemptIdRef.current) attemptIdRef.current = newAttemptId();
    return attemptIdRef.current;
  }

  const total = breadPrice * quantity;

  const handleTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
    setErrors((prev) => ({ ...prev, captcha: undefined }));
  }, []);

  function setQuantityTo(next: number) {
    setQuantity(Math.min(MAX_QUANTITY, Math.max(1, next)));
    setErrors((prev) => ({ ...prev, quantity: undefined }));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const name = supporterName.trim();
    if (!name) {
      next.name = "Your name is required.";
    } else if (name.length > SUPPORTER_NAME_MAX_LENGTH) {
      next.name = `Name must be ${SUPPORTER_NAME_MAX_LENGTH} characters or fewer.`;
    }
    if (!supporterEmail.trim()) {
      next.email = "Your email is required for the receipt.";
    } else if (!isValidEmail(supporterEmail.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      next.quantity = `Choose between 1 and ${MAX_QUANTITY} breads.`;
    }
    if (mode?.turnstileRequired && !turnstileToken) {
      next.captcha = "Complete the human verification above.";
    }
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A synchronous guard closes the gap before React applies `pending` state.
    if (submittingRef.current) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    submittingRef.current = true;
    setPending(true);
    try {
      const trimmedMessage = message.trim();
      const result = await createCheckout({
        attemptId: getAttemptId(),
        username,
        quantity,
        supporterName: supporterName.trim(),
        supporterEmail: supporterEmail.trim(),
        isPrivate,
        ...(trimmedMessage ? { message: trimmedMessage } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
      });

      if (result.status === "redirect") {
        window.location.href = result.url;
        return;
      }
      router.push(`/thanks?ref=${encodeURIComponent(result.reference)}`);
    } catch (error) {
      const retryAfterMs = appErrorRetryAfterMs(error);
      toast.error(
        retryAfterMs !== null
          ? `${appErrorMessage(error)} (retry in ${Math.ceil(retryAfterMs / 1000)}s)`
          : appErrorMessage(error),
      );
      submittingRef.current = false;
      setPending(false);
      // A definitive provider failure means no checkout exists. Rotate the
      // attempt ID so the supporter can genuinely retry; transient/network
      // errors keep it so those retries remain idempotent.
      if (appErrorCode(error) === "checkout_failed") {
        attemptIdRef.current = null;
      }
      // Tokens are single-use. Reset after a failure so the next attempt gets
      // a fresh challenge instead of retrying a consumed token.
      setTurnstileToken(null);
      setTurnstileReset((value) => value + 1);
    }
  }

  if (mode === undefined) {
    return (
      <Card className="toy-card relative overflow-hidden">
        <div className="ankara-ribbon absolute inset-x-0 top-0 h-1.5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-toy text-xl">
            <BreadBuddy size={28} />
            Tear {displayName} small bread
          </CardTitle>
          <CardDescription>
            {formatMoney(breadPrice, currency)} per bread
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!mode.checkoutReady) {
    return (
      <Card className="toy-card relative overflow-hidden">
        <div className="ankara-ribbon absolute inset-x-0 top-0 h-1.5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-toy text-xl">
            <BreadBuddy size={28} />
            Support is temporarily unavailable
          </CardTitle>
          <CardDescription>
            The payment provider isn&apos;t configured right now, so{" "}
            {displayName} can&apos;t accept new support. Please check back
            later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="toy-card relative overflow-hidden">
      <div className="ankara-ribbon absolute inset-x-0 top-0 h-1.5" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-toy text-xl sm:text-2xl">
          <BreadBuddy size={30} />
          <span className="[overflow-wrap:anywhere]">
            Tear {displayName} small bread
          </span>
        </CardTitle>
        <CardDescription>
          {formatMoney(breadPrice, currency)} per bread · small small is
          enough.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode.driver === "simulated" ? (
          <p className="mb-4 rounded-xl border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/20 px-3 py-2 text-xs text-muted-foreground">
            Demo deployment — payments are simulated.
          </p>
        ) : null}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <Field data-invalid={errors.quantity ? true : undefined}>
            <div className="flex items-center justify-between gap-2">
              <FieldTitle>How many breads?</FieldTitle>
              <span className="text-[11px] text-muted-foreground">
                up to {MAX_QUANTITY}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {QUANTITY_PRESETS.map((preset) => {
                const active = quantity === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantityTo(preset)}
                    aria-pressed={active}
                    disabled={pending}
                    className={cn(
                      "flex touch-manipulation flex-col items-center gap-0.5 rounded-xl border-2 px-1.5 py-2 text-center transition-colors disabled:opacity-50",
                      active
                        ? "border-primary bg-[var(--toy-ochre)]/45"
                        : "border-[var(--toy-ink)]/10 bg-background/60 hover:bg-muted/60",
                    )}
                  >
                    <BreadBuddy size={23} />
                    <span className="text-sm font-bold tabular-nums">
                      {preset}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMoney(breadPrice * preset, currency)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One fewer bread"
                disabled={pending || quantity <= 1}
                onClick={() => setQuantityTo(quantity - 1)}
                className="size-9 touch-manipulation"
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-16 text-center text-sm">
                <span className="font-toy text-xl font-bold tabular-nums">
                  {quantity}
                </span>{" "}
                <span className="text-muted-foreground">
                  {quantity === 1 ? "bread" : "breads"}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One more bread"
                disabled={pending || quantity >= MAX_QUANTITY}
                onClick={() => setQuantityTo(quantity + 1)}
                className="size-9 touch-manipulation"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <FieldError>{errors.quantity}</FieldError>
          </Field>

          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="donate-name">Your name</FieldLabel>
            <Input
              id="donate-name"
              value={supporterName}
              onChange={(event) => {
                setSupporterName(event.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              maxLength={SUPPORTER_NAME_MAX_LENGTH}
              placeholder="Ada from Lagos"
              autoComplete="name"
              disabled={pending}
              aria-invalid={errors.name ? true : undefined}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="donate-email">Your email</FieldLabel>
            <Input
              id="donate-email"
              type="email"
              value={supporterEmail}
              onChange={(event) => {
                setSupporterEmail(event.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="ada@example.com"
              autoComplete="email"
              disabled={pending}
              aria-invalid={errors.email ? true : undefined}
            />
            <FieldDescription>
              For your receipt. Never shown on the page.
            </FieldDescription>
            <FieldError>{errors.email}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="donate-message">Kind words</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MESSAGES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={pending}
                  onClick={() => setMessage(preset)}
                  aria-pressed={message === preset}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                    message === preset
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-[var(--toy-ink)]/10 bg-background/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Textarea
              id="donate-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={3}
              placeholder="Drop a kind word — make them smile…"
              disabled={pending}
            />
            <FieldDescription className="flex items-center justify-between gap-2">
              <span>Shown publicly unless you keep it private.</span>
              <span className="shrink-0 tabular-nums">
                {message.length}/{MESSAGE_MAX_LENGTH}
              </span>
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="donate-private">
              Keep my support private
            </FieldLabel>
            <Switch
              id="donate-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={pending}
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <BreadBuddy size={27} />
              <div className="flex flex-col text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {quantity} {quantity === 1 ? "bread" : "breads"}
                </span>
                <span>{formatMoney(breadPrice, currency)} each</span>
              </div>
            </div>
            <span className="font-toy text-xl font-bold tabular-nums">
              {formatMoney(total, currency)}
            </span>
          </div>

          {mode.turnstileRequired && mode.turnstileSiteKey ? (
            <Field data-invalid={errors.captcha ? true : undefined}>
              <TurnstileWidget
                key={turnstileReset}
                siteKey={mode.turnstileSiteKey}
                onToken={handleTurnstileToken}
                className="min-h-[65px] w-full"
              />
              <FieldError>{errors.captcha}</FieldError>
            </Field>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold shadow-lg shadow-primary/20"
            disabled={pending}
          >
            {pending ? (
              <>
                <Spinner />
                Starting checkout…
              </>
            ) : (
              <>
                <BreadBuddy size={22} />
                Tear bread · {formatMoney(total, currency)}
              </>
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <CheckBuddy className="size-3.5" />
            Secure checkout · no account needed
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
