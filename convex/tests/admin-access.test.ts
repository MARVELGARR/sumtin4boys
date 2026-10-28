/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  forUser,
  makeCreatorWithUser,
  makeTest,
  makeUser,
  withEnv,
  type Test,
} from "./helpers.test-utils";

/**
 * Security regression tests for the admin surface.
 *
 * Every privileged read must fail closed before touching data:
 * - signed out            -> `unauthenticated`
 * - signed in, not listed -> `forbidden`
 * - listed but unverified -> `forbidden`
 *
 * Only a verified email that is in ADMIN_EMAILS may read.
 */

type Client = Pick<Test, "query" | "mutation">;

type ReadCall = {
  name: string;
  run: (client: Client) => Promise<unknown>;
};

const READ_CALLS: ReadonlyArray<ReadCall> = [
  {
    name: "admin.listCreators",
    run: (client) => client.query(api.admin.listCreators, {}),
  },
  {
    name: "admin.listPayouts (all)",
    run: (client) => client.query(api.admin.listPayouts, {}),
  },
  {
    name: "admin.listPayouts (filtered)",
    run: (client) =>
      client.query(api.admin.listPayouts, { status: "requested" }),
  },
  {
    name: "admin.listWebhookEvents",
    run: (client) => client.query(api.admin.listWebhookEvents, {}),
  },
  {
    name: "admin.listApiOperations",
    run: (client) => client.query(api.admin.listApiOperations, {}),
  },
  {
    name: "admin.listAuditLog",
    run: (client) => client.query(api.admin.listAuditLog, {}),
  },
  {
    name: "contact.listMessages (all)",
    run: (client) => client.query(api.contact.listMessages, {}),
  },
  {
    name: "contact.listMessages (filtered)",
    run: (client) => client.query(api.contact.listMessages, { status: "new" }),
  },
];

async function expectReadsDenied(
  client: Client,
  code: "unauthenticated" | "forbidden",
) {
  for (const read of READ_CALLS) {
    await expect(
      read.run(client),
      `${read.name} should reject with ${code}`,
    ).rejects.toMatchObject({
      data: { code },
    });
  }
}

type Seeded = {
  adminId: Id<"users">;
  creatorId: Id<"creators">;
  payoutId: Id<"payouts">;
  messageId: Id<"contactMessages">;
};

/**
 * Seed one representative row per admin-readable table so the tests prove
 * admins actually receive data, not just an empty authorized result.
 */
async function seedAdminSurface(t: Test): Promise<Seeded> {
  const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
  const adminId = await makeUser(t, "admin@test.com", "Admin", {
    emailVerified: true,
  });

  const { payoutId, messageId } = await t.run(async (ctx) => {
    const payout = await ctx.db.insert("payouts", {
      creatorId,
      amount: 100_000,
      currency: "NGN",
      status: "requested",
      method: "manual",
      requestedAt: 1_000,
    });
    await ctx.db.insert("payouts", {
      creatorId,
      amount: 50_000,
      currency: "NGN",
      status: "paid",
      method: "manual",
      reference: "trf_previous",
      requestedAt: 2_000,
      processedAt: 3_000,
    });
    await ctx.db.insert("webhookEvents", {
      eventId: "evt_admin_access",
      type: "checkout.completed",
      source: "webhook",
      outcome: "processed",
      creatorId,
      eventCreatedAt: 1_000,
      receivedAt: 2_000,
    });
    await ctx.db.insert("apiOperations", {
      key: "op_admin_access",
      kind: "checkout.create",
      status: "succeeded",
      attempts: 1,
      createdAt: 1_000,
      updatedAt: 2_000,
    });
    await ctx.db.insert("adminAuditLogs", {
      actorUserId: adminId,
      action: "payout.paid",
      targetType: "payout",
      targetId: "payout_seed",
      metadata: "seed",
      createdAt: 3_000,
    });
    const message = await ctx.db.insert("contactMessages", {
      name: "Ada Supporter",
      email: "ada@example.com",
      topic: "support",
      message: "I sent a payment but the creator page still shows pending.",
      status: "new",
      createdAt: 4_000,
    });
    await ctx.db.insert("contactMessages", {
      name: "Grace Supporter",
      email: "grace@example.com",
      topic: "payment",
      message: "Please check my payout reference from yesterday.",
      status: "read",
      createdAt: 5_000,
    });
    return { payoutId: payout, messageId: message };
  });

  return { adminId, creatorId, payoutId, messageId };
}

describe("admin read authorization", () => {
  it("returns unauthenticated for every admin read when signed out", async () => {
    const t = makeTest();
    await seedAdminSurface(t);

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await expectReadsDenied(t, "unauthenticated");
    });
  });

  it("returns forbidden for a verified signed-in outsider", async () => {
    const t = makeTest();
    await seedAdminSurface(t);
    const outsiderId = await makeUser(t, "outsider@test.com", "Outsider", {
      emailVerified: true,
    });

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      await expectReadsDenied(forUser(t, outsiderId), "forbidden");
    });
  });

  it("returns forbidden for an allow-listed user whose email is unverified", async () => {
    const t = makeTest();
    await seedAdminSurface(t);
    const unverifiedAdminId = await makeUser(
      t,
      "unverified-admin@test.com",
      "Unverified Admin",
    );

    await withEnv(
      { ADMIN_EMAILS: "admin@test.com,unverified-admin@test.com" },
      async () => {
        await expectReadsDenied(forUser(t, unverifiedAdminId), "forbidden");
      },
    );
  });

  it("lets a verified allow-listed admin read each surface, including payout filters", async () => {
    const t = makeTest();
    const seeded = await seedAdminSurface(t);

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      const admin = forUser(t, seeded.adminId);

      const creators = await admin.query(api.admin.listCreators, {});
      expect(creators).toHaveLength(1);
      expect(creators[0]).toMatchObject({
        _id: seeded.creatorId,
        username: "ada",
        email: "creator@test.com",
      });

      const allPayouts = await admin.query(api.admin.listPayouts, {});
      expect(allPayouts).toHaveLength(2);

      const requested = await admin.query(api.admin.listPayouts, {
        status: "requested",
      });
      expect(requested).toHaveLength(1);
      expect(requested[0]).toMatchObject({
        _id: seeded.payoutId,
        status: "requested",
        creatorUsername: "ada",
      });

      const paid = await admin.query(api.admin.listPayouts, { status: "paid" });
      expect(paid).toHaveLength(1);
      expect(paid[0].status).toBe("paid");
      expect(paid[0].reference).toBe("trf_previous");

      const events = await admin.query(api.admin.listWebhookEvents, {});
      expect(events).toHaveLength(1);
      expect(events[0].eventId).toBe("evt_admin_access");

      const operations = await admin.query(api.admin.listApiOperations, {});
      expect(operations).toHaveLength(1);
      expect(operations[0].key).toBe("op_admin_access");

      const audit = await admin.query(api.admin.listAuditLog, {});
      expect(audit).toHaveLength(1);
      expect(audit[0].action).toBe("payout.paid");

      const messages = await admin.query(api.contact.listMessages, {});
      expect(messages).toHaveLength(2);

      const newMessages = await admin.query(api.contact.listMessages, {
        status: "new",
      });
      expect(newMessages).toHaveLength(1);
      expect(newMessages[0]._id).toBe(seeded.messageId);
      expect(newMessages[0].email).toBe("ada@example.com");
    });
  });
});

describe("admin status probe", () => {
  it("only reports true for a verified allow-listed admin", async () => {
    const t = makeTest();
    const adminId = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });
    const outsiderId = await makeUser(t, "outsider@test.com", "Outsider", {
      emailVerified: true,
    });
    const unverifiedAdminId = await makeUser(
      t,
      "unverified-admin@test.com",
      "Unverified Admin",
    );

    await withEnv(
      { ADMIN_EMAILS: "admin@test.com,unverified-admin@test.com" },
      async () => {
        expect(await t.query(api.admin.amIAdmin, {})).toBe(false);
        expect(
          await forUser(t, outsiderId).query(api.admin.amIAdmin, {}),
        ).toBe(false);
        expect(
          await forUser(t, unverifiedAdminId).query(api.admin.amIAdmin, {}),
        ).toBe(false);
        expect(await forUser(t, adminId).query(api.admin.amIAdmin, {})).toBe(
          true,
        );
      },
    );
  });
});

describe("admin mutation authorization", () => {
  it("rejects privileged mutations before they can read or write data", async () => {
    const t = makeTest();
    const seeded = await seedAdminSurface(t);
    const outsiderId = await makeUser(t, "outsider@test.com", "Outsider", {
      emailVerified: true,
    });
    const unverifiedAdminId = await makeUser(
      t,
      "unverified-admin@test.com",
      "Unverified Admin",
    );

    const mutations = [
      {
        name: "admin.setCreatorStatus",
        run: (client: Client) =>
          client.mutation(api.admin.setCreatorStatus, {
            creatorId: seeded.creatorId,
            status: "suspended",
          }),
      },
      {
        name: "admin.markPayoutPaid",
        run: (client: Client) =>
          client.mutation(api.admin.markPayoutPaid, {
            payoutId: seeded.payoutId,
            reference: "trf_attack",
          }),
      },
      {
        name: "admin.markPayoutFailed",
        run: (client: Client) =>
          client.mutation(api.admin.markPayoutFailed, {
            payoutId: seeded.payoutId,
            reason: "attack",
          }),
      },
      {
        name: "admin.recomputeCreatorBalances",
        run: (client: Client) =>
          client.mutation(api.admin.recomputeCreatorBalances, {
            creatorId: seeded.creatorId,
          }),
      },
      {
        name: "contact.setStatus",
        run: (client: Client) =>
          client.mutation(api.contact.setStatus, {
            messageId: seeded.messageId,
            status: "archived",
          }),
      },
    ];

    const actors = [
      { label: "signed out", client: t, code: "unauthenticated" as const },
      {
        label: "outsider",
        client: forUser(t, outsiderId),
        code: "forbidden" as const,
      },
      {
        label: "allow-listed unverified",
        client: forUser(t, unverifiedAdminId),
        code: "forbidden" as const,
      },
    ];

    await withEnv(
      { ADMIN_EMAILS: "admin@test.com,unverified-admin@test.com" },
      async () => {
        for (const actor of actors) {
          for (const mutation of mutations) {
            await expect(
              mutation.run(actor.client),
              `${mutation.name} should reject ${actor.label} with ${actor.code}`,
            ).rejects.toMatchObject({ data: { code: actor.code } });
          }
        }
      },
    );

    // Nothing was mutated by any rejected caller.
    const [creator, payout, message] = await t.run(async (ctx) =>
      Promise.all([
        ctx.db.get("creators", seeded.creatorId),
        ctx.db.get("payouts", seeded.payoutId),
        ctx.db.get("contactMessages", seeded.messageId),
      ]),
    );
    expect(creator?.status).toBe("active");
    expect(payout?.status).toBe("requested");
    expect(payout?.reference).toBeUndefined();
    expect(message?.status).toBe("new");
  });
});
