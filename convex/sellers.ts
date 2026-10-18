import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { appUrl, connectEnabled } from "./lib/config";
import { appError } from "./lib/errors";
import { requireCreator } from "./lib/guards";

/**
 * Connect mode: creator (seller) accounts on Bachs.
 *
 * Only active when the deployment has `CONNECT_ENABLED=true` and the platform
 * account has the Bachs `connect` capability. Creators click "Set up
 * payouts", get a hosted Bachs onboarding link, and once Bachs activates
 * their `transfers` + `payouts` capabilities their checkouts become
 * destination charges that pay them directly.
 *
 * Without Connect (the default), creators never see this flow.
 */

const onboardingStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("pending"),
  v.literal("enabled"),
  v.literal("blocked"),
);

export const getConnectStatus = query({
  args: {},
  returns: v.object({
    connectEnabled: v.boolean(),
    onboardingStatus: onboardingStatusValidator,
    sellerConnected: v.boolean(),
  }),
  handler: async (ctx) => {
    const { creator } = await requireCreator(ctx);
    return {
      connectEnabled: connectEnabled(),
      onboardingStatus: creator.onboardingStatus,
      sellerConnected: Boolean(creator.sellerAccountId),
    };
  },
});

/** Internal: creator row + contact email for the onboarding action. */
export const creatorForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      creatorId: v.id("creators"),
      username: v.string(),
      displayName: v.string(),
      sellerAccountId: v.union(v.string(), v.null()),
      contactEmail: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!creator) return null;
    const user = await ctx.db.get("users", args.userId);
    return {
      creatorId: creator._id,
      username: creator.username,
      displayName: creator.displayName,
      sellerAccountId: creator.sellerAccountId ?? null,
      contactEmail: user?.email ?? null,
    };
  },
});

export const attachSellerAccount = internalMutation({
  args: { creatorId: v.id("creators"), accountId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const creator = await ctx.db.get("creators", args.creatorId);
    if (!creator) return null;
    await ctx.db.patch("creators", creator._id, {
      sellerAccountId: args.accountId,
      onboardingStatus: "pending",
    });
    return null;
  },
});

export const applyAccountStatus = internalMutation({
  args: {
    accountId: v.string(),
    status: v.union(v.literal("pending"), v.literal("enabled"), v.literal("blocked")),
    detail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_sellerAccountId", (q) => q.eq("sellerAccountId", args.accountId))
      .unique();
    if (!creator) return null;
    await ctx.db.patch("creators", creator._id, { onboardingStatus: args.status });
    return null;
  },
});

/** Webhook side: re-read the account and sync its capability state. */
export const refreshAccountStatus = internalAction({
  args: { accountId: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const result = await ctx.runAction(
      internal.bachs.bachsNode.retrieveAccountStatus,
      { accountId: args.accountId },
    );
    if (!result.ok) return null;
    await ctx.runMutation(internal.sellers.applyAccountStatus, {
      accountId: args.accountId,
      status: result.status,
      detail: result.detail,
    });
    return null;
  },
});

/**
 * Creator-facing: create (once) the connected account and return a hosted
 * onboarding URL. Idempotent per creator: a second call reuses the account.
 */
export const startOnboarding = action({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx): Promise<{ url: string }> => {
    if (!connectEnabled()) {
      throw appError(
        "not_configured",
        "Direct payouts are not enabled on this deployment yet.",
      );
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw appError("unauthenticated", "You need to sign in to do that.");
    }
    const info = await ctx.runQuery(internal.sellers.creatorForUser, { userId });
    if (!info) {
      throw appError("not_a_creator", "You do not have a creator page yet.");
    }

    let accountId = info.sellerAccountId;
    if (!accountId) {
      if (!info.contactEmail) {
        throw appError("invalid_input", "Your account needs an email address first.");
      }
      const created = await ctx.runAction(
        internal.bachs.bachsNode.createConnectAccount,
        {
          displayName: info.displayName,
          contactEmail: info.contactEmail,
          // Deterministic key: a retry can never create a second account.
          idempotencyKey: `connect_account_${info.creatorId}`,
        },
      );
      if (!created.ok) {
        throw appError(
          "checkout_failed",
          created.outcomeUnknown
            ? "We couldn't reach Bachs. Please try again in a moment."
            : `Payment setup failed: ${created.message}`,
        );
      }
      accountId = created.accountId;
      await ctx.runMutation(internal.sellers.attachSellerAccount, {
        creatorId: info.creatorId,
        accountId,
      });
    }

    const link = await ctx.runAction(internal.bachs.bachsNode.createAccountLink, {
      accountId,
      refreshUrl: `${appUrl()}/dashboard/payouts?connect=refresh`,
      returnUrl: `${appUrl()}/dashboard/payouts?connect=done`,
    });
    if (!link.ok) {
      throw appError("checkout_failed", `Could not start hosted onboarding: ${link.message}`);
    }
    return { url: link.url };
  },
});
