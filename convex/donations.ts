import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { appUrl, connectEnabled, paymentsConfigured, platformFeeFor, resolvePaymentsDriver } from "./lib/config";
import { appError } from "./lib/errors";
import { requireCreator } from "./lib/guards";
import {
  MAX_QUANTITY,
  MESSAGE_MAX_LENGTH,
  SUPPORTER_NAME_MAX_LENGTH,
  isValidEmail,
  normalizeUsername,
} from "./lib/validation";
import { buildCheckoutPayload, checkoutIdempotencyKey } from "./bachs/payload";
import { checkoutPayloadValidator } from "./bachs/provider";
import { rateLimiter } from "./rateLimit";

/**
 * Donations: the public support flow.
 *
 * Flow: `createCheckout` (action) -> `startCheckout` (mutation: validate,
 * rate-limit, record donation + apiOperation) -> provider call -> checkout
 * URL, or `unknown` when the provider outcome is uncertain (recovered by the
 * reconciliation cron). Fulfilment happens ONLY through
 * `payments/events.processCheckoutEvent` when a webhook/reconcile confirms
 * collection.
 */

/** Reconcile pending/unresolved donations older than this. */
const RECONCILE_AFTER_MS = 30 * 60 * 1000;
/** Re-check stuck API operations older than this. */
const STUCK_OPERATION_AFTER_MS = 5 * 60 * 1000;
/** Give up replaying an uncertain checkout write after this many attempts. */
const MAX_CHECKOUT_ATTEMPTS = 8;

const donationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("unresolved"),
  v.literal("refunded"),
);

/** Full donation row as shown to the owning creator. */
const donationRowValidator = v.object({
  _id: v.id("donations"),
  reference: v.string(),
  supporterName: v.string(),
  supporterEmail: v.string(),
  message: v.optional(v.string()),
  isPrivate: v.boolean(),
  hidden: v.optional(v.boolean()),
  quantity: v.number(),
  amount: v.number(),
  platformFee: v.number(),
  netAmount: v.number(),
  currency: v.string(),
  status: donationStatusValidator,
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
});

function asDonationId(value: string | undefined): Id<"donations"> | null {
  return value ? (value as Id<"donations">) : null;
}

// ---------------------------------------------------------------------------
// Internal: checkout creation
// ---------------------------------------------------------------------------

/**
 * Validate the request, rate-limit, and record the donation + its API
 * operation. Returns everything the action needs to call the provider.
 * Runs in a single transaction: either the donation and its operation row
 * both exist, or neither does.
 */
export const startCheckout = internalMutation({
  args: {
    username: v.string(),
    quantity: v.number(),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  returns: v.object({
    donationId: v.id("donations"),
    reference: v.string(),
    driver: v.union(v.literal("bachs"), v.literal("simulated")),
    payload: checkoutPayloadValidator,
  }),
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!creator) {
      throw appError("creator_not_found", "That creator page does not exist.");
    }
    if (creator.status !== "active") {
      throw appError("creator_suspended", "This page is not accepting support right now.");
    }

    const quantity = args.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw appError("invalid_input", `Choose between 1 and ${MAX_QUANTITY} coffees.`);
    }
    const supporterName = args.supporterName.trim();
    if (supporterName.length < 1 || supporterName.length > SUPPORTER_NAME_MAX_LENGTH) {
      throw appError(
        "invalid_input",
        `Please enter a name of at most ${SUPPORTER_NAME_MAX_LENGTH} characters.`,
      );
    }
    const supporterEmail = args.supporterEmail.trim().toLowerCase();
    if (!isValidEmail(supporterEmail)) {
      throw appError("invalid_input", "Please enter a valid email address.");
    }
    let message = args.message?.trim();
    if (message !== undefined && message.length === 0) message = undefined;
    if (message !== undefined && message.length > MESSAGE_MAX_LENGTH) {
      throw appError(
        "invalid_input",
        `Messages can be at most ${MESSAGE_MAX_LENGTH} characters.`,
      );
    }

    if (!paymentsConfigured()) {
      throw appError(
        "payments_unavailable",
        "Payments are not configured on this deployment yet. Add Bachs keys to accept support.",
      );
    }

    // Connect mode: the split checkout only works for onboarded creators.
    if (connectEnabled()) {
      if (!creator.sellerAccountId || creator.onboardingStatus !== "enabled") {
        throw appError(
          "creator_not_onboarded",
          "This creator has not finished their payment setup yet. Try again later.",
        );
      }
    }

    const emailLimit = await rateLimiter.limit(ctx, "createCheckoutPerEmail", {
      key: supporterEmail,
    });
    if (!emailLimit.ok) {
      throw appError(
        "rate_limited",
        "Too many attempts from this email — please wait a minute and try again.",
        { retryAfterMs: emailLimit.retryAfter },
      );
    }
    const creatorLimit = await rateLimiter.limit(ctx, "createCheckoutPerCreator", {
      key: creator._id,
    });
    if (!creatorLimit.ok) {
      throw appError(
        "rate_limited",
        "This page is getting plenty of support right now — please try again shortly.",
        { retryAfterMs: creatorLimit.retryAfter },
      );
    }

    const amount = creator.coffeePrice * quantity;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw appError("invalid_input", "That amount is out of range.");
    }
    const platformFee = platformFeeFor(amount);
    const netAmount = amount - platformFee;

    const driver = resolvePaymentsDriver();
    const reference = `a4b_${crypto.randomUUID().replace(/-/g, "")}`;
    const now = Date.now();
    const donationId = await ctx.db.insert("donations", {
      creatorId: creator._id,
      supporterName,
      supporterEmail,
      message,
      isPrivate: args.isPrivate,
      quantity,
      amount,
      platformFee,
      netAmount,
      currency: creator.currency,
      reference,
      driver,
      status: "pending",
      createdAt: now,
    });
    await ctx.db.insert("apiOperations", {
      key: checkoutIdempotencyKey(reference),
      kind: "checkout.create",
      status: "started",
      refId: donationId,
      attempts: 1,
      createdAt: now,
      updatedAt: now,
    });

    const donation = await ctx.db.get("donations", donationId);
    if (!donation) {
      throw new Error("Failed to insert donation");
    }
    return {
      donationId,
      reference,
      driver,
      payload: buildCheckoutPayload(creator, donation),
    };
  },
});

/** Record the provider's checkout id on both the donation and its operation. */
export const attachCheckout = internalMutation({
  args: {
    donationId: v.id("donations"),
    checkoutId: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (donation && !donation.checkoutId) {
      await ctx.db.patch("donations", donation._id, { checkoutId: args.checkoutId });
    }
    const operation = await ctx.db
      .query("apiOperations")
      .withIndex("by_key", (q) => q.eq("key", args.idempotencyKey))
      .unique();
    if (operation) {
      await ctx.db.patch("apiOperations", operation._id, {
        status: "succeeded",
        providerId: args.checkoutId,
        errorCode: undefined,
        errorMessage: undefined,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const markOperationUnknown = internalMutation({
  args: {
    idempotencyKey: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db
      .query("apiOperations")
      .withIndex("by_key", (q) => q.eq("key", args.idempotencyKey))
      .unique();
    if (operation) {
      await ctx.db.patch("apiOperations", operation._id, {
        status: "outcome_unknown",
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const markOperationFailed = internalMutation({
  args: {
    idempotencyKey: v.string(),
    errorCode: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db
      .query("apiOperations")
      .withIndex("by_key", (q) => q.eq("key", args.idempotencyKey))
      .unique();
    if (!operation) return null;
    await ctx.db.patch("apiOperations", operation._id, {
      status: "failed",
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    const donationId = asDonationId(operation.refId);
    if (donationId) {
      const donation = await ctx.db.get("donations", donationId);
      if (donation && donation.status === "pending") {
        await ctx.db.patch("donations", donation._id, { status: "unresolved" });
      }
    }
    return null;
  },
});

export const markOperationSucceeded = internalMutation({
  args: {
    operationId: v.id("apiOperations"),
    providerId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("apiOperations", args.operationId, {
      status: "succeeded",
      providerId: args.providerId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public: create a checkout (the support button)
// ---------------------------------------------------------------------------

export const createCheckout = action({
  args: {
    username: v.string(),
    quantity: v.number(),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  returns: v.union(
    v.object({
      status: v.literal("redirect"),
      url: v.string(),
      reference: v.string(),
    }),
    v.object({
      status: v.literal("unknown"),
      reference: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | { status: "redirect"; url: string; reference: string }
    | { status: "unknown"; reference: string }
  > => {
    const started = await ctx.runMutation(internal.donations.startCheckout, args);

    if (started.driver === "simulated") {
      const url = `${appUrl()}/simulated-checkout?ref=${encodeURIComponent(started.reference)}`;
      await ctx.runMutation(internal.donations.attachCheckout, {
        donationId: started.donationId,
        checkoutId: `sim_${started.reference}`,
        idempotencyKey: started.payload.idempotencyKey,
      });
      return { status: "redirect" as const, url, reference: started.reference };
    }

    const result = await ctx.runAction(
      internal.bachs.bachsNode.createCheckoutSession,
      { payload: started.payload },
    );

    if (result.ok) {
      await ctx.runMutation(internal.donations.attachCheckout, {
        donationId: started.donationId,
        checkoutId: result.checkoutId,
        idempotencyKey: started.payload.idempotencyKey,
      });
      return { status: "redirect" as const, url: result.url, reference: started.reference };
    }

    if (result.outcomeUnknown) {
      // Do NOT fail loudly: the checkout may exist. The reconciliation cron
      // replays with the same Idempotency-Key and the supporter can check the
      // reference at /thanks.
      await ctx.runMutation(internal.donations.markOperationUnknown, {
        idempotencyKey: started.payload.idempotencyKey,
        errorCode: result.code,
        errorMessage: result.message,
      });
      return { status: "unknown" as const, reference: started.reference };
    }

    await ctx.runMutation(internal.donations.markOperationFailed, {
      idempotencyKey: started.payload.idempotencyKey,
      errorCode: result.code,
      errorMessage: result.message,
    });
    throw appError("checkout_failed", "We couldn't start the payment. Please try again.");
  },
});

/** Recovery path: settle an uncertain creation attempt (see reconcile.ts). */
export const settleCheckoutRetry = internalMutation({
  args: {
    operationId: v.id("apiOperations"),
    ok: v.boolean(),
    checkoutId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    outcomeUnknown: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get("apiOperations", args.operationId);
    if (!operation) return null;

    if (args.ok && args.checkoutId) {
      const donationId = asDonationId(operation.refId);
      if (donationId) {
        const donation = await ctx.db.get("donations", donationId);
        if (donation && !donation.checkoutId) {
          await ctx.db.patch("donations", donation._id, { checkoutId: args.checkoutId });
        }
      }
      await ctx.db.patch("apiOperations", operation._id, {
        status: "succeeded",
        providerId: args.checkoutId,
        errorCode: undefined,
        errorMessage: undefined,
        updatedAt: Date.now(),
      });
      return null;
    }

    const attempts = operation.attempts + 1;
    if (args.outcomeUnknown && attempts < MAX_CHECKOUT_ATTEMPTS) {
      await ctx.db.patch("apiOperations", operation._id, {
        status: "outcome_unknown",
        attempts,
        errorCode: args.errorCode,
        errorMessage: args.errorMessage,
        updatedAt: Date.now(),
      });
      return null;
    }

    // Definitive failure, or out of attempts: give up and park the donation.
    await ctx.db.patch("apiOperations", operation._id, {
      status: "failed",
      attempts,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    const donationId = asDonationId(operation.refId);
    if (donationId) {
      const donation = await ctx.db.get("donations", donationId);
      if (donation && donation.status === "pending") {
        await ctx.db.patch("donations", donation._id, { status: "unresolved" });
      }
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: reconciliation support
// ---------------------------------------------------------------------------

/** Pending/unresolved donations old enough to double-check against Bachs. */
export const listStaleForReconcile = internalQuery({
  args: { now: v.number() },
  returns: v.array(
    v.object({
      donationId: v.id("donations"),
      checkoutId: v.string(),
      reference: v.string(),
      status: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const cutoff = args.now - RECONCILE_AFTER_MS;
    const pending = await ctx.db
      .query("donations")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", "pending").lt("createdAt", cutoff),
      )
      .order("asc")
      .take(15);
    const unresolved = await ctx.db
      .query("donations")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", "unresolved").lt("createdAt", cutoff),
      )
      .order("asc")
      .take(15);
    return [...pending, ...unresolved]
      .filter((donation) => Boolean(donation.checkoutId))
      .map((donation) => ({
        donationId: donation._id,
        checkoutId: donation.checkoutId as string,
        reference: donation.reference,
        status: donation.status,
      }));
  },
});

/** Checkout-creation operations whose outcome was never learned. */
export const listStuckOperations = internalQuery({
  args: { now: v.number() },
  returns: v.array(
    v.object({
      operationId: v.id("apiOperations"),
      kind: v.string(),
      attempts: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const cutoff = args.now - STUCK_OPERATION_AFTER_MS;
    const started = await ctx.db
      .query("apiOperations")
      .withIndex("by_status", (q) => q.eq("status", "started").lt("updatedAt", cutoff))
      .take(10);
    const unknown = await ctx.db
      .query("apiOperations")
      .withIndex("by_status", (q) => q.eq("status", "outcome_unknown").lt("updatedAt", cutoff))
      .take(10);
    return [...started, ...unknown].map((operation) => ({
      operationId: operation._id,
      kind: operation.kind,
      attempts: operation.attempts,
    }));
  },
});

/**
 * Decide what to do with a stuck checkout operation:
 * - null: nothing to do (already terminal / missing data)
 * - retry: replay the original request with the same Idempotency-Key
 * - already_resolved: the checkout exists after all; just close the operation
 */
export const prepareCheckoutRetry = internalQuery({
  args: { operationId: v.id("apiOperations") },
  returns: v.union(
    v.null(),
    v.object({
      kind: v.literal("retry"),
      payload: checkoutPayloadValidator,
    }),
    v.object({
      kind: v.literal("already_resolved"),
      providerId: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const operation = await ctx.db.get("apiOperations", args.operationId);
    if (!operation || operation.kind !== "checkout.create") return null;
    if (operation.status === "succeeded" || operation.status === "failed") return null;

    const donationId = asDonationId(operation.refId);
    if (!donationId) return null;
    const donation = await ctx.db.get("donations", donationId);
    if (!donation) return null;

    if (donation.checkoutId) {
      return { kind: "already_resolved" as const, providerId: donation.checkoutId };
    }
    if (donation.status !== "pending") {
      return { kind: "already_resolved" as const, providerId: null };
    }
    const creator = await ctx.db.get("creators", donation.creatorId);
    if (!creator) return null;
    return { kind: "retry" as const, payload: buildCheckoutPayload(creator, donation) };
  },
});

/** Bachs has no record of this checkout; park it for human review. */
export const parkUnknownCheckout = internalMutation({
  args: { donationId: v.id("donations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (donation && donation.status === "pending") {
      await ctx.db.patch("donations", donation._id, { status: "unresolved" });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Public: reads
// ---------------------------------------------------------------------------

/**
 * Status view for the `/thanks?ref=...` page. Keyed by the unguessable
 * reference, so it doubles as the supporter's tracking link.
 */
export const getByReference = query({
  args: { reference: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      reference: v.string(),
      status: donationStatusValidator,
      supporterName: v.string(),
      quantity: v.number(),
      amount: v.number(),
      currency: v.string(),
      message: v.optional(v.string()),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
      creator: v.union(
        v.object({
          username: v.string(),
          displayName: v.string(),
        }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const donation = await ctx.db
      .query("donations")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.trim()))
      .unique();
    if (!donation) return null;
    const creator = await ctx.db.get("creators", donation.creatorId);
    return {
      reference: donation.reference,
      status: donation.status,
      supporterName: donation.supporterName,
      quantity: donation.quantity,
      amount: donation.amount,
      currency: donation.currency,
      message: donation.message,
      createdAt: donation.createdAt,
      paidAt: donation.paidAt,
      creator: creator
        ? { username: creator.username, displayName: creator.displayName }
        : null,
    };
  },
});

/** The creator's own supporters table (dashboard), paginated + filterable. */
export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(donationStatusValidator),
  },
  returns: paginationResultValidator(donationRowValidator),
  handler: async (ctx, args) => {
    const { creator } = await requireCreator(ctx);
    const status = args.status;
    const page = status
      ? await ctx.db
          .query("donations")
          .withIndex("by_creator_status", (q) =>
            q.eq("creatorId", creator._id).eq("status", status),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("donations")
          .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
          .order("desc")
          .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.map((donation) => ({
        _id: donation._id,
        reference: donation.reference,
        supporterName: donation.supporterName,
        supporterEmail: donation.supporterEmail,
        message: donation.message,
        isPrivate: donation.isPrivate,
        hidden: donation.hidden,
        quantity: donation.quantity,
        amount: donation.amount,
        platformFee: donation.platformFee,
        netAmount: donation.netAmount,
        currency: donation.currency,
        status: donation.status,
        createdAt: donation.createdAt,
        paidAt: donation.paidAt,
      })),
    };
  },
});

/**
 * Dashboard summary. Counts are computed over a bounded scan (500 rows per
 * status); `countsTruncated` flags when a count hit that cap, so the UI can
 * say "500+".
 */
export const getMyStats = query({
  args: {},
  returns: v.object({
    currency: v.string(),
    totals: v.object({
      raised: v.number(),
      supporters: v.number(),
    }),
    balances: v.object({
      pending: v.number(),
      available: v.number(),
      paidOut: v.number(),
    }),
    counts: v.object({
      paid: v.number(),
      pending: v.number(),
      unresolved: v.number(),
      refunded: v.number(),
      truncated: v.boolean(),
    }),
  }),
  handler: async (ctx) => {
    const { creator } = await requireCreator(ctx);
    const CAP = 500;
    const countStatus = async (status: "paid" | "pending" | "unresolved" | "refunded") => {
      const rows = await ctx.db
        .query("donations")
        .withIndex("by_creator_status", (q) =>
          q.eq("creatorId", creator._id).eq("status", status),
        )
        .take(CAP + 1);
      return rows.length;
    };
    const [paid, pending, unresolved, refunded] = await Promise.all([
      countStatus("paid"),
      countStatus("pending"),
      countStatus("unresolved"),
      countStatus("refunded"),
    ]);
    const truncated = [paid, pending, unresolved, refunded].some((count) => count > CAP);
    return {
      currency: creator.currency,
      totals: {
        raised: creator.totalRaised,
        supporters: creator.totalSupporters,
      },
      balances: {
        pending: creator.balancePending,
        available: creator.balanceAvailable,
        paidOut: creator.balancePaidOut,
      },
      counts: {
        paid: Math.min(paid, CAP),
        pending: Math.min(pending, CAP),
        unresolved: Math.min(unresolved, CAP),
        refunded: Math.min(refunded, CAP),
        truncated,
      },
    };
  },
});
