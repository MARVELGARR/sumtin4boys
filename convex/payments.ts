import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  connectEnabled,
  paymentsConfigured,
  platformFeeBps,
  resolvePaymentsDriver,
} from "./lib/config";

/**
 * Public payment-mode info for the frontend.
 *
 * The UI uses this to show honest states:
 * - `driver: "simulated"` renders the clearly-labelled fake checkout flow.
 * - `driver: "bachs"` + `checkoutReady: false` shows "payments not configured"
 *   instead of a broken support button.
 * - `connectEnabled` switches the payouts page to "set up direct payouts".
 */
export const mode = query({
  args: {},
  returns: v.object({
    driver: v.union(v.literal("bachs"), v.literal("simulated")),
    /** True when checkouts can actually be created on this deployment. */
    checkoutReady: v.boolean(),
    /** True when creator payouts run through Bachs Connect accounts. */
    connectEnabled: v.boolean(),
    /** Platform fee in basis points (500 = 5%). */
    platformFeeBps: v.number(),
  }),
  handler: async () => {
    return {
      driver: resolvePaymentsDriver(),
      checkoutReady: paymentsConfigured(),
      connectEnabled: connectEnabled(),
      platformFeeBps: platformFeeBps(),
    };
  },
});
