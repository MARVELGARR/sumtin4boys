/**
 * Auth guards.
 *
 * Rule: never accept a user id (or creator id) as an argument for
 * authorization. Always derive identity from `ctx.auth` via these helpers.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { adminEmails } from "./config";
import { appError } from "./errors";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's id, or null. */
export async function currentUserId(ctx: Ctx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/** The signed-in user's id, or a thrown `unauthenticated` app error. */
export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw appError("unauthenticated", "You need to sign in to do that.");
  }
  return userId;
}

/** The signed-in user doc, or null. */
export async function currentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get("users", userId);
}

/** The signed-in user's creator profile, or null when they have none. */
export async function currentCreator(ctx: Ctx): Promise<Doc<"creators"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("creators")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/**
 * The signed-in creator, or thrown errors.
 * Throws `unauthenticated` when signed out, `not_a_creator` when the user
 * has not claimed a username yet.
 */
export async function requireCreator(
  ctx: Ctx,
): Promise<{ userId: Id<"users">; creator: Doc<"creators"> }> {
  const userId = await requireUserId(ctx);
  const creator = await ctx.db
    .query("creators")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (!creator) {
    throw appError("not_a_creator", "You do not have a creator page yet.");
  }
  return { userId, creator };
}

/** True when the signed-in user's email is in `ADMIN_EMAILS`. */
export async function isAdmin(ctx: Ctx): Promise<boolean> {
  const user = await currentUser(ctx);
  if (!user?.email) return false;
  const allowList = adminEmails();
  return allowList.includes(user.email.toLowerCase());
}

/** Throws `forbidden` unless the signed-in user is an admin. */
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get("users", userId);
  const allowList = adminEmails();
  if (!user?.email || !allowList.includes(user.email.toLowerCase())) {
    throw appError("forbidden", "This area is restricted.");
  }
  return user;
}

/** Display name fallback for new creators, derived from the user doc. */
export function defaultDisplayName(user: Doc<"users"> | null, username: string): string {
  const name = user?.name?.trim();
  if (name) return name.slice(0, 60);
  const email = user?.email;
  if (email && email.includes("@")) {
    const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
    if (local) return local.slice(0, 60);
  }
  return username;
}
