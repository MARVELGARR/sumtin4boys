import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
// The landing page (`/`) and public creator pages (`/[username]`) are open to
// everyone — only account areas are gated. Client-side guards (`RequireAuth`,
// creator guard) back these up so the UI still behaves when a session expires.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated();
  if (isSignInPage(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
  if (isProtectedRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
