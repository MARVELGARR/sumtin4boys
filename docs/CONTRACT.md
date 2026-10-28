# CONTRACT.md — Frozen backend API + parallel work plan

This document is the **contract** between the Convex backend (complete, pushed,
typechecked) and the frontend agents building against it. **Reading the
backend source is allowed; changing it is not.** If something is wrong or
missing, report it — the lead owns `convex/**`.

---

## 1. Rules of engagement (READ FIRST)

**Never do these (in parallel agent sessions):**

- No `git` commands of any kind (the lead commits).
- No `npx convex dev` / `npx convex deploy` / `npx convex env` (pushing is the
  lead's job; a stray push from an agent can corrupt the deployment).
- No `npm install` / `package.json` edits — **except the tests agent** who may
  add devDependencies (`vitest`, `convex-test`, `@edge-runtime/vm`).
- No editing of files you were not assigned (see §5 ownership table).
- No edits to `convex/**`, `app/globals.css`, `components.json`, `app/layout.tsx`,
  `lib/**`, `components/layout/**`, `components/ui/**`, `ARCHITECTURE.md`,
  `docs/**`, `README.md`. These are shared/frozen.
- No dev servers (`npm run dev` starts `convex dev` — forbidden).

**Always:**

- Run `npx tsc --noEmit` before declaring done; fix all errors in your files.
- Keep `"use client"` at the top of files using hooks/events.
- Use the installed shadcn components (`components/ui/**`) — do not add new ones.
- Use `@/lib/format` for money/date formatting and the error helpers; never
  re-implement money math.
- Handle loading, empty, and error states for every async surface.

---

## 2. Payments posture (what the UI must honour)

`api.payments.mode` (public query, no auth):

```ts
{
  driver: "bachs" | "simulated",   // which payment driver is active
  checkoutReady: boolean,          // true when real checkouts can be created
  connectEnabled: boolean,         // true when payouts run through creator Bachs accounts
  platformFeeBps: number,          // e.g. 500 = 5% platform fee
}
```

UI obligations:

| State | UI behaviour |
|---|---|
| `driver: "simulated"` | Donate flow works end-to-end but redirects to `/simulated-checkout` (clearly labelled **Simulated payment** — never pretend it's real). |
| `driver: "bachs"` + `checkoutReady: false` | Creator page shows a "Support is temporarily unavailable" notice instead of the donate form. Dashboard unaffected. |
| `connectEnabled: false` | Payouts page uses the **request → admin fulfils** flow (`api.payouts.request`). |
| `connectEnabled: true` | Payouts page hides the request form, shows **Connect onboarding** (`api.sellers.startOnboarding`) + balances are informational. |

---

## 3. Frozen public API surface

All money values are **integer minor units** (kobo/cents). Use
`formatMoney(minor, currency)` to display; `parseMajorAmount(input, currency)`
to parse user input (returns `number | null`).

### 3.1 `creators`

#### `api.creators.getByUsername` — query `{ username: string }`

Public. Returns `{ creator: PublicCreator | null, recentDonations: PublicDonation[] }`.
`creator: null` for unknown usernames (render a not-found page, don't crash).

```ts
PublicCreator = {
  username: string; displayName: string; bio?: string;
  avatarUrl: string | null;             // ready-to-use URL
  breadPrice: number;                  // minor units
  currency: string;                     // "NGN" default
  goalAmount?: number;                  // minor units
  status: "active" | "suspended";       // suspended → show notice instead of donate form
  totalRaised: number; totalSupporters: number; createdAt: number;
}
PublicDonation = {                      // up to 20 latest public (non-private/hidden) paid donations
  _id: Id<"donations">; supporterName: string; message?: string;
  quantity: number; amount: number; currency: string; paidAt?: number;
}
```

#### `api.creators.checkUsername` — query `{ username: string }`

Live availability: `{ available: boolean, normalized: string, reason?: "too_short" | "too_long" | "invalid_characters" | "reserved" | "taken" }`.

#### `api.creators.claimUsername` — mutation `{ username: string }`

Auth required. Returns `{ username }`. Errors: `unauthenticated`, `already_a_creator`, `username_taken`, `invalid_input`.

#### `api.creators.getMyCreator` — query `{}`

Works signed-out (`viewer` fields null, `creator: null`).

```ts
{
  viewer: { email: string | null; name: string | null };
  creator: MyCreator | null;
}
MyCreator = {
  _id: Id<"creators">; username: string; displayName: string; bio?: string;
  avatarUrl: string | null; breadPrice: number; currency: string; goalAmount?: number;
  status: "active" | "suspended"; createdAt: number;
  balancePending: number; balanceAvailable: number; balancePaidOut: number;
  totalRaised: number; totalSupporters: number;
  onboardingStatus: "not_started" | "pending" | "enabled" | "blocked";
  sellerConnected: boolean;             // true when a Bachs account id is attached
}
```

#### `api.creators.updateProfile` — mutation

`{ displayName?: string, bio?: string | null, breadPrice?: number, currency?: string, goalAmount?: number | null }` → `null`.
Auth + creator required. Only provided fields change; explicit `null` clears bio/goalAmount.
Bread price must be within `MIN_BREAD_PRICE_MINOR .. MAX_BREAD_PRICE_MINOR` (see §4). The persisted schema field is still named `coffeePrice` for migration compatibility; public functions expose `breadPrice`.

#### Avatar upload (3 steps)

1. `api.creators.generateAvatarUploadUrl` — mutation `{}` → `{ url: string }`
2. `POST` the `File` straight to `url` (fetch with `body: file`); response JSON has `{ storageId }`
3. `api.creators.setAvatar` — mutation `{ storageId: Id<"_storage"> }` → `null`
   `api.creators.removeAvatar` — mutation `{}` → `null`

### 3.2 `donations`

#### `api.donations.createCheckout` — **action**

```ts
args: {
  attemptId: string;                       // UUID created when the form opens
  username: string; quantity: number;      // 1..MAX_QUANTITY (10)
  supporterName: string; supporterEmail: string;
  message?: string; isPrivate: boolean;
}
returns:
  | { status: "redirect"; url: string; reference: string }   // send the browser to `url`
  | { status: "unknown"; reference: string }                 // outcome uncertain — send to /thanks?ref=reference
```

`attemptId` is required and idempotent. A retry with the same `attemptId` and the
same checkout fields returns the original donation and checkout URL; a retry
with different fields is rejected with `invalid_input`. The donation stores the
attempt (`by_attemptId` index) and the hosted `checkoutUrl`, while the Bachs
`Idempotency-Key` remains server-derived from the donation `reference`.

Public (anonymous). Errors: `creator_not_found`, `creator_suspended`, `invalid_input`,
`rate_limited` (has `retryAfterMs`), `payments_unavailable`, `checkout_failed`.
**The supporter's browser never returns to us from Bachs directly with state —
the `/thanks?ref=` page polls `getByReference` reactively.**

#### `api.donations.getByReference` — query `{ reference: string }`

Public, minimal fields, for `/thanks`:

```ts
null | {
  reference: string;
  status: "pending" | "paid" | "unresolved" | "refunded";
  supporterName: string; quantity: number; amount: number; currency: string;
  message?: string; createdAt: number; paidAt?: number;
  creator: { username: string; displayName: string } | null;
}
```

#### `api.donations.listMine` — query

`{ paginationOpts: PaginationOptions, status?: DonationStatus }` →
paginated rows (`_id, reference, supporterName, supporterEmail, message?, isPrivate, hidden?, quantity, amount, platformFee, netAmount, currency, status, createdAt, paidAt?`).
Creator-only (throws `not_a_creator`). Use `usePaginatedQuery`.

#### `api.donations.getMyStats` — query `{}`

Creator-only:

```ts
{
  currency: string;
  totals: { raised: number; supporters: number };          // all-time, minor units
  balances: { pending: number; available: number; paidOut: number };
  counts: { paid: number; pending: number; unresolved: number; refunded: number; truncated: boolean };  // truncated=true → show "500+"
}
```

### 3.3 `payouts`

#### `api.payouts.getBalances` — query `{}`

Creator-only: `{ currency, pending, available, paidOut, minimum, connectMode, hasOpenPayout }` (all minor units).

#### `api.payouts.request` — mutation `{ amount: number }`

Creator-only. Returns `{ payoutId }`. Errors: `connect_mode`, `forbidden` (suspended),
`below_minimum_payout`, `insufficient_available`, `payout_pending`. One open payout at a time.

#### `api.payouts.listMine` — query `{ paginationOpts }`

Paginated `{ _id, amount, currency, status: "requested"|"processing"|"paid"|"failed", method: "manual"|"bachs", reference?, failureReason?, requestedAt, processedAt? }`.

### 3.4 `sellers` (Connect)

- `api.sellers.getConnectStatus` — query `{}` → `{ connectEnabled, onboardingStatus, sellerConnected }` (creator-only).
- `api.sellers.startOnboarding` — action `{}` → `{ url }`; open it in a new tab. Errors: `checkout_failed`, `not_a_creator`.
  The hosted onboarding returns to `/dashboard/payouts?connect=done` or `?connect=refresh` (restart onboarding).

### 3.5 `payments`

- `api.payments.mode` — query `{}` (see §2). No auth.

### 3.6 `bachs.simulated` (dev only)

- `api.bachs.simulated.completeSimulatedCheckout` — mutation `{ reference: string, outcome: "paid" | "failed" | "expire" }` → `{ ok, outcome }`.
  Only callable when `PAYMENTS_DRIVER=simulated` (throws `simulated_only` otherwise).
  Only from `/simulated-checkout`. Deterministic event ids make double-clicks safe.

### 3.7 `admin`

All admin functions throw `forbidden` for non-admins (`ADMIN_EMAILS` env on the deployment).

- `api.admin.amIAdmin` — query `{}` → `boolean` (safe signed-out → false).
- `api.admin.listCreators` — query `{}` → rows `{ _id, username, displayName, email|null, status, currency, breadPrice, totalRaised, totalSupporters, balancePending, balanceAvailable, balancePaidOut, onboardingStatus, createdAt, nextSettlementAt|null, payoutsAwaiting }`.
- `api.admin.setCreatorStatus` — mutation `{ creatorId: Id<"creators">, status: "active" | "suspended" }`.
- `api.admin.listPayouts` — query `{ status?: "requested"|"processing"|"paid"|"failed" }` → rows `{ _id, creatorUsername, creatorDisplayName, amount, currency, status, method, reference?, failureReason?, requestedAt, processedAt? }` (up to 100 new→old).
- `api.admin.markPayoutPaid` — mutation `{ payoutId: Id<"payouts">, reference: string }` (bank/transfer reference).
- `api.admin.markPayoutFailed` — mutation `{ payoutId: Id<"payouts">, reason: string }`.
- `api.admin.recomputeCreatorBalances` — mutation `{ creatorId: Id<"creators"> }` → `{ pending, available, entriesScanned, truncated }` (recomputes pending/available from the ledger; `paidOut` is historical and untouched).
- `api.admin.listWebhookEvents` — query `{}` → last 100 events `{ _id, eventId, type, source: "webhook"|"reconcile"|"simulated", outcome, donationId?, creatorId?, checkoutId?, eventCreatedAt, receivedAt }`.
- `api.admin.listApiOperations` — query `{}` → last 100 provider ops `{ _id, key, kind, status: "started"|"succeeded"|"failed"|"outcome_unknown", refId?, providerId?, errorCode?, errorMessage?, attempts, createdAt, updatedAt }`.

#### Admin telemetry (all admin-only; money is per-currency integer minor units)

- `api.adminTelemetry.overview` — query `{}` → `{ now, config, counts, health, currencies, sampled }`. `currencies[]` contains `creatorOwned`, `creatorPending`, `creatorAvailable`, `heldForSettlement`, `pendingClawbacks`, `nextSettlementAt`, `platformGrossFees`, `platformFeeReversals`, `platformNetRevenue`, `grossDonationVolume`, `refundedVolume`, `paidOutLifetime`, and `payoutsAwaiting`. Money is never summed across currencies.
- `api.adminTelemetry.heldFunds` — query `{ limit? }` (1..200, default 100) → `{ now, settlementHoldHours, totals, entries, sampled }`. Pending ledger entries are oldest-first with `settlesAt = createdAt + settlementHoldHours`.
- `api.adminTelemetry.creatorDetail` — query `{ creatorId }` → creator summary (including `payoutsAwaiting` and `payoutsSampled`), held entries (bounded), latest 15 donations, latest 15 payouts, and latest 20 ledger entries. Throws `not_found` for a missing creator.

All telemetry scans are bounded (creators 1000, ledger 5000, donations 5000, payouts 2000). `sampled` flags mean a total may be partial; the UI must label those figures as samples rather than exact lifetime totals.

### 3.8 `contact`

- `api.contact.submit` — public mutation `{ name, email, topic: "support"|"creator"|"payment"|"press"|"other", message, website? }` → `{ ok: true }`. Honeypot `website`; rate-limited per email and globally; stores in `contactMessages`; best-effort team notification.
- `api.contact.listMessages` — admin-only query `{ status?: "new"|"read"|"archived" }` → up to 200 messages, newest first.
- `api.contact.setStatus` — admin-only mutation `{ messageId, status: "new"|"read"|"archived" }` → `null`.
- `api.contact.notify` — internal action, called after a successful submission; skipped when Resend/`SUPPORT_EMAIL` is not configured.

**Debug timestamp fields** (`eventCreatedAt`, `receivedAt`, `createdAt`, `updatedAt`) are **epoch milliseconds — `v.number()`, NOT `_creationTime`**. Convert with `formatDateTime(ms)`.

---

## 4. Shared helpers (import — don't re-implement)

From `@/lib/format` (re-exports `convex/lib/money.ts` + `convex/lib/validation.ts` + `convex/lib/errors.ts`):

```ts
formatMoney(minor, currency, locale?)     // "₦1,500.00" — for display ONLY
fromMinorUnits(minor, currency)           // "1500.00" decimal string (Bachs boundary)
toMinorUnits("15.50", "NGN")              // 1550  (throws on invalid)
parseMajorAmount("15.50", "NGN")          // 1550 | null  — use for form inputs
decimalsFor(currency)                     // 2 for NGN
CURRENCY_DECIMALS

USERNAME_MIN_LENGTH=3, USERNAME_MAX_LENGTH=30, DISPLAY_NAME_MAX_LENGTH=60,
BIO_MAX_LENGTH=500, SUPPORTER_NAME_MAX_LENGTH=60, MESSAGE_MAX_LENGTH=280,
MAX_QUANTITY=10, MIN_BREAD_PRICE_MINOR=10_000 (₦100), MAX_BREAD_PRICE_MINOR=100_000_000,
SUPPORTED_CURRENCIES (includes NGN), normalizeUsername, checkUsernameFormat, isValidEmail

appErrorCode(error): AppErrorCode | null
appErrorMessage(error, fallback?): string        // friendliest available message
appErrorRetryAfterMs(error): number | null       // for rate_limited
```

Shared components (lead-owned, already written):

- `components/require-auth.tsx` → `<RequireAuth title? description?>{children}</RequireAuth>` — handles loading + signed-out states.
- `components/donation-status-badge.tsx` → `<DonationStatusBadge status={"pending"|"paid"|"unresolved"|"refunded"} />`.
- `components/layout/site-header.tsx` / `site-footer.tsx` — already rendered by the root layout.

---

## 5. Work breakdown + file ownership

| Agent | Owns (create/edit ONLY these) | Mission |
|---|---|---|
| **B1** | `app/[username]/**`, `app/thanks/**`, `components/creator/**` | Public creator page (SSR + preloadQuery), donate flow, thanks/status page |
| **B2** | `app/page.tsx`, `app/signin/**`, `app/onboarding/**`, `app/simulated-checkout/**`, `components/landing/**`, `components/auth/**`, `components/onboarding/**`, `components/checkout/**` | Landing page, sign in/up, creator onboarding, simulated checkout |
| **C** | `app/dashboard/**`, `app/admin/**`, `components/dashboard/**`, `components/admin/**` | Creator dashboard (overview, supporters, page editor, payouts/connect) + admin console |
| **D** | `tests/**`, `vitest.config.ts`, `package.json` (devDeps + `"test"` script) | convex-test suite for the money-critical backend paths |
| **Lead** | everything else (`convex/**`, `lib/**`, shared components, docs, git) | integration, fixes, commits, reviews |

### Route map (all current, own your subtree)

| Route | Notes |
|---|---|
| `/` | B2 — landing (placeholder exists — replace it) |
| `/signin` | B2 — password auth, `?flow=signUp` opens the create-account tab |
| `/about` | public — story, values, money flow, author section |
| `/about/author` | public — team author/editorial page |
| `/support` | public — supporter/creator help + FAQ |
| `/contact` | public — contact form, admin inbox persists submissions |
| `/onboarding` | B2 — claim username + set price (auth required) |
| `/[username]` | B1 — SSR creator page + donate card + bread feed |
| `/thanks?ref=` | B1 — reactive donation status |
| `/simulated-checkout?ref=` | B2 — labelled fake checkout (Pay / Fail / Expire) |
| `/dashboard` | C — overview: balances, totals, recent supporters |
| `/dashboard/supporters` | C — paginated + status filter (nuqs) |
| `/dashboard/page` | C — page editor (profile, avatar, price, goal) |
| `/dashboard/payouts` | C — balances, request payout OR connect onboarding, history |
| `/admin` | C — creators, payouts, webhook events, api operations |

---

## 6. Error-handling contract

Backend throws `ConvexError` with `{ code, message, retryAfterMs? }`. In the UI:

```ts
import { toast } from "sonner";
import { appErrorMessage, appErrorRetryAfterMs, appErrorCode } from "@/lib/format";

try {
  await doThing();
} catch (error) {
  const retry = appErrorRetryAfterMs(error);
  toast.error(retry ? `${appErrorMessage(error)} (retry in ${Math.ceil(retry / 1000)}s)` : appErrorMessage(error));
}
```

Use codes for branching where it matters: `rate_limited`, `connect_mode`,
`payout_pending`, `insufficient_available`, `below_minimum_payout`, `simulated_only`.

---

## 7. Notes that prevent known bugs

- **Next 16**: `params` and `searchParams` are **Promises** — `await` them in pages.
- **`useSearchParams`** must be inside a `<Suspense>` boundary or `next build` fails.
- Convex hooks: `useQuery(api.x.y, {…})`, skip with `"skip"` when args aren't ready.
  `usePaginatedQuery(api.donations.listMine, { status }, { initialNumItems: 20 })`.
  Pagination keys: `paginationOpts` is injected by the hook — pass only the other args.
- `api.creators.getMyCreator` is safe to call signed-out; `api.donations.listMine`,
  `getMyStats`, payouts, sellers, and admin queries throw for non-owners/non-admins — wrap them behind `RequireAuth`/`amIAdmin`.
- Money inputs: keep a single minor-unit number in state; parse with `parseMajorAmount`
  on submit (or store the raw string + parse on submit — never store floats).
- The simulated checkout page must be **impossible to mistake for real**: include a
  visible "Simulated payment — no money moves" banner and the driver check.
