/**
 * Builds the checkout-creation payload for a donation.
 *
 * Shared by `donations.startCheckout` (first attempt) and the reconciliation
 * cron (retry with the SAME Idempotency-Key, per Bachs' recovery guidance:
 * https://docs.bachs.io/guides/idempotency).
 */

import type { Doc } from "../_generated/dataModel";
import { appUrl, connectEnabled } from "../lib/config";
import { fromMinorUnits } from "../lib/money";
import type { CheckoutPayload } from "./provider";

/**
 * The Idempotency-Key for a donation's checkout operation. Deterministic from
 * the donation reference, so every retry reuses it and Bachs can replay the
 * cached success instead of creating a second checkout.
 */
export function checkoutIdempotencyKey(reference: string): string {
  return `checkout_${reference}`;
}

export function buildCheckoutPayload(
  creator: Doc<"creators">,
  donation: Doc<"donations">,
): CheckoutPayload {
  const app = appUrl();
  const connectActive =
    connectEnabled() && creator.onboardingStatus === "enabled" && creator.sellerAccountId;
  return {
    amount: fromMinorUnits(donation.amount, donation.currency),
    currency: donation.currency,
    reference: donation.reference,
    idempotencyKey: checkoutIdempotencyKey(donation.reference),
    supporterName: donation.supporterName,
    supporterEmail: donation.supporterEmail,
    successUrl: `${app}/thanks?ref=${encodeURIComponent(donation.reference)}`,
    cancelUrl: `${app}/${creator.username}`,
    creatorUsername: creator.username,
    donationId: donation._id,
    platformFee: fromMinorUnits(donation.platformFee, donation.currency),
    connectDestination: connectActive ? creator.sellerAccountId : undefined,
  };
}
