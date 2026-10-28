import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import {
  applyLedgerEntry,
  applyPlatformLedgerEntry,
  settlePendingDonationEntries,
} from "../ledger";
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
  | "no_donation"
  | "pending_refund"
  | "missing_charge_id"
  | "already_refunded"
  | "unmatched_refund";

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
  const expected = donationTotalCharged(donation);
  if (minor === expected) return null;

  // When the supporter chooses to cover processing, Bachs adds its actual
  // fee on top. The live state may report the total charge including that
  // fee; accept only when the provider also reports the fee amount.
  if (donation.coverProcessingFee && checkout.processingFee) {
    try {
      const fee = toMinorUnits(checkout.processingFee, donation.currency);
      if (minor === expected + fee) return null;
    } catch {
      // Fall through to the mismatch below.
    }
  }
  return `amount ${minor} does not match donation ${expected}`;
}

type RefundApplyOutcome = "applied" | "partial" | "pending" | "already_refunded";

function donationTotalCharged(donation: Doc<"donations">): number {
  return donation.totalCharged ?? donation.amount;
}

async function applyRefundToDonation(
  ctx: MutationCtx,
  donation: Doc<"donations">,
  refund: Doc<"providerRefunds">,
): Promise<RefundApplyOutcome> {
  if (donation.status === "refunded") {
    await ctx.db.patch("providerRefunds", refund._id, {
      status: "applied",
      donationId: donation._id,
      creatorId: donation.creatorId,
      currency: donation.currency,
      appliedAt: Date.now(),
    });
    return "already_refunded";
  }
  if (donation.status !== "paid") return "pending";

  const expected = donationTotalCharged(donation);
  let refundedMinor = refund.amount ?? expected;
  if (refund.amount === undefined && refund.amountRaw) {
    try {
      refundedMinor = toMinorUnits(refund.amountRaw, donation.currency);
    } catch {
      refundedMinor = expected;
    }
  }

  if (refundedMinor > 0 && refundedMinor < expected) {
    await ctx.db.patch("donations", donation._id, {
      refundedAmount: (donation.refundedAmount ?? 0) + refundedMinor,
    });
    await ctx.db.patch("providerRefunds", refund._id, {
      status: "partial",
      amount: refundedMinor,
      donationId: donation._id,
      creatorId: donation.creatorId,
      currency: donation.currency,
      appliedAt: Date.now(),
    });
    return "partial";
  }

  await ctx.db.patch("donations", donation._id, {
    status: "refunded",
    refundedAmount: expected,
    lastEventAt: Math.max(donation.lastEventAt ?? 0, refund.eventCreatedAt),
  });
  // Settle any still-pending donation/fee entries first, then write the
  // refund as settled too. The clawback therefore reduces balanceAvailable in
  // this same transaction and can never be withdrawn while the refund entries
  // are still pending.
  await settlePendingDonationEntries(ctx, donation._id);
  await applyLedgerEntry(ctx, {
    creatorId: donation.creatorId,
    type: "refund",
    amount: -donation.amount,
    currency: donation.currency,
    donationId: donation._id,
    settlementStatus: "settled",
    note: "Provider refund",
    reference: refund.refundId || refund.eventId,
  });
  if (donation.platformFee > 0) {
    await applyLedgerEntry(ctx, {
      creatorId: donation.creatorId,
      type: "fee_reversal",
      amount: donation.platformFee,
      currency: donation.currency,
      donationId: donation._id,
      settlementStatus: "settled",
      note: "Platform fee returned on refund",
      reference: refund.refundId || refund.eventId,
    });
  }
  if (donation.platformFee > 0) {
    await applyPlatformLedgerEntry(ctx, {
      type: "platform_fee_refund",
      amount: -donation.platformFee,
      currency: donation.currency,
      donationId: donation._id,
      note: "Platform fee reversed on refund",
    });
  }
  if ((donation.platformTip ?? 0) > 0) {
    await applyPlatformLedgerEntry(ctx, {
      type: "platform_tip_refund",
      amount: -(donation.platformTip ?? 0),
      currency: donation.currency,
      donationId: donation._id,
      note: "Platform tip reversed on refund",
    });
  }
  const creator = await ctx.db.get("creators", donation.creatorId);
  if (creator) {
    await ctx.db.patch("creators", creator._id, {
      totalRaised: creator.totalRaised - donation.amount,
      totalSupporters: Math.max(0, creator.totalSupporters - 1),
    });
  }
  await ctx.db.patch("providerRefunds", refund._id, {
    status: "applied",
    amount: expected,
    donationId: donation._id,
    creatorId: donation.creatorId,
    currency: donation.currency,
    appliedAt: Date.now(),
  });
  return "applied";
}

async function pendingRefundsForDonation(
  ctx: MutationCtx,
  donation: Doc<"donations">,
): Promise<Doc<"providerRefunds">[]> {
  const byCharge = donation.paymentId
    ? await ctx.db
        .query("providerRefunds")
        .withIndex("by_chargeId", (q) =>
          q.eq("chargeId", donation.paymentId as string).eq("status", "pending_match"),
        )
        .collect()
    : [];
  const byCheckout = donation.checkoutId
    ? await ctx.db
        .query("providerRefunds")
        .withIndex("by_checkoutId", (q) =>
          q.eq("checkoutId", donation.checkoutId as string).eq("status", "pending_match"),
        )
        .collect()
    : [];
  const byId = new Map<Id<"providerRefunds">, Doc<"providerRefunds">>();
  for (const row of [...byCharge, ...byCheckout]) byId.set(row._id, row);
  return [...byId.values()];
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
        checkoutId: v.optional(v.string()),
        refundId: v.optional(v.string()),
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
      v.literal("pending_refund"),
      v.literal("missing_charge_id"),
      v.literal("already_refunded"),
      v.literal("unmatched_refund"),
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
    // Refunds: never discard a refund because completion has not landed yet.
    // The refund is queued by charge/checkout id and applied when it matches.
    // ---------------------------------------------------------------------
    if (eventClass === "refund") {
      const chargeId = args.refund?.chargeId ?? args.checkout?.chargeId ?? "";
      const checkoutId = args.refund?.checkoutId ?? args.checkout?.checkoutId ?? "";
      const refundId = args.refund?.refundId ?? "";
      const donation =
        (chargeId ? await findDonationByCharge(ctx, chargeId) : null) ??
        (checkoutId
          ? await ctx.db
              .query("donations")
              .withIndex("by_checkoutId", (q) => q.eq("checkoutId", checkoutId))
              .unique()
          : null);

      const refundRowId = await ctx.db.insert("providerRefunds", {
        eventId: args.eventId,
        eventCreatedAt: args.eventCreatedAt,
        chargeId,
        checkoutId: checkoutId || donation?.checkoutId || "",
        refundId,
        donationId: donation?._id,
        creatorId: donation?.creatorId,
        amountRaw: args.refund?.refundedAmount,
        currency: donation?.currency,
        status:
          chargeId || checkoutId ? "pending_match" : "unmatched",
        createdAt: Date.now(),
      });
      const refundRow = await ctx.db.get("providerRefunds", refundRowId);
      if (!refundRow) throw new Error("Failed to queue provider refund.");

      if (!donation) {
        const outcome = chargeId || checkoutId ? "pending_refund" : "unmatched_refund";
        await recordEvent(ctx, {
          eventId: args.eventId,
          type: args.eventType,
          source: args.source,
          outcome,
          eventCreatedAt: args.eventCreatedAt,
          checkoutId: checkoutId || undefined,
        });
        return { outcome } as const;
      }

      const result = await applyRefundToDonation(ctx, donation, refundRow);
      if (result === "pending") {
        await recordEvent(ctx, {
          eventId: args.eventId,
          type: args.eventType,
          source: args.source,
          outcome: "pending_refund",
          eventCreatedAt: args.eventCreatedAt,
          donationId: donation._id,
          creatorId: donation.creatorId,
          checkoutId: donation.checkoutId,
        });
        return { outcome: "pending_refund" as const, donationId: donation._id };
      }
      if (result === "partial") {
        await recordEvent(ctx, {
          eventId: args.eventId,
          type: args.eventType,
          source: args.source,
          outcome: "partial_refund",
          eventCreatedAt: args.eventCreatedAt,
          donationId: donation._id,
          creatorId: donation.creatorId,
          checkoutId: donation.checkoutId,
        });
        return { outcome: "partial_refund" as const, donationId: donation._id };
      }
      await recordEvent(ctx, {
        eventId: args.eventId,
        type: args.eventType,
        source: args.source,
        outcome: result === "already_refunded" ? "already_refunded" : "processed",
        eventCreatedAt: args.eventCreatedAt,
        donationId: donation._id,
        creatorId: donation.creatorId,
        checkoutId: donation.checkoutId,
      });
      return {
        outcome: result === "already_refunded" ? ("already_refunded" as const) : ("processed" as const),
        donationId: donation._id,
      };
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

      // Do NOT apply the timestamp guard to a completion backed by live,
      // collected money. An older `collection.succeeded` can legitimately
      // arrive after a newer `checkout.expired`; the money was still
      // collected, and ignoring it would leave a real payment unfulfilled.
      // Status is monotonic: paid always beats unresolved.
      if (donation.status === "paid") {
        await recordEvent(ctx, { ...recordBase, outcome: "already_paid" });
        return { outcome: "already_paid" as const, donationId: donation._id };
      }
      if (donation.status === "refunded") {
        await recordEvent(ctx, { ...recordBase, outcome: "ignored" });
        return { outcome: "ignored" as const, donationId: donation._id };
      }

      // Fail closed without a charge id. A later refund can only be matched by
      // charge id; crediting money we cannot later reverse is worse than
      // parking the completion for reconciliation.
      const chargeId = checkout.chargeId ?? donation.paymentId;
      if (!chargeId) {
        await recordEvent(ctx, { ...recordBase, outcome: "missing_charge_id" });
        return {
          outcome: "missing_charge_id" as const,
          donationId: donation._id,
        };
      }

      let processingFee: number | undefined;
      if (checkout.processingFee) {
        try {
          processingFee = toMinorUnits(checkout.processingFee, donation.currency);
        } catch {
          processingFee = undefined;
        }
      }
      const feeBearer =
        checkout.feeBearer ??
        (donation.coverProcessingFee ? ("customer" as const) : ("merchant" as const));

      const now = Date.now();
      const totalCharged = donationTotalCharged(donation);
      await ctx.db.patch("donations", donation._id, {
        status: "paid",
        paidAt: now,
        lastEventAt: Math.max(donation.lastEventAt ?? 0, args.eventCreatedAt),
        checkoutId: checkout.checkoutId,
        paymentId: chargeId,
        totalCharged,
        ...(processingFee !== undefined
          ? {
              processingFee,
              processingFeeCurrency: donation.currency,
              feeBearer,
              processingFeeStatus: "recorded" as const,
            }
          : donation.coverProcessingFee
            ? { processingFeeStatus: "pending" as const }
            : {}),
      });
      await applyLedgerEntry(ctx, {
        creatorId: donation.creatorId,
        type: "donation",
        amount: donation.amount,
        currency: donation.currency,
        donationId: donation._id,
        settlementStatus: "pending",
      });
      if (donation.platformFee > 0) {
        await applyLedgerEntry(ctx, {
          creatorId: donation.creatorId,
          type: "fee",
          amount: -donation.platformFee,
          currency: donation.currency,
          donationId: donation._id,
          settlementStatus: "pending",
        });
      }
      if (donation.platformFee > 0) {
        await applyPlatformLedgerEntry(ctx, {
          type: "platform_fee",
          amount: donation.platformFee,
          currency: donation.currency,
          donationId: donation._id,
          note: "Platform fee",
        });
      }
      if ((donation.platformTip ?? 0) > 0) {
        await applyPlatformLedgerEntry(ctx, {
          type: "platform_tip",
          amount: donation.platformTip ?? 0,
          currency: donation.currency,
          donationId: donation._id,
          note: "Optional supporter tip for the platform",
        });
      }
      if (feeBearer === "merchant" && processingFee && processingFee > 0) {
        await applyPlatformLedgerEntry(ctx, {
          type: "processing_fee_expense",
          amount: -processingFee,
          currency: donation.currency,
          donationId: donation._id,
          note: "Processing fee borne by the platform",
        });
      }
      const creator = await ctx.db.get("creators", donation.creatorId);
      if (creator) {
        await ctx.db.patch("creators", creator._id, {
          totalRaised: creator.totalRaised + donation.amount,
          totalSupporters: creator.totalSupporters + 1,
        });
      }

      // A refund may have arrived before this completion. Now that the charge
      // id is stored, apply every queued refund in the SAME transaction. The
      // donation can end this event as `refunded`; the money is never left
      // credited after the provider has already returned it.
      const paidDonation = await ctx.db.get("donations", donation._id);
      if (paidDonation) {
        const queuedRefunds = await pendingRefundsForDonation(ctx, paidDonation);
        for (const queued of queuedRefunds) {
          const current = await ctx.db.get("donations", donation._id);
          if (current) await applyRefundToDonation(ctx, current, queued);
        }
      }

      // Receipt + creator alert. No-ops (with a log line) when email is
      // not configured — see convex/emails.ts.
      await ctx.scheduler.runAfter(0, internal.emails.notifyDonationPaid, {
        donationId: donation._id,
      });
      await recordEvent(ctx, { ...recordBase, outcome: "processed" });
      return { outcome: "processed" as const, donationId: donation._id };
    }

    // Out-of-order guard for non-completion states. A stale expiry/underpaid
    // event must not overwrite a newer state.
    if (donation.lastEventAt !== undefined && args.eventCreatedAt < donation.lastEventAt) {
      await recordEvent(ctx, { ...recordBase, outcome: "stale" });
      return { outcome: "stale" as const, donationId: donation._id };
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
