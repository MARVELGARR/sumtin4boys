import type { ViteUserConfig } from "vitest/config";

// NOTE: `defineConfig` from "vitest/config" cannot be imported at runtime here:
// on Node < 20.19 its CJS entry requires the ESM-only `std-env` package and
// throws ERR_REQUIRE_ESM while loading this CommonJS-loaded config file.
// The plain object below is the same shape `defineConfig` returns, typed via
// `satisfies ViteUserConfig`, so `npx vitest run` works on this environment.
export default {
  test: {
    environment: "edge-runtime",
  },
} satisfies ViteUserConfig;
