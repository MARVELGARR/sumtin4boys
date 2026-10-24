"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroClaimInput() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Clean username: letters, numbers, hyphens, underscores
  const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (cleanHandle) {
      router.push(`/signin?flow=signUp&username=${encodeURIComponent(cleanHandle)}`);
    } else {
      router.push("/signin?flow=signUp");
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form
        onSubmit={handleSubmit}
        className={`relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl border bg-card/90 p-1.5 shadow-xl transition-all duration-200 ${
          isFocused
            ? "border-primary ring-2 ring-primary/20 shadow-primary/10"
            : "border-border/70 hover:border-primary/40 shadow-muted/50"
        }`}
      >
        <div className="flex flex-1 items-center px-3 py-2 sm:py-1 text-sm font-medium">
          <span className="text-muted-foreground shrink-0 select-none font-mono text-xs sm:text-sm">
            anything4boys.com/
          </span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="yourname"
            maxLength={30}
            className="w-full min-w-0 bg-transparent pl-1 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            aria-label="Claim your username"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 sm:h-10 px-5 text-sm font-semibold shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          <span>Claim link</span>
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </form>

      {/* Reactive validation feedback */}
      <div className="mt-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {cleanHandle ? (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>anything4boys.com/{cleanHandle} is available to claim!</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
            <Sparkles className="size-3 text-primary" />
            <span>Claim your permanent link in 30 seconds · No card required</span>
          </span>
        )}
      </div>
    </div>
  );
}
