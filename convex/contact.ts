import { v } from "convex/values";
import {
  internalAction,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { appError } from "./lib/errors";
import { requireAdmin } from "./lib/guards";
import { emailFrom, resendApiKey, supportEmail } from "./lib/config";
import { sendResendEmail } from "./lib/resend";
import { isValidEmail } from "./lib/validation";
import { rateLimiter } from "./rateLimit";

const NAME_MAX = 80;
const MESSAGE_MAX = 5_000;

const topicValidator = v.union(
  v.literal("support"),
  v.literal("creator"),
  v.literal("payment"),
  v.literal("press"),
  v.literal("other"),
);

const statusValidator = v.union(
  v.literal("new"),
  v.literal("read"),
  v.literal("archived"),
);

const messageValidator = v.object({
  _id: v.id("contactMessages"),
  _creationTime: v.number(),
  name: v.string(),
  email: v.string(),
  topic: topicValidator,
  message: v.string(),
  status: statusValidator,
  createdAt: v.number(),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Public contact form.
 *
 * A hidden `website` field is a honeypot: when it is filled we return the same
 * success response as a real submission, but write nothing and do not consume
 * a rate-limit token.
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    topic: topicValidator,
    message: v.string(),
    website: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.website?.trim()) return { ok: true };

    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const message = args.message.trim();

    if (name.length < 2 || name.length > NAME_MAX) {
      throw appError("invalid_input", "Add your name (2–80 characters).");
    }
    if (!isValidEmail(email)) {
      throw appError("invalid_input", "Enter a valid email address.");
    }
    if (message.length < 20 || message.length > MESSAGE_MAX) {
      throw appError(
        "invalid_input",
        "Tell us a little more — between 20 and 5,000 characters.",
      );
    }

    const emailLimit = await rateLimiter.limit(ctx, "contactPerEmail", {
      key: email,
    });
    if (!emailLimit.ok) {
      throw appError(
        "rate_limited",
        "You have sent a few messages already. Please wait before trying again.",
        { retryAfterMs: emailLimit.retryAfter },
      );
    }
    const globalLimit = await rateLimiter.limit(ctx, "contactGlobal", {
      key: "all",
    });
    if (!globalLimit.ok) {
      throw appError(
        "rate_limited",
        "The inbox is unusually busy. Please try again shortly.",
        { retryAfterMs: globalLimit.retryAfter },
      );
    }

    const messageId = await ctx.db.insert("contactMessages", {
      name,
      email,
      topic: args.topic,
      message,
      status: "new",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.contact.notify, { messageId });
    return { ok: true };
  },
});

/** Admin-only inbox. Full message bodies never leave this authorized query. */
export const listMessages = query({
  args: { status: v.optional(statusValidator) },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = args.status
      ? await ctx.db
          .query("contactMessages")
          .withIndex("by_status_createdAt", (q) =>
            q.eq("status", args.status!),
          )
          .order("desc")
          .take(200)
      : await ctx.db
          .query("contactMessages")
          .withIndex("by_createdAt")
          .order("desc")
          .take(200);
    return rows;
  },
});

export const setStatus = mutation({
  args: { messageId: v.id("contactMessages"), status: statusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get("contactMessages", args.messageId);
    if (!message) throw appError("not_found", "Message not found.");
    await ctx.db.patch("contactMessages", message._id, {
      status: args.status,
    });
    return null;
  },
});

/** Internal lookup used by the notification action. */
export const getMessage = internalQuery({
  args: { messageId: v.id("contactMessages") },
  returns: v.union(messageValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get("contactMessages", args.messageId);
  },
});

/**
 * Best-effort notification to the configured support inbox. If Resend or
 * SUPPORT_EMAIL is missing the message is still safely stored in the admin
 * inbox; a notification failure must never lose the submission.
 */
export const notify = internalAction({
  args: { messageId: v.id("contactMessages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = resendApiKey();
    const from = emailFrom();
    const to = supportEmail();
    if (!apiKey || !from || to === "no-reply@example.com") return null;

    const message = await ctx.runQuery(internal.contact.getMessage, {
      messageId: args.messageId,
    });
    if (!message) return null;

    try {
      await sendResendEmail({
        apiKey,
        from,
        to,
        subject: `[anything4boys] ${message.topic} message from ${message.name}`,
        text: `${message.name} <${message.email}> wrote:\n\n${message.message}\n\nOpen the admin inbox to reply.`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #090b0c;">
            <h1 style="font-size: 22px; margin: 0 0 8px;">New ${escapeHtml(message.topic)} message</h1>
            <p style="font-size: 14px; margin: 0 0 20px;">
              From <strong>${escapeHtml(message.name)}</strong>
              &lt;${escapeHtml(message.email)}&gt;
            </p>
            <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; padding: 16px; border-radius: 12px; background: #f4c45e33;">${escapeHtml(message.message)}</div>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Reply directly to the sender's email. This message is also stored in the admin inbox.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error("[contact] notification failed", error);
    }
    return null;
  },
});
