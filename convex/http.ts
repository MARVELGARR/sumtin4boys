import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { classifyEvent } from "./bachs/provider";
import { appUrl } from "./lib/config";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "./lib/validation";

const http = httpRouter();

// Convex Auth's HTTP endpoints (/api/auth/...).
auth.addHttpRoutes(http);

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
    },
  });
}

function headerRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Find the checkout session id inside an event's `data` object.
 * - `checkout.*` events carry `data.checkout_id` (and `data.id`).
 * - `collection.*` events carry a payment object with `checkout_id`.
 */
function extractCheckoutId(
  eventType: string,
  data: Record<string, unknown>,
): string | undefined {
  const direct =
    stringOrUndefined(data.checkout_id) ??
    stringOrUndefined(data.checkout_session_id);
  if (direct) return direct;
  if (eventType.startsWith("checkout.")) {
    return stringOrUndefined(data.id);
  }
  const payment = asRecord(data.payment);
  return stringOrUndefined(payment.checkout_id);
}

function extractAccountId(data: Record<string, unknown>): string | undefined {
  return stringOrUndefined(data.account) ?? stringOrUndefined(data.account_id);
}

/**
 * Refund events are not uniformly shaped across Bachs versions. Pull the
 * charge/session ids from every documented nesting so a refund is never
 * discarded merely because the id lives one level deeper.
 */
function extractRefundDetails(data: Record<string, unknown>): {
  chargeId?: string;
  checkoutId?: string;
  refundId?: string;
  refundedAmount?: string;
} {
  const refund = asRecord(data.refund);
  const charge = asRecord(data.charge);
  const payment = asRecord(data.payment);
  return {
    chargeId:
      stringOrUndefined(data.charge_id) ??
      stringOrUndefined(data.payment_id) ??
      stringOrUndefined(refund.charge_id) ??
      stringOrUndefined(refund.payment_id) ??
      stringOrUndefined(charge.id) ??
      stringOrUndefined(payment.id),
    checkoutId:
      stringOrUndefined(data.checkout_id) ??
      stringOrUndefined(data.checkout_session_id) ??
      stringOrUndefined(refund.checkout_id) ??
      stringOrUndefined(charge.checkout_id) ??
      stringOrUndefined(payment.checkout_id),
    refundId:
      stringOrUndefined(data.refund_id) ??
      stringOrUndefined(refund.id) ??
      stringOrUndefined(data.id),
    refundedAmount:
      stringOrUndefined(data.refunded_amount) ??
      stringOrUndefined(refund.refunded_amount) ??
      stringOrUndefined(refund.amount) ??
      stringOrUndefined(data.amount),
  };
}

/**
 * Bachs checkout redirects.
 *
 * Bachs requires public success/cancel URLs, so checkout sessions point at
 * these Convex-site routes (see CHECKOUT_REDIRECT_URL) and the browser is then
 * sent back to the app. This keeps local development tunnel-free.
 */
http.route({
  path: "/checkout/success",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const ref = new URL(req.url).searchParams.get("ref") ?? "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(ref)) {
      return json(400, { error: "invalid_reference" });
    }
    return redirect(`${appUrl()}/thanks?ref=${encodeURIComponent(ref)}`);
  }),
});

http.route({
  path: "/checkout/cancel",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    const username = new URL(req.url).searchParams.get("username") ?? "";
    if (
      username.length < USERNAME_MIN_LENGTH ||
      username.length > USERNAME_MAX_LENGTH ||
      !USERNAME_PATTERN.test(username)
    ) {
      return json(400, { error: "invalid_username" });
    }
    return redirect(`${appUrl()}/${encodeURIComponent(username)}`);
  }),
});

/**
 * Bachs webhook endpoint.
 *
 * Contract (https://docs.bachs.io/guides/webhooks):
 * - Verify `X-Bachs-Signature-V2` over the exact raw body; reject with 400 on
 *   bad signatures.
 * - Deduplicate by event id (done in the pipeline via `webhookEvents`).
 * - Answer 2xx within 10 seconds or Bachs redelivers; only successful
 *   responses are cached by Bachs.
 * - Fulfil on the FIRST of `checkout.completed` / `collection.succeeded` whose
 *   live checkout state shows collected money; never trust the body alone.
 */
http.route({
  path: "/bachs/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // 1. Signature verification over the exact raw bytes, before parsing.
    const rawBody = await req.text();
    const verification = await ctx.runAction(
      internal.bachs.bachsNode.verifyWebhook,
      { rawBody, headers: headerRecord(req.headers) },
    );
    if (!verification.ok) {
      // Not configured -> 503 so Bachs retries later; anything else -> 400.
      const status = verification.code === "not_configured" ? 503 : 400;
      return json(status, { error: verification.code });
    }

    const { id: eventId, type: eventType, createdAtMs } = verification;
    const data = asRecord(JSON.parse(verification.dataJson));

    // 2. Connect account lifecycle: re-read the account and sync onboarding
    //    state (the event body is only a hint, never the source of truth).
    if (eventType === "account.updated" || eventType === "capability.updated") {
      const accountId = extractAccountId(data);
      if (accountId) {
        await ctx.runAction(internal.sellers.refreshAccountStatus, { accountId });
      }
      return json(200, { ok: true, type: eventType });
    }

    const eventClass = classifyEvent(eventType);

    // 3. Refunds act on the charge directly (no checkout fetch needed).
    if (eventClass === "refund") {
      const result = await ctx.runMutation(
        internal.bachs.events.processCheckoutEvent,
        {
          eventId,
          eventType,
          eventCreatedAt: createdAtMs,
          source: "webhook" as const,
          refund: extractRefundDetails(data),
        },
      );
      return json(200, { ok: true, outcome: result.outcome });
    }

    // 4. Money events: fetch the LIVE checkout state, then run the pipeline.
    if (
      eventClass === "completion" ||
      eventClass === "expiry" ||
      eventClass === "underpaid" ||
      eventClass === "nonfinal_failure"
    ) {
      const checkoutId = extractCheckoutId(eventType, data);
      if (!checkoutId) {
        return json(200, { ok: true, ignored: "no_checkout_id", type: eventType });
      }
      const state = await ctx.runAction(
        internal.bachs.bachsNode.retrieveCheckout,
        { checkoutId },
      );
      if (!state.ok) {
        if (state.notFound) {
          return json(200, { ok: true, ignored: "checkout_not_found", checkoutId });
        }
        // Transient provider failure: ask for redelivery.
        return json(500, { error: "retrieve_failed" });
      }

      const result = await ctx.runMutation(
        internal.bachs.events.processCheckoutEvent,
        {
          eventId,
          eventType,
          eventCreatedAt: createdAtMs,
          source: "webhook" as const,
          checkout: state.state,
        },
      );

      // The live state does not (yet) show collected money. Do not record the
      // event; ask Bachs to redeliver, so we can process it once consistent.
      if (result.outcome === "not_ready") {
        return json(500, { error: "not_ready" });
      }
      return json(200, { ok: true, outcome: result.outcome });
    }

    // 5. Anything else (subscriptions, disputes, transfers, payouts, ...):
    //    acknowledge so Bachs stops retrying; not processed in this MVP.
    return json(200, { ok: true, ignored: eventType });
  }),
});

export default http;
