/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import {
  computeDonationPricing,
  maxPayoutNet,
  minPayoutMinorFor,
  payoutFeeFor,
  platformFeeFor,
  platformTipFor,
} from "../lib/pricing";

describe("platform pricing", () => {
  it("charges NGN 5% with a ₦20 minimum", () => {
    expect(platformFeeFor(10_000, "NGN")).toBe(2_000); // ₦100 bread
    expect(platformFeeFor(100_000, "NGN")).toBe(5_000); // ₦1,000 bread
    expect(platformFeeFor(400_000, "NGN")).toBe(20_000); // ₦4,000 bread
  });

  it("charges USD 10% with a $1 minimum", () => {
    expect(platformFeeFor(500, "USD")).toBe(100); // $5 bread
    expect(platformFeeFor(1_000, "USD")).toBe(100); // $10 bread
    expect(platformFeeFor(10_000, "USD")).toBe(1_000); // $100 bread
  });

  it("applies the USD $1 minimum on small orders and reports the effective rate", () => {
    // $5 is the USD minimum bread price: 10% would be $0.50, so $1 binds.
    expect(platformFeeFor(500, "USD")).toBe(100);
    expect((platformFeeFor(500, "USD") / 500) * 100).toBe(20); // 20% effective
    // $6: 10% = $0.60 < $1 → still the minimum (16.7% effective).
    expect(platformFeeFor(600, "USD")).toBe(100);
    expect(platformFeeFor(600, "USD") / 600).toBeCloseTo(1 / 6, 10);
    // $10 is the exact break-even: 10% === $1.
    expect(platformFeeFor(1_000, "USD")).toBe(100);
    // $11: 10% = $1.10 > $1 → the percentage takes over again.
    expect(platformFeeFor(1_100, "USD")).toBe(110);
    expect(platformFeeFor(1_100, "USD") / 1_100).toBeCloseTo(0.1, 10);
    // Above the break-even the effective rate is exactly the nominal 10%.
    expect(platformFeeFor(25_000, "USD")).toBe(2_500);
  });

  it("caps the optional tip at 10% and keeps it out of creator net", () => {
    const pricing = computeDonationPricing(50_000, "NGN", 1_000);
    expect(pricing.platformFee).toBe(2_500);
    expect(pricing.platformTip).toBe(5_000);
    expect(pricing.totalCharged).toBe(55_000);
    expect(pricing.netAmount).toBe(47_500);
    expect(platformTipFor(50_000, 20_000)).toBe(5_000);
  });

  it("charges a USD supporter bread + tip only, with the USD fee split", () => {
    // $50 bread + 10% tip.
    const pricing = computeDonationPricing(5_000, "USD", 1_000);
    expect(pricing.platformFee).toBe(500); // 10% of $50
    expect(pricing.platformTip).toBe(500); // 10% tip, capped at 10%
    expect(pricing.totalCharged).toBe(5_500); // $55 charged (bread + tip)
    expect(pricing.netAmount).toBe(4_500); // $45 to the creator

    // The processing fee is never folded into app math: when the supporter
    // covers it, Bachs adds its actual fee on top at the provider.
    expect(pricing.totalCharged).toBe(5_000 + 500);

    // Smallest USD order: the $1 minimum fee exceeds the 10% nominal cut.
    const minimum = computeDonationPricing(500, "USD", 1_000);
    expect(minimum.platformFee).toBe(100);
    expect(minimum.platformTip).toBe(50);
    expect(minimum.totalCharged).toBe(550);
    expect(minimum.netAmount).toBe(400);
    // Effective fee on a $5 bread is 20%, disclosed by the donate form.
    expect((minimum.platformFee / minimum.amount) * 100).toBe(20);

    // A 50% tip request is clamped to the 10% platform-tip cap.
    expect(computeDonationPricing(5_000, "USD", 5_000).platformTip).toBe(500);
  });

  it("uses per-currency payout fees and minimums", () => {
    expect(payoutFeeFor(100_000, "NGN")).toBe(5_000);
    expect(payoutFeeFor(10_000, "USD")).toBe(100);
    expect(payoutFeeFor(100_000, "USD")).toBe(1_000);
    expect(payoutFeeFor(1_000_000, "USD")).toBe(1_500);
    expect(minPayoutMinorFor("NGN")).toBe(100_000);
    expect(minPayoutMinorFor("USD")).toBe(1_000);
  });

  it("computes the exact largest net payout after the fee is added on top", () => {
    expect(maxPayoutNet(100_000, "NGN")).toBe(95_000);
    expect(maxPayoutNet(380_000, "NGN")).toBe(375_000);
    expect(maxPayoutNet(1_000, "USD")).toBe(900); // below the $10 minimum
    expect(maxPayoutNet(1_200, "USD")).toBe(1_100);
    // Below $100, 1% is less than the $1 minimum, so the fee stays at $1.
    expect(maxPayoutNet(10_000, "USD")).toBe(9_900);
    // Above the minimum-fee band, rounding still leaves an exact maximum:
    // 19,802 + round(1%) = 20,000, while 19,803 + 198 = 20,001.
    expect(maxPayoutNet(20_000, "USD")).toBe(19_802);
    // Default 0.3% fee: 99,701 + round(299.103) = 100,000.
    expect(maxPayoutNet(100_000, "GHS")).toBe(99_701);
    expect(maxPayoutNet(0, "NGN")).toBe(0);
  });
});
