"use node";

/**
 * Bachs adapter (Node runtime).
 *
 * This is the ONLY file that imports `@bachs/sdk`. Why Node and not the
 * default Convex runtime:
 * - `webhooks.constructEvent` verifies signatures with `node:crypto`
 *   (HMAC-SHA256 + timingSafeEqual), and the SDK's entry point imports it.
 * - Node actions may use any npm package; default-runtime actions may not.
 *
 * Everything here returns structured results instead of throwing, so callers
 * can distinguish three outcomes that matter for money:
 *   - ok: the provider definitively accepted the request
 *   - !ok && !outcomeUnknown: the provider definitively rejected it (4xx)
 *   - !ok && outcomeUnknown: uncertain (timeout / network / 5xx). Recovery is
 *     reconciling with the SAME Idempotency-Key — see
 *     https://docs.bachs.io/guides/idempotency
 *
 * Connect (split payments) endpoints are NOT modelled by the SDK, so they use
 * documented raw HTTP requests here (same file, same error mapping).
 */

import {
  Bachs,
  BachsAbortError,
  BachsApiError,
  BachsConfigError,
  BachsError,
  BachsNetworkError,
  BachsResponseError,
  BachsTimeoutError,
  BachsWebhookError,
  webhooks,
} from "@bachs/sdk";
import type { CheckoutSessionResponse } from "@bachs/sdk";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { bachsApiKey, bachsBaseUrl, bachsEnvironment, bachsWebhookSecret } from "../lib/config";
import {
  checkoutPayloadValidator,
  checkoutStateValidator,
  type CheckoutState,
} from "./provider";

// ---------------------------------------------------------------------------
// Client + low-level helpers
// ---------------------------------------------------------------------------

function bachsClient(): Bachs | null {
  const apiKey = bachsApiKey();
  if (!apiKey) return null;
  return new Bachs({ apiKey, environment: bachsEnvironment() });
}

interface ProviderFailure {
  code: string;
  message: string;
  outcomeUnknown: boolean;
}

/** Map any thrown SDK error onto our three-way result shape. */
function describeBachsError(error: unknown): ProviderFailure {
  if (error instanceof BachsConfigError) {
    // Missing/invalid configuration: deterministic, retrying won't help.
    return { code: "config_error", message: error.message, outcomeUnknown: false };
  }
  if (error instanceof BachsApiError) {
    return {
      code: error.errorCode ?? `http_${error.status}`,
      message: error.message,
      // 5xx (and idempotency-in-progress) leave the outcome uncertain.
      outcomeUnknown: error.outcomeUnknown || error.status >= 500,
    };
  }
  if (
    error instanceof BachsNetworkError ||
    error instanceof BachsTimeoutError ||
    error instanceof BachsAbortError ||
    error instanceof BachsResponseError
  ) {
    // The request may have reached Bachs: uncertain outcome.
    return { code: error.name, message: error.message, outcomeUnknown: true };
  }
  if (error instanceof BachsError) {
    return { code: error.name, message: error.message, outcomeUnknown: true };
  }
  return {
    code: "unknown_error",
    message: error instanceof Error ? error.message : "Unknown provider error",
    outcomeUnknown: true,
  };
}

interface RawOk<T> {
  ok: true;
  data: T;
}
interface RawFail {
  ok: false;
  status: number;
  code: string;
  message: string;
  outcomeUnknown: boolean;
}

/**
 * Raw request helper for documented endpoints the SDK does not model
 * (Connect accounts, account links). Uses the same auth + error mapping as
 * the SDK paths.
 */
async function bachsFetch<T>(
  path: string,
  init: {
    method: "GET" | "POST";
    body?: unknown;
    idempotencyKey?: string;
    /** Act on behalf of a connected account. */
    accountId?: string;
    timeoutMs?: number;
  },
): Promise<RawOk<T> | RawFail> {
  const apiKey = bachsApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      code: "missing_api_key",
      message: "BACHS_API_KEY is not set for this deployment.",
      outcomeUnknown: false,
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  try {
    const response = await fetch(`${bachsBaseUrl()}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
        ...(init.accountId ? { "X-Account-Id": init.accountId } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    if (response.ok) {
      return { ok: true, data: parsed as T };
    }
    const body = parsed as
      | { detail?: string; message?: string; error_code?: string }
      | null;
    const code = body?.error_code ?? `http_${response.status}`;
    return {
      ok: false,
      status: response.status,
      code,
      message:
        body?.detail ?? body?.message ?? `Bachs returned HTTP ${response.status}`,
      // 5xx and "operation still in progress" are uncertain; 4xx is definitive.
      outcomeUnknown:
        response.status >= 500 ||
        (response.status === 409 && code === "IDEMPOTENCY_IN_PROGRESS"),
    };
  } catch (error) {
    // Network failure or abort: the request may or may not have been executed.
    return {
      ok: false,
      status: 0,
      code: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
      message: error instanceof Error ? error.message : "Network error",
      outcomeUnknown: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Normalize a live checkout session into the app's shape. */
function normalizeCheckout(session: CheckoutSessionResponse): CheckoutState {
  const charge = session.charge ?? null;
  const chargeRaw = charge as unknown as Record<string, unknown> | null;
  const chargeId =
    charge && typeof charge.payment_id === "string" && charge.payment_id
      ? charge.payment_id
      : charge && typeof charge.id === "string"
        ? charge.id
        : undefined;

  const fees = chargeRaw?.fees as { amount?: unknown } | undefined;
  const processingFee =
    typeof fees?.amount === "string"
      ? fees.amount
      : typeof chargeRaw?.fee === "string"
        ? chargeRaw.fee
        : undefined;
  const feePaidBy = chargeRaw?.fee_paid_by;
  const feeBearer =
    feePaidBy === "merchant"
      ? ("merchant" as const)
      : feePaidBy === "customer"
        ? ("customer" as const)
        : undefined;

  return {
    checkoutId: session.checkout_id,
    status: typeof session.status === "string" ? session.status : "unknown",
    paymentStatus:
      typeof session.payment_status === "string"
        ? session.payment_status
        : charge && typeof charge.status === "string"
          ? charge.status
          : undefined,
    amount: typeof session.amount === "string" ? session.amount : charge?.amount,
    currency: typeof session.currency === "string" ? session.currency : charge?.currency,
    reference: typeof session.reference === "string" ? session.reference : undefined,
    chargeId,
    processingFee,
    feeBearer,
  };
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify `X-Bachs-Signature-V2` over the exact raw body and parse the event
 * envelope. Never decide anything from the event body alone — the payload is
 * used for IDs/type only; state is re-fetched before mutating anything.
 */
export const verifyWebhook = internalAction({
  args: {
    rawBody: v.string(),
    headers: v.record(v.string(), v.string()),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      id: v.string(),
      type: v.string(),
      createdAtMs: v.number(),
      /** Event `data` object, serialized (JSON text) for transport. */
      dataJson: v.string(),
    }),
    v.object({
      ok: v.literal(false),
      code: v.string(),
      message: v.string(),
    }),
  ),
  handler: async (_ctx, args) => {
    const secret = bachsWebhookSecret();
    if (!secret) {
      return {
        ok: false as const,
        code: "not_configured",
        message: "BACHS_WEBHOOK_SECRET is not set for this deployment.",
      };
    }
    try {
      const event = webhooks.constructEvent(args.rawBody, args.headers, secret);
      const parsedMs = Date.parse(event.created_at);
      return {
        ok: true as const,
        id: event.id,
        type: event.type,
        createdAtMs: Number.isNaN(parsedMs) ? Date.now() : parsedMs,
        dataJson: JSON.stringify(event.data ?? {}),
      };
    } catch (error) {
      if (error instanceof BachsWebhookError) {
        return {
          ok: false as const,
          code: "invalid_signature",
          message: error instanceof Error ? error.message : "Invalid signature.",
        };
      }
      return {
        ok: false as const,
        code: "verify_failed",
        message: error instanceof Error ? error.message : "Webhook verification failed.",
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Checkout sessions
// ---------------------------------------------------------------------------

export const createCheckoutSession = internalAction({
  args: { payload: checkoutPayloadValidator },
  returns: v.union(
    v.object({ ok: v.literal(true), checkoutId: v.string(), url: v.string() }),
    v.object({
      ok: v.literal(false),
      code: v.string(),
      message: v.string(),
      outcomeUnknown: v.boolean(),
    }),
  ),
  handler: async (_ctx, args) => {
    const payload = args.payload;
    const metadata = {
      donation_id: payload.donationId,
      creator_username: payload.creatorUsername,
      reference: payload.reference,
    };
    const chargeAmount = payload.chargeAmount ?? payload.amount;

    // Use the documented raw endpoint for both platform and Connect mode:
    // the SDK's create type does not expose `customer_bears_fee`, and the
    // Connect shape needs `transfer_data` / `platform_fee`.
    // https://docs.bachs.io/connect/processing-fees
    // https://docs.bachs.io/connect/split-payments/destination
    const result = await bachsFetch<{
      checkout_id?: string;
      checkout_url?: string;
    }>("/v1/checkout-sessions", {
      method: "POST",
      idempotencyKey: payload.idempotencyKey,
      body: {
        pricing: { currency: payload.currency, amount: chargeAmount },
        customer: { email: payload.supporterEmail, name: payload.supporterName },
        success_url: payload.successUrl,
        cancel_url: payload.cancelUrl,
        reference: payload.reference,
        metadata,
        // Default-on for new checkouts. The provider adds its actual fee on
        // top; the app never guesses that amount.
        customer_bears_fee: payload.coverProcessingFee === true,
        ...(payload.connectDestination
          ? {
              transfer_data: { destination: payload.connectDestination },
              platform_fee: payload.platformFee,
            }
          : {}),
      },
    });

    if (!result.ok) {
      return {
        ok: false as const,
        code: result.code,
        message: result.message,
        outcomeUnknown: result.outcomeUnknown,
      };
    }
    const checkoutId = result.data.checkout_id;
    const url = result.data.checkout_url;
    if (!checkoutId || !url) {
      // A 2xx without ids should not happen; treat as uncertain, reconcile.
      return {
        ok: false as const,
        code: "bad_response",
        message: "Bachs returned a checkout without an id or url.",
        outcomeUnknown: true,
      };
    }
    return { ok: true as const, checkoutId, url };
  },
});

/**
 * Fetch the live state of a checkout session. Used by the webhook handler
 * (never trust the event body for state) and by reconciliation.
 */
export const retrieveCheckout = internalAction({
  args: { checkoutId: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), state: checkoutStateValidator }),
    v.object({
      ok: v.literal(false),
      code: v.string(),
      message: v.string(),
      notFound: v.boolean(),
    }),
  ),
  handler: async (_ctx, args) => {
    const client = bachsClient();
    if (!client) {
      return {
        ok: false as const,
        code: "missing_api_key",
        message: "BACHS_API_KEY is not set for this deployment.",
        notFound: false,
      };
    }
    try {
      const session = await client.checkoutSessions.get(args.checkoutId);
      return { ok: true as const, state: normalizeCheckout(session) };
    } catch (error) {
      if (error instanceof BachsApiError && error.status === 404) {
        return {
          ok: false as const,
          code: "not_found",
          message: "Bachs does not know this checkout session.",
          notFound: true,
        };
      }
      const failure = describeBachsError(error);
      return { ok: false as const, ...failure, notFound: false };
    }
  },
});

// ---------------------------------------------------------------------------
// Connect: accounts + hosted onboarding (raw documented endpoints)
// ---------------------------------------------------------------------------

export const createConnectAccount = internalAction({
  args: {
    displayName: v.string(),
    contactEmail: v.string(),
    idempotencyKey: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), accountId: v.string() }),
    v.object({
      ok: v.literal(false),
      code: v.string(),
      message: v.string(),
      outcomeUnknown: v.boolean(),
    }),
  ),
  handler: async (_ctx, args) => {
    // https://docs.bachs.io/connect/guides/create-an-account
    const result = await bachsFetch<{ id?: string }>("/v1/accounts", {
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: {
        display_name: args.displayName,
        contact_email: args.contactEmail,
        entity_type: "individual",
        configuration: {
          recipient: {
            capabilities: {
              transfers: { requested: true },
              payouts: { requested: true },
            },
          },
        },
      },
    });
    if (!result.ok) {
      return { ok: false as const, code: result.code, message: result.message, outcomeUnknown: result.outcomeUnknown };
    }
    const accountId = result.data.id;
    if (!accountId) {
      return {
        ok: false as const,
        code: "bad_response",
        message: "Bachs returned an account without an id.",
        outcomeUnknown: true,
      };
    }
    return { ok: true as const, accountId };
  },
});

export const createAccountLink = internalAction({
  args: {
    accountId: v.string(),
    refreshUrl: v.string(),
    returnUrl: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), url: v.string(), expiresAt: v.union(v.string(), v.null()) }),
    v.object({ ok: v.literal(false), code: v.string(), message: v.string() }),
  ),
  handler: async (_ctx, args) => {
    // https://docs.bachs.io/connect/guides/hosted-onboarding
    const result = await bachsFetch<{ url?: string; expires_at?: string }>(
      `/v1/accounts/${encodeURIComponent(args.accountId)}/account-links`,
      {
        method: "POST",
        body: {
          type: "onboarding",
          refresh_url: args.refreshUrl,
          return_url: args.returnUrl,
        },
      },
    );
    if (!result.ok) {
      return { ok: false as const, code: result.code, message: result.message };
    }
    if (!result.data.url) {
      return {
        ok: false as const,
        code: "bad_response",
        message: "Bachs returned an account link without a url.",
      };
    }
    return {
      ok: true as const,
      url: result.data.url,
      expiresAt: result.data.expires_at ?? null,
    };
  },
});

/**
 * Read an account and summarize its onboarding state for our creator rows.
 * Enabled = both `transfers` and `payouts` capabilities are active.
 */
export const retrieveAccountStatus = internalAction({
  args: { accountId: v.string() },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      status: v.union(v.literal("pending"), v.literal("enabled"), v.literal("blocked")),
      detail: v.string(),
    }),
    v.object({ ok: v.literal(false), code: v.string(), message: v.string() }),
  ),
  handler: async (_ctx, args) => {
    const result = await bachsFetch<{
      capabilities?: Record<string, { status?: string } | undefined>;
    }>(`/v1/accounts/${encodeURIComponent(args.accountId)}`, { method: "GET" });
    if (!result.ok) {
      return { ok: false as const, code: result.code, message: result.message };
    }
    const capabilities = result.data.capabilities ?? {};
    const transfers = capabilities.transfers?.status ?? "unknown";
    const payouts = capabilities.payouts?.status ?? "unknown";
    const detail = `transfers=${transfers}, payouts=${payouts}`;
    if (transfers === "active" && payouts === "active") {
      return { ok: true as const, status: "enabled" as const, detail };
    }
    if (transfers === "rejected" || payouts === "rejected") {
      return { ok: true as const, status: "blocked" as const, detail };
    }
    return { ok: true as const, status: "pending" as const, detail };
  },
});
