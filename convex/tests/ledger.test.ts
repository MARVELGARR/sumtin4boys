/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  eventId,
  getBalances,
  listLedger,
  makeCreatorWithUser,
  makeTest,
  paidCheckoutState,
  seedDonation,
  type Test,
} from "./helpers.test-utils";

const HOUR_MS = 60 * 60 * 1000;

/** Creator with one paid donation (pending ledger entries, 5% fee). */
async function creatorWithPendingDonation(t: Test, amount = 400_000) {
  const { creatorId, userId } = await makeCreatorWithUser(t, { username: "ada" });
  const checkoutId = eventId("ch");
  const { donationId, platformFee, netAmount } = await seedDonation(t, {
    creatorId,
    amount,
    checkoutId,
  });
  const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
    eventId: eventId("evt"),
    eventType: "checkout.completed",
    eventCreatedAt: 1_000,
    source: "webhook",
    checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: eventId("py_ch") }),
  });
  expect(result.outcome).toBe("processed");
  return { creatorId, userId, donationId, amount, platformFee, netAmount };
}

async function backdateAllEntries(t: Test, creatorId: Id<"creators">, hours: number) {
  const cutoff = Date.now() - hours * HOUR_MS;
  await t.run(async (ctx) => {
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
      .collect();
    for (const entry of entries) {
      await ctx.db.patch("ledgerEntries", entry._id, { createdAt: cutoff });
    }
  });
}

describe("ledger settlement", () => {
  it("does not settle entries that are younger than the hold period", async () => {
    const t = makeTest();
    const { creatorId, netAmount } = await creatorWithPendingDonation(t);

    const settledCount = await t.mutation(internal.ledger.settleMatureEntries, {});
    expect(settledCount).toEqual({ settledCount: 0, hasMore: false });

    const balances = await getBalances(t, creatorId);
    expect(balances).toEqual({ pending: netAmount, available: 0, paidOut: 0 });
  });

  it("moves mature pending entries into balanceAvailable", async () => {
    const t = makeTest();
    const { creatorId, netAmount, platformFee, amount } =
      await creatorWithPendingDonation(t);
    await backdateAllEntries(t, creatorId, 48);

    const result = await t.mutation(internal.ledger.settleMatureEntries, {});
    expect(result).toEqual({ settledCount: 2, hasMore: false });

    const balances = await getBalances(t, creatorId);
    expect(balances.pending).toBe(0);
    expect(balances.available).toBe(netAmount);
    expect(balances.available).toBe(amount - platformFee);

    const entries = await listLedger(t, creatorId);
    for (const entry of entries) {
      expect(entry.settlementStatus).toBe("settled");
      expect(entry.settledAt).toBeTypeOf("number");
    }
  });

  it("keeps pending + available equal to the sum of all ledger entries", async () => {
    const t = makeTest();
    const { creatorId, netAmount } = await creatorWithPendingDonation(t);

    // Second donation, still pending, created after the first was settled.
    await backdateAllEntries(t, creatorId, 48);
    await t.mutation(internal.ledger.settleMatureEntries, {});

    const checkoutId = eventId("ch");
    await seedDonation(t, { creatorId, amount: 20_000, checkoutId });
    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: 2_000,
      source: "webhook",
      checkout: paidCheckoutState({
        checkoutId,
        amountMinor: 20_000,
        chargeId: eventId("py_ch"),
      }),
    });
    expect(result.outcome).toBe("processed");

    const secondNet = 20_000 - Math.round((20_000 * 500) / 10_000);
    const balances = await getBalances(t, creatorId);
    expect(balances.pending).toBe(secondNet);
    expect(balances.available).toBe(netAmount);

    const entries = await listLedger(t, creatorId);
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    expect(balances.pending + balances.available).toBe(sum);
  });
});
