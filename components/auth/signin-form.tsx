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
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
} from "lucide-react";
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
type Step = "credentials" | "verifyEmail" | "resetRequest" | "resetVerify";

const CODE_LENGTH = 6;

/**
 * Email + password sign in / sign up, plus the two follow-up flows:
 * email verification and password reset. Both use a 6-digit Resend code.
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

  const [step, setStep] = useState<Step>("credentials");

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
    else if (urlFlow === "signIn") {
      setFlow("signIn");
      setStep("credentials");
    }
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    setStep("credentials");
    setError(null);
    setPassword("");
    setCode("");
    setShowPassword(false);
  }

  function backToSignIn() {
    setStep("credentials");
    setError(null);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  function startReset() {
    setStep("resetRequest");
    setError(null);
    setPassword("");
    setCode("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const emailValue = email.trim();
    const normalizedCode = code.replace(/\s/g, "");

    if (
      (step === "verifyEmail" || step === "resetVerify") &&
      !/^\d{6}$/.test(normalizedCode)
    ) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (step === "resetVerify") {
      if (newPassword.length < 8) {
        setError("Your new password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("The two passwords don't match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", emailValue);

      if (step === "credentials") {
        formData.set("password", password);
        formData.set("flow", flow);
        if (flow === "signUp") formData.set("name", name.trim());
        const result = await signIn("password", formData);
        if (result.signingIn) {
          router.push("/onboarding");
        } else {
          // Sign-up and unverified sign-in now send a code instead of
          // establishing a session.
          setStep("verifyEmail");
          setCode("");
          setPassword("");
          toast.success("Check your email for a 6-digit code.");
        }
        return;
      }

      if (step === "verifyEmail") {
        formData.set("flow", "email-verification");
        formData.set("code", normalizedCode);
        const result = await signIn("password", formData);
        if (!result.signingIn) {
          throw new Error("Could not verify code");
        }
        router.push("/onboarding");
        return;
      }

      if (step === "resetRequest") {
        formData.set("flow", "reset");
        try {
          await signIn("password", formData);
        } catch (caught) {
          // Do not reveal whether an address has an account. Rate limits are
          // the one exception: the user needs to know to wait.
          if (appErrorCode(caught) === "rate_limited") {
            throw caught;
          }
          if (
            caught instanceof Error &&
            caught.message.includes("not configured")
          ) {
            throw caught;
          }
          console.error("[auth] password reset request failed", caught);
        }
        setStep("resetVerify");
        setCode("");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(
          "If that email has an account, a reset code is on the way.",
        );
        return;
      }

      formData.set("flow", "reset-verification");
      formData.set("code", normalizedCode);
      formData.set("newPassword", newPassword);
      const result = await signIn("password", formData);
      if (!result.signingIn) {
        throw new Error("Could not verify code");
      }
      router.push("/dashboard");
    } catch (caught) {
      const codeValue = appErrorCode(caught);
      const message = codeValue
        ? appErrorMessage(caught)
        : step === "credentials"
          ? flow === "signUp"
            ? "We couldn't create your account. Check your details and try again."
            : "That email and password combination didn't work."
          : step === "resetRequest"
            ? "We couldn't send a reset code. Please try again in a moment."
            : "That code didn't work. Check it and try again.";
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
  const title =
    step === "verifyEmail"
      ? "Check your email"
      : step === "resetRequest"
        ? "Reset your password"
        : step === "resetVerify"
          ? "Choose a new password"
          : isSignUp
            ? "Create your account"
            : "Welcome back";
  const description =
    step === "verifyEmail"
      ? `We sent a 6-digit code to ${email.trim() || "your email"}.`
      : step === "resetRequest"
        ? "Enter the email on your account and we'll send a reset code."
        : step === "resetVerify"
          ? `Enter the code sent to ${email.trim() || "your email"} and pick a new password.`
          : isSignUp
            ? "It takes a minute — you will claim your username next."
            : "Sign in to manage your page and track your supporters.";
  const submitLabel =
    step === "credentials"
      ? isSignUp
        ? "Create account"
        : "Sign in"
      : step === "verifyEmail"
        ? "Verify email"
        : step === "resetRequest"
          ? "Send reset code"
          : "Set new password";
  const pendingLabel =
    step === "credentials"
      ? isSignUp
        ? "Creating account…"
        : "Signing in…"
      : step === "verifyEmail"
        ? "Verifying…"
        : step === "resetRequest"
          ? "Sending code…"
          : "Saving password…";

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xl shadow-primary/5">
      <CardHeader className="gap-1.5 border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2">
          {step !== "credentials" ? (
            <button
              type="button"
              onClick={backToSignIn}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to sign in"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : null}
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        {step === "credentials" ? (
          <>
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
          </>
        ) : step === "verifyEmail" ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border bg-muted/35 p-3.5">
            <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Didn&apos;t get it? Check spam, or go back and sign in again to
              request a new code.
            </p>
          </div>
        ) : step === "resetRequest" ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border bg-muted/35 p-3.5">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              We&apos;ll email a 6-digit code. For your safety, we don&apos;t
              reveal whether an address has an account.
            </p>
          </div>
        ) : (
          <div className="mb-5 flex items-start gap-3 rounded-xl border bg-muted/35 p-3.5">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              The code expires in 15 minutes. Changing your password signs out
              other devices.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            {step === "credentials" && isSignUp ? (
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

            {step === "credentials" || step === "resetRequest" ? (
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
            ) : (
              <div className="rounded-lg border bg-muted/35 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Sent to </span>
                <span className="font-medium text-foreground">
                  {email.trim()}
                </span>
              </div>
            )}

            {step === "credentials" ? (
              <Field>
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {!isSignUp ? (
                    <button
                      type="button"
                      onClick={startReset}
                      className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
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
            ) : null}

            {step === "verifyEmail" || step === "resetVerify" ? (
              <Field>
                <FieldLabel htmlFor="code">6-digit code</FieldLabel>
                <Input
                  id="code"
                  name="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LENGTH}
                  pattern="[0-9]{6}"
                  required
                  autoFocus
                  disabled={submitting}
                  className="h-11 text-center text-lg tracking-[0.35em] tabular-nums"
                />
                <FieldDescription>
                  Paste the code from your email. It expires in 15 minutes.
                </FieldDescription>
              </Field>
            ) : null}

            {step === "resetVerify" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="new-password">New password</FieldLabel>
                  <InputGroup className="h-10">
                    <InputGroupInput
                      id="new-password"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
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
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm new password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={submitting}
                    className="h-10"
                  />
                </Field>
              </>
            ) : null}

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
              {submitting ? pendingLabel : submitLabel}
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {step === "credentials" ? (
            isSignUp ? (
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
            )
          ) : (
            <button
              type="button"
              onClick={backToSignIn}
              className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            >
              Back to sign in
            </button>
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
