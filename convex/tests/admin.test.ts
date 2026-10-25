/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import {
  eventId,
  forUser,
  getBalances,
  getCreator,
  makeCreatorWithUser,
  makeTest,
  makeUser,
  paidCheckoutState,
  seedDonation,
  withEnv,
} from "./helpers.test-utils";

describe("admin tooling", () => {
  it("recomputeCreatorBalances repairs drifted counters from the ledger", async () => {
    const t = makeTest();
    const { creatorId, userId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    await seedDonation(t, { creatorId, amount: 50_000, checkoutId });
    const processed = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: 1_000,
      source: "webhook",
      checkout: paidCheckoutState({
        checkoutId,
        amountMinor: 50_000,
        chargeId: eventId("py_ch"),
      }),
    });
    expect(processed.outcome).toBe("processed");

    // Simulate corrupted denormalized counters.
    await t.run(async (ctx) =>
      ctx.db.patch("creators", creatorId, { balancePending: 999_999, balanceAvailable: 123 }),
    );

    const adminId = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });
    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      const result = await forUser(t, adminId).mutation(api.admin.recomputeCreatorBalances, {
        creatorId,
      });
      expect(result).toEqual({
        pending: 47_500,
        available: 0,
        entriesScanned: 2,
        truncated: false,
      });

      const audit = await forUser(t, adminId).query(api.admin.listAuditLog, {});
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe("creator.balances.recompute");
      expect(audit[0].targetId).toBe(creatorId);
      expect(JSON.parse(audit[0].beforeJson ?? "null")).toEqual({
        balancePending: 999_999,
        balanceAvailable: 123,
        balancePaidOut: 0,
      });
      expect(JSON.parse(audit[0].afterJson ?? "null")).toEqual({
        balancePending: 47_500,
        balanceAvailable: 0,
        balancePaidOut: 0,
        entriesScanned: 2,
      });
    });

    expect(await getBalances(t, creatorId)).toEqual({
      pending: 47_500,
      available: 0,
      paidOut: 0,
    });

    // The creator-facing dashboard view reflects the repaired counters too.
    const mine = await forUser(t, userId).query(api.creators.getMyCreator, {});
    expect(mine.creator?.balancePending).toBe(47_500);
    expect(mine.creator?.balanceAvailable).toBe(0);
  });

  it("refuses to recompute from a truncated ledger and leaves balances untouched", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const adminId = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });

    await t.run(async (ctx) => {
      const now = Date.now();
      for (let index = 0; index < 5_001; index += 1) {
        await ctx.db.insert("ledgerEntries", {
          creatorId,
          type: "donation",
          amount: 1,
          currency: "NGN",
          settlementStatus: "pending",
          createdAt: now,
        });
      }
      await ctx.db.patch("creators", creatorId, {
        balancePending: 777,
        balanceAvailable: 888,
      });
    });

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await expect(
        forUser(t, adminId).mutation(api.admin.recomputeCreatorBalances, {
          creatorId,
        }),
      ).rejects.toMatchObject({ data: { code: "too_many_entries" } });

      const audit = await forUser(t, adminId).query(api.admin.listAuditLog, {});
      expect(audit).toHaveLength(0);
    });

    expect(await getBalances(t, creatorId)).toEqual({
      pending: 777,
      available: 888,
      paidOut: 0,
    });
  }, 60_000);

  it("gates admin queries and shows the audit trail to admins", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const adminId = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });
    const outsiderId = await makeUser(t, "outsider@test.com");

    await expect(t.query(api.admin.listCreators, {})).rejects.toMatchObject({
      data: { code: "unauthenticated" },
    });
    await expect(
      forUser(t, outsiderId).query(api.admin.listWebhookEvents, {}),
    ).rejects.toMatchObject({ data: { code: "forbidden" } });

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      const creators = await forUser(t, adminId).query(api.admin.listCreators, {});
      expect(creators).toHaveLength(1);
      expect(creators[0]._id).toBe(creatorId);
      expect(creators[0].email).toBe("creator@test.com");

      const events = await forUser(t, adminId).query(api.admin.listWebhookEvents, {});
      expect(events).toEqual([]);

      const operations = await forUser(t, adminId).query(api.admin.listApiOperations, {});
      expect(operations).toEqual([]);

      const audit = await forUser(t, adminId).query(api.admin.listAuditLog, {});
      expect(audit).toEqual([]);
    });
  });

  it("audits creator status changes with before and after state", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const adminId = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await forUser(t, adminId).mutation(api.admin.setCreatorStatus, {
        creatorId,
        status: "suspended",
      });

      const audit = await forUser(t, adminId).query(api.admin.listAuditLog, {});
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe("creator.status");
      expect(audit[0].targetId).toBe(creatorId);
      expect(JSON.parse(audit[0].beforeJson ?? "null")).toEqual({
        status: "active",
      });
      expect(JSON.parse(audit[0].afterJson ?? "null")).toEqual({
        status: "suspended",
      });
    });

    expect((await getCreator(t, creatorId)).status).toBe("suspended");
  });

  it("rejects an allow-listed email that has not been verified", async () => {
    const t = makeTest();
    const unverifiedAdmin = await makeUser(t, "admin@test.com", "Admin");

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      expect(
        await forUser(t, unverifiedAdmin).query(api.admin.amIAdmin, {}),
      ).toBe(false);
      await expect(
        forUser(t, unverifiedAdmin).query(api.admin.listCreators, {}),
      ).rejects.toMatchObject({ data: { code: "forbidden" } });
    });
  });
});
