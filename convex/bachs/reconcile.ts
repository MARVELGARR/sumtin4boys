import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { resolvePaymentsDriver } from "../lib/config";
import { classifyCheckoutState } from "./provider";

/**
 * Reconciliation cron jobs.
 *
 * Two things can go stale in a webhook-driven system:
 *
 * 1. Donations stuck in `pending`/`unresolved` because a webhook was lost.
 *    `reconcilePendingDonations` re-fetches each checkout from Bachs and feeds
 *    the live state through the same fulfilment pipeline.
 *
 * 2. Checkout *creations* whose outcome was never learned (timeout/5xx — see
 *    https://docs.bachs.io/guides/idempotency). `reconcileUncertainOperations`
 *    replays the ORIGINAL request with the SAME Idempotency-Key: Bachs returns
 *    the cached success if it landed, or executes it if it never did.
 *
 * Both jobs process bounded batches and are safe to run concurrently: the
 * pipeline deduplicates by event id.
 */

export const reconcilePendingDonations = internalAction({
  args: {},
  returns: v.object({ checked: v.number(), processed: v.number() }),
  handler: async (ctx): Promise<{ checked: number; processed: number }> => {
    if (resolvePaymentsDriver() !== "bachs") {
      return { checked: 0, processed: 0 };
    }
    const stale = await ctx.runQuery(internal.donations.listStaleForReconcile, {
      now: Date.now(),
    });
    let processed = 0;
    for (const item of stale) {
      const result = await ctx.runAction(internal.bachs.bachsNode.retrieveCheckout, {
        checkoutId: item.checkoutId,
      });

      if (!result.ok) {
        if (result.notFound) {
          // Bachs has no record of this checkout; park it for review instead
          // of retrying forever.
          await ctx.runMutation(internal.donations.parkUnknownCheckout, {
            donationId: item.donationId,
          });
        }
        continue; // transient failures retry on the next run
      }

      const classification = classifyCheckoutState(result.state);
      if (classification === "open") continue;

      const eventType =
        classification === "completion" ? "checkout.completed" : "checkout.expired";
      // Deterministic id per (checkout, state) pair: replays dedupe, but a
      // later state change (open -> paid) is a new event and processes.
      const eventId = `recon_${result.state.checkoutId}_${result.state.status}_${
        result.state.paymentStatus ?? "none"
      }`;

      const outcome = await ctx.runMutation(
        internal.bachs.events.processCheckoutEvent,
        {
          eventId,
          eventType,
          eventCreatedAt: Date.now(),
          source: "reconcile" as const,
          checkout: result.state,
        },
      );
      if (outcome.outcome === "processed") processed += 1;
    }
    return { checked: stale.length, processed };
  },
});

export const reconcileUncertainOperations = internalAction({
  args: {},
  returns: v.object({ checked: v.number(), resolved: v.number() }),
  handler: async (ctx): Promise<{ checked: number; resolved: number }> => {
    if (resolvePaymentsDriver() !== "bachs") {
      return { checked: 0, resolved: 0 };
    }
    const stuck = await ctx.runQuery(internal.donations.listStuckOperations, {
      now: Date.now(),
    });
    let resolved = 0;
    for (const operation of stuck) {
      const retry = await ctx.runQuery(internal.donations.prepareCheckoutRetry, {
        operationId: operation.operationId,
      });
      if (!retry) continue;

      if (retry.kind === "already_resolved") {
        await ctx.runMutation(internal.donations.markOperationSucceeded, {
          operationId: operation.operationId,
          providerId: retry.providerId ?? undefined,
        });
        resolved += 1;
        continue;
      }

      const result = await ctx.runAction(internal.bachs.bachsNode.createCheckoutSession, {
        payload: retry.payload,
      });
      await ctx.runMutation(internal.donations.settleCheckoutRetry, {
        operationId: operation.operationId,
        ok: result.ok,
        checkoutId: result.ok ? result.checkoutId : undefined,
        errorCode: result.ok ? undefined : result.code,
        errorMessage: result.ok ? undefined : result.message,
        outcomeUnknown: result.ok ? false : result.outcomeUnknown,
      });
      if (result.ok) resolved += 1;
    }
    return { checked: stuck.length, resolved };
  },
});
