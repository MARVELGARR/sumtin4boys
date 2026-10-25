import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { BreadBuddy } from "@/components/brand/toy-icons";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist on anything4boys.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="grid size-20 place-items-center rounded-[1.75rem] border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 shadow-sm">
        <SearchX className="size-9 text-primary" />
      </span>
      <p className="mt-6 font-toy text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        404 · Page not found
      </p>
      <h1 className="mt-2 max-w-lg font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        This bread crumb led nowhere.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        The link may be old, the username may have changed, or somebody ate the
        page. Let&apos;s get you back to something useful.
      </p>
      <div className="mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row">
        <Button asChild size="lg" className="h-11 gap-2">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back home
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11">
          <Link href="/support">Visit support</Link>
        </Button>
      </div>
      <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <BreadBuddy size={20} />
        <span>Small bread, big love. Nothing wasted.</span>
      </div>
    </div>
  );
}
