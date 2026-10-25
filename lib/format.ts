/**
 * Frontend formatting helpers.
 *
 * Money helpers are re-exported from the shared module used by the Convex
 * backend, so there is exactly ONE implementation of minor-unit conversion.
 * Import from `@/lib/format` in components — never re-implement.
 */

export {
  CURRENCY_DECIMALS,
  decimalsFor,
  fromMinorUnits,
  formatMoney,
  parseMajorAmount,
  toMinorUnits,
} from "@/convex/lib/money";

export {
  ALLOWED_AVATAR_CONTENT_TYPES,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_AVATAR_BYTES,
  MAX_BREAD_PRICE_MINOR,
  MAX_QUANTITY,
  MESSAGE_MAX_LENGTH,
  MIN_BREAD_PRICE_MINOR,
  SUPPORTED_CURRENCIES,
  SUPPORTER_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  checkUsernameFormat,
  isSupportedCurrency,
  isValidEmail,
  normalizeUsername,
} from "@/convex/lib/validation";

/** Error helpers for ConvexError-shaped app errors (`error.data.code`). */
export {
  appErrorCode,
  appErrorMessage,
  appErrorRetryAfterMs,
} from "@/convex/lib/errors";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(ms: number): string {
  return dateFormatter.format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return dateTimeFormatter.format(new Date(ms));
}

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "2 hours ago", "in 3 days", ... for timestamps in ms. */
export function formatRelativeTime(ms: number): string {
  const diffSeconds = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return relativeFormatter.format(Math.round(diffSeconds), "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86_400) return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86_400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86_400), "day");
  if (abs < 86_400 * 365) {
    return relativeFormatter.format(Math.round(diffSeconds / (86_400 * 30)), "month");
  }
  return relativeFormatter.format(Math.round(diffSeconds / (86_400 * 365)), "year");
}
