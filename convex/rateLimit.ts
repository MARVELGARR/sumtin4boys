/**
 * Rate limiter wiring.
 *
 * Uses the @convex-dev/rate-limiter component (mounted in convex.config.ts).
 * Buckets are consumed inside mutations so a client cannot bypass them by
 * calling an action differently.
 */

import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  /** Per supporter email: at most this many checkout creations per window. */
  createCheckoutPerEmail: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  /** Per creator page: a generous ceiling that protects a single page's feeds. */
  createCheckoutPerCreator: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 30,
  },
});
