import { ConvexError } from "convex/values";

/**
 * App-wide error codes.
 *
 * Every deliberate failure in this backend throws
 * `new ConvexError({ code, message })`. The frontend maps `error.data.code`
 * to friendly UI via `appErrorMessage` / `appErrorCode` below, so user-facing
 * copy lives in one place per surface.
 */
export type AppErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "rate_limited"
  | "username_taken"
  | "already_a_creator"
  | "not_a_creator"
  | "creator_not_found"
  | "creator_suspended"
  | "creator_not_onboarded"
  | "payments_unavailable"
  | "checkout_failed"
  | "insufficient_available"
  | "payout_pending"
  | "below_minimum_payout"
  | "connect_mode"
  | "not_configured"
  | "simulated_only"
  | "already_resolved";

export type AppErrorData = {
  code: AppErrorCode;
  message: string;
  /** Present on rate_limited: milliseconds until the caller may retry. */
  retryAfterMs?: number;
};

export function appError(
  code: AppErrorCode,
  message: string,
  extra?: { retryAfterMs?: number },
): ConvexError<AppErrorData> {
  return new ConvexError({ code, message, ...extra });
}

function isAppErrorData(data: unknown): data is AppErrorData {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as { code?: unknown; message?: unknown };
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

/** Extract the app error code from an unknown thrown value, or null. */
export function appErrorCode(error: unknown): AppErrorCode | null {
  const data = (error as { data?: unknown } | null)?.data;
  return isAppErrorData(data) ? data.code : null;
}

/** Extract a human-friendly message from any thrown value. */
export function appErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (isAppErrorData(data)) return data.message;
  if (error instanceof Error && error.message) {
    // Raw Convex/provider errors are noisy; only surface short messages.
    const message = error.message.replace(/^\[.*?\]\s*/, "");
    return message.length <= 200 ? message : fallback;
  }
  return fallback;
}

/** Milliseconds until retry, when a rate_limited error provides one. */
export function appErrorRetryAfterMs(error: unknown): number | null {
  const data = (error as { data?: unknown } | null)?.data;
  if (isAppErrorData(data) && typeof data.retryAfterMs === "number") {
    return data.retryAfterMs;
  }
  return null;
}
