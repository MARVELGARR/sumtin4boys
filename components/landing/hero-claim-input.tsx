"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CheckBuddy, SparkBuddy } from "@/components/brand/toy-icons";
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
        className={`relative flex flex-col items-stretch rounded-2xl border-2 bg-card/90 p-2 shadow-[0_4px_0_rgba(23,61,42,0.08)] transition-all duration-200 sm:flex-row sm:items-center sm:p-1.5 ${
          isFocused
            ? "border-primary ring-2 ring-primary/20 shadow-primary/10"
            : "border-[var(--toy-ink)]/10 hover:border-primary/40"
        }`}
      >
        <div className="flex flex-1 items-center px-2 py-2 text-sm font-medium sm:px-3 sm:py-1">
          <span className="shrink-0 select-none font-mono text-[11px] text-muted-foreground sm:text-sm">
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full min-w-0 bg-transparent pl-1 font-mono text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:text-sm"
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
      <div className="mt-2.5 flex items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
        {cleanHandle ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-accent">
            <CheckBuddy className="size-4" />
            <span>anything4boys.com/{cleanHandle} is available to claim!</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
            <SparkBuddy className="size-4" />
            <span>Claim your permanent link in 30 seconds · No card required</span>
          </span>
        )}
      </div>
    </div>
  );
}
