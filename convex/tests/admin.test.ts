/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import {
  eventId,
  forUser,
  getBalances,
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

    const adminId = await makeUser(t, "admin@test.com", "Admin");
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

  it("gates admin queries and shows the audit trail to admins", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const adminId = await makeUser(t, "admin@test.com", "Admin");
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
    });
  });
});
