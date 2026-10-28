/**
 * Pricing and payout-fee policy.
 *
 * Pure TypeScript so the Convex backend and the Next.js checkout UI compute
 * exactly the same numbers. All amounts are integer minor units.
 *
 * Platform fee:
 * - NGN: 5%, minimum ₦20.
 * - USD: 10%, minimum $1.
 * - Other currencies: 5%, no extra minimum for now.
 *
 * The supporter can cover Bachs' processing fee (default on). Bachs adds its
 * actual fee on top at checkout; we never guess that amount in app math.
 *
 * Payout fees follow Bachs' published withdrawal schedule:
 * - NGN: ₦50 flat.
 * - USD: 1%, minimum $1, capped at $15.
 * - Other currencies: 0.3%.
 */

import { decimalsFor } from "./money";

export const PRICING_VERSION = "2026-10-28-fees-v1";

export const PLATFORM_TIP_MAX_BPS = 1_000; // 10%

type CurrencyPolicy = {
  platformFeeBps: number;
  platformFeeMinMinor: number;
  minBreadPriceMinor: number;
  maxBreadPriceMinor: number;
};

const DEFAULT_POLICY: CurrencyPolicy = {
  platformFeeBps: 500,
  platformFeeMinMinor: 0,
  minBreadPriceMinor: 10_000,
  maxBreadPriceMinor: 100_000_000,
};

const CURRENCY_POLICY: Record<string, CurrencyPolicy> = {
  NGN: {
    platformFeeBps: 500,
    platformFeeMinMinor: 2_000,
    minBreadPriceMinor: 10_000,
    maxBreadPriceMinor: 100_000_000,
  },
  USD: {
    platformFeeBps: 1_000,
    platformFeeMinMinor: 100,
    // $5. A $1 minimum bread would make the $1 minimum fee a 100% cut.
    minBreadPriceMinor: 500,
    maxBreadPriceMinor: 100_000_000,
  },
};

export function pricingPolicy(currency: string): CurrencyPolicy {
  return CURRENCY_POLICY[currency.toUpperCase()] ?? DEFAULT_POLICY;
}

export function minBreadPriceMinorFor(currency: string): number {
  return pricingPolicy(currency).minBreadPriceMinor;
}

export function maxBreadPriceMinorFor(currency: string): number {
  return pricingPolicy(currency).maxBreadPriceMinor;
}

/** Platform fee for a bread subtotal. Never negative, never above the amount. */
export function platformFeeFor(amountMinor: number, currency: string): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 0;
  const policy = pricingPolicy(currency);
  const percentage = Math.round((amountMinor * policy.platformFeeBps) / 10_000);
  return Math.min(amountMinor, Math.max(policy.platformFeeMinMinor, percentage));
}

/** Optional platform tip, capped at 10% of the bread subtotal. */
export function platformTipFor(amountMinor: number, tipBps: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 0;
  if (!Number.isSafeInteger(tipBps) || tipBps <= 0) return 0;
  const clamped = Math.min(PLATFORM_TIP_MAX_BPS, tipBps);
  return Math.min(amountMinor, Math.round((amountMinor * clamped) / 10_000));
}

export function normalizeTipBps(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) return 0;
  return Math.min(PLATFORM_TIP_MAX_BPS, value);
}

export type DonationPricing = {
  amount: number;
  platformFee: number;
  platformTip: number;
  totalCharged: number;
  netAmount: number;
  tipBps: number;
};

export function computeDonationPricing(
  amountMinor: number,
  currency: string,
  tipBps: number,
): DonationPricing {
  const normalizedTipBps = normalizeTipBps(tipBps);
  const platformFee = platformFeeFor(amountMinor, currency);
  const platformTip = platformTipFor(amountMinor, normalizedTipBps);
  return {
    amount: amountMinor,
    platformFee,
    platformTip,
    totalCharged: amountMinor + platformTip,
    netAmount: amountMinor - platformFee,
    tipBps: normalizedTipBps,
  };
}

/** Flat/percentage payout fee, in minor units, added on top of the amount. */
export function payoutFeeFor(amountMinor: number, currency: string): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return 0;
  switch (currency.toUpperCase()) {
    case "NGN":
      return 5_000; // ₦50 flat
    case "USD": {
      const onePercent = Math.round(amountMinor / 100);
      return Math.min(1_500, Math.max(100, onePercent)); // $1 min, $15 cap
    }
    default:
      // Bachs' published default for other withdrawal currencies.
      return Math.round((amountMinor * 30) / 10_000);
  }
}

/** Minimum net payout per currency. */
export function minPayoutMinorFor(currency: string): number {
  switch (currency.toUpperCase()) {
    case "NGN":
      return 100_000; // ₦1,000
    case "USD":
      return 1_000; // $10
    default:
      return 100_000;
  }
}

/**
 * Largest net amount a creator can request from `availableMinor` after the
 * payout fee is added on top. The fee depends on the net amount, so this
 * settles in at most a couple of iterations.
 */
export function maxPayoutNet(availableMinor: number, currency: string): number {
  if (!Number.isSafeInteger(availableMinor) || availableMinor <= 0) return 0;
  let net = availableMinor;
  for (let i = 0; i < 4; i += 1) {
    const fee = payoutFeeFor(net, currency);
    const total = net + fee;
    if (total <= availableMinor) return net;
    net = availableMinor - fee;
    if (net <= 0) return 0;
  }
  return Math.max(0, Math.min(net, availableMinor));
}

/** True when the currency has a configured decimal precision. */
export function hasKnownCurrency(currency: string): boolean {
  return Number.isInteger(decimalsFor(currency));
}
