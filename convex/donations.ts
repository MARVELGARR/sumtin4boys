import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import {
  appUrl,
  checkoutRedirectBase,
  connectEnabled,
  isPubliclyReachableUrl,
  paymentsConfigured,
  resolvePaymentsDriver,
} from "./lib/config";
import { appError } from "./lib/errors";
import { requireCreator } from "./lib/guards";
import {
  computeDonationPricing,
  PRICING_VERSION,
  normalizeTipBps,
} from "./lib/pricing";
import { verifyTurnstileToken } from "./lib/turnstile";
import {
  MAX_QUANTITY,
  MESSAGE_MAX_LENGTH,
  SUPPORTER_NAME_MAX_LENGTH,
  isValidCheckoutRequestId,
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
/** Stop reconciling donations older than this; move them to "abandoned". */
const RECONCILE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
/** Reconcile queue batch size per status per cron run. */
const RECONCILE_BATCH_SIZE = 30;
/** Cap the exponential backoff between reconcile attempts. */
const RECONCILE_MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;

const donationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("unresolved"),
  v.literal("refunded"),
  v.literal("abandoned"),
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
  platformTip: v.optional(v.number()),
  totalCharged: v.optional(v.number()),
  currency: v.string(),
  status: donationStatusValidator,
  createdAt: v.number(),
  paidAt: v.optional(v.number()),
});

function asDonationId(value: string | undefined): Id<"donations"> | null {
  return value ? (value as Id<"donations">) : null;
}

type CheckoutRequestFields = {
  quantity: number;
  supporterName: string;
  supporterEmail: string;
  message: string | undefined;
  isPrivate: boolean;
  tipBps: number;
  coverProcessingFee: boolean;
};

function sameCheckoutRequest(
  donation: Doc<"donations">,
  creatorId: Id<"creators">,
  fields: CheckoutRequestFields,
): boolean {
  return (
    donation.creatorId === creatorId &&
    donation.quantity === fields.quantity &&
    donation.supporterName === fields.supporterName &&
    donation.supporterEmail === fields.supporterEmail &&
    (donation.message ?? undefined) === fields.message &&
    donation.isPrivate === fields.isPrivate &&
    (donation.tipBps ?? 0) === fields.tipBps &&
    (donation.coverProcessingFee ?? false) === fields.coverProcessingFee
  );
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
    /** Browser-generated UUID, stable across retries of this checkout form. */
    attemptId: v.string(),
    username: v.string(),
    quantity: v.number(),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    isPrivate: v.boolean(),
    /** Optional platform tip, 0–1000 bps. */
    tipBps: v.number(),
    /** Whether the supporter pays Bachs' processing fee on top. */
    coverProcessingFee: v.boolean(),
  },
  returns: v.object({
    donationId: v.id("donations"),
    reference: v.string(),
    driver: v.union(v.literal("bachs"), v.literal("simulated")),
    status: donationStatusValidator,
    checkoutId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),
    payload: checkoutPayloadValidator,
  }),
  handler: async (ctx, args) => {
    const attemptId = args.attemptId.trim().toLowerCase();
    if (!isValidCheckoutRequestId(attemptId)) {
      throw appError(
        "invalid_input",
        "This checkout request is invalid. Refresh the page and try again.",
      );
    }

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
      throw appError("invalid_input", `Choose between 1 and ${MAX_QUANTITY} bread.`);
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
    if (
      !Number.isSafeInteger(args.tipBps) ||
      args.tipBps < 0 ||
      args.tipBps > 1_000
    ) {
      throw appError("invalid_input", "That platform tip is out of range.");
    }
    const tipBps = normalizeTipBps(args.tipBps);

    if (!paymentsConfigured()) {
      throw appError(
        "payments_unavailable",
        "Payments are not configured on this deployment yet. Add Bachs keys to accept support.",
      );
    }

    // Bachs refuses checkout sessions whose redirect URLs are not public.
    // Checkout redirects are built from CHECKOUT_REDIRECT_URL (default: this
    // deployment's public Convex site), which 302s back to APP_URL. Catch a
    // bad explicit value here, before creating a donation or apiOperation.
    if (
      resolvePaymentsDriver() === "bachs" &&
      !isPubliclyReachableUrl(checkoutRedirectBase())
    ) {
      throw appError(
        "payments_unavailable",
        "Payments need a publicly reachable checkout redirect URL. Set CHECKOUT_REDIRECT_URL to a public HTTPS URL (for example your Convex site URL) and try again.",
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

    // Double-click / flaky-network guard. The browser generates one attemptId
    // when the form opens and reuses it for every retry. Returning the original
    // donation (and checkout URL, once known) means a retry never creates a
    // second donation or a second provider checkout.
    const existing = await ctx.db
      .query("donations")
      .withIndex("by_attemptId", (q) => q.eq("attemptId", attemptId))
      .unique();
    if (existing) {
      const requestMatches = sameCheckoutRequest(existing, creator._id, {
        quantity,
        supporterName,
        supporterEmail,
        message,
        isPrivate: args.isPrivate,
        tipBps,
        coverProcessingFee: args.coverProcessingFee,
      });
      if (!requestMatches) {
        throw appError(
          "invalid_input",
          "This checkout was already started with different details. Refresh the page to start a new one.",
        );
      }
      if (existing.status === "abandoned") {
        throw appError(
          "checkout_failed",
          "That checkout attempt didn't go through. Refresh the page and try again.",
        );
      }
      return {
        donationId: existing._id,
        reference: existing.reference,
        driver: existing.driver,
        status: existing.status,
        checkoutId: existing.checkoutId,
        checkoutUrl: existing.checkoutUrl,
        payload: buildCheckoutPayload(creator, existing),
      };
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
    const globalLimit = await rateLimiter.limit(ctx, "createCheckoutGlobal", {
      key: "all",
    });
    if (!globalLimit.ok) {
      throw appError(
        "rate_limited",
        "Support is unusually busy right now — please try again shortly.",
        { retryAfterMs: globalLimit.retryAfter },
      );
    }

    const breadPrice = creator.coffeePrice;
    const amount = breadPrice * quantity;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw appError("invalid_input", "That amount is out of range.");
    }
    const pricing = computeDonationPricing(amount, creator.currency, tipBps);

    const driver = resolvePaymentsDriver();
    const reference = `a4b_${crypto.randomUUID().replace(/-/g, "")}`;
    const now = Date.now();
    const donationId = await ctx.db.insert("donations", {
      attemptId,
      creatorId: creator._id,
      supporterName,
      supporterEmail,
      message,
      isPrivate: args.isPrivate,
      quantity,
      amount,
      platformFee: pricing.platformFee,
      netAmount: pricing.netAmount,
      platformTip: pricing.platformTip,
      tipBps: pricing.tipBps,
      totalCharged: pricing.totalCharged,
      coverProcessingFee: args.coverProcessingFee,
      pricingVersion: PRICING_VERSION,
      processingFeeStatus: "pending",
      currency: creator.currency,
      reference,
      driver,
      status: "pending",
      createdAt: now,
      reconcileAttempts: 0,
      nextReconcileAt: now + RECONCILE_AFTER_MS,
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
      status: donation.status,
      checkoutId: donation.checkoutId,
      checkoutUrl: donation.checkoutUrl,
      payload: buildCheckoutPayload(creator, donation),
    };
  },
});

/** Record the provider's checkout id + URL on both the donation and its operation. */
export const attachCheckout = internalMutation({
  args: {
    donationId: v.id("donations"),
    checkoutId: v.string(),
    checkoutUrl: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (donation) {
      await ctx.db.patch("donations", donation._id, {
        ...(donation.checkoutId ? {} : { checkoutId: args.checkoutId }),
        checkoutUrl: args.checkoutUrl,
      });
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
    // A concurrent retry may already have landed the checkout. Never downgrade
    // a known success to an uncertain outcome.
    if (operation && operation.status !== "succeeded") {
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
    if (!operation || operation.status === "succeeded") return null;
    await ctx.db.patch("apiOperations", operation._id, {
      status: "failed",
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
    const donationId = asDonationId(operation.refId);
    if (donationId) {
      const donation = await ctx.db.get("donations", donationId);
      if (donation && donation.status === "pending" && !donation.checkoutId) {
        // A definitive provider failure means no checkout exists, so there is
        // no payment to reconcile. Terminalise it instead of filling the
        // reconcile queue with rows that can never produce a checkout.
        await ctx.db.patch("donations", donation._id, {
          status: "abandoned",
          abandonedAt: Date.now(),
        });
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
    /** Browser-generated UUID, reused for retries of the same form. */
    attemptId: v.string(),
    username: v.string(),
    quantity: v.number(),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    isPrivate: v.boolean(),
    /** Optional platform tip, 0–1000 bps. */
    tipBps: v.number(),
    /** Whether the supporter pays Bachs' processing fee on top. */
    coverProcessingFee: v.boolean(),
    /** Cloudflare Turnstile token; required when Turnstile is configured. */
    turnstileToken: v.optional(v.string()),
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
    const { turnstileToken, ...checkoutArgs } = args;
    // Verify before creating a donation row or payment-provider operation, so
    // a failed challenge cannot leave billable/retryable state behind.
    await verifyTurnstileToken(turnstileToken);

    const started = await ctx.runMutation(
      internal.donations.startCheckout,
      checkoutArgs,
    );

    if (started.status === "abandoned") {
      throw appError(
        "checkout_failed",
        "That checkout attempt didn't go through. Refresh the page and try again.",
      );
    }
    if (started.status !== "pending") {
      // Already paid/refunded, or an earlier session failed. Send the supporter
      // to the reference page instead of reopening a finished checkout.
      return { status: "unknown" as const, reference: started.reference };
    }
    if (started.checkoutUrl) {
      // This is the duplicate-request path: the first request already created
      // a checkout, so return the exact same hosted checkout URL.
      return {
        status: "redirect" as const,
        url: started.checkoutUrl,
        reference: started.reference,
      };
    }

    if (started.driver === "simulated") {
      const url = `${appUrl()}/simulated-checkout?ref=${encodeURIComponent(started.reference)}`;
      await ctx.runMutation(internal.donations.attachCheckout, {
        donationId: started.donationId,
        checkoutId: started.checkoutId ?? `sim_${started.reference}`,
        checkoutUrl: url,
        idempotencyKey: started.payload.idempotencyKey,
      });
      return { status: "redirect" as const, url, reference: started.reference };
    }

    // No stored URL yet (first attempt, or an action that crashed before
    // attachCheckout). Replaying the request with the SAME server-derived
    // Idempotency-Key returns Bachs' cached success instead of a new checkout.
    const result = await ctx.runAction(
      internal.bachs.bachsNode.createCheckoutSession,
      { payload: started.payload },
    );

    if (result.ok) {
      await ctx.runMutation(internal.donations.attachCheckout, {
        donationId: started.donationId,
        checkoutId: result.checkoutId,
        checkoutUrl: result.url,
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
    checkoutUrl: v.optional(v.string()),
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
        if (donation) {
          await ctx.db.patch("donations", donation._id, {
            ...(donation.checkoutId ? {} : { checkoutId: args.checkoutId }),
            ...(args.checkoutUrl ? { checkoutUrl: args.checkoutUrl } : {}),
          });
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
        if (args.outcomeUnknown) {
          // We exhausted retries without learning the outcome. Keep it
          // unresolved for manual review; the bounded cleanup will eventually
          // move it to abandoned.
          await ctx.db.patch("donations", donation._id, { status: "unresolved" });
        } else {
          await ctx.db.patch("donations", donation._id, {
            status: "abandoned",
            abandonedAt: Date.now(),
          });
        }
      }
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Internal: reconciliation support
// ---------------------------------------------------------------------------

/**
 * Pending/unresolved donations due for a provider re-check.
 *
 * The queue is driven by `nextReconcileAt`, not by repeatedly selecting the
 * oldest rows. Each attempt pushes a row into the future, so a handful of
 * abandoned checkouts can no longer starve newer donations. The query is
 * also bounded to the last 7 days; older rows are terminalised by
 * `abandonStaleDonations`.
 */
export const listStaleForReconcile = internalQuery({
  args: { now: v.number() },
  returns: v.array(
    v.object({
      donationId: v.id("donations"),
      checkoutId: v.optional(v.string()),
      reference: v.string(),
      status: v.string(),
      reconcileAttempts: v.number(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const windowStart = args.now - RECONCILE_WINDOW_MS;
    const statuses = ["pending", "unresolved"] as const;

    const due = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("donations")
          .withIndex("by_status_nextReconcileAt", (q) =>
            q.eq("status", status).lte("nextReconcileAt", args.now),
          )
          // Filter in the query, before `.take()`: a backlog of rows older
          // than the 7-day window must not consume the batch and hide fresh
          // rows behind it. Old rows are terminalised separately.
          .filter((q) => q.gte(q.field("createdAt"), windowStart))
          .order("asc")
          .take(RECONCILE_BATCH_SIZE),
      ),
    );

    // Rows created before the reconciliation fields existed have no
    // `nextReconcileAt`. Find them through the bounded created-at index and
    // enqueue them on their first pass.
    const legacy = await Promise.all(
      statuses.map(async (status) => {
        return await ctx.db
          .query("donations")
          .withIndex("by_status_createdAt", (q) =>
            q.eq("status", status).gte("createdAt", windowStart),
          )
          // Filter before `.take()` so rows beyond the first page of legacy
          // data are still discovered after earlier rows are queued.
          .filter((q) => q.eq(q.field("nextReconcileAt"), undefined))
          .order("asc")
          .take(RECONCILE_BATCH_SIZE * 4);
      }),
    );

    const byId = new Map<Id<"donations">, (typeof due)[number][number]>();
    for (const row of [...due.flat(), ...legacy.flat()]) {
      if (row.createdAt >= windowStart && !byId.has(row._id)) byId.set(row._id, row);
    }

    return [...byId.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, RECONCILE_BATCH_SIZE * 2)
      .map((donation) => ({
        donationId: donation._id,
        checkoutId: donation.checkoutId,
        reference: donation.reference,
        status: donation.status,
        reconcileAttempts: donation.reconcileAttempts ?? 0,
        createdAt: donation.createdAt,
      }));
  },
});

/**
 * Record one reconciliation attempt and schedule the next one with
 * exponential backoff. A processed donation leaves the queue because its
 * status changes to paid/refunded/abandoned.
 */
export const markReconcileAttempt = internalMutation({
  args: { donationId: v.id("donations"), now: v.number() },
  returns: v.object({ attempts: v.number(), nextReconcileAt: v.number() }),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (!donation || donation.status === "paid" || donation.status === "refunded" || donation.status === "abandoned") {
      return { attempts: donation?.reconcileAttempts ?? 0, nextReconcileAt: args.now };
    }
    const attempts = (donation.reconcileAttempts ?? 0) + 1;
    const backoff = Math.min(
      RECONCILE_MAX_BACKOFF_MS,
      RECONCILE_AFTER_MS * 2 ** Math.min(attempts - 1, 8),
    );
    const nextReconcileAt = args.now + backoff;
    await ctx.db.patch("donations", donation._id, {
      reconcileAttempts: attempts,
      lastReconciledAt: args.now,
      nextReconcileAt,
    });
    return { attempts, nextReconcileAt };
  },
});

/** Terminalise a single donation that is too old for the reconcile window. */
export const abandonDonation = internalMutation({
  args: { donationId: v.id("donations"), now: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (
      donation &&
      (donation.status === "pending" || donation.status === "unresolved")
    ) {
      await ctx.db.patch("donations", donation._id, {
        status: "abandoned",
        abandonedAt: args.now,
        nextReconcileAt: undefined,
        lastReconciledAt: args.now,
      });
    }
    return null;
  },
});

/**
 * Daily safety valve: rows still pending/unresolved after the 7-day window
 * leave the queue permanently. They remain visible for manual review rather
 * than being retried forever.
 */
export const abandonStaleDonations = internalMutation({
  args: { now: v.optional(v.number()) },
  returns: v.object({ abandoned: v.number() }),
  handler: async (ctx, args) => {
    const now = args.now ?? Date.now();
    const cutoff = now - RECONCILE_WINDOW_MS;
    const statuses = ["pending", "unresolved"] as const;
    let abandoned = 0;
    for (const status of statuses) {
      const rows = await ctx.db
        .query("donations")
        .withIndex("by_status_createdAt", (q) =>
          q.eq("status", status).lt("createdAt", cutoff),
        )
        .order("asc")
        .take(RECONCILE_BATCH_SIZE * 4);
      for (const donation of rows) {
        await ctx.db.patch("donations", donation._id, {
          status: "abandoned",
          abandonedAt: now,
          nextReconcileAt: undefined,
          lastReconciledAt: now,
        });
        abandoned += 1;
      }
    }
    return { abandoned };
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
        platformTip: donation.platformTip,
        totalCharged: donation.totalCharged,
        currency: donation.currency,
        status: donation.status,
        createdAt: donation.createdAt,
        paidAt: donation.paidAt,
      })),
    };
  },
});

/**
 * Dashboard summary. Status counts other than `paid` use a bounded scan (500
 * rows per status) and flag truncation. `paid` is the creator's exact lifetime
 * counter, so the UI never has to show a misleading "500+".
 */
export const getMyStats = query({
  args: {},
  returns: v.object({
    currency: v.string(),
    totals: v.object({
      raised: v.number(),
      /** Exact lifetime paid-support count, not unique supporters. */
      paidSupports: v.number(),
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
      abandoned: v.number(),
      truncated: v.boolean(),
    }),
  }),
  handler: async (ctx) => {
    const { creator } = await requireCreator(ctx);
    const CAP = 500;
    const countStatus = async (
      status: "paid" | "pending" | "unresolved" | "refunded" | "abandoned",
    ) => {
      const rows = await ctx.db
        .query("donations")
        .withIndex("by_creator_status", (q) =>
          q.eq("creatorId", creator._id).eq("status", status),
        )
        .take(CAP + 1);
      return rows.length;
    };
    const [pending, unresolved, refunded, abandoned] = await Promise.all([
      countStatus("pending"),
      countStatus("unresolved"),
      countStatus("refunded"),
      countStatus("abandoned"),
    ]);
    const truncated = [pending, unresolved, refunded, abandoned].some(
      (count) => count > CAP,
    );
    return {
      currency: creator.currency,
      totals: {
        raised: creator.totalRaised,
        // Exact lifetime count of paid support, not unique people. The UI
        // labels this "Paid supports" so it does not imply one person each.
        paidSupports: creator.totalSupporters,
      },
      balances: {
        pending: creator.balancePending,
        available: creator.balanceAvailable,
        paidOut: creator.balancePaidOut,
      },
      counts: {
        paid: creator.totalSupporters,
        pending: Math.min(pending, CAP),
        unresolved: Math.min(unresolved, CAP),
        refunded: Math.min(refunded, CAP),
        abandoned: Math.min(abandoned, CAP),
        truncated,
      },
    };
  },
});
