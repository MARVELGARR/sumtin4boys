import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { settlementHoldHours } from "./lib/config";

/**
 * The ledger.
 *
 * Every money movement appends signed entries here; the creator document's
 * `balancePending` / `balanceAvailable` fields are denormalized sums of those
 * entries, updated in the SAME transaction as each insert, so balances are
 * always consistent with the ledger:
 *
 *   balancePending   = sum(entries with settlementStatus "pending")
 *   balanceAvailable = sum(entries with settlementStatus "settled")
 *
 * Donations enter `pending`; `settleMatureEntries` (cron) moves them to
 * `settled` after `SETTLEMENT_HOLD_HOURS`. Payout reservations are inserted
 * already settled so they immediately reduce `balanceAvailable`.
 *
 * If counters ever drift, an admin can rebuild them from the entries with
 * `admin.recomputeCreatorBalances`.
 */

export type LedgerEntryType = Doc<"ledgerEntries">["type"];

export interface LedgerEntryInput {
  creatorId: Id<"creators">;
  type: LedgerEntryType;
  /** Signed minor units. */
  amount: number;
  currency: string;
  donationId?: Id<"donations">;
  payoutId?: Id<"payouts">;
  settlementStatus: "pending" | "settled";
  note?: string;
}

/**
 * Append an entry and apply it to the creator's balances atomically.
 * Must be called inside a mutation.
 */
export async function applyLedgerEntry(
  ctx: MutationCtx,
  entry: LedgerEntryInput,
): Promise<Id<"ledgerEntries">> {
  const now = Date.now();
  const entryId = await ctx.db.insert("ledgerEntries", {
    creatorId: entry.creatorId,
    type: entry.type,
    amount: entry.amount,
    currency: entry.currency,
    donationId: entry.donationId,
    payoutId: entry.payoutId,
    settlementStatus: entry.settlementStatus,
    settledAt: entry.settlementStatus === "settled" ? now : undefined,
    note: entry.note,
    createdAt: now,
  });

  const creator = await ctx.db.get("creators", entry.creatorId);
  if (!creator) {
    throw new Error(`Ledger entry references missing creator ${entry.creatorId}`);
  }
  if (entry.settlementStatus === "settled") {
    await ctx.db.patch("creators", entry.creatorId, {
      balanceAvailable: creator.balanceAvailable + entry.amount,
    });
  } else {
    await ctx.db.patch("creators", entry.creatorId, {
      balancePending: creator.balancePending + entry.amount,
    });
  }
  return entryId;
}

/**
 * Move any still-pending entries for one donation into `settled` immediately.
 *
 * Used when a refund arrives before the normal settlement hold has elapsed:
 * the original donation/fee must stop sitting in `pending` while the refund
 * is settled, otherwise the creator can briefly have a positive pending
 * balance that does not correspond to money they are entitled to.
 */
export async function settlePendingDonationEntries(
  ctx: MutationCtx,
  donationId: Id<"donations">,
): Promise<void> {
  const entries = await ctx.db
    .query("ledgerEntries")
    .withIndex("by_donation", (q) => q.eq("donationId", donationId))
    .collect();
  const pending = entries.filter((entry) => entry.settlementStatus === "pending");
  if (pending.length === 0) return;

  const deltas = new Map<Id<"creators">, number>();
  for (const entry of pending) {
    deltas.set(entry.creatorId, (deltas.get(entry.creatorId) ?? 0) + entry.amount);
  }

  const now = Date.now();
  for (const entry of pending) {
    await ctx.db.patch("ledgerEntries", entry._id, {
      settlementStatus: "settled",
      settledAt: now,
    });
  }
  for (const [creatorId, delta] of deltas) {
    const creator = await ctx.db.get("creators", creatorId);
    if (!creator) continue;
    await ctx.db.patch("creators", creatorId, {
      balancePending: creator.balancePending - delta,
      balanceAvailable: creator.balanceAvailable + delta,
    });
  }
}

/**
 * Amount a creator may actually withdraw.
 *
 * `balanceAvailable` is normally the answer, but negative pending entries
 * (for example an adjustment or a refund clawback) must reduce it. Positive
 * pending entries are not spendable until they settle. A refund can therefore
 * push `balanceAvailable` negative, and future settled donations recover it.
 */
export function payoutableBalance(
  creator: Pick<Doc<"creators">, "balanceAvailable" | "balancePending">,
): number {
  return creator.balanceAvailable + Math.min(0, creator.balancePending);
}

const SETTLE_BATCH_SIZE = 200;

/**
 * Cron job: move pending entries older than the hold period to `settled`.
 * Processes bounded batches and schedules a continuation when there is more
 * work, so a large backlog never blows the mutation budget.
 */
export const settleMatureEntries = internalMutation({
  args: {},
  returns: v.object({ settledCount: v.number(), hasMore: v.boolean() }),
  handler: async (ctx) => {
    const holdMs = settlementHoldHours() * 60 * 60 * 1000;
    const cutoff = Date.now() - holdMs;

    const batch = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementStatus", "pending").lt("createdAt", cutoff),
      )
      .order("asc")
      .take(SETTLE_BATCH_SIZE);

    if (batch.length === 0) {
      return { settledCount: 0, hasMore: false };
    }

    // Sum per creator first, then patch each balance once.
    const deltas = new Map<Id<"creators">, number>();
    for (const entry of batch) {
      deltas.set(entry.creatorId, (deltas.get(entry.creatorId) ?? 0) + entry.amount);
    }

    const now = Date.now();
    for (const entry of batch) {
      await ctx.db.patch("ledgerEntries", entry._id, {
        settlementStatus: "settled",
        settledAt: now,
      });
    }
    for (const [creatorId, delta] of deltas) {
      const creator = await ctx.db.get("creators", creatorId);
      if (!creator) continue;
      await ctx.db.patch("creators", creatorId, {
        balancePending: creator.balancePending - delta,
        balanceAvailable: creator.balanceAvailable + delta,
      });
    }

    const hasMore = batch.length === SETTLE_BATCH_SIZE;
    if (hasMore) {
      // Each run settles at least one entry, so this always terminates.
      await ctx.scheduler.runAfter(0, internal.ledger.settleMatureEntries, {});
    }
    return { settledCount: batch.length, hasMore };
  },
});
