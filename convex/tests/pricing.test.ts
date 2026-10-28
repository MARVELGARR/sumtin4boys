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

  it("caps the optional tip at 10% and keeps it out of creator net", () => {
    const pricing = computeDonationPricing(50_000, "NGN", 1_000);
    expect(pricing.platformFee).toBe(2_500);
    expect(pricing.platformTip).toBe(5_000);
    expect(pricing.totalCharged).toBe(55_000);
    expect(pricing.netAmount).toBe(47_500);
    expect(platformTipFor(50_000, 20_000)).toBe(5_000);
  });

  it("uses per-currency payout fees and minimums", () => {
    expect(payoutFeeFor(100_000, "NGN")).toBe(5_000);
    expect(payoutFeeFor(10_000, "USD")).toBe(100);
    expect(payoutFeeFor(100_000, "USD")).toBe(1_000);
    expect(payoutFeeFor(1_000_000, "USD")).toBe(1_500);
    expect(minPayoutMinorFor("NGN")).toBe(100_000);
    expect(minPayoutMinorFor("USD")).toBe(1_000);
  });

  it("computes the largest net payout after the fee is added on top", () => {
    expect(maxPayoutNet(100_000, "NGN")).toBe(95_000);
    expect(maxPayoutNet(380_000, "NGN")).toBe(375_000);
    expect(maxPayoutNet(1_000, "USD")).toBe(900); // below the $10 minimum
    expect(maxPayoutNet(1_200, "USD")).toBe(1_100);
    expect(maxPayoutNet(0, "NGN")).toBe(0);
  });
});
