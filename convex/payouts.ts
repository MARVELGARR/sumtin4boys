import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyLedgerEntry, payoutableBalance } from "./ledger";
import { connectEnabled, minPayoutMinor } from "./lib/config";
import { appError } from "./lib/errors";
import { requireCreator } from "./lib/guards";
import { fromMinorUnits } from "./lib/money";

/**
 * Payouts.
 *
 * Platform mode (default): the platform collects all funds; creators request
 * withdrawals here and an admin fulfils them (see admin.markPayoutPaid).
 * Requesting reserves the amount immediately via a settled `payout` ledger
 * entry, so it can't be double-requested; a failed payout releases it again.
 * Refunds are also settled immediately, so a clawed-back donation cannot be
 * withdrawn. A negative available balance is recovered by future donations.
 *
 * Connect mode: money settles into each creator's own Bachs account, so this
 * request flow is disabled and the dashboard points creators at Bachs
 * instead (see docs/PAYMENTS.md).
 */

const payoutRowValidator = v.object({
  _id: v.id("payouts"),
  amount: v.number(),
  currency: v.string(),
  status: v.union(
    v.literal("requested"),
    v.literal("processing"),
    v.literal("paid"),
    v.literal("failed"),
  ),
  method: v.union(v.literal("manual"), v.literal("bachs")),
  reference: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  requestedAt: v.number(),
  processedAt: v.optional(v.number()),
});

export const request = mutation({
  args: { amount: v.number() },
  returns: v.object({ payoutId: v.id("payouts") }),
  handler: async (ctx, args) => {
    const { creator } = await requireCreator(ctx);
    if (connectEnabled()) {
      throw appError(
        "connect_mode",
        "Your earnings settle to your own Bachs account — withdraw from Bachs instead.",
      );
    }
    if (creator.status !== "active") {
      throw appError("forbidden", "Your page is suspended, so payouts are paused.");
    }
    const minimum = minPayoutMinor();
    if (!Number.isSafeInteger(args.amount) || args.amount < minimum) {
      throw appError(
        "below_minimum_payout",
        `The minimum payout is ${fromMinorUnits(minimum, creator.currency)} ${creator.currency}.`,
      );
    }
    // Positive pending donations are not withdrawable yet, and negative
    // pending entries (refund clawbacks/adjustments) must reduce what is.
    // A creator whose available balance went negative from a refund can only
    // recover through future settled donations or an admin adjustment.
    const withdrawable = payoutableBalance(creator);
    if (args.amount > withdrawable) {
      throw appError("insufficient_available", "That is more than your available balance.");
    }
    const recent = await ctx.db
      .query("payouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
      .order("desc")
      .take(10);
    if (recent.some((payout) => payout.status === "requested" || payout.status === "processing")) {
      throw appError(
        "payout_pending",
        "You already have a payout being processed. Wait for it to complete first.",
      );
    }

    const now = Date.now();
    const payoutId = await ctx.db.insert("payouts", {
      creatorId: creator._id,
      amount: args.amount,
      currency: creator.currency,
      status: "requested",
      method: "manual",
      requestedAt: now,
    });
    // Reserve the funds immediately: a settled negative entry lowers
    // balanceAvailable in the same transaction as the payout row.
    await applyLedgerEntry(ctx, {
      creatorId: creator._id,
      type: "payout",
      amount: -args.amount,
      currency: creator.currency,
      payoutId,
      settlementStatus: "settled",
      note: "Payout requested",
    });
    return { payoutId };
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(payoutRowValidator),
  handler: async (ctx, args) => {
    const { creator } = await requireCreator(ctx);
    const page = await ctx.db
      .query("payouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: page.page.map((payout) => ({
        _id: payout._id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        reference: payout.reference,
        failureReason: payout.failureReason,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
      })),
    };
  },
});

export const getBalances = query({
  args: {},
  returns: v.object({
    currency: v.string(),
    pending: v.number(),
    available: v.number(),
    paidOut: v.number(),
    minimum: v.number(),
    connectMode: v.boolean(),
    hasOpenPayout: v.boolean(),
  }),
  handler: async (ctx) => {
    const { creator } = await requireCreator(ctx);
    const recent = await ctx.db
      .query("payouts")
      .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
      .order("desc")
      .take(10);
    return {
      currency: creator.currency,
      pending: creator.balancePending,
      available: creator.balanceAvailable,
      paidOut: creator.balancePaidOut,
      minimum: minPayoutMinor(),
      connectMode: connectEnabled(),
      hasOpenPayout: recent.some(
        (payout) => payout.status === "requested" || payout.status === "processing",
      ),
    };
  },
});
