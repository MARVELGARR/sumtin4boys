import { defineApp } from "convex/server";
import { v } from "convex/values";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

/**
 * App-level configuration.
 *
 * The `env` block declares every environment variable this backend reads.
 * Convex generates a typed `env` object in `convex/_generated/server.ts`
 * from this declaration, so functions never touch `process.env` directly
 * and a typo in a variable name is caught at compile time.
 *
 * Set values per deployment, for example:
 *
 *   npx convex env set PAYMENTS_DRIVER simulated
 *   npx convex env set BACHS_API_KEY sk_sandbox_...
 *   npx convex env set BACHS_WEBHOOK_SECRET whsec_...
 *
 * Every variable is optional: the app degrades gracefully (and loudly) when
 * payments are not configured yet. See docs/SETUP.md.
 */
const app = defineApp({
  env: {
    // ---------------------------------------------------------------------
    // Payments (Bachs)
    // ---------------------------------------------------------------------
    /**
     * Secret API key for the Bachs API.
     * Sandbox keys start with `sk_sandbox_`, production keys with `sk_live_`.
     */
    BACHS_API_KEY: v.optional(v.string()),
    /**
     * Which Bachs environment `BACHS_API_KEY` belongs to.
     * Defaults to "sandbox". Going live is a key swap plus changing this.
     */
    BACHS_ENV: v.optional(v.union(v.literal("sandbox"), v.literal("production"))),
    /**
     * Signing secret used to verify `X-Bachs-Signature-V2` on incoming
     * webhooks at `POST /bachs/webhook`.
     */
    BACHS_WEBHOOK_SECRET: v.optional(v.string()),
    /**
     * Which payment driver to use:
     * - "bachs": real Bachs API (requires `BACHS_API_KEY`).
     * - "simulated": the local fake checkout. Requires `ALLOW_SIMULATED=true`
     *   as a second, explicit opt-in. Never set this in production.
     * Unset: Bachs. Missing keys make checkout creation fail loudly; they
     * never turn the deployment into fake-payments mode.
     */
    PAYMENTS_DRIVER: v.optional(v.union(v.literal("bachs"), v.literal("simulated"))),
    /**
     * Explicit opt-in for the simulated payment driver. Set to "true" only on
     * local/dev deployments, together with PAYMENTS_DRIVER=simulated.
     */
    ALLOW_SIMULATED: v.optional(v.string()),
    /**
     * "true" once your platform's Bachs `connect` capability is active and
     * creator payouts should run through connected accounts instead of the
     * platform's own balance. See docs/PAYMENTS.md.
     */
    CONNECT_ENABLED: v.optional(v.string()),
    /**
     * Legacy platform fee for currencies other than NGN/USD. NGN (5%) and USD
     * (10%) are fixed by `convex/lib/pricing.ts`; this only applies to other
     * currencies. Default 500 = 5%.
     */
    PLATFORM_FEE_BPS: v.optional(v.string()),
    /**
     * How long (in hours) a settled donation stays pending before it becomes
     * available for payout. Default 24.
     */
    SETTLEMENT_HOLD_HOURS: v.optional(v.string()),
    // ---------------------------------------------------------------------
    // App
    // ---------------------------------------------------------------------
    /**
     * Origin of the Next.js app. Used as the final destination of checkout
     * redirects and for links in emails. Defaults to http://localhost:3000.
     */
    APP_URL: v.optional(v.string()),
    /**
     * Public base URL handed to Bachs for checkout success/cancel redirects.
     * Defaults to this deployment's Convex site URL, whose `/checkout/*` HTTP
     * routes 302 back to APP_URL. This lets local development keep
     * APP_URL=http://localhost:3000 without a tunnel, while still satisfying
     * Bachs' requirement that redirect URLs be publicly reachable.
     */
    CHECKOUT_REDIRECT_URL: v.optional(v.string()),

    // ---------------------------------------------------------------------
    // Bot protection (Cloudflare Turnstile)
    // ---------------------------------------------------------------------
    /**
     * Public Turnstile site key. Safe to send to the browser. When the secret
     * key is set, checkout creation fails closed without a valid token.
     */
    TURNSTILE_SITE_KEY: v.optional(v.string()),
    /** Server-side Turnstile secret. Never expose this to the browser. */
    TURNSTILE_SECRET_KEY: v.optional(v.string()),

    // ---------------------------------------------------------------------
    // Email (optional; notifications are skipped, not failed, without a key)
    // ---------------------------------------------------------------------
    /** Resend API key. Without it, email notifications are logged and skipped. */
    RESEND_API_KEY: v.optional(v.string()),
    /** From address for notification emails, e.g. "anything4boys <hello@example.com>". */
    EMAIL_FROM: v.optional(v.string()),
    /** Reply-to / support address shown to creators and supporters. */
    SUPPORT_EMAIL: v.optional(v.string()),

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------
    /** Comma-separated list of emails that can access the `/admin` dashboard. */
    ADMIN_EMAILS: v.optional(v.string()),
  },
});

// Rate limiting for public write paths (uses the @convex-dev/rate-limiter
// component, mounted below).
app.use(rateLimiter);

export default app;
