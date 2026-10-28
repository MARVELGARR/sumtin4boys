# Architecture: Creator Support Platform ("Tear Small Bread"-style SaaS)

> Stack: **Next.js (App Router) + Convex + Bachs payments**
> Built with **OpenCode** (multi-agent) using the official **Bachs skill**.
> This file is the source of truth for humans and AI agents. Keep it updated.

---

## 1. Product Summary

Creators get a public page (`/[username]`) where supporters can tear them "bread" (one-time support) with an optional message. Creators see supporters and earnings in a dashboard and receive payouts. Later phases add memberships (monthly tiers), goals, and embeddable widgets.

**Primary users**
- **Supporter**: anonymous or lightly identified, pays in a few clicks.
- **Creator**: signs up, claims a username, sets up payouts, manages a page.
- **Admin (us)**: moderation, fee configuration, support tooling.

**Non-goals for MVP**: subscriptions, gated content, custom domains, multi-creator carts.

---

## 2. Key Decisions

| Area | Decision | Why |
|---|---|---|
| Frontend | Next.js App Router, TypeScript | SSR for SEO on creator pages, great DX |
| Backend | Convex (queries, mutations, actions, HTTP actions, crons, file storage) | Reactive data, transactional mutations, no separate API server |
| Payments | Bachs hosted checkout, server-created sessions | Hosted checkout keeps card data off our systems |
| Money model | Marketplace via Bachs Connect **destination charges** (see section 4) | Platform owns the sale; creator's sub-account receives its share at settlement |
| Source of truth for payment state | **Verified webhooks** (plus reconciliation) | A redirect or browser event is never proof of payment |
| Amounts | Integer minor units internally; **decimal strings with ISO currency** at the Bachs API boundary | Bachs requires decimal strings at currency precision |
| Auth | Convex Auth (or Clerk / Better Auth) | Pick one; all authorization lives in Convex functions |
| Email | Resend, called from Convex actions | Receipts and creator notifications |

---

## 3. System Overview

```
Supporter ──► Next.js  /[username]   (SSR via preloadQuery, live via Convex)
                 │
                 │  "Tear small bread"  → Convex action: donations.createCheckout
                 ▼
          ┌──────────────────────────────────────────────────────┐
          │ Convex                                               │
          │  1. rate limit + validate                            │
          │  2. insert donation (status: pending) + reference    │
          │  3. persist Idempotency-Key                          │
          │  4. call Bachs: create checkout session ─────────────┼──► Bachs API
          │  5. save checkoutId, return hosted checkout URL      │
          └──────────────────────────────────────────────────────┘
                 │ redirect
                 ▼
          Bachs hosted checkout  (supporter pays)
                 │
                 ├── redirect back to /thanks?ref=…  (display only, polls our DB)
                 │
                 └── signed webhook ─► Convex httpAction  /bachs/webhook
                                          │ verify raw body + X-Bachs-Signature-V2
                                          │ retrieve checkout, match status/amount/currency
                                          ▼
                                   internalMutation (atomic):
                                     • dedupe event ID
                                     • reject older-than-current state
                                     • update donation → paid
                                     • append ledger entries
                                     • schedule emails
                                          ▼
                              UI updates live (Convex reactivity)
```

---

## 4. Money Flow (Decide Before Building Payments)

**Chosen model: Bachs Connect, destination charges.**

- The **platform owns the sale**. The creator's **seller sub-account** receives its share at **settlement**.
- Choose destination account and platform fee **on the server**. Never accept either from the client.
- Let the destination charge generate its own transfer at settlement. **Do not add a second manual transfer.**
- Three separate states, tracked separately in our data:
  1. **Payment** (supporter paid)
  2. **Seller balance credit** (settlement)
  3. **Payout** (money delivered to the creator's destination)
- This is **not an escrow** integration.
- Start with **one creator per donation**.

**Constraints to confirm in docs before coding**
- Connect, subscriptions, payouts, and refunds may be **Beta / Limited Access**. Request access early (hello@bachs.io).
- The official SDK **does not yet support** Connect account context, seller onboarding, or checkout split fields. Use documented HTTP requests for those; do not invent SDK methods or pass unsupported fields through type casts.
- Read: `https://docs.bachs.io/build/use-cases/marketplace.md` and `https://docs.bachs.io/connect/choose-your-integration.md`.

**Fallback (sandbox only / if Connect access is delayed)**: platform collects all funds and tracks creator balances in our ledger, then pays out via the Payouts API. This makes us a custodian of creator funds and has compliance weight. Keep it behind the `PaymentProvider` interface so we can swap without rewriting domain logic.

---

## 5. Repository Structure

```
.
├── AGENTS.md                      # = this file (or symlink / pointer)
├── .opencode/
│   ├── agents/                    # payments.md, convex.md, frontend.md, reviewer.md
│   └── skills/bachs/SKILL.md      # official Bachs skill
├── vendor/bachs-sdk/              # vendored @bachs/sdk (see section 8)
├── convex/
│   ├── schema.ts
│   ├── auth.ts
│   ├── http.ts                    # routes: POST /bachs/webhook
│   ├── creators.ts
│   ├── donations.ts               # createCheckout (action), internal state mutations
│   ├── ledger.ts
│   ├── payouts.ts
│   ├── admin.ts                   # admin mutations + operational lists
│   ├── adminTelemetry.ts          # protected dashboard overview/held/detail queries
│   ├── sellers.ts                 # Connect onboarding state
│   ├── emails.ts
│   ├── crons.ts                   # reconciliation
│   ├── payments/
│   │   ├── provider.ts            # PaymentProvider interface
│   │   ├── bachs.ts               # Bachs implementation (SDK + raw Connect calls)
│   │   ├── webhookNode.ts         # "use node" signature verification (if SDK needs Node)
│   │   └── events.ts              # event → state transitions
│   └── lib/
│       ├── money.ts               # minor units <-> decimal string, per-currency precision
│       ├── rateLimit.ts
│       └── guards.ts              # requireUser, requireCreator, requireAdmin
├── src/ (or app/)
│   ├── app/
│   │   ├── [username]/page.tsx    # public creator page
│   │   ├── [username]/opengraph-image.tsx
│   │   ├── thanks/page.tsx
│   │   ├── dashboard/...
│   │   ├── onboarding/...
│   │   └── (auth)/...
│   ├── components/
│   └── lib/convex.tsx             # ConvexClientProvider
└── tests/                         # convex-test + Playwright
```

---

## 6. Data Model (Convex)

```ts
// convex/schema.ts (sketch; refine types as you implement)
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
  }).index("by_authId", ["authId"]),

  creators: defineTable({
    userId: v.id("users"),
    username: v.string(),               // unique, lowercase, reserved words blocked
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    coffeePrice: v.number(),            // minor units; public API exposes breadPrice
    currency: v.string(),               // ISO 4217
    goalAmount: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("suspended")),
    // Connect
    sellerAccountId: v.optional(v.string()),
    onboardingStatus: v.union(
      v.literal("not_started"), v.literal("pending"),
      v.literal("blocked"), v.literal("enabled"),
    ),
    payoutsEnabled: v.boolean(),
  })
    .index("by_username", ["username"])
    .index("by_userId", ["userId"]),

  donations: defineTable({
    creatorId: v.id("creators"),
    supporterName: v.string(),
    supporterEmail: v.string(),
    message: v.optional(v.string()),
    isPrivate: v.boolean(),
    quantity: v.number(),
    amount: v.number(),                 // minor units, computed server-side
    currency: v.string(),
    platformFee: v.number(),            // minor units
    netAmount: v.number(),
    reference: v.string(),              // unique forever; never reused (even after expiry)
    attemptId: v.optional(v.string()),  // browser UUID; dedupes double-click/retry
    checkoutId: v.optional(v.string()),
    checkoutUrl: v.optional(v.string()),// reused when the same attempt arrives again
    paymentId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("unresolved"),          // expired/failed: NOT final, later success can win
      v.literal("refunded"),
    ),
    lastEventAt: v.optional(v.number()),// guards against older events overwriting newer state
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_reference", ["reference"])
    .index("by_attemptId", ["attemptId"])
    .index("by_checkoutId", ["checkoutId"])
    .index("by_creator_status", ["creatorId", "status"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  ledgerEntries: defineTable({         // append-only; balances are derived by summing
    creatorId: v.id("creators"),
    type: v.union(
      v.literal("donation"), v.literal("fee"), v.literal("refund"),
      v.literal("payout"), v.literal("adjustment"),
    ),
    amount: v.number(),                 // signed, minor units
    currency: v.string(),
    donationId: v.optional(v.id("donations")),
    payoutId: v.optional(v.id("payouts")),
    settlementStatus: v.optional(v.union(v.literal("pending"), v.literal("settled"))),
    createdAt: v.number(),
  }).index("by_creator", ["creatorId", "createdAt"]),

  payouts: defineTable({
    creatorId: v.id("creators"),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("requested"), v.literal("processing"),
                    v.literal("paid"), v.literal("failed")),
    idempotencyKey: v.string(),
    bachsPayoutId: v.optional(v.string()),
    requestedAt: v.number(),
  }).index("by_creator", ["creatorId", "requestedAt"]),

  webhookEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),

  apiOperations: defineTable({          // idempotency + uncertain-write recovery
    key: v.string(),
    kind: v.string(),                   // "create_checkout" | "create_payout" | ...
    status: v.union(v.literal("started"), v.literal("succeeded"),
                    v.literal("outcome_unknown"), v.literal("failed")),
    refId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
});
```

**Data rules**
- Integers in minor units internally; convert with `lib/money.ts` only at the Bachs boundary.
- `ledgerEntries` is append-only. Never edit a stored balance.
- Each payment attempt gets its **own** donation row and **own** `reference`.
- Verify the "unique username" invariant inside the mutation (index lookup, then insert).

---

## 7. Payment Pipeline

### 7.1 Create checkout (`donations.createCheckout`, public **action**)

1. The browser generates one `attemptId` UUID when the support form opens and reuses it for every retry.
2. Rate limit by email/creator (Convex rate-limiter component). Duplicate attempts return before consuming a bucket.
3. Validate args (quantity bounds, email format, message length, creator active and onboarded).
4. **Recompute amount server-side** from `creator.coffeePrice * quantity` (the field is exposed publicly as `breadPrice`). Ignore any client amount. Compute `platformFee` from server config.
5. `internalMutation`: look up `donations.by_attemptId`. If found, verify the request fields match and return the existing donation + `checkoutUrl`.
6. Otherwise insert donation (`pending`) with `attemptId`, a fresh `reference`, and an `apiOperations` row (`started`).
7. Call Bachs to create the hosted checkout session (`product_cart`, `reference`, destination seller account, fee, redirect URLs). Send the persisted `Idempotency-Key` derived from `reference`.
8. On success: save `checkoutId` + `checkoutUrl`, mark operation `succeeded`, return the checkout URL.
9. On timeout / 5xx: mark `outcome_unknown`. **Reconcile before resubmitting**; never blindly retry with a new key.

> **Open question:** the skill's one-time flow uses `product_cart`. Confirm in `checkout-sessions.md` whether custom / pay-what-you-want amounts are supported. If not, model bread as a product with quantities (1, 3, 5) and map them on the server.

### 7.2 Webhook (`POST /bachs/webhook`, Convex `httpAction`)

1. Read the **raw body** (`await request.text()`) and headers. **Verify `X-Bachs-Signature-V2` before parsing JSON**, with timestamp tolerance and all v1 signatures as documented. Prefer the SDK's `webhooks.constructEvent`. If it needs Node crypto, run it in a `"use node"` action (`payments/webhookNode.ts`) called via `ctx.runAction`; route files themselves cannot be Node files.
2. Invalid signature → 4xx (this is the only legitimate 4xx).
3. Relevant events → call `internalMutation processEvent` after fetching the live checkout state (below).
4. **Return 2xx only after the work is durable. Return 5xx if our own handling fails** so Bachs retries. 408 and 429 are retried even though they are 4xx.

### 7.3 Event processing (`internalMutation`, atomic)

- Fulfil once on **`checkout.completed` or `collection.succeeded`, whichever arrives first**, after retrieving the checkout and confirming: status is `completed`, **amount and currency match the donation**. If not yet completed → throw (5xx) so it is retried.
- In one transaction: insert `eventId` into `webhookEvents` (unique check), compare event time with `lastEventAt` (ignore older), update donation, append ledger entries, schedule emails.
- `collection.failed` is **not final**. `checkout.expired` is **not final** (a payment can still complete the checkout afterward). Both map to `unresolved`, and a later success moves it to `paid`.
- A virtual-account deposit with no order reference does **not** pay a donation automatically; flag it for manual review.
- Failed processing must leave the event eligible for redelivery (do not record the event ID until the transaction commits).

### 7.4 State machine

```
pending ──paid event──────────────► paid ──refund event──► refunded
   │                                  ▲
   └─expired/failed──► unresolved ────┘   (late success wins)
```

### 7.5 Reconciliation (cron, every 10–15 min)

- Find `pending`/`unresolved` donations older than 30 minutes and operations in `outcome_unknown`.
- Fetch real state from Bachs and run the same `processEvent` logic (idempotent).
- Alert if the backlog exceeds a threshold.

### 7.6 Payouts

- Payment, seller balance credit, and payout delivery are separate states. Payout uses the **seller's balance** and its **usable destination**.
- Persist an `Idempotency-Key` per payout request. Handle payout failure and retry paths explicitly.
- Show creators three numbers: **pending**, **available**, **paid out**.

---

## 8. Bachs Integration Rules (from the official Bachs skill)

1. **Use the official SDK** `@bachs/sdk` for products, checkout sessions, subscriptions, portal sessions, and webhook verification.
   - The npm `0.0.1` package is a **placeholder. Do not install it.**
   - Until `1.0.0` is released, use the vendored copy from `bachsdev/bachs-nextjs-saas/vendor` in `vendor/bachs-sdk/`, imported by relative path (so Convex bundles it). After release, pin the exact npm version.
   - Verify the SDK runs in Convex's runtime; use `"use node"` actions only where required.
2. Construct the client with `apiKey` and an **explicit environment**. Sandbox: `https://sandbox-api.bachs.io` with `sk_sandbox_…`. Production: `https://api.bachs.io` with `sk_live_…`.
3. **Secrets** live in Convex environment variables only. Never log keys, full provider error bodies, or portal URLs. Never in client code.
4. **Amounts** are decimal strings with ISO currency at its precision. Prices and product mappings are chosen/validated **on the server**.
5. **Checkout redirects must be publicly reachable**, even in sandbox. Use a Vercel preview or tunnel for automatic return. CLI webhook forwarding is separate from redirects.
6. **Never** grant access or fulfil from a redirect or browser event. Only from verified webhook state.
7. **One persisted `Idempotency-Key` per business operation** for POST/PATCH. A timeout or 5xx is an *uncertain outcome*: reconcile first, then reuse the same key if a retry is needed. The SDK reports `outcomeUnknown` on uncertain writes.
8. **Do not build** another transport, response decoder, or signature verifier for operations the SDK supports.
9. Do not invent endpoints, fields, events, or eligibility. If docs are unreachable, ask for the page pasted via "Copy page".

**Docs index**: `https://docs.bachs.io/llms.txt`
Checkout sessions: `/guides/checkout/checkout-sessions.md` · Webhooks: `/guides/webhooks/overview.md` · Local testing: `/developer-portal/local-testing.md` · Idempotency: `/guides/idempotency.md` · Go-live: `/go-live.md` · Marketplace: `/build/use-cases/marketplace.md` · SaaS subscriptions: `/build/use-cases/saas-subscriptions.md`

---

## 9. Authentication and Authorization

- Every mutation/query declares who may call it. Use `lib/guards.ts`: `requireUser`, `requireCreator` (owns the resource), `requireAdmin`.
- Public functions: creator page read, `createCheckout`, thanks-page donation status (by `reference` only, exposing minimal fields).
- All webhook-driven state changes use **`internalMutation`/`internalAction`** only, never public functions.
- Supporter emails are visible only to the owning creator and admins.
- Suspended creators: page returns 404/notice, `createCheckout` refuses.
- `/admin` is protected in three layers: auth middleware, the client-side `amIAdmin` gate (no sensitive query is mounted before it returns true), and `requireAdmin` in every admin query/mutation. Admin access requires an allow-listed email **and** `emailVerificationTime`.
- Admin telemetry (`convex/adminTelemetry.ts`) is admin-only. Money is always bucketed by currency and never summed across currencies. Overview/held-funds scans are bounded and flag sampled totals; `creatorDetail` bounds its recent-history lists.
- The admin console covers overview/financial telemetry, creators, held funds + settlement countdowns, payouts, webhook/API activity, contact messages, and the append-only admin audit log.

---

## 10. Frontend Routes

| Route | Purpose | Notes |
|---|---|---|
| `/[username]` | Public creator page | SSR with `preloadQuery`, live feed via `usePreloadedQuery`; `generateMetadata` + OG image |
| `/thanks?ref=` | Post-payment landing | Polls donation state reactively; shows pending / paid / unsuccessful from stored state |
| `/dashboard` | Earnings summary, recent supporters | Pending / available / paid out |
| `/dashboard/page` | Page editor | Avatar upload via Convex storage, price, goal |
| `/dashboard/payouts` | Balance and payout history | Request payout, show failures |
| `/dashboard/settings` | Account, onboarding status | Connect seller onboarding |
| `/onboarding` | Username, profile, payout setup | Blocked-onboarding state handled explicitly |
| `/admin` | Operations console: creator management, financial telemetry, held funds, payouts, activity, messages, audit | Admin only |

Reserved usernames (`admin`, `dashboard`, `api`, `thanks`, etc.) are blocked at creation.

---

## 11. Feature Phases

**Phase 1: MVP**
- Auth, creator onboarding, public page, one-time donations, webhook-driven fulfilment
- Supporter feed, creator dashboard, ledger
- Seller onboarding + payouts (Connect), receipt emails

**Phase 2**
- Memberships via Bachs subscriptions (recurring product checkout creates the subscription; there is no separate create-subscription endpoint; customer required)
- Persist customer + full subscription state from `customer.subscription.created/updated/deleted`; define access policy for `trialing`, `active`, `past_due`, cancelled
- Customer portal sessions (server-created, for the user's own customer only)
- Goals, embeddable widgets/buttons, refunds UI

**Phase 3**
- Analytics, custom domains, stream overlays, multi-currency display, referral links

---

## 12. Security, Abuse, Privacy

- **Card testing** is common on donation pages: rate limit, minimum amount, per-IP/email velocity checks, optional CAPTCHA/Turnstile on `createCheckout`.
- Sanitize and length-limit supporter messages; escape on render; creators can hide/delete messages.
- Private-message option: not shown in the public feed.
- Never log PII beyond what is needed. Provide data export/deletion paths.
- Webhook endpoint accepts only signed requests; reject stale timestamps; constant-time comparison (SDK handles this).
- Moderation: creator suspension flag, report flow, admin tools.

---

## 13. Observability and Operations

- Sentry for Next.js; Convex logs; `webhookEvents` + `apiOperations` form an audit trail.
- Alerts: pending/unresolved backlog, webhook 5xx rate, `outcome_unknown` operations, failed payouts.
- Backups/exports of Convex data on a schedule.
- Separate Convex deployments: **dev**, **staging**, **prod**. Sandbox keys in dev/staging; live keys only in prod.

---

## 14. Testing Strategy

Use `convex-test` for backend logic and Playwright for flows. Required cases:

**One-time payments**
- Successful payment (checkout.completed first, and collection.succeeded first)
- Unsuccessful payment; expired checkout followed by late success
- Amount/currency mismatch is rejected
- **Invalid signature** rejected
- **Duplicate delivery** is a no-op
- **Older event arriving late** does not overwrite newer state
- **Processing failure then redelivery** succeeds
- **Uncertain write** (timeout) then reconciliation

**Marketplace**
- Blocked onboarding, settlement, payout failure

**Subscriptions (Phase 2)**
- Renewal failure, cancellation, past_due access policy

> A synthetic webhook tests handling only, not a completed checkout or settlement. A mock or a code review is **not** a sandbox payment. Do not describe them as one.

---

## 15. Environment Variables (Convex)

```
BACHS_API_KEY=            # sk_sandbox_… (dev/staging), sk_live_… (prod)
BACHS_ENV=sandbox|production
BACHS_WEBHOOK_SECRET=
APP_URL=                  # final Next.js origin (http://localhost:3000 in dev)
CHECKOUT_REDIRECT_URL=    # optional public base for checkout redirects; defaults to CONVEX_SITE_URL
PLATFORM_FEE_BPS=         # e.g. 500 = 5%
RESEND_API_KEY=
SENTRY_DSN=
```

Next.js public env: only `NEXT_PUBLIC_CONVEX_URL` and non-secret config.

---

## 16. Working With AI Agents (OpenCode)

**Agents** (`.opencode/agents/`)

| Agent | Mode | Scope |
|---|---|---|
| `payments` | subagent | Bachs client, checkout, webhook, ledger, idempotency. **Loads the `bachs` skill first** |
| `convex` | subagent | Schema, queries/mutations/actions, http routes, crons |
| `frontend` | subagent | Next.js pages, components, UX polish |
| `reviewer` | subagent, read-only (`edit: deny`, `bash: deny`) | Go-live and security review |

**Rules for all agents**
1. Read this file and the relevant Bachs docs before writing payment code.
2. Never invent Bachs endpoints, fields, events, or eligibility. Check docs or ask.
3. Assign non-overlapping files per agent; the lead agent owns integration.
4. Commit after each green step.
5. State plainly what was tested, what was not, and what dashboard setup remains.
6. Production transactions and deployment require explicit human approval.

**Build order**
1. `schema.ts`, `lib/money.ts`, `lib/guards.ts`
2. `payments/bachs.ts` (SDK client) + `donations.createCheckout`
3. Webhook `httpAction`, signature verification, `processEvent`, ledger, dedupe
4. Reconciliation cron
5. Public creator page, thanks page
6. Dashboard, Connect onboarding, payouts
7. Tests for every case in section 14
8. `reviewer` runs the go-live review; fix; repeat

---

## 17. Go-Live Review Checklist (reviewer agent reports by file and line, ordered by risk)

- [ ] Secret keys reachable from the client
- [ ] Amounts sent as numbers instead of decimal strings
- [ ] Prices, product IDs, destination, or fee taken from the client
- [ ] Fulfilment or access granted outside verified webhook handling
- [ ] Webhook body parsed before signature verification
- [ ] Missing duplicate-event or older-event protection (including concurrent deliveries)
- [ ] 4xx returned when our own handling fails
- [ ] Writes without a persisted `Idempotency-Key`; uncertain writes not reconciled
- [ ] `reference` reused across attempts
- [ ] Sandbox URLs, keys, or webhook secrets still configured for production
- [ ] Logs contain secrets, full provider error bodies, or portal URLs
- [ ] Reviewer states which checks it could **not** complete and why

---

## 18. Open Questions / Unverified Items

- Custom amounts at checkout vs. product-based pricing (section 7.1)
- Exact Connect checkout split/fee field names (SDK does not cover them; use the marketplace docs)
- Whether the vendored SDK works inside Convex's default runtime or needs `"use node"`
- Event ordering field to use for "older event" protection
- Beta/Limited Access status for Connect, subscriptions, payouts, refunds, and supported countries/currencies for creators and supporters
- Whether OpenCode runs multiple subagents in parallel in your installed version

---

## 19. SEO, Public Content, and Contact

- Canonical origin resolution lives in `lib/seo.ts`. It reads `APP_URL` (the same
  origin used by checkout redirects/emails), then Vercel's production hostname,
  then `https://anything4boys.com`. Localhost, LAN, and temporary tunnel hosts
  are ignored so a dev environment cannot publish a bad canonical or sitemap.
- `app/layout.tsx` owns `metadataBase`, the default title template, OG/Twitter
  defaults, robots policy, and site-wide `Organization` + `WebSite` JSON-LD.
- Every public page exports its own metadata through `pageMetadata()` (canonical,
  Open Graph, Twitter, keywords) and adds the relevant structured data:
  `FAQPage` on `/` and `/support`, `AboutPage` on `/about` and
  `/about/author`, `ProfilePage` on creator pages, and `ContactPage` on
  `/contact`.
- `app/sitemap.ts` is dynamic: static marketing routes plus active creator
  usernames from `creators.listForSitemap`. Suspended creators are omitted.
  `app/robots.ts` disallows app/private routes and points at the sitemap.
- `/about`, `/about/author`, `/support`, and `/contact` are indexable. Dashboard,
  admin, onboarding, sign-in, thanks/reference pages, and simulated checkout are
  `noindex, nofollow`; unknown creator usernames render a real 404.
- FAQ answers render in native `<details>` elements, so the full text is in the
  server-rendered HTML without a client component.
- `/contact` stores submissions in `contactMessages` and notifies the team on a
  best-effort basis. It never promises a public support email address that has
  not been verified.
