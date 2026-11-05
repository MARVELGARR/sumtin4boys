/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import { appErrorCode, appErrorRetryAfterMs } from "../lib/errors";
import { MESSAGE_MAX_LENGTH } from "../lib/validation";
import {
  forUser,
  makeCreatorWithUser,
  makeTest,
  newRequestId,
  withEnv,
} from "./helpers.test-utils";

const VALID = {
  username: "ada",
  quantity: 2,
  supporterName: "Sam Supporter",
  supporterEmail: "sam@test.com",
  isPrivate: false,
  tipBps: 0,
  coverProcessingFee: true,
};

type CheckoutOverrides = Partial<typeof VALID> & {
  message?: string;
  attemptId?: string;
};

function checkoutArgs(overrides: CheckoutOverrides = {}) {
  return { ...VALID, attemptId: newRequestId(), ...overrides };
}

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

    const result = await t.action(api.donations.createCheckout, checkoutArgs({
      username: "  Ada  ",
      supporterName: "  Sam Supporter  ",
      supporterEmail: "  Sam@Test.COM  ",
      message: "  Keep going!  ",
    }));
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
    expect(donation?.platformTip).toBe(0);
    expect(donation?.totalCharged).toBe(100_000);
    expect(donation?.coverProcessingFee).toBe(true);
    expect(donation?.pricingVersion).toBeTypeOf("string");
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
    expect(stats.totals).toEqual({ raised: 100_000, paidSupports: 1 });
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

  it("adds an optional platform tip without changing the creator's bread", async () => {
    const t = makeTest();
    const { userId } = await makeCreatorWithUser(t, {
      username: "ada",
      coffeePrice: 50_000,
    });

    const result = await t.action(api.donations.createCheckout, checkoutArgs({
      quantity: 1,
      tipBps: 1_000,
      coverProcessingFee: true,
    }));
    expect(result.status).toBe("redirect");
    if (result.status !== "redirect") throw new Error("expected a redirect result");

    const donation = await t.run(async (ctx) =>
      ctx.db
        .query("donations")
        .withIndex("by_reference", (q) => q.eq("reference", result.reference))
        .unique(),
    );
    expect(donation?.amount).toBe(50_000);
    expect(donation?.platformFee).toBe(2_500);
    expect(donation?.platformTip).toBe(5_000);
    expect(donation?.totalCharged).toBe(55_000);
    expect(donation?.netAmount).toBe(47_500);

    await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: result.reference,
      outcome: "paid",
    });

    const stats = await forUser(t, userId).query(api.donations.getMyStats, {});
    expect(stats.totals).toEqual({ raised: 50_000, paidSupports: 1 });
    expect(stats.balances).toEqual({
      pending: 47_500,
      available: 0,
      paidOut: 0,
    });

    const platform = await t.run(async (ctx) =>
      ctx.db.query("platformLedgerEntries").collect(),
    );
    expect(platform.find((entry) => entry.type === "platform_tip")?.amount).toBe(5_000);
  });

  it("runs a full USD donation end to end with the USD fee split", async () => {
    const t = makeTest();
    const { userId } = await makeCreatorWithUser(t, {
      username: "ada",
      currency: "USD",
      coffeePrice: 500, // $5 per bread — the USD minimum bread price
    });

    const result = await t.action(api.donations.createCheckout, checkoutArgs({
      quantity: 2,
      tipBps: 1_000, // 10% platform tip
      coverProcessingFee: true,
    }));
    expect(result.status).toBe("redirect");
    if (result.status !== "redirect") throw new Error("expected a redirect result");

    const donation = await t.run(async (ctx) =>
      ctx.db
        .query("donations")
        .withIndex("by_reference", (q) => q.eq("reference", result.reference))
        .unique(),
    );
    expect(donation?.currency).toBe("USD");
    expect(donation?.amount).toBe(1_000); // 2 × $5
    expect(donation?.platformFee).toBe(100); // USD 10% — hits the $1 minimum exactly
    expect(donation?.netAmount).toBe(900); // $9 to the creator
    expect(donation?.platformTip).toBe(100);
    expect(donation?.tipBps).toBe(1_000);
    expect(donation?.totalCharged).toBe(1_100); // $11 = $10 bread + $1 tip
    expect(donation?.coverProcessingFee).toBe(true);

    const completion = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: result.reference,
      outcome: "paid",
    });
    expect(completion).toEqual({ ok: true, outcome: "processed" });

    const paid = await t.query(api.donations.getByReference, { reference: result.reference });
    expect(paid?.status).toBe("paid");
    expect(paid?.currency).toBe("USD");
    expect(paid?.amount).toBe(1_000);

    // Every ledger row for this creator is denominated in USD.
    const ledger = await t.run(async (ctx) => ctx.db.query("ledgerEntries").collect());
    expect(ledger).toHaveLength(2);
    for (const entry of ledger) expect(entry.currency).toBe("USD");
    expect(ledger.reduce((sum, entry) => sum + entry.amount, 0)).toBe(900);

    const platform = await t.run(async (ctx) =>
      ctx.db.query("platformLedgerEntries").collect(),
    );
    const feeEntry = platform.find((entry) => entry.type === "platform_fee");
    expect(feeEntry?.amount).toBe(100);
    expect(feeEntry?.currency).toBe("USD");
    const tipEntry = platform.find((entry) => entry.type === "platform_tip");
    expect(tipEntry?.amount).toBe(100);
    expect(tipEntry?.currency).toBe("USD");

    const stats = await forUser(t, userId).query(api.donations.getMyStats, {});
    expect(stats.currency).toBe("USD");
    expect(stats.totals).toEqual({ raised: 1_000, paidSupports: 1 });
    expect(stats.balances).toEqual({ pending: 900, available: 0, paidOut: 0 });

    const publicPage = await t.query(api.creators.getByUsername, { username: "ada" });
    expect(publicPage.creator?.currency).toBe("USD");
    expect(publicPage.creator?.totalRaised).toBe(1_000);
  });

  it("sends Bachs USD decimal strings for a USD creator's checkout payload", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, {
      username: "ada",
      currency: "USD",
      coffeePrice: 500,
    });

    const started = await t.mutation(internal.donations.startCheckout, {
      attemptId: newRequestId(),
      username: "ada",
      quantity: 2,
      supporterName: "Sam Supporter",
      supporterEmail: "usd-sam@test.com",
      isPrivate: false,
      tipBps: 1_000,
      coverProcessingFee: true,
    });

    expect(started.payload.currency).toBe("USD");
    expect(started.payload.amount).toBe("10.00"); // bread subtotal in dollars
    expect(started.payload.chargeAmount).toBe("11.00"); // + $1 tip
    expect(started.payload.platformFee).toBe("2.00"); // $1 platform fee + $1 tip
    expect(started.payload.platformTip).toBe("1.00");
    expect(started.payload.coverProcessingFee).toBe(true);
    expect(started.payload.idempotencyKey).toBe(`checkout_${started.reference}`);
  });

  it("marks failed and expired simulated checkouts unresolved", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const first = await t.action(api.donations.createCheckout, checkoutArgs());
    expect(first.status).toBe("redirect");
    const failed = await t.mutation(api.bachs.simulated.completeSimulatedCheckout, {
      reference: first.reference,
      outcome: "failed",
    });
    expect(failed).toEqual({ ok: true, outcome: "processed" });
    expect(
      (await t.query(api.donations.getByReference, { reference: first.reference }))?.status,
    ).toBe("unresolved");

    const second = await t.action(api.donations.createCheckout, checkoutArgs());
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
      t.action(api.donations.createCheckout, checkoutArgs({ username: "nobody" })),
    ).rejects.toMatchObject({ data: { code: "creator_not_found" } });

    await expect(
      t.action(api.donations.createCheckout, checkoutArgs({ supporterEmail: "not-an-email" })),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, checkoutArgs({ quantity: 0 })),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, checkoutArgs({ quantity: 11 })),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, checkoutArgs({ supporterName: "   " })),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      t.action(api.donations.createCheckout, checkoutArgs({
        message: "x".repeat(MESSAGE_MAX_LENGTH + 1),
      })),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await t.run(async (ctx) => ctx.db.patch("creators", creatorId, { status: "suspended" }));
    await expect(t.action(api.donations.createCheckout, checkoutArgs())).rejects.toMatchObject({
      data: { code: "creator_suspended" },
    });
  });

  it("rate limits repeated attempts from the same email", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const attempt = (supporterEmail: string) =>
      t.mutation(internal.donations.startCheckout, {
        attemptId: newRequestId(),
        username: "ada",
        quantity: 1,
        supporterName: "Flood",
        supporterEmail,
        isPrivate: false,
        tipBps: 0,
        coverProcessingFee: true,
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

        await expect(t.action(api.donations.createCheckout, checkoutArgs())).rejects.toMatchObject({
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
