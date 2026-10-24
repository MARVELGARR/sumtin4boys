



import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { appError } from "./lib/errors";
import {
  currentCreator,
  currentUser,
  defaultDisplayName,
  requireCreator,
  requireUserId,
} from "./lib/guards";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_COFFEE_PRICE_MINOR,
  MIN_COFFEE_PRICE_MINOR,
  checkUsernameFormat,
  isSupportedCurrency,
  normalizeUsername,
} from "./lib/validation";

// ---------------------------------------------------------------------------
// Return validators (public shapes)
// ---------------------------------------------------------------------------

const publicCreatorValidator = v.object({
  username: v.string(),
  displayName: v.string(),
  bio: v.optional(v.string()),
  avatarUrl: v.union(v.string(), v.null()),
  coffeePrice: v.number(),
  currency: v.string(),
  goalAmount: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("suspended")),
  totalRaised: v.number(),
  totalSupporters: v.number(),
  createdAt: v.number(),
});

const publicDonationValidator = v.object({
  _id: v.id("donations"),
  supporterName: v.string(),
  message: v.optional(v.string()),
  quantity: v.number(),
  amount: v.number(),
  currency: v.string(),
  paidAt: v.optional(v.number()),
});

const myCreatorValidator = v.object({
  _id: v.id("creators"),
  username: v.string(),
  displayName: v.string(),
  bio: v.optional(v.string()),
  avatarUrl: v.union(v.string(), v.null()),
  coffeePrice: v.number(),
  currency: v.string(),
  goalAmount: v.optional(v.number()),
  status: v.union(v.literal("active"), v.literal("suspended")),
  createdAt: v.number(),
  balancePending: v.number(),
  balanceAvailable: v.number(),
  balancePaidOut: v.number(),
  totalRaised: v.number(),
  totalSupporters: v.number(),
  onboardingStatus: v.union(
    v.literal("not_started"),
    v.literal("pending"),
    v.literal("enabled"),
    v.literal("blocked"),
  ),
  /** True when a Bachs connected account id is attached (Connect mode). */
  sellerConnected: v.boolean(),
});

function usernameReasonMessage(
  reason: "too_short" | "too_long" | "invalid_characters" | "reserved",
): string {
  switch (reason) {
    case "too_short":
      return "Usernames need at least 3 characters.";
    case "too_long":
      return "Usernames can be at most 30 characters.";
    case "invalid_characters":
      return "Usernames can only contain lowercase letters, numbers and underscores.";
    case "reserved":
      return "That username is reserved. Try another one.";
  }
}

// ---------------------------------------------------------------------------
// Public page
// ---------------------------------------------------------------------------

/**
 * Everything the public creator page at `/{username}` needs.
 * Returns `creator: null` for unknown usernames so the page can render a
 * friendly 404 without throwing.
 */
export const getByUsername = query({
  args: { username: v.string() },
  returns: v.object({
    creator: v.union(publicCreatorValidator, v.null()),
    recentDonations: v.array(publicDonationValidator),
  }),
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    const creator = await ctx.db
      .query("creators")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!creator) {
      return { creator: null, recentDonations: [] };
    }
    const avatarUrl = creator.avatarStorageId
      ? await ctx.storage.getUrl(creator.avatarStorageId)
      : null;

    const paid = await ctx.db
      .query("donations")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", creator._id).eq("status", "paid"),
      )
      .order("desc")
      .take(50);
    const recentDonations = paid
      .filter((donation) => !donation.isPrivate && !donation.hidden)
      .slice(0, 20)
      .map((donation) => ({
        _id: donation._id,
        supporterName: donation.supporterName,
        message: donation.message,
        quantity: donation.quantity,
        amount: donation.amount,
        currency: donation.currency,
        paidAt: donation.paidAt,
      }));

    return {
      creator: {
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        avatarUrl,
        coffeePrice: creator.coffeePrice,
        currency: creator.currency,
        goalAmount: creator.goalAmount,
        status: creator.status,
        totalRaised: creator.totalRaised,
        totalSupporters: creator.totalSupporters,
        createdAt: creator.createdAt,
      },
      recentDonations,
    };
  },
});

/** Live availability check for the onboarding username picker. */
export const checkUsername = query({
  args: { username: v.string() },
  returns: v.object({
    available: v.boolean(),
    normalized: v.string(),
    reason: v.optional(
      v.union(
        v.literal("too_short"),
        v.literal("too_long"),
        v.literal("invalid_characters"),
        v.literal("reserved"),
        v.literal("taken"),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const normalized = normalizeUsername(args.username);
    const format = checkUsernameFormat(args.username);
    if (!format.ok) {
      return { available: false, normalized, reason: format.reason };
    }
    const existing = await ctx.db
      .query("creators")
      .withIndex("by_username", (q) => q.eq("username", format.username))
      .unique();
    if (existing) {
      return { available: false, normalized, reason: "taken" as const };
    }
    return { available: true, normalized };
  },
});

// ---------------------------------------------------------------------------
// Onboarding + profile management
// ---------------------------------------------------------------------------

/** Claim a username and create the creator profile. One per user. */
export const claimUsername = mutation({
  args: { username: v.string() },
  returns: v.object({ username: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("creators")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      throw appError("already_a_creator", "You already have a creator page.");
    }
    const format = checkUsernameFormat(args.username);
    if (!format.ok) {
      throw appError("invalid_input", usernameReasonMessage(format.reason));
    }
    const taken = await ctx.db
      .query("creators")
      .withIndex("by_username", (q) => q.eq("username", format.username))
      .unique();
    if (taken) {
      throw appError("username_taken", "That username is already taken.");
    }
    const user = await currentUser(ctx);
    await ctx.db.insert("creators", {
      userId,
      username: format.username,
      displayName: defaultDisplayName(user, format.username),
      coffeePrice: MIN_COFFEE_PRICE_MINOR * 10, // ₦1,000.00 default
      currency: "NGN",
      status: "active",
      balancePending: 0,
      balanceAvailable: 0,
      balancePaidOut: 0,
      totalRaised: 0,
      totalSupporters: 0,
      onboardingStatus: "not_started",
      createdAt: Date.now(),
    });
    return { username: format.username };
  },
});

/** The dashboard's view of the signed-in user + their creator profile. */
export const getMyCreator = query({
  args: {},
  returns: v.object({
    viewer: v.object({
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
    }),
    creator: v.union(myCreatorValidator, v.null()),
  }),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    const creator = await currentCreator(ctx);
    if (!creator) {
      return {
        viewer: { email: user?.email ?? null, name: user?.name ?? null },
        creator: null,
      };
    }
    const avatarUrl = creator.avatarStorageId
      ? await ctx.storage.getUrl(creator.avatarStorageId)
      : null;
    return {
      viewer: { email: user?.email ?? null, name: user?.name ?? null },
      creator: {
        _id: creator._id,
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        avatarUrl,
        coffeePrice: creator.coffeePrice,
        currency: creator.currency,
        goalAmount: creator.goalAmount,
        status: creator.status,
        createdAt: creator.createdAt,
        balancePending: creator.balancePending,
        balanceAvailable: creator.balanceAvailable,
        balancePaidOut: creator.balancePaidOut,
        totalRaised: creator.totalRaised,
        totalSupporters: creator.totalSupporters,
        onboardingStatus: creator.onboardingStatus,
        sellerConnected: Boolean(creator.sellerAccountId),
      },
    };
  },
});

/**
 * Update page settings. Only provided fields change; explicit `null` clears
 * `bio` and `goalAmount`.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.union(v.string(), v.null())),
    coffeePrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    goalAmount: v.optional(v.union(v.number(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { creator } = await requireCreator(ctx);

    if (args.displayName !== undefined) {
      const displayName = args.displayName.trim();
      if (displayName.length < 1 || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
        throw appError(
          "invalid_input",
          `Display name must be between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
        );
      }
      await ctx.db.patch("creators", creator._id, { displayName });
    }

    if (args.bio !== undefined) {
      if (args.bio === null) {
        await ctx.db.patch("creators", creator._id, { bio: undefined });
      } else {
        const bio = args.bio.trim();
        if (bio.length > BIO_MAX_LENGTH) {
          throw appError("invalid_input", `Bio can be at most ${BIO_MAX_LENGTH} characters.`);
        }
        await ctx.db.patch("creators", creator._id, { bio: bio.length > 0 ? bio : undefined });
      }
    }

    if (args.coffeePrice !== undefined) {
      const price = args.coffeePrice;
      if (
        !Number.isSafeInteger(price) ||
        price < MIN_COFFEE_PRICE_MINOR ||
        price > MAX_COFFEE_PRICE_MINOR
      ) {
        throw appError("invalid_input", "That coffee price is out of range.");
      }
      await ctx.db.patch("creators", creator._id, { coffeePrice: price });
    }

    if (args.currency !== undefined) {
      if (!isSupportedCurrency(args.currency)) {
        throw appError("invalid_input", "That currency is not supported yet.");
      }
      const currency = args.currency.toUpperCase();
      if (currency !== creator.currency) {
        // Switching currencies mid-flight would corrupt balances, so it is
        // only allowed before any donation exists.
        const anyDonation = await ctx.db
          .query("donations")
          .withIndex("by_creator", (q) => q.eq("creatorId", creator._id))
          .take(1);
        if (anyDonation.length > 0) {
          throw appError(
            "invalid_input",
            "You can't change your currency after your page has received donations.",
          );
        }
        await ctx.db.patch("creators", creator._id, { currency });
      }
    }

    if (args.goalAmount !== undefined) {
      if (args.goalAmount === null) {
        await ctx.db.patch("creators", creator._id, { goalAmount: undefined });
      } else {
        const goal = args.goalAmount;
        if (!Number.isSafeInteger(goal) || goal < MIN_COFFEE_PRICE_MINOR) {
          throw appError("invalid_input", "That goal amount is out of range.");
        }
        await ctx.db.patch("creators", creator._id, { goalAmount: goal });
      }
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Avatar (Convex file storage)
// ---------------------------------------------------------------------------

/** Step 1 of the avatar flow: get a one-shot upload URL. */
export const generateAvatarUploadUrl = mutation({
  args: {},
  returns: v.object({ url: v.string() }),
  handler: async (ctx) => {
    await requireCreator(ctx);
    const url = await ctx.storage.generateUploadUrl();
    return { url };
  },
});

/** Step 2: attach an uploaded file id to the creator profile. */
export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { creator } = await requireCreator(ctx);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw appError("invalid_input", "That upload could not be found. Try again.");
    }
    await ctx.db.patch("creators", creator._id, { avatarStorageId: args.storageId });
    return null;
  },
});

export const removeAvatar = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { creator } = await requireCreator(ctx);
    await ctx.db.patch("creators", creator._id, { avatarStorageId: undefined });
    return null;
  },
});
