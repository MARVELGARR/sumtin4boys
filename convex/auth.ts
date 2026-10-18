import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      /**
       * Persist the display name captured on the sign-up form (the sign-in
       * form sends `name` as an extra param; the default profile drops it).
       * Mirrors the default `{ email }` shape for every other flow.
       */
      profile(params) {
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return {
          email: params.email as string,
          ...(name ? { name } : {}),
        };
      },
    }),
  ],
});
