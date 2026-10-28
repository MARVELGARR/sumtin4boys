/**
 * Payment-provider contracts.
 *
 * Two drivers implement the same user-facing behaviour:
 *
 * - `bachs` (convex/bachs/bachsNode.ts): the real Bachs API.
 * - `simulated` (convex/bachs/simulated.ts): a labelled fake, no network.
 *
 * Both funnel into ONE fulfilment pipeline: `processCheckoutEvent`
 * (convex/bachs/events.ts). The simulator writes the same event rows as a
 * real webhook would, so the whole money path is exercised locally.
 */

import { v, type Infer } from "convex/values";

// ---------------------------------------------------------------------------
// Normalized provider state
// ---------------------------------------------------------------------------

/**
 * A checkout session as the app needs to see it, regardless of which driver
 * produced it. Amounts are decimal strings at this boundary (the provider
 * format); the event pipeline converts to minor units for comparison.
 */
export const checkoutStateValidator = v.object({
  checkoutId: v.string(),
  /** Provider status: "open" | "completed" | "expired" | ... */
  status: v.string(),
  /** Provider payment status: "paid" | "succeeded" | "failed" | undefined. */
  paymentStatus: v.optional(v.string()),
  /** Decimal string, e.g. "5000.00". */
  amount: v.optional(v.string()),
  currency: v.optional(v.string()),
  reference: v.optional(v.string()),
  chargeId: v.optional(v.string()),
  /** Bachs' actual processing fee, when the payment object reports it. */
  processingFee: v.optional(v.string()),
  /** Who bore the processing fee, when known. */
  feeBearer: v.optional(
    v.union(v.literal("customer"), v.literal("merchant")),
  ),
});
export type CheckoutState = Infer<typeof checkoutStateValidator>;

export const eventSourceValidator = v.union(
  v.literal("webhook"),
  v.literal("reconcile"),
  v.literal("simulated"),
);
export type EventSource = Infer<typeof eventSourceValidator>;

// ---------------------------------------------------------------------------
// Checkout creation payload (internal action argument)
// ---------------------------------------------------------------------------

export const checkoutPayloadValidator = v.object({
  /** Bread subtotal, decimal string at currency precision. */
  amount: v.string(),
  /** Bread subtotal + platform tip. The amount Bachs should charge. */
  chargeAmount: v.optional(v.string()),
  currency: v.string(),
  reference: v.string(),
  /** Idempotency-Key for the provider request. Reused verbatim on retries. */
  idempotencyKey: v.string(),
  supporterName: v.string(),
  supporterEmail: v.string(),
  successUrl: v.string(),
  cancelUrl: v.string(),
  creatorUsername: v.string(),
  donationId: v.id("donations"),
  /** Platform cut (excluding the optional tip), decimal string. */
  platformFee: v.string(),
  /** Optional supporter tip for the platform, decimal string. */
  platformTip: v.optional(v.string()),
  /** Bachs adds its actual processing fee on top when true. */
  coverProcessingFee: v.optional(v.boolean()),
  /**
   * Connected account id when Connect mode is on and the creator is
   * onboarded. Its presence switches the checkout to a destination charge.
   */
  connectDestination: v.optional(v.string()),
});
export type CheckoutPayload = Infer<typeof checkoutPayloadValidator>;

// ---------------------------------------------------------------------------
// Event classification
// ---------------------------------------------------------------------------

/**
 * What a provider event means for a donation. Everything not listed here is
 * recorded for observability but never changes money state.
 *
 * Source: https://docs.bachs.io/llms.txt (Webhooks > Events).
 */
export type EventClass =
  | "completion" // money arrived; fulfil
  | "expiry" // checkout closed; unresolved, but NOT final
  | "underpaid" // crypto underpayment; unresolved, needs manual review
  | "nonfinal_failure" // a payment attempt failed; checkout stays open
  | "refund" // refund delivered
  | "other"; // subscriptions, disputes, transfers, ...

export function classifyEvent(type: string): EventClass {
  switch (type) {
    case "checkout.completed":
    case "collection.succeeded":
    case "simulated.paid":
      return "completion";
    case "checkout.expired":
    case "simulated.expired":
    case "simulated.failed":
      return "expiry";
    case "collection.underpaid":
      return "underpaid";
    case "collection.failed":
      return "nonfinal_failure";
    case "refund.paid":
    case "simulated.refunded":
      return "refund";
    default:
      return "other";
  }
}

/** True when a provider checkout state represents collected money. */
export function checkoutStateIsPaid(state: CheckoutState): boolean {
  const status = (state.status ?? "").toLowerCase();
  const paymentStatus = (state.paymentStatus ?? "").toLowerCase();
  return (
    status === "completed" && (paymentStatus === "paid" || paymentStatus === "succeeded")
  );
}

/** True when a checkout state is closed without payment. */
export function checkoutStateIsExpired(state: CheckoutState): boolean {
  const status = (state.status ?? "").toLowerCase();
  return status === "expired" || status === "cancelled" || status === "canceled";
}

/** How a live checkout state maps onto the event pipeline (reconciliation). */
export function classifyCheckoutState(
  state: CheckoutState,
): "completion" | "expiry" | "open" {
  if (checkoutStateIsPaid(state)) return "completion";
  if (checkoutStateIsExpired(state)) return "expiry";
  return "open";
}
