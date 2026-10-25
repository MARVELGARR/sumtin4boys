/**
 * Minimal Resend client over `fetch` (no SDK dependency).
 *
 * Callers decide whether a missing key should fail closed (auth emails) or be
 * skipped (best-effort donation notifications).
 */

export type ResendEmailInput = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendResendEmail(args: ResendEmailInput): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend responded ${response.status}: ${body.slice(0, 300)}`);
  }
}
