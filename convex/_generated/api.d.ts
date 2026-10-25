/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as authEmails from "../authEmails.js";
import type * as bachs_bachsNode from "../bachs/bachsNode.js";
import type * as bachs_events from "../bachs/events.js";
import type * as bachs_payload from "../bachs/payload.js";
import type * as bachs_provider from "../bachs/provider.js";
import type * as bachs_reconcile from "../bachs/reconcile.js";
import type * as bachs_simulated from "../bachs/simulated.js";
import type * as contact from "../contact.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as donations from "../donations.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as ledger from "../ledger.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_guards from "../lib/guards.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_resend from "../lib/resend.js";
import type * as lib_turnstile from "../lib/turnstile.js";
import type * as lib_validation from "../lib/validation.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as rateLimit from "../rateLimit.js";
import type * as sellers from "../sellers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  authEmails: typeof authEmails;
  "bachs/bachsNode": typeof bachs_bachsNode;
  "bachs/events": typeof bachs_events;
  "bachs/payload": typeof bachs_payload;
  "bachs/provider": typeof bachs_provider;
  "bachs/reconcile": typeof bachs_reconcile;
  "bachs/simulated": typeof bachs_simulated;
  contact: typeof contact;
  creators: typeof creators;
  crons: typeof crons;
  donations: typeof donations;
  emails: typeof emails;
  http: typeof http;
  ledger: typeof ledger;
  "lib/config": typeof lib_config;
  "lib/errors": typeof lib_errors;
  "lib/guards": typeof lib_guards;
  "lib/money": typeof lib_money;
  "lib/resend": typeof lib_resend;
  "lib/turnstile": typeof lib_turnstile;
  "lib/validation": typeof lib_validation;
  payments: typeof payments;
  payouts: typeof payouts;
  rateLimit: typeof rateLimit;
  sellers: typeof sellers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
