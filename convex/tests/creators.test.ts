/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import { MIN_COFFEE_PRICE_MINOR } from "../lib/validation";
import {
  forUser,
  makeCreatorWithUser,
  makeTest,
  makeUser,
  seedDonation,
} from "./helpers.test-utils";

describe("creators.claimUsername", () => {
  it("creates a creator with defaults and a normalized username", async () => {
    const t = makeTest();
    const userId = await makeUser(t, "creator@test.com", "Ada Lovelace");

    const result = await forUser(t, userId).mutation(api.creators.claimUsername, {
      username: "  AdaLovelace  ",
    });
    expect(result).toEqual({ username: "adalovelace" });

    const creator = await t.run(async (ctx) =>
      ctx.db
        .query("creators")
        .withIndex("by_username", (q) => q.eq("username", "adalovelace"))
        .unique(),
    );
    expect(creator).not.toBeNull();
    expect(creator?.userId).toBe(userId);
    expect(creator?.displayName).toBe("Ada Lovelace");
    expect(creator?.coffeePrice).toBe(MIN_COFFEE_PRICE_MINOR * 10);
    expect(creator?.currency).toBe("NGN");
    expect(creator?.status).toBe("active");
    expect(creator?.balancePending).toBe(0);
    expect(creator?.balanceAvailable).toBe(0);
    expect(creator?.balancePaidOut).toBe(0);
    expect(creator?.totalRaised).toBe(0);
    expect(creator?.totalSupporters).toBe(0);
    expect(creator?.onboardingStatus).toBe("not_started");

    const mine = await forUser(t, userId).query(api.creators.getMyCreator, {});
    expect(mine.viewer.email).toBe("creator@test.com");
    expect(mine.creator?.username).toBe("adalovelace");
    expect(mine.creator?.sellerConnected).toBe(false);
  });

  it("rejects a username another user already owns", async () => {
    const t = makeTest();
    const first = await makeUser(t, "first@test.com");
    const second = await makeUser(t, "second@test.com");
    await forUser(t, first).mutation(api.creators.claimUsername, { username: "ada" });

    await expect(
      forUser(t, second).mutation(api.creators.claimUsername, { username: "ADA" }),
    ).rejects.toMatchObject({ data: { code: "username_taken" } });
  });

  it("rejects a second claim by the same user", async () => {
    const t = makeTest();
    const userId = await makeUser(t, "creator@test.com");
    await forUser(t, userId).mutation(api.creators.claimUsername, { username: "ada" });

    await expect(
      forUser(t, userId).mutation(api.creators.claimUsername, { username: "ada2" }),
    ).rejects.toMatchObject({ data: { code: "already_a_creator" } });
  });

  it("requires authentication and a valid format", async () => {
    const t = makeTest();
    const userId = await makeUser(t, "creator@test.com");

    await expect(
      t.mutation(api.creators.claimUsername, { username: "ada" }),
    ).rejects.toMatchObject({ data: { code: "unauthenticated" } });

    await expect(
      forUser(t, userId).mutation(api.creators.claimUsername, { username: "ab" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      forUser(t, userId).mutation(api.creators.claimUsername, { username: "bad name" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    await expect(
      forUser(t, userId).mutation(api.creators.claimUsername, { username: "admin" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });
  });
});

describe("creators.checkUsername", () => {
  it("reports too_short, reserved, taken and available correctly", async () => {
    const t = makeTest();
    const { userId, creatorId } = await makeCreatorWithUser(t, { username: "ada" });

    expect(await t.query(api.creators.checkUsername, { username: "ab" })).toEqual({
      available: false,
      normalized: "ab",
      reason: "too_short",
    });
    expect(await t.query(api.creators.checkUsername, { username: "admin" })).toEqual({
      available: false,
      normalized: "admin",
      reason: "reserved",
    });
    expect(await t.query(api.creators.checkUsername, { username: "ADA" })).toEqual({
      available: false,
      normalized: "ada",
      reason: "taken",
    });
    expect(await t.query(api.creators.checkUsername, { username: " NewUser " })).toEqual({
      available: true,
      normalized: "newuser",
    });

    const creator = await t.run(async (ctx) => ctx.db.get("creators", creatorId));
    expect(creator?.userId).toBe(userId);
  });
});

describe("creators.getByUsername", () => {
  it("returns null for unknown usernames and only public paid donations", async () => {
    const t = makeTest();
    const { creatorId } = await makeCreatorWithUser(t, { username: "ada" });
    await seedDonation(t, {
      creatorId,
      status: "paid",
      amount: 50_000,
      supporterName: "Public Sam",
    });
    await seedDonation(t, {
      creatorId,
      status: "paid",
      amount: 30_000,
      supporterName: "Shy Sam",
      isPrivate: true,
    });
    await seedDonation(t, { creatorId, status: "pending", supporterName: "Unpaid" });

    const unknown = await t.query(api.creators.getByUsername, { username: "nobody" });
    expect(unknown).toEqual({ creator: null, recentDonations: [] });

    const page = await t.query(api.creators.getByUsername, { username: "ADA" });
    expect(page.creator?.username).toBe("ada");
    expect(page.creator?.currency).toBe("NGN");
    expect(page.recentDonations).toHaveLength(1);
    expect(page.recentDonations[0].supporterName).toBe("Public Sam");
  });
});
