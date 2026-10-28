/**
 * Builds the checkout-creation payload for a donation.
 *
 * Shared by `donations.startCheckout` (first attempt) and the reconciliation
 * cron (retry with the SAME Idempotency-Key, per Bachs' recovery guidance:
 * https://docs.bachs.io/guides/idempotency).
 */

import type { Doc } from "../_generated/dataModel";
import { checkoutRedirectBase, connectEnabled } from "../lib/config";
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
  const redirectBase = checkoutRedirectBase();
  const connectActive =
    connectEnabled() && creator.onboardingStatus === "enabled" && creator.sellerAccountId;
  const platformTip = donation.platformTip ?? 0;
  const totalCharged = donation.totalCharged ?? donation.amount + platformTip;
  return {
    amount: fromMinorUnits(donation.amount, donation.currency),
    chargeAmount: fromMinorUnits(totalCharged, donation.currency),
    currency: donation.currency,
    reference: donation.reference,
    idempotencyKey: checkoutIdempotencyKey(donation.reference),
    supporterName: donation.supporterName,
    supporterEmail: donation.supporterEmail,
    successUrl: `${redirectBase}/checkout/success?ref=${encodeURIComponent(donation.reference)}`,
    cancelUrl: `${redirectBase}/checkout/cancel?username=${encodeURIComponent(creator.username)}`,
    creatorUsername: creator.username,
    donationId: donation._id,
    platformFee: fromMinorUnits(
      donation.platformFee + platformTip,
      donation.currency,
    ),
    platformTip: fromMinorUnits(platformTip, donation.currency),
    coverProcessingFee: donation.coverProcessingFee ?? false,
    connectDestination: connectActive ? creator.sellerAccountId : undefined,
  };
}
