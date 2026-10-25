/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import { appErrorCode, appErrorRetryAfterMs } from "../lib/errors";
import { MESSAGE_MAX_LENGTH } from "../lib/validation";
import {
  forUser,
  makeCreatorWithUser,
  makeTest,
  withEnv,
} from "./helpers.test-utils";

const VALID = {
  username: "ada",
  quantity: 2,
  supporterName: "Sam Supporter",
  supporterEmail: "sam@test.com",
  isPrivate: false,
};

async function expectRateLimited(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(appErrorCode(error)).toBe("rate_limited");
    const retryAfterMs = appErrorRetryAfterMs(error);
    expect(retryAfterMs).not.toBeNull();
    expect(retryAfterMs ?? 0).toBeGreaterThan(0);
    return;
  }
  throw new Error("Expected rate_limited but the call succeeded");
}

describe("simulated end-to-end donation", () => {
  it("creates a checkout, completes it and exposes a paid reference", async () => {
    const t = makeTest();
    const { userId, creatorId } = await makeCreatorWithUser(t, {
      username: "ada",
      coffeePrice: 50_000,
    });

    const mode = await t.query(api.payments.mode, {});
    expect(mode.driver).toBe("simulated");
    expect(mode.checkoutReady).toBe(true);
    expect(mode.connectEnabled).toBe(false);
    expect(mode.platformFeeBps).toBe(500);

    const result = await t.action(api.donations.createCheckout, {
      ...VALID,
      username: "  Ada  ",
      supporterName: "  Sam Supporter  ",
      supporterEmail: "  Sam@Test.COM  ",
      message: "  Keep going!  ",
    });
    expect(result.status).toBe("redirect");
    if (result.status !== "redirect") throw new Error("expected a redirect result");
    expect(result.reference).toMatch(/^a4b_/);
    expect(result.url).toContain("/simulated-checkout");
    expect(result.url).toContain(encodeURIComponent(result.reference));

    const donation = await t.run(async (ctx) =>
      ctx.db
        .query("donations")
        .withIndex("by_reference", (q) => q.eq("reference", result.reference))
        .unique(),
    );
    expect(donation?.creatorId).toBe(creatorId);
    expect(donation?.status).toBe("pending");
    expect(donation?.driver).toBe("simulated");
    expect(donation?.checkoutId).toBe(`sim_${result.reference}`);
    expect(donation?.quantity).toBe(2);
    expect(donation?.amount).toBe(100_000);
    expect(donation?.platformFee).toBe(5_000);
    expect(donation?.netAmount).toBe(95_000);
    expect(donation?.currency).toBe("NGN");
    expect(donation?.supporterName).toBe("Sam Supporter");
    expect(donation?.supporterEmail).toBe("sam@test.com");
    expect(donation?.message).toBe("Keep going!");

    const pending = await t.query(api.donations.getByReference, {
      reference: result.reference,
    });
    expect(pending?.status).toBe("pending");
    expect(pending?.creator).toEqual({ username: "ada", displayName: "Ada" });
    expect(await t.query(api.donations.getByReference, { reference: "a4b_missing" })).toBeNull();

    const completion = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: result.reference,
      outcome: "paid",
    });
    expect(completion).toEqual({ ok: true, outcome: "processed" });

    const paid = await t.query(api.donations.getByReference, { reference: result.reference });
    expect(paid?.status).toBe("paid");
    expect(paid?.amount).toBe(100_000);
    expect(paid?.quantity).toBe(2);
    expect(paid?.paidAt).toBeTypeOf("number");

    // Double-click safety: the deterministic event id dedupes.
    const again = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: result.reference,
      outcome: "paid",
    });
    expect(again).toEqual({ ok: false, outcome: "duplicate" });

    const stats = await forUser(t, userId).query(api.donations.getMyStats, {});
    expect(stats.currency).toBe("NGN");
    expect(stats.totals).toEqual({ raised: 100_000, supporters: 1 });
    expect(stats.balances).toEqual({ pending: 95_000, available: 0, paidOut: 0 });
    expect(stats.counts).toEqual({
      paid: 1,
      pending: 0,
      unresolved: 0,
      refunded: 0,
      abandoned: 0,
      truncated: false,
    });

    const page = await forUser(t, userId).query(api.donations.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].status).toBe("paid");
    expect(page.page[0].netAmount).toBe(95_000);

    const publicPage = await t.query(api.creators.getByUsername, { username: "ada" });
    expect(publicPage.creator?.totalRaised).toBe(100_000);
    expect(publicPage.creator?.totalSupporters).toBe(1);
    expect(publicPage.recentDonations).toHaveLength(1);
    expect(publicPage.recentDonations[0].supporterName).toBe("Sam Supporter");
  });

  it("marks failed and expired simulated checkouts unresolved", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const first = await t.action(api.donations.createCheckout, VALID);
    expect(first.status).toBe("redirect");
    const failed = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: first.reference,
      outcome: "failed",
    });
    expect(failed).toEqual({ ok: true, outcome: "processed" });
    expect(
      (await t.query(api.donations.getByReference, { reference: first.reference }))?.status,
    ).toBe("unresolved");

    const second = await t.action(api.donations.createCheckout, VALID);
    expect(second.status).toBe("redirect");
    const expired = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: second.reference,
      outcome: "expire",
    });
    expect(expired).toEqual({ ok: true, outcome: "processed" });
    expect(
      (await t.query(api.donations.getByReference, { reference: second.reference }))?.status,
    ).toBe("unresolved");
  });

  it("validates the checkout request and the creator status", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, {
      username: "ada",
      coffeePrice: 50_000,
    });

    await expect(
      t.action(api.donations.createCheckout, { ...VALID, username: "nobody" }),
    ).rejects.toMatchObject({ data: { code: "creator_not_found" } });

    await expect(
      t.action(api.donations.createCheckout, { ...VALID, supporterEmail: "not-an-email" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, { ...VALID, quantity: 0 }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, { ...VALID, quantity: 11 }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, { ...VALID, supporterName: "   " }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, {
        ...VALID,
        message: "x".repeat(MESSAGE_MAX_LENGTH + 1),
      }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await t.run(async (ctx) => ctx.db.patch("creators", creatorId, { status: "suspended" }));
    await expect(t.action(api.donations.createCheckout, VALID)).rejects.toMatchObject({
      data: { code: "creator_suspended" },
    });
  });

  it("rate limits repeated attempts from the same email", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const attempt = (supporterEmail: string) =>
      t.mutation(internal.donations.startCheckout, {
        username: "ada",
        quantity: 1,
        supporterName: "Flood",
        supporterEmail,
        isPrivate: false,
      });

    for (let index = 0; index < 5; index += 1) {
      const started = await attempt("flood@test.com");
      expect(started.driver).toBe("simulated");
    }
    await expectRateLimited(attempt("flood@test.com"));

    // A different supporter email is unaffected.
    const other = await attempt("someone-else@test.com");
    expect(other.reference).toMatch(/^a4b_/);
  });
});

describe("simulated checkout guardrails", () => {
  it("does not fall back to fake payments when the explicit opt-in is missing", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    await withEnv(
      { PAYMENTS_DRIVER: "simulated", ALLOW_SIMULATED: "", BACHS_API_KEY: "" },
      async () => {
        const mode = await t.query(api.payments.mode, {});
        expect(mode.driver).toBe("bachs");
        expect(mode.checkoutReady).toBe(false);

        await expect(t.action(api.donations.createCheckout, VALID)).rejects.toMatchObject({
          data: { code: "payments_unavailable" },
        });
        expect(await t.run(async (ctx) => ctx.db.query("donations").collect())).toHaveLength(0);
      },
    );
  });

  it("requires both values before the simulated driver is active", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    await withEnv(
      { PAYMENTS_DRIVER: "simulated", ALLOW_SIMULATED: "true", BACHS_API_KEY: "" },
      async () => {
        const mode = await t.query(api.payments.mode, {});
        expect(mode.driver).toBe("simulated");
        expect(mode.checkoutReady).toBe(true);
      },
    );
  });

  it("never allows simulated payments in a production-labelled deployment", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    await withEnv(
      {
        PAYMENTS_DRIVER: "simulated",
        ALLOW_SIMULATED: "true",
        BACHS_ENV: "production",
        BACHS_API_KEY: "",
      },
      async () => {
        const mode = await t.query(api.payments.mode, {});
        expect(mode.driver).toBe("bachs");
        expect(mode.checkoutReady).toBe(false);
      },
    );
  });
});

describe("simulated checkout edge cases", () => {
  it("rejects unknown references", async () => {
    const t = makeTest();
    await expect(
      t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
        reference: "a4b_missing",
        outcome: "paid",
      }),
    ).rejects.toMatchObject({ data: { code: "not_found" } });
  });

  it("keeps test isolation: fresh state per makeTest", async () => {
    const t = makeTest();
    const donations = await t.run(async (ctx) => ctx.db.query("donations").collect());
    expect(donations).toHaveLength(0);
  });
});
