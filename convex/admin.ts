import { v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { applyLedgerEntry, applyPlatformLedgerEntry } from "./ledger";
import { settlementHoldHours } from "./lib/config";
import { appError } from "./lib/errors";
import { isAdmin, requireAdmin } from "./lib/guards";
import { rateLimiter } from "./rateLimit";

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

/** Append-only audit trail for privileged actions. */
async function recordAdminAudit(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<"users">;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  const json = (value: unknown) =>
    value === undefined ? undefined : JSON.stringify(value);
  await ctx.db.insert("adminAuditLogs", {
    actorUserId: args.actorUserId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    metadata: args.metadata,
    beforeJson: json(args.before),
    afterJson: json(args.after),
    createdAt: Date.now(),
  });
}

/** The subset of creator balance/status state worth putting in the audit log. */
function creatorAuditState(creator: {
  status: string;
  balancePending: number;
  balanceAvailable: number;
  balancePaidOut: number;
}) {
  return {
    status: creator.status,
    balancePending: creator.balancePending,
    balanceAvailable: creator.balanceAvailable,
    balancePaidOut: creator.balancePaidOut,
  };
}

const creatorOverviewValidator = v.object({
  _id: v.id("creators"),
  username: v.string(),
  displayName: v.string(),
  email: v.union(v.string(), v.null()),
  status: v.union(v.literal("active"), v.literal("suspended")),
  currency: v.string(),
  breadPrice: v.number(),
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
  nextSettlementAt: v.union(v.number(), v.null()),
  payoutsAwaiting: v.number(),
});

export const listCreators = query({
  args: {},
  returns: v.array(creatorOverviewValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const creators = await ctx.db.query("creators").order("desc").take(100);

    // Pending settlement times per creator. One bounded scan is enough for
    // the admin list; the per-creator detail view has its own breakdown.
    const holdMs = settlementHoldHours() * 60 * 60 * 1000;
    const pendingEntries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_settlement", (q) => q.eq("settlementStatus", "pending"))
      .take(5000);
    const nextSettlementByCreator = new Map<Id<"creators">, number>();
    for (const entry of pendingEntries) {
      const settlesAt = entry.createdAt + holdMs;
      const current = nextSettlementByCreator.get(entry.creatorId);
      if (current === undefined || settlesAt < current) {
        nextSettlementByCreator.set(entry.creatorId, settlesAt);
      }
    }

    // Open withdrawals are relatively few; query them by status so the sum
    // does not depend on walking each creator's payout history. Bucket by
    // currency so a creator's awaiting total never mixes currencies.
    const awaitingByCreator = new Map<string, number>();
    for (const status of ["requested", "processing"] as const) {
      const open = await ctx.db
        .query("payouts")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(1000);
      for (const payout of open) {
        const key = `${payout.creatorId}:${payout.currency}`;
        awaitingByCreator.set(
          key,
          (awaitingByCreator.get(key) ?? 0) + payout.amount,
        );
      }
    }

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
        breadPrice: creator.coffeePrice,
        totalRaised: creator.totalRaised,
        totalSupporters: creator.totalSupporters,
        balancePending: creator.balancePending,
        balanceAvailable: creator.balanceAvailable,
        balancePaidOut: creator.balancePaidOut,
        onboardingStatus: creator.onboardingStatus,
        createdAt: creator.createdAt,
        nextSettlementAt: nextSettlementByCreator.get(creator._id) ?? null,
        payoutsAwaiting:
          awaitingByCreator.get(`${creator._id}:${creator.currency}`) ?? 0,
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
    const admin = await requireAdmin(ctx);
    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");
    await ctx.db.patch("creators", creator._id, { status: args.status });
    await recordAdminAudit(ctx, {
      actorUserId: admin._id,
      action: "creator.status",
      targetType: "creator",
      targetId: creator._id,
      metadata: `${creator.status} -> ${args.status}`,
      before: { status: creator.status },
      after: { status: args.status },
    });
    return null;
  },
});

const payoutAdminRowValidator = v.object({
  _id: v.id("payouts"),
  creatorUsername: v.string(),
  creatorDisplayName: v.string(),
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
        fee: payout.fee,
        totalDebited: payout.totalDebited,
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

/**
 * Manual creator balance adjustment (positive credit or negative clawback).
 *
 * Every adjustment is a settled ledger entry, so it immediately changes the
 * creator's withdrawable balance and remains auditable forever. The
 * idempotency key is stored on the entry; retrying the same admin action
 * returns the original entry instead of moving money twice.
 */
export const adjustCreatorBalance = mutation({
  args: {
    creatorId: v.id("creators"),
    /** Signed minor units: positive credits, negative debits. */
    amount: v.number(),
    reason: v.string(),
    reference: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.object({
    ledgerEntryId: v.id("ledgerEntries"),
    duplicate: v.boolean(),
    balanceAvailable: v.number(),
  }),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const limit = await rateLimiter.limit(ctx, "adminAdjustmentPerActor", {
      key: admin._id,
    });
    if (!limit.ok) {
      throw appError("rate_limited", "Too many balance adjustments. Try again later.", {
        retryAfterMs: limit.retryAfter,
      });
    }

    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");
    if (!Number.isSafeInteger(args.amount) || args.amount === 0) {
      throw appError("invalid_input", "Adjustment must be a non-zero whole minor-unit amount.");
    }
    if (!Number.isSafeInteger(creator.balanceAvailable + args.amount)) {
      throw appError("invalid_input", "That adjustment would overflow the balance.");
    }
    const reason = args.reason.trim();
    const reference = args.reference.trim();
    const idempotencyKey = args.idempotencyKey.trim();
    if (reason.length < 3 || reason.length > 280) {
      throw appError("invalid_input", "Give a reason between 3 and 280 characters.");
    }
    if (reference.length < 3 || reference.length > 128) {
      throw appError("invalid_input", "Give a reference between 3 and 128 characters.");
    }
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw appError("invalid_input", "Invalid adjustment idempotency key.");
    }

    const existing = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_adjustmentKey", (q) =>
        q.eq("creatorId", creator._id).eq("adjustmentKey", idempotencyKey),
      )
      .unique();
    if (existing) {
      return {
        ledgerEntryId: existing._id,
        duplicate: true,
        balanceAvailable: creator.balanceAvailable,
      };
    }

    const before = creatorAuditState(creator);
    const ledgerEntryId = await applyLedgerEntry(ctx, {
      creatorId: creator._id,
      type: "adjustment",
      amount: args.amount,
      currency: creator.currency,
      settlementStatus: "settled",
      note: reason,
      reference,
      adjustmentKey: idempotencyKey,
    });
    const after = await ctx.db.get("creators", creator._id);
    await recordAdminAudit(ctx, {
      actorUserId: admin._id,
      action: "creator.balance_adjusted",
      targetType: "creator",
      targetId: creator._id,
      metadata: `${args.amount} ${creator.currency}; ${reason}; ref ${reference}`,
      before,
      after: after ? creatorAuditState(after) : undefined,
    });
    return {
      ledgerEntryId,
      duplicate: false,
      balanceAvailable: after?.balanceAvailable ?? creator.balanceAvailable,
    };
  },
});

export const markPayoutPaid = mutation({
  args: { payoutId: v.id("payouts"), reference: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (!payout) throw appError("not_found", "Payout not found.");
    if (payout.status === "paid" || payout.status === "failed") {
      throw appError("already_resolved", "This payout has already been resolved.");
    }
    const reference = args.reference.trim();
    if (!reference) {
      throw appError("invalid_input", "Record the transfer reference you used.");
    }
    const creator = await ctx.db.get("creators", payout.creatorId);
    if (!creator) {
      throw appError("not_found", "The payout's creator no longer exists.");
    }
    if (creator.currency.toUpperCase() !== payout.currency.toUpperCase()) {
      throw appError(
        "currency_mismatch",
        "The payout currency does not match the creator's currency.",
      );
    }
    const fee = payout.fee ?? 0;
    const amount = payout.amount;
    const totalDebited = payout.totalDebited ?? amount + fee;
    if (amount <= 0 || totalDebited !== amount + fee) {
      throw appError("invalid_payout", "The payout's amounts are inconsistent.");
    }
    await ctx.db.patch("payouts", payout._id, {
      status: "paid",
      reference,
      fee,
      totalDebited,
      processedAt: Date.now(),
    });
    // No creator-ledger debit here: request() already reserved totalDebited.
    // Record the creator's net received, and the pass-through fee on the
    // platform ledger so it is never mistaken for platform revenue.
    await ctx.db.patch("creators", creator._id, {
      balancePaidOut: creator.balancePaidOut + amount,
      balancePayoutFeesPaid: (creator.balancePayoutFeesPaid ?? 0) + fee,
    });
    if (fee > 0) {
      await applyPlatformLedgerEntry(ctx, {
        type: "payout_fee_collected",
        amount: fee,
        currency: payout.currency,
        payoutId: payout._id,
        note: "Withdrawal fee collected from creator",
      });
      // Only the automatic rail pays this fee to Bachs. A manual bank
      // transfer has its own (unknown) cost, so do not invent a provider
      // expense for it; the collected fee offsets that cost instead.
      if (payout.method === "bachs") {
        await applyPlatformLedgerEntry(ctx, {
          type: "payout_fee_expense",
          amount: -fee,
          currency: payout.currency,
          payoutId: payout._id,
          note: "Withdrawal fee passed to Bachs",
        });
      }
    }
    const creatorAfter = await ctx.db.get("creators", creator._id);
    await recordAdminAudit(ctx, {
      actorUserId: admin._id,
      action: "payout.paid",
      targetType: "payout",
      targetId: payout._id,
      metadata: `${amount} ${payout.currency} net; fee ${fee}; total ${totalDebited}; ref ${reference}`,
      before: {
        payoutStatus: payout.status,
        creator: creator ? creatorAuditState(creator) : null,
      },
      after: {
        payoutStatus: "paid",
        reference,
        creator: creatorAfter ? creatorAuditState(creatorAfter) : null,
      },
    });
    return null;
  },
});

export const markPayoutFailed = mutation({
  args: { payoutId: v.id("payouts"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const payout = await ctx.db.get("payouts", args.payoutId);
    if (!payout) throw appError("not_found", "Payout not found.");
    if (payout.status === "paid" || payout.status === "failed") {
      throw appError("already_resolved", "This payout has already been resolved.");
    }
    const reason = args.reason.trim();
    if (!reason) {
      throw appError("invalid_input", "Add a reason for the failure.");
    }
    const creatorBefore = await ctx.db.get("creators", payout.creatorId);
    if (!creatorBefore) {
      throw appError("not_found", "The payout's creator no longer exists.");
    }
    const fee = payout.fee ?? 0;
    const amount = payout.amount;
    const totalDebited = payout.totalDebited ?? amount + fee;
    await ctx.db.patch("payouts", payout._id, {
      status: "failed",
      failureReason: reason,
      fee,
      totalDebited,
      processedAt: Date.now(),
    });
    // Release the full reservation (net amount + provider fee).
    await applyLedgerEntry(ctx, {
      creatorId: payout.creatorId,
      type: "payout_reversal",
      amount: totalDebited,
      currency: payout.currency,
      payoutId: payout._id,
      settlementStatus: "settled",
      note: "Payout failed — full reservation released",
      reference: `payout_failed_${payout._id}`,
    });
    const creatorAfter = await ctx.db.get("creators", payout.creatorId);
    await recordAdminAudit(ctx, {
      actorUserId: admin._id,
      action: "payout.failed",
      targetType: "payout",
      targetId: payout._id,
      metadata: reason,
      before: {
        payoutStatus: payout.status,
        creator: creatorBefore ? creatorAuditState(creatorBefore) : null,
      },
      after: {
        payoutStatus: "failed",
        failureReason: reason,
        creator: creatorAfter ? creatorAuditState(creatorAfter) : null,
      },
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
    const admin = await requireAdmin(ctx);
    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");
    const CAP = 5000;
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
      .take(CAP + 1);
    if (entries.length > CAP) {
      // Never overwrite balances from a partial ledger. Refusing is safer
      // than silently reporting a lower balance as authoritative.
      throw appError(
        "too_many_entries",
        `This creator has more than ${CAP} ledger entries. Recompute in smaller batches or export the ledger; no balances were changed.`,
      );
    }
    let pending = 0;
    let available = 0;
    for (const entry of entries) {
      if (entry.settlementStatus === "pending") pending += entry.amount;
      else available += entry.amount;
    }
    await ctx.db.patch("creators", creator._id, {
      balancePending: pending,
      balanceAvailable: available,
    });
    await recordAdminAudit(ctx, {
      actorUserId: admin._id,
      action: "creator.balances.recompute",
      targetType: "creator",
      targetId: creator._id,
      metadata: `pending ${pending}; available ${available}; entries ${entries.length}`,
      before: {
        balancePending: creator.balancePending,
        balanceAvailable: creator.balanceAvailable,
        balancePaidOut: creator.balancePaidOut,
      },
      after: {
        balancePending: pending,
        balanceAvailable: available,
        balancePaidOut: creator.balancePaidOut,
        entriesScanned: entries.length,
      },
    });
    return {
      pending,
      available,
      entriesScanned: entries.length,
      truncated: false,
    };
  },
});

/** Recent webhook/reconcile/simulated events (debugging). */
export const listWebhookEvents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("webhookEvents"),
      _creationTime: v.number(),
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
      _creationTime: v.number(),
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

/**
 * Retention for append-only operational tables.
 *
 * Webhook deliveries and API-operation rows are kept long enough to debug a
 * payment, then deleted in bounded batches so they cannot grow forever.
 * Ledger entries, donations, payouts and the admin audit log are financial
 * records and are intentionally NOT touched by this job.
 */
export const cleanupExpiredRecords = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({
    webhookEvents: v.number(),
    apiOperations: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const webhookCutoff = now - 90 * 24 * 60 * 60 * 1000;
    const operationCutoff = now - 90 * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("webhookEvents")
      .withIndex("by_receivedAt", (q) => q.lt("receivedAt", webhookCutoff))
      .take(500);
    for (const event of events) {
      await ctx.db.delete("webhookEvents", event._id);
    }

    let operationsDeleted = 0;
    for (const status of ["succeeded", "failed", "outcome_unknown"] as const) {
      const operations = await ctx.db
        .query("apiOperations")
        .withIndex("by_status", (q) =>
          q.eq("status", status).lt("updatedAt", operationCutoff),
        )
        .take(500);
      for (const operation of operations) {
        await ctx.db.delete("apiOperations", operation._id);
        operationsDeleted += 1;
      }
    }

    return { webhookEvents: events.length, apiOperations: operationsDeleted };
  },
});

/** Recent privileged actions, newest first. */
export const listAuditLog = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("adminAuditLogs"),
      _creationTime: v.number(),
      actorUserId: v.id("users"),
      action: v.string(),
      targetType: v.string(),
      targetId: v.optional(v.string()),
      metadata: v.optional(v.string()),
      beforeJson: v.optional(v.string()),
      afterJson: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("adminAuditLogs").order("desc").take(200);
  },
});
