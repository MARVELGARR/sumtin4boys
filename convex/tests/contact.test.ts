/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import {
  forUser,
  makeTest,
  makeUser,
  withEnv,
} from "./helpers.test-utils";

const VALID = {
  name: "Ada Supporter",
  email: "ada@example.com",
  topic: "support" as const,
  message: "I sent a payment but the creator page still shows pending.",
};

describe("contact form", () => {
  it("stores a valid message for the admin inbox", async () => {
    const t = makeTest();
    await t.mutation(api.contact.submit, VALID);

    const rows = await t.run(async (ctx) =>
      ctx.db.query("contactMessages").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Ada Supporter",
      email: "ada@example.com",
      topic: "support",
      status: "new",
    });
    expect(rows[0].message).toContain("payment");
  });

  it("silently ignores a honeypot submission without storing it", async () => {
    const t = makeTest();
    const result = await t.mutation(api.contact.submit, {
      ...VALID,
      website: "https://spam.example",
    });
    expect(result.ok).toBe(true);

    const rows = await t.run(async (ctx) =>
      ctx.db.query("contactMessages").collect(),
    );
    expect(rows).toHaveLength(0);
  });

  it("rejects invalid contact details", async () => {
    const t = makeTest();
    await expect(
      t.mutation(api.contact.submit, { ...VALID, email: "not-an-email" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });
    await expect(
      t.mutation(api.contact.submit, { ...VALID, message: "too short" }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });
  });

  it("rate-limits repeated submissions from one email", async () => {
    const t = makeTest();
    for (let index = 0; index < 3; index += 1) {
      await t.mutation(api.contact.submit, VALID);
    }
    await expect(
      t.mutation(api.contact.submit, VALID),
    ).rejects.toMatchObject({ data: { code: "rate_limited" } });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("contactMessages").collect(),
    );
    expect(rows).toHaveLength(3);
  });

  it("keeps the inbox admin-only and lets admins triage messages", async () => {
    const t = makeTest();
    await t.mutation(api.contact.submit, VALID);
    const outsider = await makeUser(t, "outsider@test.com");
    const admin = await makeUser(t, "admin@test.com", "Admin", {
      emailVerified: true,
    });

    await expect(
      forUser(t, outsider).query(api.contact.listMessages, {}),
    ).rejects.toMatchObject({ data: { code: "forbidden" } });

    await withEnv({ ADMIN_EMAILS: "admin@test.com" }, async () => {
      const rows = await forUser(t, admin).query(api.contact.listMessages, {});
      expect(rows).toHaveLength(1);

      await forUser(t, admin).mutation(api.contact.setStatus, {
        messageId: rows[0]._id,
        status: "read",
      });

      const updated = await forUser(t, admin).query(api.contact.listMessages, {
        status: "read",
      });
      expect(updated).toHaveLength(1);
      expect(updated[0].status).toBe("read");
    });
  });
});
