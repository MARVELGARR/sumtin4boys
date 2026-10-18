"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { appErrorMessage, formatMoney, fromMinorUnits, parseMajorAmount } from "@/lib/format";

/**
 * Platform mode withdrawal request: pick an amount in major units, confirm in
 * an AlertDialog, then `api.payouts.request`. Validation is client-side UX
 * only — the backend re-checks minimum and available balance.
 */
export function PayoutRequestForm({
  minimum,
  available,
  currency,
  hasOpenPayout,
}: {
  minimum: number;
  available: number;
  currency: string;
  hasOpenPayout: boolean;
}) {
  const request = useMutation(api.payouts.request);
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canRequest = available >= minimum;
  const disabled = !canRequest || hasOpenPayout || submitting;
  const parsed = parseMajorAmount(amountInput, currency);

  function validate(): number | null {
    const amount = parseMajorAmount(amountInput, currency);
    if (amount === null || amount <= 0) {
      setError("Enter the amount you want to withdraw.");
      return null;
    }
    if (amount < minimum) {
      setError(`The minimum payout is ${formatMoney(minimum, currency)}.`);
      return null;
    }
    if (amount > available) {
      setError(
        `You can withdraw up to ${formatMoney(available, currency)} right now.`,
      );
      return null;
    }
    setError(null);
    return amount;
  }

  function handleOpenConfirm() {
    if (validate() === null) return;
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    const amount = parseMajorAmount(amountInput, currency);
    if (amount === null) return;
    setSubmitting(true);
    try {
      await request({ amount });
      toast.success("Payout requested — we'll process it soon.");
      setAmountInput("");
      setError(null);
    } catch (requestError) {
      toast.error(appErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a payout</CardTitle>
        <CardDescription>
          Withdraw from your available balance. An admin transfers the money and
          marks it as paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="payout-amount">Amount ({currency})</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id="payout-amount"
              inputMode="decimal"
              placeholder="e.g. 5000"
              value={amountInput}
              aria-invalid={Boolean(error)}
              disabled={disabled}
              onChange={(event) => setAmountInput(event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || available <= 0}
              onClick={() => {
                setAmountInput(fromMinorUnits(available, currency));
                setError(null);
              }}
            >
              Use max
            </Button>
          </div>
          <FieldDescription>
            Minimum payout: {formatMoney(minimum, currency)} · Available:{" "}
            {formatMoney(available, currency)}
          </FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>

        {hasOpenPayout ? (
          <p className="text-sm text-muted-foreground">
            You already have a payout being processed.
          </p>
        ) : !canRequest ? (
          <p className="text-sm text-muted-foreground">
            You need at least {formatMoney(minimum, currency)} available before
            you can request a payout.
          </p>
        ) : null}

        <div>
          <Button
            onClick={handleOpenConfirm}
            disabled={disabled || amountInput.trim() === ""}
          >
            Request payout
          </Button>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Request {parsed !== null ? formatMoney(parsed, currency) : "a payout"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This reserves the amount from your available balance. Payouts
                can&apos;t be cancelled once requested.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting}
                onClick={() => void handleConfirm()}
              >
                {submitting ? "Requesting…" : "Request payout"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
