"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
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
  const [submitting, setSubmitting] = useState(false);

  // Only redirect visitors who were ALREADY signed in when the page mounted.
  // After a successful sign-in we deliberately go to /onboarding instead.
  const initialAuthChecked = useRef(false);
  useEffect(() => {
    if (isLoading || initialAuthChecked.current) return;
    initialAuthChecked.current = true;
    if (isAuthenticated) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);
      formData.set("flow", flow);
      if (flow === "signUp") formData.set("name", name.trim());
      await signIn("password", formData);
      router.push("/onboarding");
    } catch (error) {
      // Bad credentials surface as plain errors; app errors (e.g. rate
      // limiting) carry a friendlier backend message.
      const code = appErrorCode(error);
      toast.error(
        code ? appErrorMessage(error) : "Check your email and password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isSignUp = flow === "signUp";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? "It takes a minute — you will claim your username next."
            : "Sign in to manage your page and track your supporters."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={flow} onValueChange={(value) => setFlow(value as Flow)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signIn">Sign in</TabsTrigger>
            <TabsTrigger value="signUp">Create account</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="mt-5">
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
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={8}
                required
                disabled={submitting}
              />
              {isSignUp ? (
                <FieldDescription>
                  At least 8 characters.
                </FieldDescription>
              ) : null}
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? <Spinner /> : null}
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link
                href="/signin?flow=signUp"
                className="text-foreground underline underline-offset-4 hover:text-primary"
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
