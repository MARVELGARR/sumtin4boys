import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyLedgerEntry } from "./ledger";
import { appError } from "./lib/errors";
import { isAdmin, requireAdmin } from "./lib/guards";

/**
 * Admin tools. Access is gated by the `ADMIN_EMAILS` deployment variable
 * (comma-separated, lowercased). Set it with:
 *
 *   npx convex env set ADMIN_EMAILS "you@example.com"
 */

export const amIAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => await isAdmin(ctx),
});

const creatorOverviewValidator = v.object({
  _id: v.id("creators"),
  username: v.string(),
  displayName: v.string(),
  email: v.union(v.string(), v.null()),
  status: v.union(v.literal("active"), v.literal("suspended")),
  currency: v.string(),
  coffeePrice: v.number(),
  totalRaised: v.number(),
  totalSupporters: v.number(),
  balancePending: v.number(),
  balanceAvailable: v.number(),
  balancePaidOut: v.number(),
  onboardingStatus: v.union(
    v.literal("not_started"),
    v.literal("pending"),
    v.literal("enabled"),
    v.literal("blocked"),
  ),
  createdAt: v.number(),
});

export const listCreators = query({
  args: {},
  returns: v.array(creatorOverviewValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const creators = await ctx.db.query("creators").order("desc").take(100);
    const rows = [];
    for (const creator of creators) {
      const user = await ctx.db.get("users", creator.userId);
      rows.push({
        _id: creator._id,
        username: creator.username,
        displayName: creator.displayName,
        email: user?.email ?? null,
        status: creator.status,
        currency: creator.currency,
        coffeePrice: creator.coffeePrice,
        totalRaised: creator.totalRaised,
        totalSupporters: creator.totalSupporters,
        balancePending: creator.balancePending,
        balanceAvailable: creator.balanceAvailable,
        balancePaidOut: creator.balancePaidOut,
        onboardingStatus: creator.onboardingStatus,
        createdAt: creator.createdAt,
      });
    }
    return rows;
  },
});

export const setCreatorStatus = mutation({
  args: {
    creatorId: v.id("creators"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");
    await ctx.db.patch("creators", creator._id, { status: args.status });
    return null;
  },
});

const payoutAdminRowValidator = v.object({
  _id: v.id("payouts"),
  creatorUsername: v.string(),
  creatorDisplayName: v.string(),
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

export const listPayouts = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("requested"),
        v.literal("processing"),
        v.literal("paid"),
        v.literal("failed"),
      ),
    ),
  },
  returns: v.array(payoutAdminRowValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = args.status;
    const payouts = status
      ? await ctx.db
          .query("payouts")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(100)
      : await ctx.db.query("payouts").order("desc").take(100);
    const rows = [];
    for (const payout of payouts) {
      const creator = await ctx.db.get("creators", payout.creatorId);
      rows.push({
        _id: payout._id,
        creatorUsername: creator?.username ?? "(deleted)",
        creatorDisplayName: creator?.displayName ?? "",
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        reference: payout.reference,
        failureReason: payout.failureReason,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
      });
    }
    return rows;
  },
});

export const markPayoutPaid = mutation({
  args: { payoutId: v.id("payouts"), reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (!payout) throw appError("not_found", "Payout not found.");
    if (payout.status === "paid" || payout.status === "failed") {
      throw appError("already_resolved", "This payout has already been resolved.");
    }
    const reference = args.reference.trim();
    if (!reference) {
      throw appError("invalid_input", "Record the transfer reference you used.");
    }
    await ctx.db.patch("payouts", payout._id, {
      status: "paid",
      reference,
      processedAt: Date.now(),
    });
    const creator = await ctx.db.get("creators", payout.creatorId);
    if (creator) {
      await ctx.db.patch("creators", creator._id, {
        balancePaidOut: creator.balancePaidOut + payout.amount,
      });
    }
    return null;
  },
});

export const markPayoutFailed = mutation({
  args: { payoutId: v.id("payouts"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (!payout) throw appError("not_found", "Payout not found.");
    if (payout.status === "paid" || payout.status === "failed") {
      throw appError("already_resolved", "This payout has already been resolved.");
    }
    const reason = args.reason.trim();
    if (!reason) {
      throw appError("invalid_input", "Add a reason for the failure.");
    }
    await ctx.db.patch("payouts", payout._id, {
      status: "failed",
      failureReason: reason,
      processedAt: Date.now(),
    });
    // Release the reservation made at request time.
    await applyLedgerEntry(ctx, {
      creatorId: payout.creatorId,
      type: "payout_reversal",
      amount: payout.amount,
      currency: payout.currency,
      payoutId: payout._id,
      settlementStatus: "settled",
      note: "Payout failed — funds released",
    });
    return null;
  },
});

/**
 * Rebuild a creator's balance counters from the ledger. The counters are
 * denormalized for cheap reads; this is the escape hatch if they ever drift.
 */
export const recomputeCreatorBalances = mutation({
  args: { creatorId: v.id("creators") },
  returns: v.object({
    pending: v.number(),
    available: v.number(),
    entriesScanned: v.number(),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");
    const CAP = 5000;
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .take(CAP + 1);
    const truncated = entries.length > CAP;
    let pending = 0;
    let available = 0;
    for (const entry of entries.slice(0, CAP)) {
      if (entry.settlementStatus === "pending") pending += entry.amount;
      else available += entry.amount;
    }
    await ctx.db.patch("creators", creator._id, {
      balancePending: pending,
      balanceAvailable: available,
    });
    return {
      pending,
      available,
      entriesScanned: Math.min(entries.length, CAP),
      truncated,
    };
  },
});

/** Recent webhook/reconcile/simulated events (debugging). */
export const listWebhookEvents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("webhookEvents"),
      eventId: v.string(),
      type: v.string(),
      source: v.union(v.literal("webhook"), v.literal("reconcile"), v.literal("simulated")),
      outcome: v.string(),
      donationId: v.optional(v.id("donations")),
      creatorId: v.optional(v.id("creators")),
      checkoutId: v.optional(v.string()),
      eventCreatedAt: v.number(),
      receivedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("webhookEvents").order("desc").take(100);
  },
});

/** Recent provider API operations (debugging uncertain writes). */
export const listApiOperations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("apiOperations"),
      key: v.string(),
      kind: v.string(),
      status: v.union(
        v.literal("started"),
        v.literal("succeeded"),
        v.literal("failed"),
        v.literal("outcome_unknown"),
      ),
      refId: v.optional(v.string()),
      providerId: v.optional(v.string()),
      errorCode: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      attempts: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("apiOperations").order("desc").take(100);
  },
});
