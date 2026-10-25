import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled jobs.
 *
 * - `settleMatureEntries`: moves donations past the settlement hold from
 *   `pending` to `available` (see convex/ledger.ts).
 * - `reconcilePendingDonations`: re-checks stale pending/unresolved donations
 *   against the provider — the safety net for lost webhooks.
 * - `reconcileUncertainOperations`: replays checkout creations whose outcome
 *   was never learned, reusing the same Idempotency-Key (see
 *   https://docs.bachs.io/guides/idempotency).
 *
 * All jobs are no-ops when PAYMENTS_DRIVER=simulated.
 */
const crons = cronJobs();

crons.interval(
  "settle mature ledger entries",
  { minutes: 30 },
  internal.ledger.settleMatureEntries,
  {},
);

crons.interval(
  "reconcile pending donations",
  { minutes: 10 },
  internal.bachs.reconcile.reconcilePendingDonations,
  {},
);

crons.interval(
  "reconcile uncertain checkout operations",
  { minutes: 10 },
  internal.bachs.reconcile.reconcileUncertainOperations,
  {},
);

crons.interval(
  "abandon donations past the reconcile window",
  { hours: 24 },
  internal.donations.abandonStaleDonations,
  {},
);

crons.interval(
  "clean up expired webhook and API-operation rows",
  { hours: 24 },
  internal.admin.cleanupExpiredRecords,
  {},
);

export default crons;
