/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  forUser,
  getCreator,
  makeCreatorWithUser,
  makeTest,
  type Test,
} from "./helpers.test-utils";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

async function storeAvatar(
  t: Test,
  contentType: string,
  size = 32,
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array(size)], { type: contentType }),
    );
    // convex-test's storage fake records size/sha256 but not the browser
    // Blob's content type, which a real Convex deployment does persist.
    const storage = ctx.db as unknown as {
      patch: (
        table: "_storage",
        id: Id<"_storage">,
        value: { contentType: string; size: number },
      ) => Promise<void>;
    };
    await storage.patch("_storage", storageId, { contentType, size });
    return storageId;
  });
}

describe("avatar uploads", () => {
  it("accepts png, jpeg and webp uploads", async () => {
    const t = makeTest();
    const { userId, creatorId } = await makeCreatorWithUser(t, { username: "ada" });

    for (const contentType of ["image/png", "image/jpeg", "image/webp"]) {
      const storageId = await storeAvatar(t, contentType);
      await forUser(t, userId).mutation(api.creators.setAvatar, { storageId });
      expect((await getCreator(t, creatorId)).avatarStorageId).toBe(storageId);
    }
  });

  it("rejects non-raster image types and files larger than 2 MB", async () => {
    const t = makeTest();
    const { userId, creatorId } = await makeCreatorWithUser(t, { username: "ada" });

    for (const contentType of ["image/gif", "image/svg+xml", "text/plain"]) {
      const storageId = await storeAvatar(t, contentType);
      await expect(
        forUser(t, userId).mutation(api.creators.setAvatar, { storageId }),
      ).rejects.toMatchObject({ data: { code: "invalid_input" } });
    }

    const tooLarge = await storeAvatar(t, "image/png", MAX_AVATAR_BYTES + 1);
    await expect(
      forUser(t, userId).mutation(api.creators.setAvatar, { storageId: tooLarge }),
    ).rejects.toMatchObject({ data: { code: "invalid_input" } });

    expect((await getCreator(t, creatorId)).avatarStorageId).toBeUndefined();
  });

  it("deletes the previous file when replacing or removing an avatar", async () => {
    const t = makeTest();
    const { userId, creatorId } = await makeCreatorWithUser(t, { username: "ada" });

    const first = await storeAvatar(t, "image/png");
    await forUser(t, userId).mutation(api.creators.setAvatar, { storageId: first });

    const second = await storeAvatar(t, "image/webp");
    await forUser(t, userId).mutation(api.creators.setAvatar, { storageId: second });

    expect((await getCreator(t, creatorId)).avatarStorageId).toBe(second);
    expect(
      await t.run(async (ctx) => ctx.db.system.get("_storage", first)),
    ).toBeNull();

    await forUser(t, userId).mutation(api.creators.removeAvatar, {});
    expect((await getCreator(t, creatorId)).avatarStorageId).toBeUndefined();
    expect(
      await t.run(async (ctx) => ctx.db.system.get("_storage", second)),
    ).toBeNull();
  });
});
