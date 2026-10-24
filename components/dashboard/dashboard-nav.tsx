"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/supporters", label: "Supporters" },
  { href: "/dashboard/page", label: "Page" },
  { href: "/dashboard/payouts", label: "Payouts" },
] as const;

/**
 * Dashboard sub-navigation. Active state is derived from the exact pathname, so
 * `/dashboard/page` never lights up `/dashboard`.
 */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="-mx-4 flex items-center gap-1 overflow-x-auto border-b border-border px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm font-medium transition-colors sm:h-8",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
