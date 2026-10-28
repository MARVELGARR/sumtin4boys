import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyLedgerEntry, payoutableBalance } from "./ledger";
import { connectEnabled, minPayoutMinor } from "./lib/config";
import { appError } from "./lib/errors";
import { requireCreator } from "./lib/guards";
import { fromMinorUnits } from "./lib/money";
import { maxPayoutNet, payoutFeeFor } from "./lib/pricing";

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
  fee: v.optional(v.number()),
  totalDebited: v.optional(v.number()),
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
  returns: v.object({
    payoutId: v.id("payouts"),
    amount: v.number(),
    fee: v.number(),
    totalDebited: v.number(),
  }),
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
    const minimum = minPayoutMinor(creator.currency);
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
    // The creator enters the net amount they want to receive. Bachs charges
    // its withdrawal fee on top, so the balance must cover both.
    const fee = payoutFeeFor(args.amount, creator.currency);
    const totalDebited = args.amount + fee;
    if (totalDebited > withdrawable) {
      const maxNet = maxPayoutNet(withdrawable, creator.currency);
      throw appError(
        "insufficient_available",
        maxNet >= minimum
          ? `The ${fromMinorUnits(fee, creator.currency)} ${creator.currency} payout fee is added on top. You can request up to ${fromMinorUnits(maxNet, creator.currency)} ${creator.currency} net right now.`
          : `The ${fromMinorUnits(fee, creator.currency)} ${creator.currency} payout fee is added on top, so your available balance is not enough for this payout.`,
      );
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
      fee,
      totalDebited,
      currency: creator.currency,
      status: "requested",
      method: "manual",
      requestedAt: now,
    });
    // Reserve the net amount plus the provider fee immediately. A failed
    // payout returns the full totalDebited, not just the net amount.
    await applyLedgerEntry(ctx, {
      creatorId: creator._id,
      type: "payout",
      amount: -totalDebited,
      currency: creator.currency,
      payoutId,
      settlementStatus: "settled",
      note: fee > 0 ? `Payout requested (fee ${fee} included)` : "Payout requested",
      reference: `payout_request_${payoutId}`,
    });
    return { payoutId, amount: args.amount, fee, totalDebited };
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
        fee: payout.fee,
        totalDebited: payout.totalDebited,
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
    /** Net pending ledger entries (can be negative). */
    pending: v.number(),
    /** Settled ledger balance before pending deductions. */
    available: v.number(),
    /** What can actually be requested after pending deductions. */
    withdrawable: v.number(),
    /** Net amount of open payout requests (what the creator will receive). */
    processing: v.number(),
    /** Provider fees attached to open payouts. */
    processingFees: v.number(),
    /** Total reserved by open payouts (net + fees). */
    processingTotal: v.number(),
    /** Lifetime net received from paid payouts. */
    paidOut: v.number(),
    /** Lifetime donation earnings after platform fees, before payout fees. */
    netEarned: v.number(),
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
      .take(100);
    const open = recent.filter(
      (payout) => payout.status === "requested" || payout.status === "processing",
    );
    const processing = open.reduce((sum, payout) => sum + payout.amount, 0);
    const processingFees = open.reduce(
      (sum, payout) => sum + (payout.fee ?? 0),
      0,
    );
    const processingTotal = open.reduce(
      (sum, payout) => sum + (payout.totalDebited ?? payout.amount),
      0,
    );
    const netEarned =
      creator.balancePending +
      creator.balanceAvailable +
      creator.balancePaidOut +
      processingTotal +
      (creator.balancePayoutFeesPaid ?? 0);
    return {
      currency: creator.currency,
      pending: creator.balancePending,
      available: creator.balanceAvailable,
      withdrawable: payoutableBalance(creator),
      processing,
      processingFees,
      processingTotal,
      paidOut: creator.balancePaidOut,
      netEarned,
      minimum: minPayoutMinor(creator.currency),
      connectMode: connectEnabled(),
      hasOpenPayout: open.length > 0,
    };
  },
});
