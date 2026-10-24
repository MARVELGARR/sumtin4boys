"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SVGProps,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { CircleAlert, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  appErrorCode,
  appErrorMessage,
  DISPLAY_NAME_MAX_LENGTH,
} from "@/lib/format";

type Flow = "signIn" | "signUp";

/**
 * Email + password sign in / sign up.
 *
 * `initialFlow` comes from the server page's awaited `searchParams`; the
 * `?flow=` parameter is also watched here so URL changes (for example the
 * header's "Start my page" link) switch tabs without a remount.
 */
export function SignInForm({ initialFlow }: { initialFlow: Flow }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Keep the tab in sync with `?flow=signUp` / `?flow=signIn` without an
  // effect: adjusting state during render when the URL changes is the
  // React-recommended pattern for derived state.
  const urlFlow = searchParams.get("flow");
  const [flow, setFlow] = useState<Flow>(() =>
    urlFlow === "signUp" ? "signUp" : urlFlow === "signIn" ? "signIn" : initialFlow,
  );
  const [seenUrlFlow, setSeenUrlFlow] = useState(urlFlow);
  if (urlFlow !== seenUrlFlow) {
    setSeenUrlFlow(urlFlow);
    if (urlFlow === "signUp") setFlow("signUp");
    else if (urlFlow === "signIn") setFlow("signIn");
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Only redirect visitors who were ALREADY signed in when the page mounted.
  // After a successful sign-in we deliberately go to /onboarding instead.
  const initialAuthChecked = useRef(false);
  useEffect(() => {
    if (isLoading || initialAuthChecked.current) return;
    initialAuthChecked.current = true;
    if (isAuthenticated) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  function switchFlow(next: Flow) {
    setFlow(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);
      formData.set("flow", flow);
      if (flow === "signUp") formData.set("name", name.trim());
      await signIn("password", formData);
      router.push("/onboarding");
    } catch (caught) {
      // Bad credentials surface as plain errors; app errors (e.g. rate
      // limiting) carry a friendlier backend message.
      const code = appErrorCode(caught);
      const message = code
        ? appErrorMessage(caught)
        : flow === "signUp"
          ? "We couldn't create your account. Check your details and try again."
          : "That email and password combination didn't work.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (submitting || googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    try {
      // Convex Auth redirects the browser to Google and back to SITE_URL +
      // `/onboarding`. Existing creators are bounced to /dashboard there.
      const result = await signIn("google", { redirectTo: "/onboarding" });
      if (!result.redirect) router.push("/onboarding");
    } catch {
      const message =
        "We couldn't start Google sign-in. Please try again in a moment.";
      setError(message);
      toast.error(message);
      setGoogleLoading(false);
    }
  }

  const isSignUp = flow === "signUp";

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xl shadow-primary/5">
      <CardHeader className="gap-1.5 border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6 sm:py-6">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? "It takes a minute — you will claim your username next."
            : "Sign in to manage your page and track your supporters."}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <Tabs
          value={flow}
          onValueChange={(value) => switchFlow(value as Flow)}
          className="mb-6"
        >
          <TabsList className="grid h-9 w-full grid-cols-2">
            <TabsTrigger value="signIn">
              <LogIn className="size-3.5" />
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signUp">
              <UserPlus className="size-3.5" />
              Create account
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 w-full gap-2.5 text-sm"
          onClick={handleGoogle}
          disabled={submitting || googleLoading}
        >
          {googleLoading ? <Spinner /> : <GoogleIcon className="size-4" />}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </Button>

        <div className="my-5 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            or use email
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            {isSignUp ? (
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ada"
                  autoComplete="name"
                  maxLength={DISPLAY_NAME_MAX_LENGTH}
                  required
                  disabled={submitting}
                  className="h-10"
                />
                <FieldDescription>
                  The name your supporters will see.
                </FieldDescription>
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={submitting}
                className="h-10"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <InputGroup className="h-10">
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  minLength={8}
                  required
                  disabled={submitting}
                  className="h-full px-3 text-base md:text-sm"
                />
                <InputGroupAddon align="inline-end" className="pr-1">
                  <InputGroupButton
                    size="icon-sm"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {isSignUp ? (
                <FieldDescription>At least 8 characters.</FieldDescription>
              ) : null}
            </Field>

            {error ? (
              <Alert
                variant="destructive"
                className="border-destructive/25 bg-destructive/5"
              >
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="mt-1 h-11 w-full text-sm"
              disabled={submitting}
            >
              {submitting ? <Spinner /> : null}
              {submitting
                ? isSignUp
                  ? "Creating account…"
                  : "Signing in…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link
                href="/signin?flow=signIn"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href="/signin?flow=signUp"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Start my page
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

/** Official four-colour Google "G", inlined so there is no extra asset. */
function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
