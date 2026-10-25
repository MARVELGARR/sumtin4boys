import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { appUrl, emailFrom, resendApiKey } from "./lib/config";
import { formatMoney } from "./lib/money";
import { sendResendEmail } from "./lib/resend";

/**
 * Email notifications.
 *
 * Uses Resend over plain `fetch` (no SDK). Without `RESEND_API_KEY` and
 * `EMAIL_FROM` configured, notifications are logged and skipped — payment
 * processing never depends on email delivery.
 *
 * Swap in any provider by editing `sendEmail` below.
 */

const receiptDataValidator = v.object({
  reference: v.string(),
  supporterEmail: v.string(),
  supporterName: v.string(),
  message: v.union(v.string(), v.null()),
  quantity: v.number(),
  amountLabel: v.string(),
  creatorUsername: v.string(),
  creatorDisplayName: v.string(),
  creatorEmail: v.union(v.string(), v.null()),
});

export const getNotificationData = internalQuery({
  args: { donationId: v.id("donations") },
  returns: v.union(v.null(), receiptDataValidator),
  handler: async (ctx, args) => {
    const donation = await ctx.db.get("donations", args.donationId);
    if (!donation || donation.status !== "paid") return null;
    const creator = await ctx.db.get("creators", donation.creatorId);
    if (!creator) return null;
    const user = await ctx.db.get("users", creator.userId);
    return {
      reference: donation.reference,
      supporterEmail: donation.supporterEmail,
      supporterName: donation.supporterName,
      message: donation.message ?? null,
      quantity: donation.quantity,
      amountLabel: formatMoney(donation.amount, donation.currency),
      creatorUsername: creator.username,
      creatorDisplayName: creator.displayName,
      creatorEmail: user?.email ?? null,
    };
  },
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const notifyDonationPaid = internalAction({
  args: { donationId: v.id("donations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.emails.getNotificationData, {
      donationId: args.donationId,
    });
    if (!data) return null;

    const apiKey = resendApiKey();
    const from = emailFrom();
    if (!apiKey || !from) {
      console.log(
        `[emails] RESEND_API_KEY / EMAIL_FROM not set — skipping notification for donation ${args.donationId}`,
      );
      return null;
    }

    const breadWord = data.quantity === 1 ? "bread" : "breads";
    const thanksUrl = `${appUrl()}/thanks?ref=${encodeURIComponent(data.reference)}`;
    const profileUrl = `${appUrl()}/${data.creatorUsername}`;

    try {
      await sendResendEmail({
        apiKey,
        from,
        to: data.supporterEmail,
        subject: `Your support for ${data.creatorDisplayName} is confirmed 🍞`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Thank you, ${escapeHtml(data.supporterName)}! 🍞</h2>
            <p>
              You tore <strong>${data.quantity} ${breadWord}</strong>
              (${escapeHtml(data.amountLabel)}) for
              <strong>@${escapeHtml(data.creatorUsername)}</strong>.
            </p>
            ${
              data.message
                ? `<blockquote style="border-left:3px solid #14b8a6;margin:16px 0;padding:8px 16px;color:#334155;">${escapeHtml(
                    data.message,
                  )}</blockquote>`
                : ""
            }
            <p>
              Reference: <code>${escapeHtml(data.reference)}</code><br />
              Status: <a href="${thanksUrl}">${thanksUrl}</a>
            </p>
            <p style="color:#64748b;font-size:12px;">
              Keep this reference — it is how you can check the payment status later.
            </p>
          </div>
        `,
      });

      if (data.creatorEmail) {
        await sendResendEmail({
          apiKey,
          from,
          to: data.creatorEmail,
          subject: `${data.supporterName} tore you ${data.quantity} ${breadWord}! 🍞`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>New support for @${escapeHtml(data.creatorUsername)}</h2>
              <p>
                <strong>${escapeHtml(data.supporterName)}</strong> tore
                <strong>${data.quantity} ${breadWord}</strong>
                (${escapeHtml(data.amountLabel)}).
              </p>
              ${
                data.message
                  ? `<blockquote style="border-left:3px solid #14b8a6;margin:16px 0;padding:8px 16px;color:#334155;">${escapeHtml(
                      data.message,
                    )}</blockquote>`
                  : ""
              }
              <p><a href="${profileUrl}">View your page</a> · <a href="${appUrl()}/dashboard">Open your dashboard</a></p>
            </div>
          `,
        });
      }
    } catch (error) {
      // Email is best-effort: log and move on. The donation is already paid.
      console.error("[emails] failed to send notification", error);
    }
    return null;
  },
});
