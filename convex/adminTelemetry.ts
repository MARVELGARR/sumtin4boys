import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  connectEnabled,
  platformFeeBps,
  resolvePaymentsDriver,
  settlementHoldHours,
  turnstileConfigured,
  webhookUrl,
} from "./lib/config";
import { appError } from "./lib/errors";
import { requireAdmin } from "./lib/guards";

/**
 * Protected admin telemetry.
 *
 * Every query here starts with `requireAdmin`, so an unauthenticated caller
 * gets `unauthenticated` and a signed-in non-admin gets `forbidden`.
 *
 * Money is stored in integer minor units. Totals are ALWAYS bucketed per
 * currency: adding minor units across currencies (kobo + cents) would produce
 * a meaningless number, so there is no cross-currency grand total anywhere.
 *
 * All table scans are bounded and every partially-scanned area reports a
 * `sampled` flag, so the UI can say "at least this much" instead of presenting
 * a truncated sum as exact.
 */

const CREATORS_CAP = 1000;
const LEDGER_CAP = 5000;
const PLATFORM_LEDGER_CAP = 5000;
const DONATIONS_CAP = 5000;
const PAYOUTS_CAP = 2000;
const CREATOR_PAYOUTS_CAP = 500;
const WEBHOOK_EVENTS_CAP = 1000;
const CONTACT_MESSAGES_CAP = 1001;
const API_OPERATIONS_CAP = 2000;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ledgerTypeValidator = v.union(
  v.literal("donation"),
  v.literal("fee"),
  v.literal("refund"),
  v.literal("fee_reversal"),
  v.literal("payout"),
  v.literal("payout_reversal"),
  v.literal("adjustment"),
);

const currencyBucketValidator = v.object({
  currency: v.string(),
  creatorOwned: v.number(),
  creatorPending: v.number(),
  creatorAvailable: v.number(),
  heldForSettlement: v.number(),
  pendingDeductions: v.number(),
  nextSettlementAt: v.union(v.number(), v.null()),
  platformGrossFees: v.number(),
  platformFeeReversals: v.number(),
  platformNetRevenue: v.number(),
  platformTipsGross: v.number(),
  platformTipReversals: v.number(),
  platformTipsNet: v.number(),
  processingFeeExpenses: v.number(),
  payoutFeesCollected: v.number(),
  payoutFeeExpenses: v.number(),
  payoutFeesNet: v.number(),
  platformAdjustments: v.number(),
  platformTotalNet: v.number(),
  grossDonationVolume: v.number(),
  refundedVolume: v.number(),
  paidOutLifetime: v.number(),
  payoutsAwaiting: v.number(),
  payoutFeesAwaiting: v.number(),
});

type CurrencyBucket = {
  currency: string;
  creatorOwned: number;
  creatorPending: number;
  creatorAvailable: number;
  heldForSettlement: number;
  pendingDeductions: number;
  nextSettlementAt: number | null;
  platformGrossFees: number;
  platformFeeReversals: number;
  platformNetRevenue: number;
  platformTipsGross: number;
  platformTipReversals: number;
  platformTipsNet: number;
  processingFeeExpenses: number;
  payoutFeesCollected: number;
  payoutFeeExpenses: number;
  payoutFeesNet: number;
  platformAdjustments: number;
  platformTotalNet: number;
  grossDonationVolume: number;
  refundedVolume: number;
  paidOutLifetime: number;
  payoutsAwaiting: number;
  payoutFeesAwaiting: number;
};

function bucketFor(
  buckets: Map<string, CurrencyBucket>,
  currency: string,
): CurrencyBucket {
  let bucket = buckets.get(currency);
  if (!bucket) {
    bucket = {
      currency,
      creatorOwned: 0,
      creatorPending: 0,
      creatorAvailable: 0,
      heldForSettlement: 0,
      pendingDeductions: 0,
      nextSettlementAt: null,
      platformGrossFees: 0,
      platformFeeReversals: 0,
      platformNetRevenue: 0,
      platformTipsGross: 0,
      platformTipReversals: 0,
      platformTipsNet: 0,
      processingFeeExpenses: 0,
      payoutFeesCollected: 0,
      payoutFeeExpenses: 0,
      payoutFeesNet: 0,
      platformAdjustments: 0,
      platformTotalNet: 0,
      grossDonationVolume: 0,
      refundedVolume: 0,
      paidOutLifetime: 0,
      payoutsAwaiting: 0,
      payoutFeesAwaiting: 0,
    };
    buckets.set(currency, bucket);
  }
  return bucket;
}

function trackNextSettlement(
  bucket: CurrencyBucket,
  createdAt: number,
  holdMs: number,
): void {
  const settlesAt = createdAt + holdMs;
  if (bucket.nextSettlementAt === null || settlesAt < bucket.nextSettlementAt) {
    bucket.nextSettlementAt = settlesAt;
  }
}

function sortBuckets(buckets: Map<string, CurrencyBucket>): CurrencyBucket[] {
  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      // Everything still owed to creators: uncommitted balances plus money
      // already reserved by an open payout. Without the last term, requesting
      // a withdrawal makes creator-owned money appear to vanish until it is
      // either paid or fails.
      creatorOwned:
        bucket.creatorPending +
        bucket.creatorAvailable +
        bucket.payoutsAwaiting +
        bucket.payoutFeesAwaiting,
      platformNetRevenue: bucket.platformGrossFees - bucket.platformFeeReversals,
      platformTipsNet:
        bucket.platformTipsGross - bucket.platformTipReversals,
      payoutFeesNet: bucket.payoutFeesCollected - bucket.payoutFeeExpenses,
      platformTotalNet:
        bucket.platformGrossFees -
        bucket.platformFeeReversals +
        bucket.platformTipsGross -
        bucket.platformTipReversals +
        bucket.payoutFeesCollected -
        bucket.payoutFeeExpenses -
        bucket.processingFeeExpenses +
        bucket.platformAdjustments,
      refundedVolume: Math.abs(bucket.refundedVolume),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export const overview = query({
  args: {},
  returns: v.object({
    now: v.number(),
    config: v.object({
      settlementHoldHours: v.number(),
      platformFeeBps: v.number(),
      paymentsDriver: v.union(v.literal("bachs"), v.literal("simulated")),
      connectEnabled: v.boolean(),
      turnstileConfigured: v.boolean(),
      /** Empty only when the deployment's site URL is unavailable. */
      webhookUrl: v.string(),
    }),
    counts: v.object({
      creatorsTotal: v.number(),
      creatorsActive: v.number(),
      creatorsSuspended: v.number(),
      donationsTotal: v.number(),
      donationsPaid: v.number(),
      donationsPending: v.number(),
      donationsUnresolved: v.number(),
      payoutsRequested: v.number(),
      payoutsProcessing: v.number(),
      newMessages: v.number(),
    }),
    health: v.object({
      webhookFailures24h: v.number(),
      apiOperationIssues: v.number(),
      lastWebhookAt: v.union(v.number(), v.null()),
    }),
    currencies: v.array(currencyBucketValidator),
    sampled: v.object({
      creators: v.boolean(),
      ledger: v.boolean(),
      platformLedger: v.boolean(),
      donations: v.boolean(),
      payouts: v.boolean(),
      webhooks: v.boolean(),
      operations: v.boolean(),
      messages: v.boolean(),
    }),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const holdHours = settlementHoldHours();
    const holdMs = holdHours * HOUR_MS;

    const creators = await ctx.db.query("creators").take(CREATORS_CAP);
    // One bounded, newest-first scan powers pending balances, fee revenue,
    // and volume totals; pending entries are always recent by definition.
    const ledgerEntries = await ctx.db
      .query("ledgerEntries")
      .order("desc")
      .take(LEDGER_CAP);
    // Platform-only revenue/cost entries (tips, processing costs, payout
    // fees). Creator balances never come from this table.
    const platformLedgerEntries = await ctx.db
      .query("platformLedgerEntries")
      .order("desc")
      .take(PLATFORM_LEDGER_CAP);
    const donations = await ctx.db
      .query("donations")
      .order("desc")
      .take(DONATIONS_CAP);
    const payouts = await ctx.db
      .query("payouts")
      .order("desc")
      .take(PAYOUTS_CAP);

    // Recent operational rows for the health strip.
    const webhookEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_receivedAt")
      .order("desc")
      .take(WEBHOOK_EVENTS_CAP);
    const apiOperations = await ctx.db
      .query("apiOperations")
      .order("desc")
      .take(API_OPERATIONS_CAP);
    const newMessages = await ctx.db
      .query("contactMessages")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "new"))
      .take(CONTACT_MESSAGES_CAP);

    const buckets = new Map<string, CurrencyBucket>();

    let creatorsActive = 0;
    let creatorsSuspended = 0;
    for (const creator of creators) {
      if (creator.status === "active") creatorsActive += 1;
      else creatorsSuspended += 1;

      const bucket = bucketFor(buckets, creator.currency);
      bucket.creatorPending += creator.balancePending;
      bucket.creatorAvailable += creator.balanceAvailable;
      bucket.paidOutLifetime += creator.balancePaidOut;
    }

    for (const entry of ledgerEntries) {
      const bucket = bucketFor(buckets, entry.currency);
      if (entry.settlementStatus === "pending") {
        // Net pending money: positive credits minus fees/deductions. This is
        // what will become available when the hold expires, and it matches the
        // creator's balancePending.
        bucket.heldForSettlement += entry.amount;
        if (entry.amount < 0) bucket.pendingDeductions += -entry.amount;
        trackNextSettlement(bucket, entry.createdAt, holdMs);
      }
      if (entry.type === "fee") {
        // Fee ledger entries are negative; report the platform's gross cut.
        bucket.platformGrossFees += -entry.amount;
      } else if (entry.type === "fee_reversal") {
        bucket.platformFeeReversals += entry.amount;
      } else if (entry.type === "donation" && entry.amount > 0) {
        bucket.grossDonationVolume += entry.amount;
      } else if (entry.type === "refund") {
        bucket.refundedVolume += entry.amount;
      }
    }

    for (const entry of platformLedgerEntries) {
      const bucket = bucketFor(buckets, entry.currency);
      switch (entry.type) {
        case "platform_tip":
          bucket.platformTipsGross += entry.amount;
          break;
        case "platform_tip_refund":
          bucket.platformTipReversals += -entry.amount;
          break;
        case "processing_fee_expense":
          bucket.processingFeeExpenses += -entry.amount;
          break;
        case "payout_fee_collected":
          bucket.payoutFeesCollected += entry.amount;
          break;
        case "payout_fee_expense":
          bucket.payoutFeeExpenses += -entry.amount;
          break;
        case "adjustment":
          bucket.platformAdjustments += entry.amount;
          break;
        case "platform_fee":
        case "platform_fee_refund":
          // Fee revenue is reported from the creator ledger for continuity
          // with the existing overview definition; counting it here too would
          // double the fee total.
          break;
      }
    }

    let payoutsRequested = 0;
    let payoutsProcessing = 0;
    for (const payout of payouts) {
      if (payout.status === "requested") payoutsRequested += 1;
      else if (payout.status === "processing") payoutsProcessing += 1;
      if (payout.status === "requested" || payout.status === "processing") {
        const bucket = bucketFor(buckets, payout.currency);
        bucket.payoutsAwaiting += payout.amount;
        bucket.payoutFeesAwaiting += payout.fee ?? 0;
      }
    }

    let donationsPaid = 0;
    let donationsPending = 0;
    let donationsUnresolved = 0;
    for (const donation of donations) {
      if (donation.status === "paid") donationsPaid += 1;
      else if (donation.status === "pending") donationsPending += 1;
      else if (donation.status === "unresolved") donationsUnresolved += 1;
    }

    const webhookCutoff = now - DAY_MS;
    let webhookFailures24h = 0;
    let lastWebhookAt: number | null = null;
    for (const event of webhookEvents) {
      if (lastWebhookAt === null || event.receivedAt > lastWebhookAt) {
        lastWebhookAt = event.receivedAt;
      }
      if (
        event.receivedAt >= webhookCutoff &&
        event.outcome !== "processed" &&
        event.outcome !== "duplicate"
      ) {
        webhookFailures24h += 1;
      }
    }

    let apiOperationIssues = 0;
    for (const operation of apiOperations) {
      if (
        operation.status === "started" ||
        operation.status === "outcome_unknown"
      ) {
        apiOperationIssues += 1;
      }
    }

    return {
      now,
      config: {
        settlementHoldHours: holdHours,
        platformFeeBps: platformFeeBps(),
        paymentsDriver: resolvePaymentsDriver(),
        connectEnabled: connectEnabled(),
        turnstileConfigured: turnstileConfigured(),
        webhookUrl: webhookUrl(),
      },
      counts: {
        creatorsTotal: creators.length,
        creatorsActive,
        creatorsSuspended,
        donationsTotal: donations.length,
        donationsPaid,
        donationsPending,
        donationsUnresolved,
        payoutsRequested,
        payoutsProcessing,
        newMessages: newMessages.length,
      },
      health: {
        webhookFailures24h,
        apiOperationIssues,
        lastWebhookAt,
      },
      currencies: sortBuckets(buckets),
      sampled: {
        creators: creators.length === CREATORS_CAP,
        ledger: ledgerEntries.length === LEDGER_CAP,
        platformLedger:
          platformLedgerEntries.length === PLATFORM_LEDGER_CAP,
        donations: donations.length === DONATIONS_CAP,
        payouts: payouts.length === PAYOUTS_CAP,
        webhooks: webhookEvents.length === WEBHOOK_EVENTS_CAP,
        operations: apiOperations.length === API_OPERATIONS_CAP,
        messages: newMessages.length === CONTACT_MESSAGES_CAP,
      },
    };
  },
});

const heldEntryValidator = v.object({
  _id: v.id("ledgerEntries"),
  creatorId: v.id("creators"),
  username: v.string(),
  displayName: v.string(),
  currency: v.string(),
  type: ledgerTypeValidator,
  amount: v.number(),
  createdAt: v.number(),
  settlesAt: v.number(),
  note: v.optional(v.string()),
});

export const heldFunds = query({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    now: v.number(),
    settlementHoldHours: v.number(),
    totals: v.array(
      v.object({
        currency: v.string(),
        amount: v.number(),
        count: v.number(),
        nextSettlementAt: v.union(v.number(), v.null()),
      }),
    ),
    entries: v.array(heldEntryValidator),
    sampled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const requested = args.limit ?? 100;
    const limit = Number.isFinite(requested)
      ? Math.min(200, Math.max(1, Math.floor(requested)))
      : 100;

    const now = Date.now();
    const holdHours = settlementHoldHours();
    const holdMs = holdHours * HOUR_MS;

    const pending = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_settlement", (q) => q.eq("settlementStatus", "pending"))
      .order("asc")
      .take(LEDGER_CAP);

    const totals = new Map<
      string,
      {
        currency: string;
        amount: number;
        count: number;
        nextSettlementAt: number | null;
      }
    >();
    for (const entry of pending) {
      let total = totals.get(entry.currency);
      if (!total) {
        total = {
          currency: entry.currency,
          amount: 0,
          count: 0,
          nextSettlementAt: null,
        };
        totals.set(entry.currency, total);
      }
      total.amount += entry.amount;
      total.count += 1;
      const settlesAt = entry.createdAt + holdMs;
      if (total.nextSettlementAt === null || settlesAt < total.nextSettlementAt) {
        total.nextSettlementAt = settlesAt;
      }
    }

    const rows = pending.slice(0, limit);
    const entries = [];
    for (const entry of rows) {
      // Only the returned page is hydrated, so the limit bounds reads too.
      const creator = await ctx.db.get("creators", entry.creatorId);
      entries.push({
        _id: entry._id,
        creatorId: entry.creatorId,
        username: creator?.username ?? "(deleted)",
        displayName: creator?.displayName ?? "",
        currency: entry.currency,
        type: entry.type,
        amount: entry.amount,
        createdAt: entry.createdAt,
        settlesAt: entry.createdAt + holdMs,
        note: entry.note,
      });
    }

    return {
      now,
      settlementHoldHours: holdHours,
      totals: [...totals.values()].sort((a, b) =>
        a.currency.localeCompare(b.currency),
      ),
      entries,
      sampled: pending.length === LEDGER_CAP,
    };
  },
});

const heldCreatorEntryValidator = v.object({
  _id: v.id("ledgerEntries"),
  type: ledgerTypeValidator,
  amount: v.number(),
  currency: v.string(),
  createdAt: v.number(),
  settlesAt: v.number(),
  note: v.optional(v.string()),
});

export const creatorDetail = query({
  args: { creatorId: v.id("creators") },
  returns: v.object({
    creator: v.object({
      _id: v.id("creators"),
      username: v.string(),
      displayName: v.string(),
      email: v.union(v.string(), v.null()),
      status: v.union(v.literal("active"), v.literal("suspended")),
      currency: v.string(),
      breadPrice: v.number(),
      balancePending: v.number(),
      balanceAvailable: v.number(),
      balancePaidOut: v.number(),
      totalRaised: v.number(),
      totalSupporters: v.number(),
      onboardingStatus: v.union(
        v.literal("not_started"),
        v.literal("pending"),
        v.literal("enabled"),
        v.literal("blocked"),
      ),
      createdAt: v.number(),
      payoutsAwaiting: v.number(),
      payoutFeesAwaiting: v.number(),
      payoutsSampled: v.boolean(),
    }),
    held: v.object({
      amount: v.number(),
      nextSettlementAt: v.union(v.number(), v.null()),
      entries: v.array(heldCreatorEntryValidator),
      sampled: v.boolean(),
    }),
    recentDonations: v.array(
      v.object({
        _id: v.id("donations"),
        reference: v.string(),
        supporterName: v.string(),
        supporterEmail: v.string(),
        amount: v.number(),
        currency: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("paid"),
          v.literal("unresolved"),
          v.literal("refunded"),
          v.literal("abandoned"),
        ),
        createdAt: v.number(),
        paidAt: v.optional(v.number()),
        message: v.optional(v.string()),
      }),
    ),
    recentPayouts: v.array(
      v.object({
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
        requestedAt: v.number(),
        processedAt: v.optional(v.number()),
        reference: v.optional(v.string()),
        failureReason: v.optional(v.string()),
      }),
    ),
    recentLedger: v.array(
      v.object({
        _id: v.id("ledgerEntries"),
        type: ledgerTypeValidator,
        amount: v.number(),
        currency: v.string(),
        settlementStatus: v.union(v.literal("pending"), v.literal("settled")),
        createdAt: v.number(),
        settledAt: v.optional(v.number()),
        note: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) throw appError("not_found", "Creator not found.");

    const holdHours = settlementHoldHours();
    const holdMs = holdHours * HOUR_MS;

    const [user, pending, donations, payouts, ledger] = await Promise.all([
      ctx.db.get("users", creator.userId),
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_settlement", (q) => q.eq("settlementStatus", "pending"))
        .order("asc")
        .take(LEDGER_CAP),
      ctx.db
        .query("donations")
        .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
        .order("desc")
        .take(15),
      // One bounded creator-specific scan powers both recent payouts and the
      // awaiting total, so the detail sheet does not read every open payout
      // across the platform.
      ctx.db
        .query("payouts")
        .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
        .order("desc")
        .take(CREATOR_PAYOUTS_CAP),
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_creator", (q) => q.eq("creatorId", args.creatorId))
        .order("desc")
        .take(20),
    ]);

    let payoutsAwaiting = 0;
    let payoutFeesAwaiting = 0;
    for (const payout of payouts) {
      if (
        (payout.status === "requested" || payout.status === "processing") &&
        payout.currency === creator.currency
      ) {
        payoutsAwaiting += payout.amount;
        payoutFeesAwaiting += payout.fee ?? 0;
      }
    }

    let nextSettlementAt: number | null = null;
    const heldEntries = [];
    for (const entry of pending) {
      if (entry.creatorId !== args.creatorId) continue;
      const settlesAt = entry.createdAt + holdMs;
      if (nextSettlementAt === null || settlesAt < nextSettlementAt) {
        nextSettlementAt = settlesAt;
      }
      heldEntries.push({
        _id: entry._id,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        createdAt: entry.createdAt,
        settlesAt,
        note: entry.note,
      });
    }

    return {
      creator: {
        _id: creator._id,
        username: creator.username,
        displayName: creator.displayName,
        email: user?.email ?? null,
        status: creator.status,
        currency: creator.currency,
        breadPrice: creator.coffeePrice,
        balancePending: creator.balancePending,
        balanceAvailable: creator.balanceAvailable,
        balancePaidOut: creator.balancePaidOut,
        totalRaised: creator.totalRaised,
        totalSupporters: creator.totalSupporters,
        onboardingStatus: creator.onboardingStatus,
        createdAt: creator.createdAt,
        payoutsAwaiting,
        payoutFeesAwaiting,
        payoutsSampled: payouts.length === CREATOR_PAYOUTS_CAP,
      },
      held: {
        // Always trust the denormalized balance; the scan only powers the
        // per-entry list and unlock time, and may be capped.
        amount: creator.balancePending,
        nextSettlementAt,
        // Keep the sheet bounded even for a creator with a large pending
        // backlog. `amount` remains the authoritative full balance.
        entries: heldEntries.slice(0, 25),
        sampled: pending.length === LEDGER_CAP || heldEntries.length > 25,
      },
      recentDonations: donations.map((donation) => ({
        _id: donation._id,
        reference: donation.reference,
        supporterName: donation.supporterName,
        supporterEmail: donation.supporterEmail,
        amount: donation.amount,
        currency: donation.currency,
        status: donation.status,
        createdAt: donation.createdAt,
        paidAt: donation.paidAt,
        message: donation.message,
      })),
      recentPayouts: payouts.slice(0, 15).map((payout) => ({
        _id: payout._id,
        amount: payout.amount,
        fee: payout.fee,
        totalDebited: payout.totalDebited,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        requestedAt: payout.requestedAt,
        processedAt: payout.processedAt,
        reference: payout.reference,
        failureReason: payout.failureReason,
      })),
      recentLedger: ledger.map((entry) => ({
        _id: entry._id,
        type: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        settlementStatus: entry.settlementStatus,
        createdAt: entry.createdAt,
        settledAt: entry.settledAt,
        note: entry.note,
      })),
    };
  },
});
