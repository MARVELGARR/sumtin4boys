import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { resolvePaymentsDriver } from "../lib/config";
import { appError } from "../lib/errors";
import { fromMinorUnits } from "../lib/money";

/**
 * Simulated payment driver.
 *
 * When `PAYMENTS_DRIVER=simulated` (the default until a Bachs API key is
 * configured), `donations.createCheckout` redirects supporters to
 * `/simulated-checkout?ref=...` instead of a real Bachs checkout. That page
 * calls `completeSimulatedCheckout` below, which synthesizes the exact event
 * shape a real webhook would deliver and feeds it through the SAME
 * `processCheckoutEvent` pipeline.
 *
 * Nothing here runs in production: every entry point checks the driver.
 */

export const completeSimulatedCheckout = mutation({
  args: {
    reference: v.string(),
    outcome: v.union(v.literal("paid"), v.literal("failed"), v.literal("expire")),
  },
  returns: v.object({
    ok: v.boolean(),
    outcome: v.string(),
  }),
  handler: async (ctx, args): Promise<{ ok: boolean; outcome: string }> => {
    if (resolvePaymentsDriver() !== "simulated") {
      throw appError(
        "simulated_only",
        "The simulated checkout is only available when PAYMENTS_DRIVER=simulated.",
      );
    }
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.trim()))
      .unique();
    if (!donation) {
      throw appError("not_found", "That simulated checkout does not exist.");
    }

    const now = Date.now();
    // Deterministic event ids: clicking a button twice maps to the same event
    // and is deduplicated exactly like a redelivered webhook.
    const eventId = `sim_${args.outcome}_${donation.reference}`;
    const eventType =
      args.outcome === "paid"
        ? "simulated.paid"
        : args.outcome === "failed"
          ? "simulated.failed"
          : "simulated.expired";

    const result = await ctx.runMutation(internal.bachs.events.processCheckoutEvent, {
      eventId,
      eventType,
      eventCreatedAt: now,
      source: "simulated",
      checkout: {
        checkoutId: donation.checkoutId ?? `sim_${donation.reference}`,
        status:
          args.outcome === "paid" ? "completed" : args.outcome === "expire" ? "expired" : "open",
        paymentStatus:
          args.outcome === "paid" ? "paid" : args.outcome === "failed" ? "failed" : undefined,
        amount: fromMinorUnits(donation.amount, donation.currency),
        currency: donation.currency,
        reference: donation.reference,
        chargeId: args.outcome === "paid" ? `sim_ch_${donation.reference}` : undefined,
      },
    });

    return { ok: result.outcome === "processed", outcome: result.outcome };
  },
});
