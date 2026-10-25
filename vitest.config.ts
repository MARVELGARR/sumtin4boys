import type { ViteUserConfig } from "vitest/config";

// NOTE: `defineConfig` from "vitest/config" cannot be imported at runtime here:
// on Node < 20.19 its CJS entry requires the ESM-only `std-env` package and
// throws ERR_REQUIRE_ESM while loading this CommonJS-loaded config file.
// The plain object below is the same shape `defineConfig` returns, typed via
// `satisfies ViteUserConfig`, so `npx vitest run` works on this environment.
export default {
  test: {
    environment: "edge-runtime",
    testTimeout: 15000,
    // Tests run the fake payment driver in-process. These are test-only values:
    // `ALLOW_SIMULATED` is the second explicit opt-in required by
    // convex/lib/config.ts, and CONVEX_SITE_URL gives checkout payloads a
    // public redirect base (Bachs rejects localhost).
    env: {
      CONVEX_SITE_URL: "https://example.convex.site",
      PAYMENTS_DRIVER: "simulated",
      ALLOW_SIMULATED: "true",
    },
  },
} satisfies ViteUserConfig;
