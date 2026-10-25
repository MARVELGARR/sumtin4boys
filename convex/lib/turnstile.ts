/**
 * Cloudflare Turnstile server-side verification.
 *
 * `createCheckout` is a public action that can create payment-provider
 * sessions, so a client-supplied token must be checked on the server. The
 * secret is never returned to the browser and tokens are never persisted.
 */

import {
  turnstileConfigured,
  turnstileRequired,
  turnstileSecretKey,
} from "./config";
import { appError } from "./errors";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2_048;
const EXPECTED_ACTION = "checkout";

type SiteverifyResponse = {
  success?: unknown;
  action?: unknown;
  "error-codes"?: unknown;
};

function invalidVerification(): never {
  throw appError(
    "verification_failed",
    "We couldn't verify that you're human. Please try again.",
  );
}

/**
 * Verify a Turnstile token when protection is configured.
 *
 * - No secret (and not production): skip, preserving local/dev and tests.
 * - Secret configured: require a token and fail closed on any error.
 * - Production without keys: treat configuration as unavailable, never as an
 *   unverified free pass.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
): Promise<void> {
  if (!turnstileRequired()) return;

  if (!turnstileConfigured()) {
    throw appError(
      "payments_unavailable",
      "Checkout verification is not configured. Add both Turnstile keys.",
    );
  }

  const secret = turnstileSecretKey();
  const trimmed = token?.trim();
  if (!secret || !trimmed || trimmed.length > MAX_TOKEN_LENGTH) {
    invalidVerification();
  }

  const body = new URLSearchParams({
    secret,
    response: trimmed,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
  } catch {
    throw appError(
      "verification_failed",
      "Verification is temporarily unavailable. Please try again.",
    );
  } finally {
    clearTimeout(timeout);
  }

  let result: SiteverifyResponse | null = null;
  try {
    result = (await response.json()) as SiteverifyResponse;
  } catch {
    result = null;
  }

  if (
    !response.ok ||
    result?.success !== true ||
    result.action !== EXPECTED_ACTION
  ) {
    // Never log the token or secret; error codes are enough to debug config.
    console.warn("[turnstile] siteverify rejected a checkout token", {
      status: response.status,
      errorCodes: result?.["error-codes"],
    });
    invalidVerification();
  }
}
