/**
 * Central configuration reader.
 *
 * ALL environment access goes through this module. Functions import getters
 * from here instead of touching `env` directly, so there is exactly one place
 * to read (and document) how the app is configured per deployment.
 *
 * Variables are declared in `convex/convex.config.ts`; Convex generates the
 * typed `env` object.
 */

import { env } from "../_generated/server";
import { MIN_PAYOUT_MINOR_DEFAULT } from "./validation";

export type PaymentsDriver = "bachs" | "simulated";

/**
 * Whether the fake payment driver is explicitly enabled for this deployment.
 *
 * Simulated payments are deliberately opt-in. Setting `PAYMENTS_DRIVER` alone
 * is not enough: a missing/rotated Bachs key must never silently turn the
 * deployment into fake-payments mode. Dev deployments should set both:
 *
 *   PAYMENTS_DRIVER=simulated
 *   ALLOW_SIMULATED=true
 */
export function simulatedPaymentsAllowed(): boolean {
  const looksLikeProduction =
    env.BACHS_ENV === "production" || Boolean(env.BACHS_API_KEY?.startsWith("sk_live_"));
  if (looksLikeProduction) return false;
  return env.PAYMENTS_DRIVER === "simulated" && env.ALLOW_SIMULATED === "true";
}

/**
 * Which payment driver is active. Fails closed to Bachs.
 *
 * - Both `PAYMENTS_DRIVER=simulated` and `ALLOW_SIMULATED=true` -> simulated.
 * - Everything else -> Bachs. If `BACHS_API_KEY` is missing, checkout creation
 *   fails loudly with `payments_unavailable`; it never falls back to fake money.
 */
export function resolvePaymentsDriver(): PaymentsDriver {
  return simulatedPaymentsAllowed() ? "simulated" : "bachs";
}

/**
 * Turnstile is enforced whenever a secret is present. Production also requires
 * it, so a missing key fails closed instead of silently accepting unverified
 * checkout traffic.
 */
export function turnstileRequired(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY) || bachsEnvironment() === "production";
}

export function turnstileSecretKey(): string | undefined {
  return env.TURNSTILE_SECRET_KEY;
}

export function turnstileSiteKey(): string | undefined {
  return env.TURNSTILE_SITE_KEY;
}

/** Both keys must be present before checkout is considered usable. */
export function turnstileConfigured(): boolean {
  if (!turnstileRequired()) return true;
  return Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
}

/** Whether checkouts can actually be created right now. */
export function paymentsConfigured(): boolean {
  const driver = resolvePaymentsDriver();
  if (driver === "simulated") return turnstileConfigured();
  return Boolean(env.BACHS_API_KEY) && turnstileConfigured();
}

export function bachsEnvironment(): "sandbox" | "production" {
  return env.BACHS_ENV ?? "sandbox";
}

export function bachsApiKey(): string | undefined {
  return env.BACHS_API_KEY;
}

export function bachsBaseUrl(): string {
  return bachsEnvironment() === "production"
    ? "https://api.bachs.io"
    : "https://sandbox-api.bachs.io";
}

export function bachsWebhookSecret(): string | undefined {
  return env.BACHS_WEBHOOK_SECRET;
}

/** True once your platform's Bachs `connect` capability is active. */
export function connectEnabled(): boolean {
  return env.CONNECT_ENABLED === "true";
}

/** Platform fee in basis points (500 = 5%). Clamped to a sane range. */
export function platformFeeBps(): number {
  const parsed = Number(env.PLATFORM_FEE_BPS ?? "500");
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5000) return 500;
  return Math.round(parsed);
}

/** Platform fee for an amount, in minor units (rounded to nearest minor unit). */
export function platformFeeFor(amountMinor: number): number {
  return Math.round((amountMinor * platformFeeBps()) / 10_000);
}

/** Hours a donation stays pending before it becomes payout-available. */
export function settlementHoldHours(): number {
  const parsed = Number(env.SETTLEMENT_HOLD_HOURS ?? "24");
  if (!Number.isFinite(parsed) || parsed < 0) return 24;
  return parsed;
}

/** Minimum payout in minor units. */
export function minPayoutMinor(): number {
  const parsed = Number(env.MIN_PAYOUT_MINOR ?? "");
  if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  return MIN_PAYOUT_MINOR_DEFAULT;
}

/** Public app origin, without a trailing slash. */
export function appUrl(): string {
  return (env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Public base URL handed to Bachs for checkout success/cancel redirects.
 *
 * Bachs rejects localhost redirect targets. By default this is the Convex site
 * URL, whose `/checkout/success` and `/checkout/cancel` routes 302 the browser
 * back to `appUrl()`, so local development needs no tunnel.
 */
export function checkoutRedirectBase(): string {
  return (env.CHECKOUT_REDIRECT_URL ?? env.CONVEX_SITE_URL).replace(/\/+$/, "");
}

/**
 * Whether a URL can be used as a payment-provider redirect target.
 *
 * Bachs rejects loopback/private hosts with
 * `VALIDATION_ERROR: success_url must be a publicly accessible URL
 * (localhost is not allowed)`, so `createCheckout` checks this up front instead
 * of failing with an opaque provider error.
 */
export function isPubliclyReachableUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return false;
  }
  if (host === "::1" || host === "0.0.0.0") return false;

  // IPv4 loopback, private, and link-local ranges.
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
  }
  return true;
}

/** Lowercased admin email allow-list. */
export function adminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "marvellousobatale@gmail.com")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function resendApiKey(): string | undefined {
  return env.RESEND_API_KEY;
}

export function emailFrom(): string | undefined {
  return env.EMAIL_FROM;
}

export function supportEmail(): string {
  return env.SUPPORT_EMAIL ?? env.EMAIL_FROM ?? "no-reply@example.com";
}

/** This deployment's HTTP actions origin (for printing the webhook URL). */
export function convexSiteUrl(): string {
  return env.CONVEX_SITE_URL;
}

/** Full public webhook URL for this deployment. */
export function webhookUrl(): string {
  return `${env.CONVEX_SITE_URL}/bachs/webhook`;
}
