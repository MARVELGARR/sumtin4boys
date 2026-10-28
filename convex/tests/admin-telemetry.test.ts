/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  forUser,
  makeCreator,
  makeTest,
  makeUser,
  withEnv,
  type Test,
} from "./helpers.test-utils";

const HOUR_MS = 60 * 60 * 1000;
const HOLD_HOURS = 24;
const HOLD_MS = HOLD_HOURS * HOUR_MS;

const ENV = { ADMIN_EMAILS: "admin@test.com", SETTLEMENT_HOLD_HOURS: "24" };

interface LedgerSeed {
  creatorId: Id<"creators">;
  type: Doc<"ledgerEntries">["type"];
  amount: number;
  currency: string;
  settlementStatus: "pending" | "settled";
  createdAt: number;
  settledAt?: number;
  note?: string;
}

async function addLedger(t: Test, entries: LedgerSeed[]): Promise<void> {
  await t.run(async (ctx) => {
    for (const entry of entries) {
      await ctx.db.insert("ledgerEntries", entry);
    }
  });
}

interface DonationSeed {
  creatorId: Id<"creators">;
  amount: number;
  currency: string;
  status: Doc<"donations">["status"];
  reference: string;
  createdAt: number;
  paidAt?: number;
  message?: string;
}

async function addDonation(
  t: Test,
  input: DonationSeed,
): Promise<Id<"donations">> {
  const platformFee = Math.round((input.amount * 500) / 10_000);
  return await t.run(async (ctx) =>
    ctx.db.insert("donations", {
      creatorId: input.creatorId,
      supporterName: "Sam Supporter",
      supporterEmail: "sam@test.com",
      message: input.message,
      isPrivate: false,
      quantity: 1,
      amount: input.amount,
      platformFee,
      netAmount: input.amount - platformFee,
      currency: input.currency,
      reference: input.reference,
      driver: "simulated",
      status: input.status,
      createdAt: input.createdAt,
      paidAt: input.paidAt,
    }),
  );
}

interface PayoutSeed {
  creatorId: Id<"creators">;
  amount: number;
  currency: string;
  status: Doc<"payouts">["status"];
  requestedAt: number;
}

async function addPayout(
  t: Test,
  input: PayoutSeed,
): Promise<Id<"payouts">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("payouts", {
      creatorId: input.creatorId,
      amount: input.amount,
      currency: input.currency,
      status: input.status,
      method: "manual",
      requestedAt: input.requestedAt,
    }),
  );
}

async function makeAdmin(t: Test): Promise<Id<"users">> {
  return await makeUser(t, "admin@test.com", "Admin", { emailVerified: true });
}

describe("admin telemetry auth", () => {
  it("rejects unauthenticated and non-admin callers for every query", async () => {
    const t = makeTest();
    const { creatorId } = await (async () => {
      const userId = await makeUser(t, "creator@test.com", "Creator");
      const id = await makeCreator(t, userId, { username: "ada" });
      return { creatorId: id };
    })();
    const outsiderId = await makeUser(t, "outsider@test.com", "Outsider");

    await withEnv(ENV, async () => {
      await expect(t.query(api.adminTelemetry.overview, {})).rejects.toMatchObject(
        { data: { code: "unauthenticated" } },
      );
      await expect(
        t.query(api.adminTelemetry.heldFunds, {}),
      ).rejects.toMatchObject({ data: { code: "unauthenticated" } });
      await expect(
        t.query(api.adminTelemetry.creatorDetail, { creatorId }),
      ).rejects.toMatchObject({ data: { code: "unauthenticated" } });

      const outsider = forUser(t, outsiderId);
      await expect(outsider.query(api.adminTelemetry.overview, {})).rejects.toMatchObject(
        { data: { code: "forbidden" } },
      );
      await expect(outsider.query(api.adminTelemetry.heldFunds, {})).rejects.toMatchObject(
        { data: { code: "forbidden" } },
      );
      await expect(
        outsider.query(api.adminTelemetry.creatorDetail, { creatorId }),
      ).rejects.toMatchObject({ data: { code: "forbidden" } });
    });
  });

  it("rejects an allow-listed admin whose email is not verified", async () => {
    const t = makeTest();
    const userId = await makeUser(t, "creator@test.com", "Creator");
    const creatorId = await makeCreator(t, userId, { username: "ada" });
    const unverifiedAdmin = await makeUser(t, "admin@test.com", "Admin");

    await withEnv(ENV, async () => {
      const admin = forUser(t, unverifiedAdmin);
      await expect(admin.query(api.adminTelemetry.overview, {})).rejects.toMatchObject(
        { data: { code: "forbidden" } },
      );
      await expect(admin.query(api.adminTelemetry.heldFunds, {})).rejects.toMatchObject(
        { data: { code: "forbidden" } },
      );
      await expect(
        admin.query(api.adminTelemetry.creatorDetail, { creatorId }),
      ).rejects.toMatchObject({ data: { code: "forbidden" } });
    });
  });
});

describe("adminTelemetry.overview", () => {
  it("computes per-currency money totals, counts, and health", async () => {
    const t = makeTest();
    const now = Date.now();
    const adminId = await makeAdmin(t);

    const userA = await makeUser(t, "ada@test.com", "Ada");
    const creatorA = await makeCreator(t, userA, {
      username: "ada",
      currency: "NGN",
      balancePending: 10_000,
      balanceAvailable: 5_000,
      balancePaidOut: 3_000,
    });
    const userB = await makeUser(t, "bola@test.com", "Bola");
    const creatorB = await makeCreator(t, userB, {
      username: "bola",
      currency: "USD",
      balancePending: -2_000,
      balanceAvailable: 7_000,
      balancePaidOut: 1_000,
    });
    const userC = await makeUser(t, "cara@test.com", "Cara");
    await makeCreator(t, userC, {
      username: "cara",
      currency: "NGN",
      status: "suspended",
    });

    const pending3h = now - 3 * HOUR_MS;
    const pending5h = now - 5 * HOUR_MS;
    const pending1h = now - 1 * HOUR_MS;
    const pending2h = now - 2 * HOUR_MS;
    const settled2h = now - 2 * HOUR_MS;
    const settled4h = now - 4 * HOUR_MS;

    await addLedger(t, [
      // Creator A — NGN.
      {
        creatorId: creatorA,
        type: "donation",
        amount: 12_000,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: pending3h,
      },
      {
        creatorId: creatorA,
        type: "fee",
        amount: -600,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: pending3h,
      },
      {
        creatorId: creatorA,
        type: "adjustment",
        amount: -200,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: pending1h,
      },
      {
        creatorId: creatorA,
        type: "fee_reversal",
        amount: 100,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      {
        creatorId: creatorA,
        type: "refund",
        amount: -500,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      {
        creatorId: creatorA,
        type: "donation",
        amount: 400,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      {
        creatorId: creatorA,
        type: "fee",
        amount: -20,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      {
        creatorId: creatorA,
        type: "fee",
        amount: -50,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      {
        creatorId: creatorA,
        type: "payout",
        amount: -1_000,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: settled2h,
        settledAt: settled2h,
      },
      // Creator B — USD.
      {
        creatorId: creatorB,
        type: "donation",
        amount: 6_000,
        currency: "USD",
        settlementStatus: "pending",
        createdAt: pending5h,
      },
      {
        creatorId: creatorB,
        type: "fee",
        amount: -300,
        currency: "USD",
        settlementStatus: "pending",
        createdAt: pending5h,
      },
      {
        creatorId: creatorB,
        type: "adjustment",
        amount: -450,
        currency: "USD",
        settlementStatus: "pending",
        createdAt: pending2h,
      },
      {
        creatorId: creatorB,
        type: "refund",
        amount: -1_000,
        currency: "USD",
        settlementStatus: "settled",
        createdAt: settled4h,
        settledAt: settled4h,
      },
      {
        creatorId: creatorB,
        type: "fee_reversal",
        amount: 50,
        currency: "USD",
        settlementStatus: "settled",
        createdAt: settled4h,
        settledAt: settled4h,
      },
      {
        creatorId: creatorB,
        type: "payout",
        amount: -2_000,
        currency: "USD",
        settlementStatus: "settled",
        createdAt: settled4h,
        settledAt: settled4h,
      },
    ]);

    await addPayout(t, {
      creatorId: creatorA,
      amount: 2_000,
      currency: "NGN",
      status: "requested",
      requestedAt: now - 6 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 1_000,
      currency: "NGN",
      status: "processing",
      requestedAt: now - 7 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 9_000,
      currency: "NGN",
      status: "paid",
      requestedAt: now - 8 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 4_000,
      currency: "NGN",
      status: "failed",
      requestedAt: now - 9 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorB,
      amount: 500,
      currency: "USD",
      status: "requested",
      requestedAt: now - 10 * HOUR_MS,
    });

    await addDonation(t, {
      creatorId: creatorA,
      amount: 12_000,
      currency: "NGN",
      status: "paid",
      reference: "don_paid",
      createdAt: now - 11 * HOUR_MS,
      paidAt: now - 10 * HOUR_MS,
    });
    await addDonation(t, {
      creatorId: creatorA,
      amount: 400,
      currency: "NGN",
      status: "pending",
      reference: "don_pending",
      createdAt: now - 12 * HOUR_MS,
    });
    await addDonation(t, {
      creatorId: creatorB,
      amount: 6_000,
      currency: "USD",
      status: "unresolved",
      reference: "don_unresolved",
      createdAt: now - 13 * HOUR_MS,
    });

    await t.run(async (ctx) => {
      const events = [
        { offset: 1, outcome: "processed" },
        { offset: 2, outcome: "duplicate" },
        { offset: 3, outcome: "ignored" },
        { offset: 4, outcome: "mismatch" },
        { offset: 25, outcome: "stale" },
      ];
      for (const [index, event] of events.entries()) {
        const receivedAt = now - event.offset * HOUR_MS;
        await ctx.db.insert("webhookEvents", {
          eventId: `evt_${index}`,
          type: "checkout.completed",
          source: "webhook",
          outcome: event.outcome,
          eventCreatedAt: receivedAt,
          receivedAt,
        });
      }

      for (const [index, status] of (
        ["started", "outcome_unknown", "succeeded", "failed"] as const
      ).entries()) {
        await ctx.db.insert("apiOperations", {
          key: `op_${index}`,
          kind: "checkout.create",
          status,
          attempts: 1,
          createdAt: now - index * HOUR_MS,
          updatedAt: now - index * HOUR_MS,
        });
      }

      for (const [index, status] of (["new", "new", "read"] as const).entries()) {
        await ctx.db.insert("contactMessages", {
          name: "Supporter",
          email: `support${index}@test.com`,
          topic: "support",
          message: "Hello there",
          status,
          createdAt: now - index * HOUR_MS,
        });
      }
    });

    await withEnv(ENV, async () => {
      const result = await forUser(t, adminId).query(
        api.adminTelemetry.overview,
        {},
      );

      expect(result.now).toBeGreaterThanOrEqual(now);
      expect(result.config).toEqual({
        settlementHoldHours: 24,
        platformFeeBps: 500,
        paymentsDriver: "simulated",
        connectEnabled: false,
        turnstileConfigured: true,
      });
      expect(result.counts).toEqual({
        creatorsTotal: 3,
        creatorsActive: 2,
        creatorsSuspended: 1,
        donationsTotal: 3,
        donationsPaid: 1,
        donationsPending: 1,
        donationsUnresolved: 1,
        payoutsRequested: 2,
        payoutsProcessing: 1,
        newMessages: 2,
      });
      expect(result.health).toEqual({
        webhookFailures24h: 2,
        apiOperationIssues: 2,
        lastWebhookAt: now - HOUR_MS,
      });
      expect(result.sampled).toEqual({
        creators: false,
        ledger: false,
        donations: false,
        payouts: false,
        webhooks: false,
        operations: false,
        messages: false,
      });

      const ngn = result.currencies.find((row) => row.currency === "NGN");
      expect(ngn).toEqual({
        currency: "NGN",
        creatorOwned: 15_000,
        creatorPending: 10_000,
        creatorAvailable: 5_000,
        heldForSettlement: 12_000,
        pendingClawbacks: 800,
        nextSettlementAt: pending3h + HOLD_MS,
        platformGrossFees: 670,
        platformFeeReversals: 100,
        platformNetRevenue: 570,
        grossDonationVolume: 12_400,
        refundedVolume: 500,
        paidOutLifetime: 3_000,
        payoutsAwaiting: 3_000,
      });

      const usd = result.currencies.find((row) => row.currency === "USD");
      expect(usd).toEqual({
        currency: "USD",
        creatorOwned: 5_000,
        creatorPending: -2_000,
        creatorAvailable: 7_000,
        heldForSettlement: 6_000,
        pendingClawbacks: 750,
        nextSettlementAt: pending5h + HOLD_MS,
        platformGrossFees: 300,
        platformFeeReversals: 50,
        platformNetRevenue: 250,
        grossDonationVolume: 6_000,
        refundedVolume: 1_000,
        paidOutLifetime: 1_000,
        payoutsAwaiting: 500,
      });

      // Never combine currencies into one grand total.
      expect(result.currencies).toHaveLength(2);
    });
  });
});

describe("adminTelemetry.heldFunds", () => {
  it("returns pending entries oldest first with per-currency totals", async () => {
    const t = makeTest();
    const now = Date.now();
    const adminId = await makeAdmin(t);

    const userA = await makeUser(t, "ada@test.com", "Ada");
    const creatorA = await makeCreator(t, userA, {
      username: "ada",
      currency: "NGN",
    });
    const userB = await makeUser(t, "bola@test.com", "Bola");
    const creatorB = await makeCreator(t, userB, {
      username: "bola",
      currency: "USD",
    });

    const oldest = now - 5 * HOUR_MS;
    const middle = now - 3 * HOUR_MS;
    const newest = now - HOUR_MS;
    await addLedger(t, [
      {
        creatorId: creatorA,
        type: "donation",
        amount: 7_000,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: middle,
      },
      {
        creatorId: creatorB,
        type: "donation",
        amount: 3_000,
        currency: "USD",
        settlementStatus: "pending",
        createdAt: oldest,
      },
      {
        creatorId: creatorA,
        type: "fee",
        amount: -200,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: newest,
      },
      {
        creatorId: creatorA,
        type: "donation",
        amount: 9_999,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: now - 10 * HOUR_MS,
        settledAt: now - 9 * HOUR_MS,
      },
    ]);

    await withEnv(ENV, async () => {
      const limited = await forUser(t, adminId).query(
        api.adminTelemetry.heldFunds,
        { limit: 2 },
      );

      expect(limited.sampled).toBe(false);
      expect(limited.settlementHoldHours).toBe(24);
      expect(limited.entries).toHaveLength(2);
      expect(limited.entries.map((entry) => entry.currency)).toEqual([
        "USD",
        "NGN",
      ]);
      expect(limited.entries[0].settlesAt).toBe(oldest + HOLD_MS);
      expect(limited.entries[1].createdAt).toBe(middle);
      expect(limited.entries[1].settlesAt).toBe(middle + HOLD_MS);
      expect(limited.entries[1].username).toBe("ada");
      expect(limited.entries[1].displayName).toBe("Ada");

      expect(limited.totals).toEqual([
        {
          currency: "NGN",
          amount: 7_000 - 200,
          count: 2,
          nextSettlementAt: middle + HOLD_MS,
        },
        {
          currency: "USD",
          amount: 3_000,
          count: 1,
          nextSettlementAt: oldest + HOLD_MS,
        },
      ]);

      const all = await forUser(t, adminId).query(
        api.adminTelemetry.heldFunds,
        {},
      );
      expect(all.entries).toHaveLength(3);
      expect(all.entries.map((entry) => entry.createdAt)).toEqual([
        oldest,
        middle,
        newest,
      ]);
    });
  });
});

describe("adminTelemetry.creatorDetail", () => {
  it("returns the creator, held funds, and recent activity", async () => {
    const t = makeTest();
    const now = Date.now();
    const adminId = await makeAdmin(t);
    const userId = await makeUser(t, "ada@test.com", "Ada");
    const creatorId = await makeCreator(t, userId, {
      username: "ada",
      displayName: "Ada Lovelace",
      currency: "NGN",
      coffeePrice: 25_000,
      balancePending: 8_000,
      balanceAvailable: 2_000,
      balancePaidOut: 1_000,
      totalRaised: 20_000,
      totalSupporters: 4,
      onboardingStatus: "enabled",
    });

    const oldestPending = now - 6 * HOUR_MS;
    const newerPending = now - 2 * HOUR_MS;
    await addLedger(t, [
      {
        creatorId,
        type: "donation",
        amount: 9_000,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: oldestPending,
        note: "first pending",
      },
      {
        creatorId,
        type: "fee",
        amount: -1_000,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: newerPending,
      },
      {
        creatorId,
        type: "donation",
        amount: 5_000,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: now - 10 * HOUR_MS,
        settledAt: now - 9 * HOUR_MS,
      },
      {
        creatorId,
        type: "payout",
        amount: -1_000,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: now - 8 * HOUR_MS,
        settledAt: now - 8 * HOUR_MS,
        note: "Payout requested",
      },
    ]);

    await addDonation(t, {
      creatorId,
      amount: 9_000,
      currency: "NGN",
      status: "pending",
      reference: "don_1",
      createdAt: now - 6 * HOUR_MS,
      message: "Keep going",
    });
    await addDonation(t, {
      creatorId,
      amount: 5_000,
      currency: "NGN",
      status: "paid",
      reference: "don_2",
      createdAt: now - 10 * HOUR_MS,
      paidAt: now - 9 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId,
      amount: 1_000,
      currency: "NGN",
      status: "requested",
      requestedAt: now - 8 * HOUR_MS,
    });
    // Cross-currency guard: this USD request must not inflate the NGN creator's
    // awaiting total or be rendered as NGN.
    await addPayout(t, {
      creatorId,
      amount: 700,
      currency: "USD",
      status: "requested",
      requestedAt: now - 9 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId,
      amount: 500,
      currency: "NGN",
      status: "paid",
      requestedAt: now - 12 * HOUR_MS,
    });

    await withEnv(ENV, async () => {
      const detail = await forUser(t, adminId).query(
        api.adminTelemetry.creatorDetail,
        { creatorId },
      );

      expect(detail.creator).toEqual({
        _id: creatorId,
        username: "ada",
        displayName: "Ada Lovelace",
        email: "ada@test.com",
        status: "active",
        currency: "NGN",
        breadPrice: 25_000,
        balancePending: 8_000,
        balanceAvailable: 2_000,
        balancePaidOut: 1_000,
        totalRaised: 20_000,
        totalSupporters: 4,
        onboardingStatus: "enabled",
        createdAt: expect.any(Number),
        payoutsAwaiting: 1_000,
        payoutsSampled: false,
      });

      // Amount always comes from the creator balance, even when the pending
      // scan is partial; the unlock is the earliest pending entry.
      expect(detail.held.amount).toBe(8_000);
      expect(detail.held.nextSettlementAt).toBe(oldestPending + HOLD_MS);
      expect(detail.held.sampled).toBe(false);
      expect(detail.held.entries).toHaveLength(2);
      expect(detail.held.entries[0]).toMatchObject({
        _id: expect.any(String),
        type: "donation",
        amount: 9_000,
        currency: "NGN",
        createdAt: oldestPending,
        settlesAt: oldestPending + HOLD_MS,
        note: "first pending",
      });
      expect(detail.held.entries[1].settlesAt).toBe(newerPending + HOLD_MS);

      expect(detail.recentDonations.map((row) => row.reference)).toEqual([
        "don_1",
        "don_2",
      ]);
      expect(detail.recentDonations[1]).toMatchObject({
        supporterName: "Sam Supporter",
        supporterEmail: "sam@test.com",
        amount: 5_000,
        currency: "NGN",
        status: "paid",
        paidAt: now - 9 * HOUR_MS,
      });

      expect(detail.recentPayouts.map((row) => row.status)).toEqual([
        "requested",
        "requested",
        "paid",
      ]);
      expect(detail.recentPayouts[0]).toMatchObject({
        amount: 1_000,
        currency: "NGN",
        method: "manual",
        requestedAt: now - 8 * HOUR_MS,
      });
      expect(detail.recentPayouts[1]).toMatchObject({
        amount: 700,
        currency: "USD",
        status: "requested",
      });

      expect(detail.recentLedger.map((row) => row.type)).toEqual([
        "fee",
        "donation",
        "payout",
        "donation",
      ]);
      expect(detail.recentLedger[2]).toMatchObject({
        amount: -1_000,
        settlementStatus: "settled",
        note: "Payout requested",
      });
    });
  });

  it("returns not_found for a missing creator", async () => {
    const t = makeTest();
    const adminId = await makeAdmin(t);
    const userId = await makeUser(t, "gone@test.com", "Gone");
    const creatorId = await makeCreator(t, userId, { username: "gone" });
    await t.run(async (ctx) => ctx.db.delete("creators", creatorId));

    await withEnv(ENV, async () => {
      await expect(
        forUser(t, adminId).query(api.adminTelemetry.creatorDetail, {
          creatorId,
        }),
      ).rejects.toMatchObject({ data: { code: "not_found" } });
    });
  });
});

describe("admin.listCreators telemetry fields", () => {
  it("appends nextSettlementAt and payoutsAwaiting without dropping existing fields", async () => {
    const t = makeTest();
    const now = Date.now();
    const adminId = await makeAdmin(t);

    const userA = await makeUser(t, "ada@test.com", "Ada");
    const creatorA = await makeCreator(t, userA, {
      username: "ada",
      currency: "NGN",
      coffeePrice: 25_000,
      balancePending: 7_000,
      balanceAvailable: 2_000,
      balancePaidOut: 1_000,
      totalRaised: 20_000,
      totalSupporters: 4,
    });
    const userB = await makeUser(t, "bola@test.com", "Bola");
    const creatorB = await makeCreator(t, userB, {
      username: "bola",
      currency: "USD",
    });

    const pendingAt = now - 3 * HOUR_MS;
    await addLedger(t, [
      {
        creatorId: creatorA,
        type: "donation",
        amount: 8_000,
        currency: "NGN",
        settlementStatus: "pending",
        createdAt: pendingAt,
      },
      {
        creatorId: creatorB,
        type: "donation",
        amount: 4_000,
        currency: "USD",
        settlementStatus: "pending",
        createdAt: now - 5 * HOUR_MS,
      },
      {
        creatorId: creatorA,
        type: "donation",
        amount: 3_000,
        currency: "NGN",
        settlementStatus: "settled",
        createdAt: now - 7 * HOUR_MS,
        settledAt: now - 6 * HOUR_MS,
      },
    ]);

    await addPayout(t, {
      creatorId: creatorA,
      amount: 1_000,
      currency: "NGN",
      status: "requested",
      requestedAt: now - 4 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 500,
      currency: "NGN",
      status: "processing",
      requestedAt: now - 3 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 700,
      currency: "USD",
      status: "requested",
      requestedAt: now - 3 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorA,
      amount: 9_000,
      currency: "NGN",
      status: "paid",
      requestedAt: now - 2 * HOUR_MS,
    });
    await addPayout(t, {
      creatorId: creatorB,
      amount: 200,
      currency: "USD",
      status: "failed",
      requestedAt: now - 2 * HOUR_MS,
    });

    await withEnv(ENV, async () => {
      const rows = await forUser(t, adminId).query(
        api.admin.listCreators,
        {},
      );
      const rowA = rows.find((row) => row._id === creatorA);
      const rowB = rows.find((row) => row._id === creatorB);

      expect(rowA).toMatchObject({
        _id: creatorA,
        username: "ada",
        displayName: "Ada",
        email: "ada@test.com",
        status: "active",
        currency: "NGN",
        breadPrice: 25_000,
        totalRaised: 20_000,
        totalSupporters: 4,
        balancePending: 7_000,
        balanceAvailable: 2_000,
        balancePaidOut: 1_000,
        onboardingStatus: "not_started",
        nextSettlementAt: pendingAt + HOLD_MS,
        payoutsAwaiting: 1_500,
      });
      expect(rowA?.createdAt).toBeTypeOf("number");

      expect(rowB).toMatchObject({
        nextSettlementAt: now - 5 * HOUR_MS + HOLD_MS,
        payoutsAwaiting: 0,
      });
    });
  });
});
