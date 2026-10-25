/**
 * Transactional emails for the Password provider.
 *
 * Convex Auth calls `sendVerificationRequest` for both email verification and
 * password reset. We use a 6-digit code (not a magic link) so users can finish
 * the flow in the same tab. Codes are generated with the platform CSPRNG and
 * expire after 15 minutes.
 *
 * Both flows fail closed when Resend/EMAIL_FROM are missing: silently
 * pretending an email was sent would strand users at the code screen.
 */

import { Email } from "@convex-dev/auth/providers/Email";
import { emailFrom, resendApiKey } from "./lib/config";
import { sendResendEmail } from "./lib/resend";

const CODE_TTL_SECONDS = 15 * 60;

function generateCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(value % 1_000_000).padStart(6, "0");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeProvider(args: {
  id: string;
  subject: string;
  heading: string;
  intro: string;
}) {
  return Email({
    id: args.id,
    name: "anything4boys",
    maxAge: CODE_TTL_SECONDS,
    normalizeIdentifier: (identifier) => identifier.trim().toLowerCase(),
    generateVerificationToken: async () => generateCode(),
    sendVerificationRequest: async ({ identifier, token, expires }) => {
      const apiKey = resendApiKey();
      const from = emailFrom();
      if (!apiKey || !from) {
        throw new Error(
          "Email sign-in is not configured. Set RESEND_API_KEY and EMAIL_FROM on the Convex deployment.",
        );
      }

      const safeCode = escapeHtml(token);
      const expiry = expires.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Lagos",
      });

      await sendResendEmail({
        apiKey,
        from,
        to: identifier,
        subject: args.subject,
        text: `${args.heading}\n\nYour code is ${token}. It expires at ${expiry} WAT.\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #090b0c;">
            <h1 style="font-size: 24px; margin: 0 0 12px;">${escapeHtml(args.heading)}</h1>
            <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">${escapeHtml(args.intro)}</p>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; padding: 18px 20px; background: #f4c45e33; border: 2px solid #090b0c1a; border-radius: 14px; text-align: center;">
              ${safeCode}
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 20px 0 0;">
              This code expires at ${escapeHtml(expiry)} WAT. If you did not request it, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  });
}

/** Used by `Password({ verify })` after sign-up and on unverified sign-in. */
export const resendOtp = makeProvider({
  id: "resend-otp",
  subject: "Your anything4boys verification code",
  heading: "Verify your email",
  intro: "Enter this code to finish setting up your anything4boys page.",
});

/** Used by `Password({ reset })` to authorize a password change. */
export const resendPasswordReset = makeProvider({
  id: "resend-password-reset",
  subject: "Reset your anything4boys password",
  heading: "Reset your password",
  intro: "Enter this code to choose a new password. Nobody can change it without it.",
});
