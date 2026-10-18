"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
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
import {
  MAX_QUANTITY,
  MESSAGE_MAX_LENGTH,
  SUPPORTER_NAME_MAX_LENGTH,
  appErrorMessage,
  appErrorRetryAfterMs,
  formatMoney,
  isValidEmail,
} from "@/lib/format";

type DonateCardProps = {
  username: string;
  displayName: string;
  /** Price of one coffee in integer minor units. */
  coffeePrice: number;
  currency: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  quantity?: string;
};

/**
 * The support form on a public creator page. Honours the deployment's payment
 * mode: never pretends real payments exist when checkout isn't ready.
 */
export function DonateCard({
  username,
  displayName,
  coffeePrice,
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

  const total = coffeePrice * quantity;

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
      next.quantity = `Choose between 1 and ${MAX_QUANTITY} coffees.`;
    }
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setPending(true);
    try {
      const trimmedMessage = message.trim();
      const result = await createCheckout({
        username,
        quantity,
        supporterName: supporterName.trim(),
        supporterEmail: supporterEmail.trim(),
        isPrivate,
        ...(trimmedMessage ? { message: trimmedMessage } : {}),
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
      setPending(false);
    }
  }

  if (mode === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy {displayName} a coffee</CardTitle>
          <CardDescription>
            {formatMoney(coffeePrice, currency)} per coffee
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

  if (mode.driver === "bachs" && !mode.checkoutReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Support is temporarily unavailable on this deployment.</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Buy {displayName} a coffee</CardTitle>
        <CardDescription>
          {formatMoney(coffeePrice, currency)} per coffee
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode.driver === "simulated" ? (
          <p className="mb-4 text-xs text-muted-foreground">
            Demo deployment — payments are simulated.
          </p>
        ) : null}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <Field data-invalid={errors.quantity ? true : undefined}>
            <FieldTitle>Coffees</FieldTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One fewer coffee"
                disabled={pending || quantity <= 1}
                onClick={() => setQuantityTo(quantity - 1)}
              >
                <Minus />
              </Button>
              <span className="w-10 text-center text-sm tabular-nums font-medium">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="One more coffee"
                disabled={pending || quantity >= MAX_QUANTITY}
                onClick={() => setQuantityTo(quantity + 1)}
              >
                <Plus />
              </Button>
              <span className="text-xs text-muted-foreground">
                up to {MAX_QUANTITY}
              </span>
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
              placeholder="Ada"
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
            <FieldError>{errors.email}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="donate-message">Message</FieldLabel>
            <Textarea
              id="donate-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={3}
              placeholder="Say something nice…"
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

          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">
                {quantity} {quantity === 1 ? "coffee" : "coffees"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatMoney(coffeePrice, currency)} each
              </span>
            </div>
            <span className="tabular-nums font-medium">
              {formatMoney(total, currency)}
            </span>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Spinner />
                Starting checkout…
              </>
            ) : (
              <>Support with {formatMoney(total, currency)}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
