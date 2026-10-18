import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { applyLedgerEntry } from "../ledger";
import { toMinorUnits } from "../lib/money";
import {
  checkoutStateValidator,
  classifyEvent,
  eventSourceValidator,
  type CheckoutState,
} from "./provider";

/**
 * The fulfilment pipeline.
 *
 * Everything that can move money — real webhooks, the reconciliation cron and
 * the simulated checkout — funnels into `processCheckoutEvent`, so there is
 * exactly ONE place where a donation becomes `paid`.
 *
 * Guarantees:
 * 1. Idempotent: the event id is deduplicated through `webhookEvents`, and the
 *    donation state machine only moves forward (pending -> paid -> refunded).
 * 2. Atomic: the audit row (`webhookEvents`) is written in the SAME mutation
 *    as the state change, so a failed run leaves no trace and the provider
 *    redelivery (or the next reconciliation pass) reprocesses cleanly.
 * 3. Ordered: events older than the last applied one (`lastEventAt`) are
 *    recorded but never applied, so redeliveries can't resurrect old states.
 * 4. Verified amounts: the provider-reported amount and currency must match
 *    the donation we created, or the event is parked as `mismatch` for review.
 */

type EventOutcome =
  | "processed"
  | "already_paid"
  | "duplicate"
  | "ignored"
  | "unmatched"
  | "mismatch"
  | "stale"
  | "not_ready"
  | "partial_refund"
  | "no_donation";

type Source = "webhook" | "reconcile" | "simulated";

interface RecordArgs {
  eventId: string;
  type: string;
  source: Source;
  outcome: EventOutcome;
  eventCreatedAt: number;
  donationId?: Id<"donations">;
  creatorId?: Id<"creators">;
  checkoutId?: string;
}

async function recordEvent(ctx: MutationCtx, args: RecordArgs): Promise<void> {
  await ctx.db.insert("webhookEvents", {
    eventId: args.eventId,
    type: args.type,
    source: args.source,
    outcome: args.outcome,
    donationId: args.donationId,
    creatorId: args.creatorId,
    checkoutId: args.checkoutId,
    eventCreatedAt: args.eventCreatedAt,
    receivedAt: Date.now(),
  });
}

async function findDonationByCheckout(
  ctx: MutationCtx,
  checkout: CheckoutState,
): Promise<Doc<"donations"> | null> {
  const byCheckout = await ctx.db
    .query("donations")
    .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkout.checkoutId))
    .unique();
  if (byCheckout) return byCheckout;
  if (checkout.reference) {
    return await ctx.db
      .query("donations")
      .withIndex("by_reference", (q) => q.eq("reference", checkout.reference as string))
      .unique();
  }
  return null;
}

async function findDonationByCharge(
  ctx: MutationCtx,
  chargeId: string,
): Promise<Doc<"donations"> | null> {
  return await ctx.db
    .query("donations")
    .withIndex("by_paymentId", (q) => q.eq("paymentId", chargeId))
    .unique();
}

/**
 * Provider amount/currency must match what we charged. Returns null when the
 * state matches, or a human-readable reason when it does not.
 */
function describeAmountMismatch(
  donation: Doc<"donations">,
  checkout: CheckoutState,
): string | null {
  if (!checkout.currency) return "provider state has no currency";
  if (checkout.currency.toUpperCase() !== donation.currency.toUpperCase()) {
    return `currency ${checkout.currency} does not match donation ${donation.currency}`;
  }
  if (!checkout.amount) return "provider state has no amount";
  let minor: number;
  try {
    minor = toMinorUnits(checkout.amount, donation.currency);
  } catch {
    return `unparseable amount "${checkout.amount}"`;
  }
  if (minor !== donation.amount) {
    return `amount ${minor} does not match donation ${donation.amount}`;
  }
  return null;
}

export const processCheckoutEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    eventCreatedAt: v.number(),
    source: eventSourceValidator,
    /** Live checkout state (absent for pure refund events). */
    checkout: v.optional(checkoutStateValidator),
    /** Refund details when the event carries a refund object. */
    refund: v.optional(
      v.object({
        chargeId: v.optional(v.string()),
        /** Decimal string; when present and smaller than the donation, it is
         *  a partial refund and money state is left for manual review. */
        refundedAmount: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({
    outcome: v.union(
      v.literal("processed"),
      v.literal("already_paid"),
      v.literal("duplicate"),
      v.literal("ignored"),
      v.literal("unmatched"),
      v.literal("mismatch"),
      v.literal("stale"),
      v.literal("not_ready"),
      v.literal("partial_refund"),
      v.literal("no_donation"),
    ),
    donationId: v.optional(v.id("donations")),
  }),
  handler: async (ctx, args) => {
    // 1. Dedupe. Convex mutations are serializable, so a concurrent redelivery
    //    either commits first (this run then sees the row) or re-runs against
    //    the committed state. No partial double-processing is possible.
    const seen = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (seen) {
      return { outcome: "duplicate" as const, donationId: seen.donationId };
    }

    const eventClass = classifyEvent(args.eventType);

    // ---------------------------------------------------------------------
    // Refunds: match by charge id, demand a full refund for the MVP.
    // ---------------------------------------------------------------------
    if (eventClass === "refund") {
      const chargeId = args.refund?.chargeId;
      const donation = chargeId ? await findDonationByCharge(ctx, chargeId) : null;
      if (!donation) {
        await recordEvent(ctx, {
          eventId: args.eventId,
          type: args.eventType,
          source: args.source,
          outcome: "no_donation",
          eventCreatedAt: args.eventCreatedAt,
        });
        return { outcome: "no_donation" as const };
      }
      if (donation.status !== "paid") {
        await recordEvent(ctx, {
          eventId: args.eventId,
          type: args.eventType,
          source: args.source,
          outcome: "ignored",
          eventCreatedAt: args.eventCreatedAt,
          donationId: donation._id,
          creatorId: donation.creatorId,
        });
        return { outcome: "ignored" as const, donationId: donation._id };
      }

      // Partial refunds are recorded but left for manual review (MVP scope:
      // full refunds only — see docs/PAYMENTS.md).
      if (args.refund?.refundedAmount) {
        let refundedMinor: number | null = null;
        try {
          refundedMinor = toMinorUnits(args.refund.refundedAmount, donation.currency);
        } catch {
          refundedMinor = null;
        }
        if (refundedMinor !== null && refundedMinor < donation.amount) {
          await recordEvent(ctx, {
            eventId: args.eventId,
            type: args.eventType,
            source: args.source,
            outcome: "partial_refund",
            eventCreatedAt: args.eventCreatedAt,
            donationId: donation._id,
            creatorId: donation.creatorId,
          });
          return { outcome: "partial_refund" as const, donationId: donation._id };
        }
      }

      await ctx.db.patch("donations", donation._id, {
        status: "refunded",
        lastEventAt: Math.max(donation.lastEventAt ?? 0, args.eventCreatedAt),
      });
      // Both entries stay pending so the settlement cron nets them out
      // against the original (possibly already settled) donation entries.
      await applyLedgerEntry(ctx, {
        creatorId: donation.creatorId,
        type: "refund",
        amount: -donation.amount,
        currency: donation.currency,
        donationId: donation._id,
        settlementStatus: "pending",
      });
      await applyLedgerEntry(ctx, {
        creatorId: donation.creatorId,
        type: "fee_reversal",
        amount: donation.platformFee,
        currency: donation.currency,
        donationId: donation._id,
        settlementStatus: "pending",
      });
      const creator = await ctx.db.get("creators", donation.creatorId);
      if (creator) {
        await ctx.db.patch("creators", creator._id, {
          totalRaised: creator.totalRaised - donation.amount,
          totalSupporters: Math.max(0, creator.totalSupporters - 1),
        });
      }
      await recordEvent(ctx, {
        eventId: args.eventId,
        type: args.eventType,
        source: args.source,
        outcome: "processed",
        eventCreatedAt: args.eventCreatedAt,
        donationId: donation._id,
        creatorId: donation.creatorId,
      });
      return { outcome: "processed" as const, donationId: donation._id };
    }

    // ---------------------------------------------------------------------
    // Everything else needs the live checkout state.
    // ---------------------------------------------------------------------
    const checkout = args.checkout;
    if (!checkout) {
      await recordEvent(ctx, {
        eventId: args.eventId,
        type: args.eventType,
        source: args.source,
        outcome: "ignored",
        eventCreatedAt: args.eventCreatedAt,
      });
      return { outcome: "ignored" as const };
    }

    const donation = await findDonationByCheckout(ctx, checkout);
    if (!donation) {
      await recordEvent(ctx, {
        eventId: args.eventId,
        type: args.eventType,
        source: args.source,
        outcome: "unmatched",
        eventCreatedAt: args.eventCreatedAt,
        checkoutId: checkout.checkoutId,
      });
      return { outcome: "unmatched" as const };
    }

    const recordBase = {
      eventId: args.eventId,
      type: args.eventType,
      source: args.source,
      eventCreatedAt: args.eventCreatedAt,
      donationId: donation._id,
      creatorId: donation.creatorId,
      checkoutId: checkout.checkoutId,
    } as const;

    // Amount/currency verification (all classes that would move money).
    if (eventClass === "completion" || eventClass === "underpaid") {
      const mismatch = describeAmountMismatch(donation, checkout);
      if (mismatch) {
        await recordEvent(ctx, { ...recordBase, outcome: "mismatch" });
        return { outcome: "mismatch" as const, donationId: donation._id };
      }
    }

    // Out-of-order guard: never apply an event older than the last applied one.
    if (donation.lastEventAt !== undefined && args.eventCreatedAt < donation.lastEventAt) {
      await recordEvent(ctx, { ...recordBase, outcome: "stale" });
      return { outcome: "stale" as const, donationId: donation._id };
    }

    if (eventClass === "completion") {
      // The live state must actually show collected money. When it does not
      // yet (eventual consistency), DON'T record the event so the provider
      // retry (or the reconciliation cron) can process it later.
      const status = (checkout.status ?? "").toLowerCase();
      const paymentStatus = (checkout.paymentStatus ?? "").toLowerCase();
      const paidEnough =
        status === "completed" && (paymentStatus === "paid" || paymentStatus === "succeeded");
      if (!paidEnough) {
        return { outcome: "not_ready" as const, donationId: donation._id };
      }
      if (donation.status === "paid") {
        await recordEvent(ctx, { ...recordBase, outcome: "already_paid" });
        return { outcome: "already_paid" as const, donationId: donation._id };
      }
      if (donation.status === "refunded") {
        await recordEvent(ctx, { ...recordBase, outcome: "ignored" });
        return { outcome: "ignored" as const, donationId: donation._id };
      }

      const now = Date.now();
      await ctx.db.patch("donations", donation._id, {
        status: "paid",
        paidAt: now,
        lastEventAt: Math.max(donation.lastEventAt ?? 0, args.eventCreatedAt),
        checkoutId: checkout.checkoutId,
        paymentId: checkout.chargeId ?? donation.paymentId,
      });
      await applyLedgerEntry(ctx, {
        creatorId: donation.creatorId,
        type: "donation",
        amount: donation.amount,
        currency: donation.currency,
        donationId: donation._id,
        settlementStatus: "pending",
      });
      await applyLedgerEntry(ctx, {
        creatorId: donation.creatorId,
        type: "fee",
        amount: -donation.platformFee,
        currency: donation.currency,
        donationId: donation._id,
        settlementStatus: "pending",
      });
      const creator = await ctx.db.get("creators", donation.creatorId);
      if (creator) {
        await ctx.db.patch("creators", creator._id, {
          totalRaised: creator.totalRaised + donation.amount,
          totalSupporters: creator.totalSupporters + 1,
        });
      }
      // Receipt + creator alert. No-ops (with a log line) when email is
      // not configured — see convex/emails.ts.
      await ctx.scheduler.runAfter(0, internal.emails.notifyDonationPaid, {
        donationId: donation._id,
      });
      await recordEvent(ctx, { ...recordBase, outcome: "processed" });
      return { outcome: "processed" as const, donationId: donation._id };
    }

    if (eventClass === "expiry" || eventClass === "underpaid") {
      if (donation.status === "paid" || donation.status === "refunded") {
        await recordEvent(ctx, { ...recordBase, outcome: "ignored" });
        return { outcome: "ignored" as const, donationId: donation._id };
      }
      await ctx.db.patch("donations", donation._id, {
        status: "unresolved",
        lastEventAt: Math.max(donation.lastEventAt ?? 0, args.eventCreatedAt),
      });
      await recordEvent(ctx, { ...recordBase, outcome: "processed" });
      return { outcome: "processed" as const, donationId: donation._id };
    }

    // collection.failed: the checkout stays open so the supporter can retry.
    // Record it for observability; the donation keeps its status.
    await recordEvent(ctx, { ...recordBase, outcome: "ignored" });
    return { outcome: "ignored" as const, donationId: donation._id };
  },
});
