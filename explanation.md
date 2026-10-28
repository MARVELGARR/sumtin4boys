# Comprehensive Backend Architecture & Compliance Guide
**Project:** `anything4boys` (Creator Monetization & Tipping Platform)  
**Technology Stack:** Next.js (App Router) + Convex (Serverless Reactive Database & Backend) + Bachs Payment Infrastructure

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Regulatory & Financial Compliance Framework](#3-regulatory--financial-compliance-framework)
   - [3.1 Marketplace vs. Custodian Money Model](#31-marketplace-vs-custodian-money-model)
   - [3.2 PCI-DSS Compliance & Card Data Isolation](#32-pci-dss-compliance--card-data-isolation)
   - [3.3 Anti-Money Laundering (AML) & Fraud Controls](#33-anti-money-laundering-aml--fraud-controls)
   - [3.4 Data Privacy (NDPR / GDPR Compliance)](#34-data-privacy-ndpr--gdpr-compliance)
   - [3.5 Double-Entry Accounting & Ledger Invariants](#35-double-entry-accounting--ledger-invariants)
4. [Deep Dive: Backend Mechanics & Execution Flows](#4-deep-dive-backend-mechanics--execution-flows)
   - [4.1 Two-Phase Checkout & Idempotency Pipeline](#41-two-phase-checkout--idempotency-pipeline)
   - [4.2 Webhook Ingestion & Cryptographic Verification](#42-webhook-ingestion--cryptographic-verification)
   - [4.3 Atomic Fulfilment Pipeline & Out-of-Order Safety](#43-atomic-fulfilment-pipeline--out-of-order-safety)
   - [4.4 Background Settlement & Autonomous Reconciliation](#44-background-settlement--autonomous-reconciliation)
   - [4.5 Payout Lifecycle (Platform vs. Connect)](#45-payout-lifecycle-platform-vs-connect)
   - [4.6 Role-Based Access Control (RBAC) & Security Guards](#46-role-based-access-control-rbac--security-guards)
5. [Environment & Payment Gateway Configuration](#5-environment--payment-gateway-configuration)
   - [5.1 Environment Variables Reference](#51-environment-variables-reference)
   - [5.2 Active Sandbox Key & Testing Strategy](#52-active-sandbox-key--testing-strategy)
6. [Operational Readiness & Audit Checklist](#6-operational-readiness--audit-checklist)

---

## 1. Executive Summary

`anything4boys` is a creator monetization platform built for African builders, developers, writers, podcasters, and entertainers. Supporters send financial appreciation ("tearing small bread") with personal messages in a friction-free, 3-tap checkout without requiring an account or app download.

The backend is engineered on **Convex**, a unified TypeScript-native backend platform that provides reactive database subscriptions, strictly serialized ACID mutations, isolated actions, and built-in cron scheduling. All payment processing, card tokenization, and settlement orchestration are delegated to **Bachs** (`bachs.io`), an infrastructure provider for local African and international payments.

---

## 2. End-to-End System Architecture

The following diagram illustrates the relationship between the supporter, the Next.js frontend, Convex functions, the Bachs payment gateway, and the ledger:

```mermaid
sequenceDiagram
    autonumber
    actor Supporter
    participant Client as Next.js (App Router)
    participant ConvexAction as Convex Action (donations.createCheckout)
    participant ConvexDB as Convex DB (ACID Mutations)
    participant Bachs as Bachs Gateway (bachs.io)
    actor Creator

    Supporter->>Client: Selects bread quantity & enters message
    Client->>ConvexAction: createCheckout({ attemptId, username, quantity, supporterName, message })
    Note over ConvexAction: 1. Rate-limit IP & Email<br/>2. Recompute amount server-side<br/>3. Generate unique reference & idempotency key
    ConvexAction->>ConvexDB: internalMutation: insert donation (pending) & apiOperation (started)
    ConvexAction->>Bachs: POST /v1/checkout-sessions (Idempotency-Key, decimal amounts)
    Bachs-->>ConvexAction: Returns checkoutId & hosted checkout URL
    ConvexAction->>ConvexDB: Update donation with checkoutId; mark apiOperation succeeded
    ConvexAction-->>Client: Return hosted checkout URL
    Client-->>Supporter: Redirect to Bachs Hosted Checkout

    Supporter->>Bachs: Completes payment (Card, Bank Transfer, USSD)
    Bachs-->>Client: Redirect to /thanks?ref=... (Informational only!)
    Bachs->>ConvexDB: POST /bachs/webhook (Raw Body + X-Bachs-Signature-V2)

    Note over ConvexDB: 1. Cryptographic Signature Verification (HMAC-SHA256)<br/>2. Retrieve checkout & match amount/currency<br/>3. Deduplicate event in webhookEvents<br/>4. Atomic Mutation: donation -> paid<br/>5. Append ledgerEntries (gross + fee)<br/>6. Schedule creator notification email
    ConvexDB-->>Bachs: HTTP 200 OK (Durable state committed)
    ConvexDB-->>Client: Real-time query updates /thanks and Creator Dashboard
    ConvexDB-->>Creator: Push notification / Live supporter wall update
```

---

## 3. Regulatory & Financial Compliance Framework

Operating a financial technology application handling payments, creator payouts, and customer transactions requires adhering to strict regulatory, compliance, and accounting standards.

### 3.1 Marketplace vs. Custodian Money Model

A core compliance decision in financial architecture is whether the platform operates as a **custodian of funds** or as a **marketplace facilitator**:

| Dimension | Platform Custodian Model (Default Fallback) | Bachs Connect Destination Charges (Target) |
|---|---|---|
| **Funds Flow** | Platform receives 100% of money into platform bank account. Platform holds balances in an internal database and disburses payouts upon request. | Payment is made directly to a destination sub-account owned by the creator. Platform fee is deducted at settlement. |
| **Regulatory Burden** | **High**: Platform is technically holding deposits/custody. Requires money transmission or escrow licenses depending on jurisdiction (e.g., CBN guidelines in Nigeria). | **Low**: The licensed payment gateway (Bachs) handles the regulatory custody, settlement, and KYC. Platform only facilitates transactions. |
| **Accounting Invariant** | Platform assumes full balance-sheet liability for unpaid creator funds. | Funds settle into creator's verified account; platform only tracks fee revenue. |
| **Code Implementation** | Managed in `convex/payouts.ts` via manual withdrawal requests, ledger reserves, and admin approval. | Managed via `convex/sellers.ts` with Bachs Connect seller onboarding. |

> **Compliance Posture:** `anything4boys` implements the marketplace model abstraction behind `resolvePaymentsDriver()` and `connectEnabled()`. In fallback mode, strict double-entry ledger bookkeeping ensures 100% mathematical auditability so no unbacked balances can ever be claimed.

---

### 3.2 PCI-DSS Compliance & Card Data Isolation

Under the **Payment Card Industry Data Security Standard (PCI-DSS)**, any entity that stores, processes, or transmits primary account numbers (PAN) must maintain comprehensive security auditing.

1. **Zero Cardholder Data Exposure (SAQ-A Eligibility):**
   - No credit card numbers, CVVs, expiry dates, or banking credentials ever touch the Next.js server or Convex database.
   - All payment collection occurs within **Bachs Hosted Checkout** iframe/redirects.
   - The browser never submits sensitive card data to our domain.
2. **Tokenized References:**
   - Convex stores only abstract payment tokens: `checkoutId` (e.g., `chk_...`), `paymentId` (e.g., `chg_...`), and a collision-resistant internal `reference`.
3. **No Fulfillment from Browser State:**
   - Redirecting to `/thanks?ref=...` is treated as strictly informational.
   - The system **never** grants access or marks a donation as `paid` based on a client query parameter or client-side redirect.

---

### 3.3 Anti-Money Laundering (AML) & Fraud Controls

Tipping and donation platforms are frequent targets for **card-testing attacks** (where fraudsters test stolen card numbers with low-dollar transactions) and money laundering. The backend employs multiple defensive layers:

```
[ Incoming Request ]
       │
       ▼
1. Rate Limiting Check
   ├── Per-IP rate limits (Convex @convex-dev/rate-limiter)
   └── Per-Email velocity limits
       │
       ▼
2. Input Sanitization & Bounds
   ├── Per-currency pricing helpers & minimum validation
   ├── Maximum quantity cap (MAX_QUANTITY = 50 breads)
   ├── Display name & message length caps (140-500 chars)
   └── Strict regex validation on usernames & emails
       │
       ▼
3. Server-Side Price Verification
   └── Client amount is DISCARDED; price is recomputed from creator database profile
       │
       ▼
4. Identity & KYC Verification
   └── Creators must undergo verification (Bachs Connect onboardingStatus: "enabled")
```

- **Server-Side Recomputation:** The client cannot manipulate the price. If a client attempts to pass `amount: 10`, the server ignores it and computes `amount = creator.coffeePrice * quantity` (the stored field is exposed publicly as `breadPrice`).
- **Velocity Checks:** Rapid successive checkout attempts from a single IP or targeted at a single creator are rejected with HTTP 429 (`rate_limited`).
- **Creator Verification:** Creators whose pages are marked `status: "suspended"` cannot receive checkouts or request payouts.

---

### 3.4 Data Privacy (NDPR / GDPR Compliance)

Under the **Nigeria Data Protection Regulation (NDPR)** and **GDPR**:

1. **Supporter Privacy & Anonymity:**
   - Supporters can toggle `isPrivate: true`. Private donations are excluded from public queries (`api.creators.getByUsername`).
   - Private messages and names appear only on the creator's private authenticated dashboard (`api.donations.listMine`).
2. **PII Masking:**
   - Supporter emails are stored strictly for receipt delivery and transaction dispute handling.
   - Public feeds never expose email addresses or IP addresses.
3. **Right to Erasure & Creator Moderation:**
   - Creators can hide offensive or abusive messages from their public wall via `hidden: true` flags.
   - Admins can suspend bad actors and prune PII upon formal request.

---

### 3.5 Double-Entry Accounting & Ledger Invariants

Financial balances are never stored as mutable numbers directly incremented or decremented (e.g., `creator.balance += 5000` is strictly forbidden). Instead, the system uses an **append-only ledger** (`ledgerEntries`) following double-entry principles.

#### Ledger Entry Types
- `donation`: Gross amount of a confirmed donation (+).
- `fee`: Platform revenue deducted from the donation (-).
- `refund`: Gross amount returned to the supporter (-).
- `fee_reversal`: Platform fee refunded back (+).
- `payout`: Funds reserved or disbursed to creator's bank account (-).
- `payout_reversal`: Funds restored if a bank payout fails (+).
- `adjustment`: Explicit administrative correction requiring an audit note (+/-).

#### The Core Invariant
$$\text{balancePending} + \text{balanceAvailable} = \sum_{\text{all entries}} \text{amount}$$

```
Supporter Pays ₦3,000 (3 Breads, 5% Platform Fee = ₦150)
────────────────────────────────────────────────────────────
Ledger Entry 1 (Donation):  +₦3,000 (pending settlement)
Ledger Entry 2 (Fee):       -₦150   (platform cut)
Net Creator Addition:       +₦2,850

After 24h Settlement Hold:
Ledger Status:              pending ──► settled
Creator Balances:           balancePending: ₦0
                            balanceAvailable: +₦2,850
```

- **Payout Reservations:** When a creator requests a payout of ₦2,000, a negative settled entry (`amount: -2000`) is written **in the exact same ACID transaction** as the payout record. It is mathematically impossible for a creator to double-request or overdraw their balance.

---

## 4. Deep Dive: Backend Mechanics & Execution Flows

### 4.1 Two-Phase Checkout & Idempotency Pipeline
Located in [`convex/donations.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/donations.ts) and [`convex/bachs/bachsNode.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/bachs/bachsNode.ts).

1. **Public Action:** The client invokes `api.donations.createCheckout`. Actions in Convex run in a Node.js runtime capable of external HTTP network requests.
2. **Phase 1 (Database Transaction):**
   - The browser creates one `attemptId` UUID when the form opens and sends it with every retry.
   - The action executes `internalMutation: donations.startCheckout`.
   - It first looks up `donations.by_attemptId`. If this attempt already exists, it verifies the fields match and returns the original donation + hosted `checkoutUrl` without consuming rate-limit capacity or calling Bachs again.
   - For a new attempt, it generates a crypto-random, non-colliding `reference` (e.g., `a4b_...`).
   - It inserts the donation with `attemptId`, `status: "pending"`, and an `apiOperations` row with status `"started"`. The Bachs idempotency key is derived server-side from the donation reference.
3. **Phase 2 (Gateway Call):**
   - The action calls Bachs: `POST /v1/checkout-sessions` sending the persisted `Idempotency-Key` header and decimal string amounts (e.g., `"3000.00"` NGN).
   - If Bachs returns `201 Created`:
     - Updates donation with `checkoutId` + `checkoutUrl` and marks `apiOperations` as `succeeded`.
     - Returns the hosted checkout URL to the frontend. A retry with the same `attemptId` returns this stored URL instead of creating another checkout.
   - If Bachs returns a network error, timeout, or 5xx:
     - The outcome is unknown. The operation is marked `status: "outcome_unknown"`.
     - **Crucial Rule:** The backend does **not** generate a new key or blindly retry. The background reconciliation cron resolves the uncertain write using the original idempotency key.

---

### 4.2 Webhook Ingestion & Cryptographic Verification
Located in [`convex/http.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/http.ts) and [`convex/bachs/bachsNode.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/bachs/bachsNode.ts).

```
Incoming POST /bachs/webhook
             │
             ▼
Read raw request text: await request.text()
(DO NOT PARSE JSON YET!)
             │
             ▼
Extract header: X-Bachs-Signature-V2
             │
             ▼
HMAC-SHA256 Verification with BACHS_WEBHOOK_SECRET
   ├── Invalid Signature? ──► Return HTTP 400 Bad Request
   └── Valid Signature?
             │
             ▼
Parse JSON payload & extract event ID
             │
             ▼
Execute internalMutation: processCheckoutEvent
   ├── Processing Succeeded? ──► Return HTTP 200 OK
   └── Internal Crash / Throw? ──► Return HTTP 500 Internal Error
                                 (Instructs Bachs to retry delivery)
```

- **Raw Text Integrity:** Signatures are computed over the exact byte stream. Parsing JSON before verification risks whitespace or property reordering altering the hash.
- **HTTP Status Code Hygiene:**
  - Returning `4xx` tells Bachs: *"You sent an invalid request; do not retry."* (Used exclusively for bad signatures).
  - Returning `5xx` tells Bachs: *"Our server had a temporary issue; retry delivery with exponential backoff."*
  - Returning `2xx` confirms durable database persistence.

---

### 4.3 Atomic Fulfilment Pipeline & Out-of-Order Safety
Located in [`convex/bachs/events.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/bachs/events.ts).

When a webhook arrives or reconciliation runs, all mutations occur inside a single atomic database transaction:

1. **Deduplication:** Looks up `eventId` in `webhookEvents`. If already present, skips processing with outcome `"duplicate"`.
2. **Order Protection:** Compares `eventCreatedAt` against `donation.lastEventAt`. If a stale event arrives out of order, it is recorded but will not overwrite newer state.
3. **Amount & Currency Parity Check:**
   ```typescript
   if (checkout.currency !== donation.currency || checkout.amountMinor !== donation.amount) {
     // Mark as mismatch for admin review; DO NOT credit creator balance!
     return { outcome: "mismatch" };
   }
   ```
4. **State Machine Transitions:**
   $$\text{pending} \xrightarrow{\text{checkout.completed}} \text{paid} \xrightarrow{\text{refund.paid}} \text{refunded}$$
   $$\text{pending} \xrightarrow{\text{checkout.expired}} \text{unresolved} \xrightarrow{\text{late checkout.completed}} \text{paid}$$
   *Note: `unresolved` is not a terminal failure; late-arriving successful bank transfers can still transition the donation to `paid`.*
5. **Ledger Commit:** Creates double-sided entries for donation gross and platform fee, updating creator balances reactively.

---

### 4.4 Background Settlement & Autonomous Reconciliation
Located in [`convex/bachs/reconcile.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/bachs/reconcile.ts) and [`convex/crons.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/crons.ts).

Two periodic background crons run automatically:

1. **`reconcilePendingDonations` (Every 15 minutes):**
   - Queries donations stuck in `pending` or `unresolved` state for more than 30 minutes.
   - Actively calls Bachs API (`GET /v1/checkout-sessions/:id`) to check if the supporter completed payment outside webhook delivery.
   - Feeds the live state through the same idempotent `processCheckoutEvent` pipeline.
2. **`reconcileUncertainOperations` (Every 10 minutes):**
   - Detects operations marked `outcome_unknown` from previous timeouts.
   - Replays the request with the identical `Idempotency-Key` to safely learn the outcome without creating duplicate charges.
3. **Settlement Rollover:**
   - Moves ledger entries from `settlementStatus: "pending"` to `"settled"` once the holding window (default 24 hours) elapses, moving funds from `balancePending` to `balanceAvailable`.

---

### 4.5 Payout Lifecycle (Platform vs. Connect)
Located in [`convex/payouts.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/payouts.ts) and [`convex/admin.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/admin.ts).

```
Creator clicks "Request Payout" (Net amount: ₦20,000)
                    │
                    ▼
Validate: net >= per-currency minimum && net + fee <= withdrawable
                    │
                    ▼
Convex Mutation (Atomic):
  1. Insert payout row (status: "requested", amount: ₦20,000, fee: ₦50)
  2. Append ledger entry: -₦20,050 (settled)
  3. Creator balanceAvailable immediately drops by ₦20,050
                    │
                    ▼
Admin Reviews in Admin Dashboard (/admin)
  ├── Bank Transfer Initiated ──► Status: "processing"
  ├── Bank Transfer Confirmed ──► Status: "paid"
  └── Bank Rejects / Fails ──► Status: "failed"
                                  │
                                  ▼
                    Auto-trigger Payout Reversal:
                    Append ledger entry: +₦20,000 (payout_reversal)
                    Creator balanceAvailable is fully restored!
```

---

### 4.6 Role-Based Access Control (RBAC) & Security Guards
Located in [`convex/lib/guards.ts`](file:///c:/Users/USER/Desktop/sumtin4boys/convex/lib/guards.ts).

- `requireUser(ctx)`: Ensures caller is authenticated via Convex Auth.
- `requireCreator(ctx)`: Verifies caller owns an active creator profile. Prohibits accessing another creator's payout history or settings.
- `requireAdmin(ctx)`: Verifies the caller's email is in the configured `ADMIN_EMAILS` whitelist **and** that the email is verified (`emailVerificationTime`). This protects manual payout approvals, creator suspension/reactivation, balance recomputation, contact messages, audit logs, and the read-only telemetry queries in `convex/adminTelemetry.ts`.
- The `/admin` page adds two more layers: auth middleware gates the route, and the client `amIAdmin` gate does not mount any sensitive table until admin access is confirmed. Telemetry money is always bucketed per currency; overview/held scans are bounded and marked sampled, with a creator detail drawer for recent donations, payouts, and ledger entries.

---

## 5. Environment & Payment Gateway Configuration

### 5.1 Environment Variables Reference

| Variable | Type | Default | Description |
|---|---|---|---|
| `BACHS_API_KEY` | `string` | *(None)* | Secret API key from Bachs dashboard. Starts with `sk_sandbox_` or `sk_live_`. |
| `BACHS_ENV` | `"sandbox" \| "production"` | `"sandbox"` | Determines whether `https://sandbox-api.bachs.io` or `https://api.bachs.io` is targeted. |
| `BACHS_WEBHOOK_SECRET` | `string` | *(None)* | Secret used to verify cryptographic webhook signatures (`X-Bachs-Signature-V2`). |
| `PAYMENTS_DRIVER` | `"bachs" \| "simulated"` | `"simulated"` *(if key missing)* | When set to `bachs`, enforces live network gateway calls. `simulated` provides full local test checkouts. |
| `CONNECT_ENABLED` | `"true" \| "false"` | `"false"` | Activates Bachs Connect destination charges once marketplace access is granted. |
| `PLATFORM_FEE_BPS` | `string` | `"500"` (5%) | Legacy fallback for currencies other than NGN/USD. NGN is fixed at 5% (₦20 minimum) and USD at 10% ($1 minimum) in `convex/lib/pricing.ts`. |
| `SETTLEMENT_HOLD_HOURS`| `string` | `"24"` | Holding window before received funds become withdrawable. |
| `APP_URL` | `string` | `"http://localhost:3000"` | Final Next.js origin used for email links and the destination of checkout redirects. |
| `CHECKOUT_REDIRECT_URL` | `string` | `CONVEX_SITE_URL` | Public base URL given to Bachs for checkout success/cancel redirects. The Convex-site routes 302 back to `APP_URL`, so local development needs no tunnel. |
| `ADMIN_EMAILS` | `string` | *(None)* | Comma-separated list of admin emails for RBAC access. |

### 5.2 Sandbox Key & Testing Strategy

Do **not** commit real Bachs keys. Set the sandbox key as a Convex deployment
environment variable (or in an ignored local env file):

```bash
BACHS_API_KEY=sk_sandbox_your_key_here
BACHS_ENV=sandbox
```

Rotate any key that has ever appeared in a document, commit, or chat log.

#### Dual Driver Testing:
1. **Bachs Sandbox Mode (`PAYMENTS_DRIVER=bachs`):**
   - Connects to `https://sandbox-api.bachs.io`.
   - Generates real hosted checkout sessions.
   - Webhooks go to the deployment's public `https://<deployment>.convex.site/bachs/webhook` URL — no tunnel needed.
   - Checkout success/cancel URLs go through `https://<deployment>.convex.site/checkout/*`, which then redirects the browser back to `APP_URL` (default `http://localhost:3000`) — also no tunnel needed.
2. **Simulated Driver (`PAYMENTS_DRIVER=simulated`):**
   - Works 100% offline with zero external network dependencies.
   - Exercises the entire double-entry ledger, webhook events, and settlement pipeline.

---

## 6. Operational Readiness & Audit Checklist

Before transitioning from sandbox to production:

- [x] **Card Data Isolation:** Verified zero cardholder data touches application servers.
- [x] **Amount Parity Check:** Client-submitted amounts are completely ignored; amounts are strictly computed from database creator rates.
- [x] **Idempotency Guarantees:** Unique idempotency keys are persisted before any gateway request is dispatched.
- [x] **Signature Verification:** Raw text request bodies are cryptographically validated using HMAC-SHA256 before JSON parsing.
- [x] **Deduplication:** Webhook events are idempotently deduplicated via `webhookEvents`.
- [x] **Out-of-Order Safety:** Stale events arriving after newer states are rejected using `lastEventAt`.
- [x] **Double-Entry Ledger:** Balance invariants hold across donations, platform fees, refunds, and payout reversals.
- [x] **RBAC Isolation:** Multi-tenant creator data is strictly scoped via `requireCreator(ctx)`.
- [ ] **Production Key Swap:** Replace `sk_sandbox_...` with `sk_live_...` and set `BACHS_ENV=production`.
- [ ] **Webhook Endpoint Registration:** Register production webhook URL in the Bachs Dashboard and set `BACHS_WEBHOOK_SECRET`.
- [ ] **Admin Allowlist:** Configure `ADMIN_EMAILS` in Convex environment variables.

---
*Document generated as the authoritative technical and compliance specification for the `anything4boys` platform.*
