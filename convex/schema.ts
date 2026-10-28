



import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Database schema.
 *
 * Money convention: every amount in these tables is an integer in MINOR UNITS
 * of its currency (kobo, cents, ...). Bachs' API speaks decimal strings; the
 * conversion happens only at the payment-provider boundary via
 * `convex/lib/money.ts`. See docs/DATA-MODEL.md for the full reference.
 */
export default defineSchema({
  // Convex Auth tables (users, authAccounts, authSessions, ...).
  ...authTables,

  // ---------------------------------------------------------------------------
  // Creators: one row per user who claimed a public username.
  // ---------------------------------------------------------------------------
  creators: defineTable({
    userId: v.id("users"),
    /** Public handle, lowercase, unique. Also the page URL: /{username}. */
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    /**
     * Price of one bread, in minor units.
     *
     * The stored field keeps its historical name until a coordinated data
     * migration; all public APIs and UI expose it as `breadPrice`.
     */
    coffeePrice: v.number(),
    /** ISO 4217 currency code this creator collects in. */
    currency: v.string(),
    /** Optional fundraising goal, in minor units. */
    goalAmount: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("suspended")),

    // --- Denormalized balances (minor units), kept in sync by ledger writes.
    // Recomputable from `ledgerEntries` via the admin tooling.
    /** Net donations received but not yet past the settlement hold. */
    balancePending: v.number(),
    /** Net donations available to request a payout for. */
    balanceAvailable: v.number(),
    /** Lifetime amount already paid out. */
    balancePaidOut: v.number(),

    // --- Lifetime counters (simple totals, adjusted on refunds).
    totalRaised: v.number(),
    totalSupporters: v.number(),

    // --- Bachs Connect state (used only when CONNECT_ENABLED=true).
    sellerAccountId: v.optional(v.string()),
    onboardingStatus: v.union(
      v.literal("not_started"),
      v.literal("pending"),
      v.literal("enabled"),
      v.literal("blocked"),
    ),

    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_sellerAccountId", ["sellerAccountId"]),

  // ---------------------------------------------------------------------------
  // Donations: one row per checkout attempt (and the money it represents).
  // ---------------------------------------------------------------------------
  donations: defineTable({
    creatorId: v.id("creators"),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    /** Supporters can hide their name + message from the public feed. */
    isPrivate: v.boolean(),
    quantity: v.number(),
    /** Gross amount, minor units: breadPrice * quantity at creation time. */
    amount: v.number(),
    /** Platform cut, minor units. */
    platformFee: v.number(),
    /** amount - platformFee, minor units. */
    netAmount: v.number(),
    currency: v.string(),
    /** Unique, human-readable id sent to Bachs and shown to the supporter. */
    reference: v.string(),
    /**
     * Browser-generated UUID created when the support form opens. Reused by
     * every retry of that form so a double-click or flaky-network retry returns
     * the existing checkout instead of creating a second donation. Optional
     * only for rows that predate this field.
     */
    attemptId: v.optional(v.string()),
    driver: v.union(v.literal("bachs"), v.literal("simulated")),

    checkoutId: v.optional(v.string()),
    /** Hosted checkout URL returned to the supporter, stored for idempotent retries. */
    checkoutUrl: v.optional(v.string()),
    /** Provider payment (charge) id, once known. */
    paymentId: v.optional(v.string()),

    status: v.union(
      // Checkout created; waiting for the supporter to pay.
      v.literal("pending"),
      // Payment confirmed. Terminal good state.
      v.literal("paid"),
      // Failed/expired/underpaid — NOT final: a later success event can still
      // flip this to "paid" (see docs/PAYMENTS.md).
      v.literal("unresolved"),
      // Refund confirmed by the provider.
      v.literal("refunded"),
      // Reconciliation gave up after the bounded window. Terminal; requires
      // manual review, but must not sit at the front of the reconcile queue.
      v.literal("abandoned"),
    ),
    /** Creator hid the message from the public page. */
    hidden: v.optional(v.boolean()),
    /** created_at of the last applied provider event (ms), used to ignore stale events. */
    lastEventAt: v.optional(v.number()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),

    // --- Reconciliation queue bookkeeping (pending/unresolved only). -------
    /** Number of times the reconcile cron has checked this donation. */
    reconcileAttempts: v.optional(v.number()),
    /** Last time the reconcile cron looked at it (ms). */
    lastReconciledAt: v.optional(v.number()),
    /** Next time this donation is due for another reconcile attempt (ms). */
    nextReconcileAt: v.optional(v.number()),
    /** When reconciliation moved the donation to the terminal "abandoned" state. */
    abandonedAt: v.optional(v.number()),
  })
    .index("by_reference", ["reference"])
    .index("by_attemptId", ["attemptId"])
    .index("by_checkoutId", ["checkoutId"])
    .index("by_paymentId", ["paymentId"])
    .index("by_creator", ["creatorId", "createdAt"])
    .index("by_creator_status", ["creatorId", "status"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_status_nextReconcileAt", ["status", "nextReconcileAt"]),

  // ---------------------------------------------------------------------------
  // Ledger: append-only double-sided entries that make up creator balances.
  // Invariant: balancePending + balanceAvailable on the creator equals
  // the sum of all ledger entry amounts, minus nothing — payout reservations
  // are settled entries that already reduced balanceAvailable.
  // ---------------------------------------------------------------------------
  ledgerEntries: defineTable({
    creatorId: v.id("creators"),
    type: v.union(
      v.literal("donation"), // + gross amount of a paid donation
      v.literal("fee"), // - platform fee
      v.literal("refund"), // - gross amount of a refunded donation
      v.literal("fee_reversal"), // + platform fee returned to the creator on refund
      v.literal("payout"), // - amount reserved at payout request time
      v.literal("payout_reversal"), // + amount released when a payout fails
      v.literal("adjustment"), // manual admin correction (+/-)
    ),
    /** Signed amount in minor units. */
    amount: v.number(),
    currency: v.string(),
    donationId: v.optional(v.id("donations")),
    payoutId: v.optional(v.id("payouts")),
    settlementStatus: v.union(v.literal("pending"), v.literal("settled")),
    settledAt: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId", "createdAt"])
    .index("by_donation", ["donationId"])
    .index("by_payout", ["payoutId"])
    .index("by_settlement", ["settlementStatus", "createdAt"]),

  // ---------------------------------------------------------------------------
  // Payouts: creator withdrawal requests.
  // ---------------------------------------------------------------------------
  payouts: defineTable({
    creatorId: v.id("creators"),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("requested"),
      v.literal("processing"),
      v.literal("paid"),
      v.literal("failed"),
    ),
    /** How the payout is fulfilled: manually by an admin, or via the Bachs API. */
    method: v.union(v.literal("manual"), v.literal("bachs")),
    /** External transfer reference recorded when an admin marks it paid. */
    reference: v.optional(v.string()),
    /** Bachs payout id (only for automatic payouts — phase 2). */
    bachsPayoutId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    requestedAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_creator", ["creatorId", "requestedAt"])
    .index("by_status", ["status", "requestedAt"]),

  // ---------------------------------------------------------------------------
  // Webhook events: dedupe + audit trail. One row per processed event.
  // The row is written in the same transaction as the state change, so a
  // crashed/failed event is automatically eligible for redelivery.
  // ---------------------------------------------------------------------------
  webhookEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    source: v.union(v.literal("webhook"), v.literal("reconcile"), v.literal("simulated")),
    /** What processing decided: processed | duplicate | ignored | unmatched |
     *  mismatch | stale | already_paid | no_donation | partial_refund. */
    outcome: v.string(),
    donationId: v.optional(v.id("donations")),
    creatorId: v.optional(v.id("creators")),
    checkoutId: v.optional(v.string()),
    /** created_at of the provider event (ms). */
    eventCreatedAt: v.number(),
    receivedAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_creator", ["creatorId", "receivedAt"])
    .index("by_receivedAt", ["receivedAt"]),

  // ---------------------------------------------------------------------------
  // Admin audit log: append-only record of privileged actions.
  // ---------------------------------------------------------------------------
  adminAuditLogs: defineTable({
    actorUserId: v.id("users"),
    /** Stable action name, e.g. "payout.paid" or "creator.suspended". */
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    /** Human-readable detail (never secrets or bank account numbers). */
    metadata: v.optional(v.string()),
    /** JSON snapshot of the relevant state before the action. */
    beforeJson: v.optional(v.string()),
    /** JSON snapshot of the relevant state after the action. */
    afterJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorUserId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  // ---------------------------------------------------------------------------
  // API operations: idempotency bookkeeping for writes to the payment
  // provider. One row per logical operation; retries reuse the same key.
  // ---------------------------------------------------------------------------
  apiOperations: defineTable({
    /** Idempotency-Key sent to Bachs. Unique per logical operation. */
    key: v.string(),
    kind: v.string(), // "checkout.create" | "connect.account.create" | ...
    status: v.union(
      v.literal("started"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("outcome_unknown"),
    ),
    /** Related app object, e.g. a donation id. */
    refId: v.optional(v.string()),
    /** Provider object id once known, e.g. a checkout id. */
    providerId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    attempts: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_status", ["status", "updatedAt"]),

  // ---------------------------------------------------------------------------
  // Contact form inbox. Admin-only; never exposed through a public query.
  // ---------------------------------------------------------------------------
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    topic: v.union(
      v.literal("support"),
      v.literal("creator"),
      v.literal("payment"),
      v.literal("press"),
      v.literal("other"),
    ),
    message: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("archived"),
    ),
    createdAt: v.number(),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
});
