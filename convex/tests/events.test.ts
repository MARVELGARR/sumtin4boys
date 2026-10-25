/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import { fromMinorUnits } from "../lib/money";
import {
  eventId,
  getBalances,
  getCreator,
  listEventsByEventId,
  listLedger,
  makeCreatorWithUser,
  makeTest,
  paidCheckoutState,
  seedDonation,
  type Test,
} from "./helpers.test-utils";

const FEE_BPS = 500;

describe("events pipeline — completion", () => {
  it("fulfils a paid checkout: donation, fee split, ledger, counters and audit row", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const amount = 50_000;
    const checkoutId = eventId("ch");
    const chargeId = eventId("py_ch");
    const { donationId, platformFee, netAmount } = await seedDonation(t, {
      creatorId,
      amount,
      checkoutId,
    });

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId }),
    });
    const setup = { creatorId, donationId, checkoutId, chargeId, amount, platformFee, netAmount };
    expect(result.outcome).toBe("processed");

    // platformFee = 500 bps of the gross amount.
    expect(setup.platformFee).toBe(Math.round((setup.amount * FEE_BPS) / 10_000));
    expect(setup.platformFee).toBe(2_500);
    expect(setup.netAmount).toBe(47_500);

    // Donation flipped to paid with provider ids recorded.
    const donation = await t.run(async (ctx) => ctx.db.get("donations", setup.donationId));
    expect(donation?.status).toBe("paid");
    expect(donation?.paidAt).toBeTypeOf("number");
    expect(donation?.paymentId).toBe(setup.chargeId);
    expect(donation?.checkoutId).toBe(setup.checkoutId);
    expect(donation?.platformFee).toBe(2_500);
    expect(donation?.netAmount).toBe(47_500);
    expect(donation?.lastEventAt).toBeTypeOf("number");

    // Ledger: gross credit + negative fee, both still pending settlement.
    const entries = await listLedger(t, setup.creatorId);
    expect(entries).toHaveLength(2);
    const donationEntry = entries.find((entry) => entry.type === "donation");
    const feeEntry = entries.find((entry) => entry.type === "fee");
    expect(donationEntry?.amount).toBe(setup.amount);
    expect(donationEntry?.settlementStatus).toBe("pending");
    expect(donationEntry?.donationId).toBe(setup.donationId);
    expect(feeEntry?.amount).toBe(-setup.platformFee);
    expect(feeEntry?.settlementStatus).toBe("pending");

    // Creator counters.
    const creator = await getCreator(t, setup.creatorId);
    expect(creator.balancePending).toBe(setup.netAmount);
    expect(creator.balanceAvailable).toBe(0);
    expect(creator.totalRaised).toBe(setup.amount);
    expect(creator.totalSupporters).toBe(1);

    // Audit trail.
    const creatorEvents = await t.run(async (ctx) =>
      ctx.db
        .query("webhookEvents")
        .withIndex("by_creator", (q) => q.eq("creatorId", setup.creatorId))
        .collect(),
    );
    expect(creatorEvents).toHaveLength(1);
    expect(creatorEvents[0].outcome).toBe("processed");
    expect(creatorEvents[0].type).toBe("checkout.completed");
    expect(creatorEvents[0].source).toBe("webhook");
    expect(creatorEvents[0].donationId).toBe(setup.donationId);
    expect(creatorEvents[0].checkoutId).toBe(setup.checkoutId);
    expect(creatorEvents[0].eventCreatedAt).toBeTypeOf("number");
    expect(creatorEvents[0].receivedAt).toBeTypeOf("number");
  });

  it("deduplicates a redelivered event id (no double credit)", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, { creatorId, amount: 50_000, checkoutId });
    const evtId = eventId("evt");

    const first = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_dup" }),
    });
    expect(first.outcome).toBe("processed");

    const second = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_dup" }),
    });
    expect(second.outcome).toBe("duplicate");
    expect(second.donationId).toBe(donationId);

    expect(await listLedger(t, creatorId)).toHaveLength(2);
    expect(await listEventsByEventId(t, evtId)).toHaveLength(1);
    const creator = await getCreator(t, creatorId);
    expect(creator.balancePending).toBe(47_500);
    expect(creator.totalSupporters).toBe(1);
  });

  it("ignores a different event id confirming an already-paid donation", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { amount } = await seedDonation(t, { creatorId, amount: 50_000, checkoutId });

    await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_1" }),
    });
    const again = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "collection.succeeded",
      eventCreatedAt: Date.now(),
      source: "reconcile",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_1" }),
    });

    expect(again.outcome).toBe("already_paid");
    expect(await listLedger(t, creatorId)).toHaveLength(2);
    const creator = await getCreator(t, creatorId);
    expect(creator.balancePending).toBe(47_500);
  });

  it("applies an older completion when the live checkout shows collected money", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, { creatorId, amount: 50_000, checkoutId });
    await t.run(async (ctx) =>
      ctx.db.patch("donations", donationId, { lastEventAt: 5_000_000 }),
    );

    const evtId = eventId("evt");
    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "collection.succeeded",
      eventCreatedAt: 4_999_999,
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_stale" }),
    });

    // The event timestamp is older, but the live state proves the money was
    // collected. Paid is monotonic and must beat the earlier unresolved state.
    expect(result.outcome).toBe("processed");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("paid");
    expect(donation?.lastEventAt).toBe(5_000_000);
    expect(await listLedger(t, creatorId)).toHaveLength(2);
    expect((await getBalances(t, creatorId)).pending).toBe(47_500);
    const rows = await listEventsByEventId(t, evtId);
    expect(rows).toHaveLength(1);
    expect(rows[0].outcome).toBe("processed");
  });

  it("still rejects a stale non-completion state change", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, { creatorId, amount: 50_000, checkoutId });
    await t.run(async (ctx) =>
      ctx.db.patch("donations", donationId, { lastEventAt: 5_000_000 }),
    );

    const evtId = eventId("evt");
    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.expired",
      eventCreatedAt: 4_999_999,
      source: "webhook",
      checkout: {
        checkoutId,
        status: "expired",
        amount: fromMinorUnits(amount, "NGN"),
        currency: "NGN",
      },
    });

    expect(result.outcome).toBe("stale");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("pending");
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("stale");
  });

  it("parks an amount mismatch and leaves the donation untouched", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, {
      creatorId,
      amount: 50_000,
      checkoutId,
    });

    const evtId = eventId("evt");
    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({
        checkoutId,
        amountMinor: amount + 100,
        chargeId: "py_ch_wrong",
      }),
    });

    expect(result.outcome).toBe("mismatch");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("pending");
    expect(donation?.paymentId).toBeUndefined();
    expect(await listLedger(t, creatorId)).toHaveLength(0);
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("mismatch");
  });

  it("does not record a completion whose live state shows no money yet", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, {
      creatorId,
      amount: 50_000,
      checkoutId,
    });
    const evtId = eventId("evt");

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: {
        checkoutId,
        status: "open",
        amount: fromMinorUnits(amount, "NGN"),
        currency: "NGN",
      },
    });

    expect(result.outcome).toBe("not_ready");
    // Deliberately not recorded, so the provider retry can process it later.
    expect(await listEventsByEventId(t, evtId)).toHaveLength(0);
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("pending");
  });

  it("records an unmatched checkout without touching money", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const evtId = eventId("evt");

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "checkout.completed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: paidCheckoutState({
        checkoutId: "ch_unknown",
        amountMinor: 50_000,
        chargeId: "py_ch_unknown",
      }),
    });

    expect(result.outcome).toBe("unmatched");
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("unmatched");
    expect(await listLedger(t, creatorId)).toHaveLength(0);
  });
});

describe("events pipeline — expiry and failure", () => {
  it("marks an expired checkout unresolved, and a later success still pays it", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, {
      creatorId,
      amount: 50_000,
      checkoutId,
    });

    const expired = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.expired",
      eventCreatedAt: 1_000,
      source: "webhook",
      checkout: {
        checkoutId,
        status: "expired",
        amount: fromMinorUnits(amount, "NGN"),
        currency: "NGN",
      },
    });
    expect(expired.outcome).toBe("processed");
    let donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("unresolved");
    expect(await listLedger(t, creatorId)).toHaveLength(0);

    // "unresolved" is not final: a later paid event fulfils the donation.
    const paid = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: 2_000,
      source: "reconcile",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId: "py_ch_late" }),
    });
    expect(paid.outcome).toBe("processed");
    donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("paid");
    expect((await getBalances(t, creatorId)).pending).toBe(47_500);
  });

  it("marks an underpaid collection unresolved", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, {
      creatorId,
      amount: 50_000,
      checkoutId,
    });

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "collection.underpaid",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: {
        checkoutId,
        status: "open",
        paymentStatus: "partially_paid",
        amount: fromMinorUnits(amount, "NGN"),
        currency: "NGN",
      },
    });

    expect(result.outcome).toBe("processed");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("unresolved");
    expect(await listLedger(t, creatorId)).toHaveLength(0);
  });

  it("records a failed collection attempt without changing status", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const { donationId, amount } = await seedDonation(t, {
      creatorId,
      amount: 50_000,
      checkoutId,
    });
    const evtId = eventId("evt");

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "collection.failed",
      eventCreatedAt: Date.now(),
      source: "webhook",
      checkout: {
        checkoutId,
        status: "open",
        paymentStatus: "failed",
        amount: fromMinorUnits(amount, "NGN"),
        currency: "NGN",
      },
    });

    expect(result.outcome).toBe("ignored");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("pending");
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("ignored");
  });
});

describe("events pipeline — refunds", () => {
  async function paidDonation(t: Test, amount = 50_000) {
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const checkoutId = eventId("ch");
    const chargeId = eventId("py_ch");
    const { donationId } = await seedDonation(t, { creatorId, amount, checkoutId });
    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "checkout.completed",
      eventCreatedAt: 1_000,
      source: "webhook",
      checkout: paidCheckoutState({ checkoutId, amountMinor: amount, chargeId }),
    });
    expect(result.outcome).toBe("processed");
    return { creatorId, donationId, chargeId, amount };
  }

  it("fully refunds a paid donation and reverses the fee", async () => {
    const t = makeTest();
    const { creatorId, donationId, chargeId, amount } = await paidDonation(t, 50_000);
    const platformFee = 2_500;

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "refund.paid",
      eventCreatedAt: 2_000,
      source: "webhook",
      refund: { chargeId },
    });
    expect(result.outcome).toBe("processed");

    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("refunded");
    expect(donation?.lastEventAt).toBe(2_000);

    const entries = await listLedger(t, creatorId);
    expect(entries).toHaveLength(4);
    const byType = new Map(entries.map((entry) => [entry.type, entry]));
    expect(byType.get("refund")?.amount).toBe(-amount);
    expect(byType.get("refund")?.settlementStatus).toBe("settled");
    expect(byType.get("fee_reversal")?.amount).toBe(platformFee);
    expect(byType.get("fee_reversal")?.settlementStatus).toBe("settled");
    // The original pending donation/fee entries were settled in the same
    // transaction, so nothing is left stranded in pending.
    expect(byType.get("donation")?.settlementStatus).toBe("settled");
    expect(byType.get("fee")?.settlementStatus).toBe("settled");

    const creator = await getCreator(t, creatorId);
    expect(creator.balancePending).toBe(0);
    expect(creator.balanceAvailable).toBe(0);
    expect(creator.totalRaised).toBe(0);
    expect(creator.totalSupporters).toBe(0);
  });

  it("records a partial refund for manual review without moving money", async () => {
    const t = makeTest();
    const { creatorId, donationId, chargeId, amount } = await paidDonation(t, 50_000);
    const evtId = eventId("evt");

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "refund.paid",
      eventCreatedAt: 2_000,
      source: "webhook",
      refund: { chargeId, refundedAmount: fromMinorUnits(amount / 2, "NGN") },
    });

    expect(result.outcome).toBe("partial_refund");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("paid");
    expect(await listLedger(t, creatorId)).toHaveLength(2);
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("partial_refund");
  });

  it("ignores a refund for a donation that was never paid", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    const chargeId = eventId("py_ch");
    const { donationId } = await seedDonation(t, { creatorId, amount: 50_000 });
    await t.run(async (ctx) => ctx.db.patch("donations", donationId, { paymentId: chargeId }));

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: eventId("evt"),
      eventType: "refund.paid",
      eventCreatedAt: Date.now(),
      source: "webhook",
      refund: { chargeId },
    });

    expect(result.outcome).toBe("ignored");
    const donation = await t.run(async (ctx) => ctx.db.get("donations", donationId));
    expect(donation?.status).toBe("pending");
    expect(await listLedger(t, creatorId)).toHaveLength(0);
  });

  it("records no_donation for a refund whose charge is unknown", async () => {
    const t = makeTest();
    const evtId = eventId("evt");

    const result = await t.mutation(internal.bachs.events.processCheckoutEvent, {
      eventId: evtId,
      eventType: "refund.paid",
      eventCreatedAt: Date.now(),
      source: "webhook",
      refund: { chargeId: "py_ch_ghost" },
    });

    expect(result.outcome).toBe("no_donation");
    expect((await listEventsByEventId(t, evtId))[0].outcome).toBe("no_donation");
  });
});
