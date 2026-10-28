/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { appErrorCode } from "../lib/errors";
import {
  makeCreatorWithUser,
  makeTest,
  newRequestId,
  withEnv,
} from "./helpers.test-utils";

const VALID = {
  username: "ada",
  quantity: 1,
  supporterName: "Sam Supporter",
  supporterEmail: "sam@test.com",
  isPrivate: false,
  tipBps: 0,
  coverProcessingFee: true,
};

type CheckoutOverrides = Partial<typeof VALID> & {
  turnstileToken?: string;
};

function checkoutArgs(overrides: CheckoutOverrides = {}) {
  return { ...VALID, attemptId: newRequestId(), ...overrides };
}

const TURNSTILE_ENV = {
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  TURNSTILE_SITE_KEY: "turnstile-site-key",
};

function siteverify(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Turnstile checkout protection", () => {
  it("does not require a token when Turnstile is not configured", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });

    const mode = await t.query(api.payments.mode, {});
    expect(mode.turnstileRequired).toBe(false);
    expect(mode.turnstileSiteKey).toBeUndefined();

    const result = await t.action(api.donations.createCheckout, checkoutArgs());
    expect(result.status).toBe("redirect");
  });

  it("rejects a missing token before creating any donation", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await withEnv(TURNSTILE_ENV, async () => {
      await expect(
        t.action(api.donations.createCheckout, checkoutArgs()),
      ).rejects.toMatchObject({ data: { code: "verification_failed" } });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(0);
  });

  it("fails closed when verification is rejected", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => siteverify({ success: false, "error-codes": ["invalid-input-response"] })),
    );

    await withEnv(TURNSTILE_ENV, async () => {
      const error = await t
        .action(api.donations.createCheckout, checkoutArgs({
          turnstileToken: "bad-token",
        }))
        .catch((caught: unknown) => caught);
      expect(appErrorCode(error)).toBe("verification_failed");
    });

    const donations = await t.run(async (ctx) =>
      ctx.db.query("donations").collect(),
    );
    expect(donations).toHaveLength(0);
  });

  it("fails closed when siteverify is unavailable", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    await withEnv(TURNSTILE_ENV, async () => {
      await expect(
        t.action(api.donations.createCheckout, checkoutArgs({
          turnstileToken: "token",
        })),
      ).rejects.toMatchObject({ data: { code: "verification_failed" } });
    });
  });

  it("requires the token action to be checkout, not another widget", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => siteverify({ success: true, action: "login" })),
    );

    await withEnv(TURNSTILE_ENV, async () => {
      await expect(
        t.action(api.donations.createCheckout, checkoutArgs({
          turnstileToken: "token-for-login",
        })),
      ).rejects.toMatchObject({ data: { code: "verification_failed" } });
    });
  });

  it("passes a valid checkout token through to siteverify", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });
    const fetchMock = vi.fn(async () =>
      siteverify({ success: true, action: "checkout" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await withEnv(TURNSTILE_ENV, async () => {
      const result = await t.action(api.donations.createCheckout, checkoutArgs({
        turnstileToken: "valid-token",
      }));
      expect(result.status).toBe("redirect");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    const body = new URLSearchParams(String(init.body));
    expect(body.get("secret")).toBe("turnstile-secret");
    expect(body.get("response")).toBe("valid-token");
  });

  it("does not enable checkout when only half of the Turnstile config exists", async () => {
    const t = makeTest();
    await makeCreatorWithUser(t, { username: "ada" });

    await withEnv(
      { TURNSTILE_SECRET_KEY: "turnstile-secret" },
      async () => {
        const mode = await t.query(api.payments.mode, {});
        expect(mode.checkoutReady).toBe(false);
        expect(mode.turnstileRequired).toBe(true);

        await expect(
          t.action(api.donations.createCheckout, checkoutArgs()),
        ).rejects.toMatchObject({ data: { code: "payments_unavailable" } });
      },
    );
  });
});
