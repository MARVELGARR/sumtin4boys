/**
 * Money helpers — the single source of truth for amount handling.
 *
 * RULE: inside the app, amounts are integer MINOR UNITS (kobo, cents, ...).
 * Bachs' API speaks decimal strings at the currency's precision ("5000.00");
 * conversion happens only at the provider boundary. This module is pure
 * TypeScript (no Convex or Node imports) so the Next.js frontend imports it
 * too — see `lib/format.ts`.
 */

/** Currencies with a non-2 decimal minor unit, or explicit support. */
export const CURRENCY_DECIMALS: Record<string, number> = {
  NGN: 2,
  USD: 2,
  GHS: 2,
  KES: 2,
  MWK: 2,
  TZS: 2,
  ZMW: 2,
  // Zero-decimal currencies:
  RWF: 0,
  UGX: 0,
  XAF: 0,
  XOF: 0,
};

export function decimalsFor(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

/**
 * "5000.00" (NGN) -> 500000. Integer arithmetic only: never multiply a
 * float by 100.
 */
export function toMinorUnits(amount: string, currency: string): number {
  const decimals = decimalsFor(currency);
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount string: "${amount}"`);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const minor = Number(whole) * 10 ** decimals + (padded === "" ? 0 : Number(padded));
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`Amount out of range: "${amount}"`);
  }
  return minor;
}

/**
 * 500000 (NGN) -> "5000.00". Exactly the currency's precision, with no
 * rounding, suitable for the Bachs API.
 */
export function fromMinorUnits(minor: number, currency: string): string {
  const decimals = decimalsFor(currency);
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  if (decimals === 0) return `${sign}${abs}`;
  const padded = abs.toString().padStart(decimals + 1, "0");
  return `${sign}${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}

/** Parse user input like "1500" or "1,500.50" into minor units, or null. */
export function parseMajorAmount(input: string, currency: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  try {
    const minor = toMinorUnits(cleaned, currency);
    return minor >= 0 ? minor : null;
  } catch {
    return null;
  }
}

/** Display helper: 500000 NGN -> "₦5,000.00". */
export function formatMoney(minor: number, currency: string, locale?: string): string {
  const decimals = decimalsFor(currency);
  const resolvedLocale =
    locale ?? (currency.toUpperCase() === "NGN" ? "en-NG" : undefined);
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(minor / 10 ** decimals);
  } catch {
    return `${currency.toUpperCase()} ${fromMinorUnits(minor, currency)}`;
  }
}
