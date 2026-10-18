/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { MIN_PAYOUT_MINOR_DEFAULT } from "../lib/validation";
import {
  eventId,
  forUser,
  getBalances,
  listLedger,
  makeCreatorWithUser,
  makeTest,
  makeUser,
  paidCheckoutState,
  seedDonation,
  withEnv,
  type Test,
} from "./helpers.test-utils";

const HOUR_MS = 60 * 60 * 1000;

/** Creator whose donation has settled: available = 380_000 minor units. */
async function fundedCreator(t: Test) {
  const { creatorId, userId } = await makeCreatorWithUser(t, { username: "ada" });
  const amount = 400_000;
  const checkoutId = eventId("ch");
  const { donationId } = await seedDonation(t, { creatorId, amount, checkoutId });
  const processed = await t.mutation(internal.bachs.events.processCheckoutEvent, {
    eventId: eventId("evt"),
    eventType: "checkout.completed",
    eventCreatedAt: 1_000,
    source: "webhook",
    checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: eventId("py_ch") }),
  });
  expect(processed.outcome).toBe("processed");

  const cutoff = Date.now() - 48 * HOUR_MS;
  await t.run(async (ctx) => {
    const entries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
      .collect();
    for (const entry of entries) {
      await ctx.db.patch("ledgerEntries", entry._id, { createdAt: cutoff });
    }
  });
  await t.mutation(internal.ledger.settleMatureEntries, {});

  const balances = await getBalances(t, creatorId);
  expect(balances).toEqual({ pending: 0, available: 380_000, paidOut: 0 });
  return { creatorId, userId, donationId, available: balances.available };
}

async function requestPayout(t: Test, userId: Id<"users">, amount: number) {
  return await forUser(t, userId).mutation(api.payouts.request, { amount });
}

describe("payouts.request", () => {
  it("rejects amounts below the minimum", async () => {
    const t = makeTest();
    const { userId, creatorId } = await fundedCreator(t);

    await expect(requestPayout(t, userId, 99_999)).rejects.toMatchObject({
      data: { code: "below_minimum_payout" },
    });
    await expect(requestPayout(t, userId, MIN_PAYOUT_MINOR_DEFAULT - 1)).rejects.toMatchObject({
      data: { code: "below_minimum_payout" },
    });
    // Non-integer amounts are rejected by the same guard.
    await expect(requestPayout(t, userId, 100_000.5)).rejects.toMatchObject({
      data: { code: "below_minimum_payout" },
    });

    const payouts = await t.run(async (ctx) => ctx.db.query("payouts").collect());
    expect(payouts).toHaveLength(0);
    expect((await getBalances(t, creatorId)).available).toBe(380_000);
  });

  it("rejects amounts above the available balance", async () => {
    const t = makeTest();
    const { userId } = await fundedCreator(t);

    await expect(requestPayout(t, userId, 380_001)).rejects.toMatchObject({
      data: { code: "insufficient_available" },
    });
  });

  it("reserves the funds with a manual payout and a settled ledger entry", async () => {
    const t = makeTest();
    const { userId, creatorId } = await fundedCreator(t);

    const { payoutId } = await requestPayout(t, userId, 100_000);

    const payout = await t.run(async (ctx) => ctx.db.get("payouts", payoutId));
    expect(payout?.creatorId).toBe(creatorId);
    expect(payout?.amount).toBe(100_000);
    expect(payout?.currency).toBe("NGN");
    expect(payout?.status).toBe("requested");
    expect(payout?.method).toBe("manual");
    expect(payout?.requestedAt).toBeTypeOf("number");
    expect(payout?.processedAt).toBeUndefined();

    const entries = await listLedger(t, creatorId);
    const payoutEntry = entries.find((entry) => entry.type === "payout");
    expect(payoutEntry?.amount).toBe(-100_000);
    expect(payoutEntry?.settlementStatus).toBe("settled");
    expect(payoutEntry?.payoutId).toBe(payoutId);

    expect(await getBalances(t, creatorId)).toEqual({
      pending: 0,
      available: 280_000,
      paidOut: 0,
    });

    const balances = await forUser(t, userId).query(api.payouts.getBalances, {});
    expect(balances.minimum).toBe(MIN_PAYOUT_MINOR_DEFAULT);
    expect(balances.connectMode).toBe(false);
    expect(balances.hasOpenPayout).toBe(true);

    const page = await forUser(t, userId).query(api.payouts.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0]._id).toBe(payoutId);
    expect(page.page[0].status).toBe("requested");
  });

  it("allows only one open payout at a time", async () => {
    const t = makeTest();
    const { userId } = await fundedCreator(t);

    await requestPayout(t, userId, 100_000);
    await expect(requestPayout(t, userId, 100_000)).rejects.toMatchObject({
      data: { code: "payout_pending" },
    });
  });

  it("requires authentication and a creator profile", async () => {
    const t = makeTest();
    const { creatorId } = await fundedCreator(t);
    const stranger = await makeUser(t, "stranger@test.com");

    await expect(t.mutation(api.payouts.request, { amount: 100_000 })).rejects.toMatchObject({
      data: { code: "unauthenticated" },
    });
    await expect(requestPayout(t, stranger, 100_000)).rejects.toMatchObject({
      data: { code: "not_a_creator" },
    });

    await t.run(async (ctx) => ctx.db.patch("creators", creatorId, { status: "suspended" }));
    const { userId } = await t.run(async (ctx) => {
      const creator = await ctx.db.get("creators", creatorId);
      return { userId: creator?.userId as Id<"users"> };
    });
    await expect(requestPayout(t, userId, 100_000)).rejects.toMatchObject({
      data: { code: "forbidden" },
    });
  });

  it("rejects requests while Connect mode is enabled", async () => {
    const t = makeTest();
    const { userId } = await fundedCreator(t);

    await withEnv({ CONNECT_ENABLED: "true" }, async () => {
      await expect(requestPayout(t, userId, 100_000)).rejects.toMatchObject({
        data: { code: "connect_mode" },
      });
    });
  });
});

describe("admin payout resolution", () => {
  async function requestedPayout(t: Test) {
    const funded = await fundedCreator(t);
    const { payoutId } = await requestPayout(t, funded.userId, 100_000);
    const adminId = await makeUser(t, "admin@test.com", "Admin");
    const outsiderId = await makeUser(t, "outsider@test.com");
    return { ...funded, payoutId, adminId, outsiderId };
  }

  it("markPayoutFailed releases the reserved funds and records the reversal", async () => {
    const t = makeTest();
    const { payoutId, adminId, outsiderId, creatorId } = await requestedPayout(t);

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      expect(await forUser(t, adminId).query(api.admin.amIAdmin, {})).toBe(true);
      expect(await forUser(t, outsiderId).query(api.admin.amIAdmin, {})).toBe(false);

      await expect(
        forUser(t, outsiderId).mutation(api.admin.markPayoutFailed, {
          payoutId,
          reason: "nope",
        }),
      ).rejects.toMatchObject({ data: { code: "forbidden" } });

      await forUser(t, adminId).mutation(api.admin.markPayoutFailed, {
        payoutId,
        reason: "Bank rejected the transfer",
      });

      const payout = await t.run(async (ctx) => ctx.db.get("payouts", payoutId));
      expect(payout?.status).toBe("failed");
      expect(payout?.failureReason).toBe("Bank rejected the transfer");
      expect(payout?.processedAt).toBeTypeOf("number");

      const entries = await listLedger(t, creatorId);
      const reversal = entries.find((entry) => entry.type === "payout_reversal");
      expect(reversal?.amount).toBe(100_000);
      expect(reversal?.settlementStatus).toBe("settled");
      expect(reversal?.payoutId).toBe(payoutId);

      expect(await getBalances(t, creatorId)).toEqual({
        pending: 0,
        available: 380_000,
        paidOut: 0,
      });

      // Resolving twice is refused.
      await expect(
        forUser(t, adminId).mutation(api.admin.markPayoutFailed, { payoutId, reason: "again" }),
      ).rejects.toMatchObject({ data: { code: "already_resolved" } });
      await expect(
        forUser(t, adminId).mutation(api.admin.markPayoutPaid, { payoutId, reference: "trf_1" }),
      ).rejects.toMatchObject({ data: { code: "already_resolved" } });
    });
  });

  it("markPayoutPaid records the reference and lifetime paid-out total", async () => {
    const t = makeTest();
    const { payoutId, adminId, creatorId } = await requestedPayout(t);

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await forUser(t, adminId).mutation(api.admin.markPayoutPaid, {
        payoutId,
        reference: "trf_abc123",
      });

      const payout = await t.run(async (ctx) => ctx.db.get("payouts", payoutId));
      expect(payout?.status).toBe("paid");
      expect(payout?.reference).toBe("trf_abc123");
      expect(payout?.processedAt).toBeTypeOf("number");

      expect(await getBalances(t, creatorId)).toEqual({
        pending: 0,
        available: 280_000,
        paidOut: 100_000,
      });

      const rows = await forUser(t, adminId).query(api.admin.listPayouts, {});
      expect(rows).toHaveLength(1);
      expect(rows[0]._id).toBe(payoutId);
      expect(rows[0].creatorUsername).toBe("ada");

      const requested = await forUser(t, adminId).query(api.admin.listPayouts, {
        status: "requested",
      });
      expect(requested).toHaveLength(0);
    });
  });

  it("validates the payout state and inputs", async () => {
    const t = makeTest();
    const { payoutId, adminId } = await requestedPayout(t);

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await expect(
        forUser(t, adminId).mutation(api.admin.markPayoutPaid, { payoutId, reference: "   " }),
      ).rejects.toMatchObject({ data: { code: "invalid_input" } });
      await expect(
        forUser(t, adminId).mutation(api.admin.markPayoutFailed, { payoutId, reason: "" }),
      ).rejects.toMatchObject({ data: { code: "invalid_input" } });
    });
  });
});
