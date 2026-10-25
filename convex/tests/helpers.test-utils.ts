/// <reference types="vite/client" />
/* eslint-disable @convex-dev/no-process-env -- test-only file: convex-test runs
   in-process; `process.env` is how specs configure the simulated deployment and
   multi-dot filenames are never bundled as Convex functions. */
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import schema from "../schema";
import type { Doc, Id } from "../_generated/dataModel";
import { fromMinorUnits } from "../lib/money";
import { MAX_QUANTITY } from "../lib/validation";

/**
 * Shared test helpers (multi-dot filename so the Convex bundler never deploys
 * it as a function module).
 */

const modules = import.meta.glob("../**/*.ts");

/** A fresh in-memory Convex backend with the rate-limiter component mounted. */
export function makeTest() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

export type Test = ReturnType<typeof makeTest>;

/** Insert a bare `users` row (the shape @convex-dev/auth expects). */
export async function makeUser(
  t: Test,
  email: string,
  name?: string,
  options: { emailVerified?: boolean } = {},
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      email,
      ...(name !== undefined ? { name } : {}),
      ...(options.emailVerified ? { emailVerificationTime: Date.now() } : {}),
    }),
  );
}

/** Insert a creator row directly, bypassing onboarding. */
export async function makeCreator(
  t: Test,
  userId: Id<"users">,
  overrides: Partial<Doc<"creators">> = {},
): Promise<Id<"creators">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("creators", {
      userId,
      username: "ada",
      displayName: "Ada",
      coffeePrice: 50_000,
      currency: "NGN",
      status: "active",
      balancePending: 0,
      balanceAvailable: 0,
      balancePaidOut: 0,
      totalRaised: 0,
      totalSupporters: 0,
      onboardingStatus: "not_started",
      createdAt: Date.now(),
      ...overrides,
    }),
  );
}

/** Creator + user in one step; returns both ids. */
export async function makeCreatorWithUser(
  t: Test,
  overrides: Partial<Doc<"creators">> = {},
): Promise<{ userId: Id<"users">; creatorId: Id<"creators"> }> {
  const userId = await makeUser(t, "creator@test.com", "Creator");
  const creatorId = await makeCreator(t, userId, overrides);
  return { userId, creatorId };
}

/** Sign-in identity that @convex-dev/auth's getAuthUserId resolves. */
export function forUser(t: Test, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

export async function getCreator(t: Test, creatorId: Id<"creators">) {
  const creator = await t.run(async (ctx) => ctx.db.get("creators", creatorId));
  if (!creator) throw new Error("creator missing");
  return creator;
}

export async function getBalances(t: Test, creatorId: Id<"creators">) {
  const creator = await getCreator(t, creatorId);
  return {
    pending: creator.balancePending,
    available: creator.balanceAvailable,
    paidOut: creator.balancePaidOut,
  };
}

export async function listLedger(t: Test, creatorId: Id<"creators">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("ledgerEntries")
      .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
      .collect(),
  );
}

export async function listEventsByEventId(t: Test, eventId: string) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect(),
  );
}

export interface SeedDonationInput {
  creatorId: Id<"creators">;
  amount?: number;
  quantity?: number;
  currency?: string;
  reference?: string;
  checkoutId?: string;
  status?: Doc<"donations">["status"];
  supporterEmail?: string;
  supporterName?: string;
  isPrivate?: boolean;
  createdAt?: number;
  nextReconcileAt?: number;
  reconcileAttempts?: number;
}

/**
 * Insert a donation row exactly like `donations.startCheckout` would, so the
 * event pipeline can be driven without touching the provider.
 */
export async function seedDonation(t: Test, input: SeedDonationInput) {
  const amount = input.amount ?? 50_000;
  const quantity = input.quantity ?? 1;
  const currency = input.currency ?? "NGN";
  const reference = input.reference ?? `a4b_test${Math.random().toString(16).slice(2)}`;
  const platformFee = Math.round((amount * 500) / 10_000);
  const donationId = await t.run(async (ctx) =>
    ctx.db.insert("donations", {
      creatorId: input.creatorId,
      supporterName: input.supporterName ?? "Sam Supporter",
      supporterEmail: input.supporterEmail ?? "sam@test.com",
      isPrivate: input.isPrivate ?? false,
      quantity,
      amount,
      platformFee,
      netAmount: amount - platformFee,
      currency,
      reference,
      driver: "simulated",
      checkoutId: input.checkoutId,
      status: input.status ?? "pending",
      createdAt: input.createdAt ?? Date.now(),
      reconcileAttempts: input.reconcileAttempts ?? 0,
      nextReconcileAt: input.nextReconcileAt,
    }),
  );
  return { donationId, reference, amount, platformFee, netAmount: amount - platformFee, currency };
}

/** The checkout state payload a `checkout.completed` webhook would deliver. */
export function paidCheckoutState(input: {
  checkoutId: string;
  amountMinor: number;
  currency?: string;
  reference?: string;
  chargeId?: string;
}) {
  return {
    checkoutId: input.checkoutId,
    status: "completed",
    paymentStatus: "paid",
    amount: fromMinorUnits(input.amountMinor, input.currency ?? "NGN"),
    currency: input.currency ?? "NGN",
    reference: input.reference,
    chargeId: input.chargeId,
  };
}

/** Stable, unique event ids per test run. */
export function eventId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Temporarily set env vars (read through convex/lib/config.ts at call time). */
export async function withEnv<T>(
  env: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

export { MAX_QUANTITY };
