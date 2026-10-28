/**
 * Validation rules shared between the Convex backend and the frontend
 * (pure TypeScript — no Convex imports).
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const DISPLAY_NAME_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 500;
export const SUPPORTER_NAME_MAX_LENGTH = 60;
export const MESSAGE_MAX_LENGTH = 280;
export const MAX_QUANTITY = 10;

/**
 * A browser-generated UUID used as the checkout idempotency key. UUID v4 has
 * enough entropy that two supporters (or two tabs) won't collide, and the
 * fixed shape lets us reject arbitrary client strings before storing them.
 */
export const CHECKOUT_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCheckoutRequestId(value: string): boolean {
  return value.length === 36 && CHECKOUT_REQUEST_ID_PATTERN.test(value);
}

/** Avatar formats we can safely serve as images (no SVG/HTML uploads). */
export const ALLOWED_AVATAR_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
/** Maximum avatar upload size: 2 MB. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Smallest price for one bread, minor units: ₦100.00. */
export const MIN_BREAD_PRICE_MINOR = 10_000;
/** Largest price for one bread, minor units: ₦1,000,000.00. */
export const MAX_BREAD_PRICE_MINOR = 100_000_000;
/** Default payout minimum, minor units (₦1,000.00). Overridable via env. */
export const MIN_PAYOUT_MINOR_DEFAULT = 100_000;

/** Currencies creators can collect in (all Bachs-supported). */
export const SUPPORTED_CURRENCIES = [
  "NGN",
  "USD",
  "GHS",
  "KES",
  "MWK",
  "RWF",
  "TZS",
  "UGX",
  "XAF",
  "XOF",
  "ZMW",
] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: string): value is SupportedCurrency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

/**
 * Handles nobody may claim, because they collide with app routes or would be
 * confusing. Checked case-insensitively on the normalized (lowercase) value.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // routes
  "signin",
  "signup",
  "signout",
  "login",
  "logout",
  "dashboard",
  "onboarding",
  "admin",
  "thanks",
  "thank-you",
  "settings",
  "supporters",
  "editor",
  "payouts",
  "simulated-checkout",
  "api",
  "webhooks",
  "checkout",
  // brand / generic
  "anything4boys",
  "support",
  "help",
  "about",
  "pricing",
  "terms",
  "privacy",
  "explore",
  "discover",
  "new",
  "create",
  "creators",
  "donations",
  "me",
  "you",
  "user",
  "users",
  "account",
  "billing",
  "settings",
  "assets",
  "static",
  "public",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "opengraph-image",
  "_next",
  "bachs",
  "stripe",
  "admin",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export type UsernameCheck =
  | { ok: true; username: string }
  | {
    ok: false;
    reason: "too_short" | "too_long" | "invalid_characters" | "reserved";
  };

/**
 * Format-level check only (length, characters, reserved list). Uniqueness is
 * checked against the database separately.
 */
export function checkUsernameFormat(raw: string): UsernameCheck {
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, reason: "too_short" };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, reason: "invalid_characters" };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, reason: "reserved" };
  }
  return { ok: true, username };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}
