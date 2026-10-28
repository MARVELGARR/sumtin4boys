/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import {
  makeCreatorWithUser,
  makeTest,
  newRequestId,
} from "./helpers.test-utils";

const BASE = {
  username: "ada",
  quantity: 2,
  supporterName: "Sam Supporter",
  supporterEmail: "sam@test.com",
  isPrivate: false,
  tipBps: 0,
  coverProcessingFee: true,
};

describe("checkout attempt idempotency", () => {
  it("returns the existing checkout for a duplicate attempt", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const attemptId = newRequestId();
    const args = { ...BASE, attemptId };

    const first = await t.action(api.donations.createCheckout, args);
    const second = await t.action(api.donations.createCheckout, args);

    if (first.status !== "redirect" || second.status !== "redirect") {
      throw new Error("expected both calls to return a checkout redirect");
    }
    expect(second.reference).toBe(first.reference);
    expect(second.url).toBe(first.url);

    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(1);
    expect(donations[0].attemptId).toBe(attemptId);
    expect(donations[0].checkoutUrl).toBe(first.url);

    const operations = await t.run(async (ctx) =>
      ctx.db.query("apiOperations").collect(),
    );
    expect(
      operations.filter((operation) => operation.kind === "checkout.create"),
    ).toHaveLength(1);
  });

  it("rejects reusing an attempt with different checkout details", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const attemptId = newRequestId();
    const first = await t.action(api.donations.createCheckout, {
      ...BASE,
      attemptId,
    });
    expect(first.status).toBe("redirect");

    await expect(
      t.action(api.donations.createCheckout, {
        ...BASE,
        attemptId,
        quantity: 3,
      }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(1);
    expect(donations[0].quantity).toBe(2);
  });

  it("serializes concurrent requests with the same attempt", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const args = { ...BASE, attemptId: newRequestId() };
    const [first, second] = await Promise.all([
      t.mutation(internal.donations.startCheckout, args),
      t.mutation(internal.donations.startCheckout, args),
    ]);

    expect(second.reference).toBe(first.reference);
    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(1);
  });

  it("does not spend another rate-limit token on a duplicate attempt", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada", coffeePrice: 50_000 });

    const attemptId = newRequestId();
    const args = { ...BASE, attemptId };
    await t.action(api.donations.createCheckout, args);
    await t.action(api.donations.createCheckout, args);

    // The duplicate above must not consume the per-email bucket. Four more
    // distinct attempts fill the remaining capacity (5 total), so the next one
    // is rate limited.
    for (let index = 0; index < 4; index += 1) {
      await t.action(api.donations.createCheckout, {
        ...BASE,
        attemptId: newRequestId(),
      });
    }

    await expect(
      t.action(api.donations.createCheckout, {
        ...BASE,
        attemptId: newRequestId(),
      }),
    ).rejects.toMatchObject({ data: { code: "rate_limited" } });

    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(5);
  });
});
