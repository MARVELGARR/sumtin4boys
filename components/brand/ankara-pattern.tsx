import { cn } from "@/lib/utils";

/**
 * A low-contrast, wax-print-inspired repeat pattern. The motifs are abstract
 * (scallops, diamonds, dots and arcs) rather than copies of specific cultural
 * symbols, so it adds texture without pretending to be a real textile.
 */
export function AnkaraPattern({
  id,
  className,
  opacity = 0.16,
}: {
  id: string;
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    >
      <defs>
        <pattern
          id={id}
          width="96"
          height="96"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 48c12-20 24-20 36 0s24 20 36 0 24-20 36 0"
            fill="none"
            stroke="var(--toy-leaf)"
            strokeWidth="3"
            opacity=".7"
          />
          <circle cx="24" cy="24" r="6" fill="var(--toy-lime)" opacity=".9" />
          <path
            d="M72 14l8 8-8 8-8-8z"
            fill="var(--toy-lime)"
            opacity=".8"
          />
          <path
            d="M12 78c8-10 16-10 24 0"
            fill="none"
            stroke="var(--toy-indigo)"
            strokeWidth="3"
            opacity=".45"
          />
          <circle cx="78" cy="66" r="4" fill="var(--toy-bread)" opacity=".8" />
          <path
            d="M60 82c0-6 5-10 10-10"
            fill="none"
            stroke="var(--toy-leaf)"
            strokeWidth="3"
            opacity=".7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  );
}

/** A thin aso-oke-style ribbon for section edges and card tops. */
export function AnkaraRibbon({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("ankara-ribbon h-1.5 w-full", className)}
    />
  );
}
