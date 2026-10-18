"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Coffee } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/constants";

/**
 * Global top navigation. Server-rendered pages stay static; this island
 * reflects auth state reactively (Convex Auth).
 */
export function SiteHeader() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const myCreator = useQuery(api.creators.getMyCreator, isAuthenticated ? {} : "skip");

  const creator = myCreator?.creator ?? null;
  const viewerEmail = myCreator?.viewer.email ?? null;
  const initial = (creator?.displayName ?? viewerEmail ?? "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="size-4" />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : isAuthenticated ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                    <Avatar className="size-8">
                      {creator?.avatarUrl ? (
                        <AvatarImage src={creator.avatarUrl} alt={creator.displayName} />
                      ) : null}
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {creator ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/${creator.username}`}>View my page</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/page">Edit page</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/payouts">Payouts</Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/onboarding">Claim your username</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void (async () => {
                        await signOut();
                        router.push("/");
                        router.refresh();
                      })();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signin?flow=signUp">Start my page</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
