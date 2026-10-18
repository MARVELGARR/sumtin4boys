import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/signin-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your page, or create an account to start one.",
};

function SignInFallback() {
  return (
    <div className="w-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-3 h-4 w-56" />
      <Skeleton className="mt-6 h-8 w-full" />
      <Skeleton className="mt-4 h-8 w-full" />
      <Skeleton className="mt-3 h-8 w-full" />
      <Skeleton className="mt-5 h-9 w-full" />
    </div>
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawFlow = Array.isArray(params.flow) ? params.flow[0] : params.flow;
  const initialFlow = rawFlow === "signUp" ? "signUp" : "signIn";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Suspense fallback={<SignInFallback />}>
        <SignInForm initialFlow={initialFlow} />
      </Suspense>
    </div>
  );
}
