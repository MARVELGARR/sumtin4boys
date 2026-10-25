/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import {
  eventId,
  makeCreatorWithUser,
  makeTest,
  seedDonation,
} from "./helpers.test-utils";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

describe("reconciliation queue", () => {
  it("bounds the queue to the 7-day window so old rows cannot starve newer ones", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();

    const old = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("old"),
      createdAt: now - 8 * DAY_MS,
      nextReconcileAt: 0,
    });
    const fresh = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("fresh"),
      createdAt: now - 2 * MINUTE_MS,
      nextReconcileAt: now - MINUTE_MS,
    });

    const due = await t.query(internal.donations.listStaleForReconcile, { now });
    expect(due.map((row) => row.donationId)).toContain(fresh.donationId);
    expect(due.map((row) => row.donationId)).not.toContain(old.donationId);
  });

  it("does not let a backlog of expired due rows starve a fresh row", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();

    for (let index = 0; index < 35; index += 1) {
      await seedDonation(t, {
        creatorId,
        checkoutId: eventId(`old_${index}`),
        createdAt: now - 8 * DAY_MS,
        nextReconcileAt: 0,
      });
    }
    const fresh = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("fresh"),
      createdAt: now - 2 * MINUTE_MS,
      nextReconcileAt: now - MINUTE_MS,
    });

    const due = await t.query(internal.donations.listStaleForReconcile, { now });
    expect(due.map((row) => row.donationId)).toContain(fresh.donationId);
  });

  it("keeps discovering legacy rows beyond the first 120 after earlier ones are queued", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();

    const rows = [];
    for (let index = 0; index < 121; index += 1) {
      rows.push(
        await seedDonation(t, {
          creatorId,
          checkoutId: eventId(`legacy_${index}`),
          createdAt: now - 3 * MINUTE_MS + index,
        }),
      );
    }
    const last = rows[rows.length - 1];

    for (let page = 0; page < 2; page += 1) {
      const batch = await t.query(internal.donations.listStaleForReconcile, { now });
      expect(batch.length).toBeGreaterThan(0);
      for (const row of batch) {
        await t.mutation(internal.donations.markReconcileAttempt, {
          donationId: row.donationId,
          now,
        });
      }
    }

    const third = await t.query(internal.donations.listStaleForReconcile, { now });
    expect(third.map((row) => row.donationId)).toContain(last.donationId);
  });

  it("moves rows past the window to the terminal abandoned state", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();
    const { donationId } = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("old"),
      createdAt: now - 8 * DAY_MS,
      nextReconcileAt: 0,
    });

    const result = await t.mutation(internal.donations.abandonStaleDonations, {
      now,
    });
    expect(result.abandoned).toBe(1);

    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("abandoned");
    expect(donation?.abandonedAt).toBe(now);
    expect(donation?.nextReconcileAt).toBeUndefined();
  });

  it("returns no-checkout rows instead of silently dropping the whole batch", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();

    for (let index = 0; index < 5; index += 1) {
      await seedDonation(t, {
        creatorId,
        reference: `a4b_no_checkout_${index}`,
        createdAt: now - 2 * MINUTE_MS,
        nextReconcileAt: now - MINUTE_MS,
      });
    }
    const withCheckout = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("ch"),
      createdAt: now - MINUTE_MS,
      nextReconcileAt: now - MINUTE_MS,
    });

    const due = await t.query(internal.donations.listStaleForReconcile, { now });
    expect(due).toHaveLength(6);
    expect(due.some((row) => row.checkoutId === undefined)).toBe(true);
    expect(due.map((row) => row.donationId)).toContain(withCheckout.donationId);
  });

  it("backs off after each attempt so the same row does not monopolise the batch", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const now = Date.now();
    const { donationId } = await seedDonation(t, {
      creatorId,
      checkoutId: eventId("ch"),
      createdAt: now - MINUTE_MS,
      nextReconcileAt: now - MINUTE_MS,
    });

    const first = await t.mutation(internal.donations.markReconcileAttempt, {
      donationId,
      now,
    });
    expect(first.attempts).toBe(1);
    expect(first.nextReconcileAt).toBeGreaterThan(now);

    const second = await t.mutation(internal.donations.markReconcileAttempt, {
      donationId,
      now: first.nextReconcileAt,
    });
    expect(second.attempts).toBe(2);
    // Exponential backoff: the second gap is longer than the first.
    expect(second.nextReconcileAt - first.nextReconcileAt).toBeGreaterThan(
      first.nextReconcileAt - now,
    );

    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.reconcileAttempts).toBe(2);
    expect(donation?.lastReconciledAt).toBe(first.nextReconcileAt);
  });
});
