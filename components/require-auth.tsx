"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side auth gate for pages that require a signed-in user.
 *
 * While the auth state is loading it renders a skeleton (so the page does not
 * flash the signed-out state); signed-out users get a sign-in card instead of
 * children. Backend queries still enforce auth — this is only UX.
 */
export function RequireAuth({
  children,
  title = "Sign in to continue",
  description = "This page is part of your creator account.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <Skeleton className="h-9 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <LockKeyhole className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <div className="flex justify-center px-6 pb-6">
            <Button asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
