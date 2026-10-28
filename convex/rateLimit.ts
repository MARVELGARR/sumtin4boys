/**
 * Rate limiter wiring.
 *
 * Uses the @convex-dev/rate-limiter component (mounted in convex.config.ts).
 * Buckets are consumed inside mutations so a client cannot bypass them by
 * calling an action differently.
 */

import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  /** Per supporter email: at most this many checkout creations per window. */
  createCheckoutPerEmail: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
  /**
   * Per creator page: a high ceiling. This is deliberately much higher than
   * the per-email bucket so one rapid supporter cannot lock out a creator's
   * real audience. The global bucket is the backstop for distributed floods.
   */
  createCheckoutPerCreator: {
    kind: "token bucket",
    rate: 120,
    period: MINUTE,
    capacity: 120,
  },
  /** Deployment-wide ceiling for checkout creation. */
  createCheckoutGlobal: {
    kind: "token bucket",
    rate: 600,
    period: MINUTE,
    capacity: 600,
  },
  /** Contact form: slow humans, not a bulk-messaging endpoint. */
  contactPerEmail: {
    kind: "token bucket",
    rate: 3,
    period: HOUR,
    capacity: 3,
  },
  /** Deployment-wide backstop against a distributed contact-form flood. */
  contactGlobal: {
    kind: "token bucket",
    rate: 60,
    period: HOUR,
    capacity: 60,
  },
  /** Admin balance adjustments: protect against accidental/repeated loops. */
  adminAdjustmentPerActor: {
    kind: "token bucket",
    rate: 20,
    period: HOUR,
    capacity: 20,
  },
});
