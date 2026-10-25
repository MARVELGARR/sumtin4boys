import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { resendOtp, resendPasswordReset } from "./authEmails";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      authorization: {
        params: {
          // Google Sign-In only: OpenID identity plus the account's email and
          // basic profile (name + avatar). These are the non-sensitive Google
          // scopes; no Gmail/Drive/Calendar access is requested.
          scope:
            "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        },
      },
    }),
    Password({
      // Require a verified email for password accounts. Google sign-in
      // provides its own verified email, so it is unaffected.
      verify: resendOtp,
      reset: resendPasswordReset,
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
