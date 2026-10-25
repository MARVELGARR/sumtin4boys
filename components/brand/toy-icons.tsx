import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type ToyIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  size?: number;
};

function ToySvg({
  size = 32,
  className,
  children,
  ...props
}: ToyIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

/** A cheerful loaf with a face — the brand mascot. */
export function BreadBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M12 30c0-10 9-18 20-18s20 8 20 18v13c0 5-4 9-9 9H21c-5 0-9-4-9-9V30Z"
        fill="var(--toy-bread)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M18 27c1-7 6-11 14-11s13 4 14 11"
        stroke="var(--toy-bread-dark)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="25" cy="30" r="2.2" fill="var(--toy-ink)" />
      <circle cx="39" cy="30" r="2.2" fill="var(--toy-ink)" />
      <path
        d="M28 37c2.2 2.2 5.8 2.2 8 0"
        stroke="var(--toy-ink)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="36" r="3" fill="var(--toy-coral)" opacity=".6" />
      <circle cx="44" cy="36" r="3" fill="var(--toy-coral)" opacity=".6" />
      <path
        d="M12 35c-3 .5-5 2.5-5 5.5M52 35c3 .5 5 2.5 5 5.5"
        stroke="var(--toy-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="22" cy="21" r="2" fill="var(--toy-cream)" opacity=".8" />
    </ToySvg>
  );
}

/** A chunky Naira coin with a sparkle. */
export function CoinBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="var(--toy-bread)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
      />
      <circle
        cx="32"
        cy="32"
        r="15"
        stroke="var(--toy-bread-dark)"
        strokeWidth="3"
      />
      <path
        d="M25 42V22l14 20V22"
        stroke="var(--toy-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 30h20M22 36h20"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M45 15l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z"
        fill="var(--toy-coral)"
        stroke="var(--toy-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </ToySvg>
  );
}

/** A smiling heart for kind words and supporter love. */
export function HeartBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M32 52S12 40 12 26c0-7 6-12 12-12 4 0 7 2 8 5 1-3 4-5 8-5 6 0 12 5 12 12 0 14-20 26-20 26Z"
        fill="var(--toy-coral)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="27" r="2.2" fill="var(--toy-ink)" />
      <circle cx="40" cy="27" r="2.2" fill="var(--toy-ink)" />
      <path
        d="M28 33c2 2 6 2 8 0"
        stroke="var(--toy-ink)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="20" r="3" fill="var(--toy-cream)" opacity=".7" />
    </ToySvg>
  );
}

/** A talking drum — a little Naija culture in the UI. */
export function DrumBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M22 10h20l-4 14 4 16H22l4-16-4-14Z"
        fill="var(--toy-coral)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M18 10h28M18 40h28"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M24 15h16M24 35h16"
        stroke="var(--toy-lime)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 18c-4 4-4 12 0 16M50 18c4 4 4 12 0 16"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".45"
      />
      <circle cx="28" cy="25" r="2" fill="var(--toy-ink)" />
      <circle cx="36" cy="25" r="2" fill="var(--toy-ink)" />
      <path
        d="M29 30c1.5 1.5 4.5 1.5 6 0"
        stroke="var(--toy-ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </ToySvg>
  );
}

/** A sunny face for good energy and "you too much". */
export function SunBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <circle
        cx="32"
        cy="32"
        r="13"
        fill="var(--toy-bread)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
      />
      <path
        d="M32 7v7M32 50v7M7 32h7M50 32h7M14 14l5 5M45 45l5 5M50 14l-5 5M19 45l-5 5"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="27" cy="30" r="2" fill="var(--toy-ink)" />
      <circle cx="37" cy="30" r="2" fill="var(--toy-ink)" />
      <path
        d="M28 36c2 2 6 2 8 0"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="23" cy="35" r="2.5" fill="var(--toy-coral)" opacity=".6" />
      <circle cx="41" cy="35" r="2.5" fill="var(--toy-coral)" opacity=".6" />
    </ToySvg>
  );
}

/** A bowl of something good — jollof energy. */
export function BowlBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M10 28h44c0 14-10 24-22 24S10 42 10 28Z"
        fill="var(--toy-coral)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M7 28h50"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M20 21c-3-4 2-6 0-10M32 21c-3-4 2-6 0-10M44 21c-3-4 2-6 0-10"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M20 34c7 5 17 5 24 0"
        stroke="var(--toy-lime)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="26" cy="40" r="2" fill="var(--toy-ink)" opacity=".55" />
      <circle cx="38" cy="40" r="2" fill="var(--toy-ink)" opacity=".55" />
      <path
        d="M28 45c2 1 6 1 8 0"
        stroke="var(--toy-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </ToySvg>
  );
}

/** A four-point sparkle for "shine" moments. */
export function SparkBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M32 6l5.5 18.5L56 30l-18.5 5.5L32 54l-5.5-18.5L8 30l18.5-5.5L32 6Z"
        fill="var(--toy-lime)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="29" r="2" fill="var(--toy-ink)" />
      <circle cx="36" cy="29" r="2" fill="var(--toy-ink)" />
      <path
        d="M28 35c2 2 6 2 8 0"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </ToySvg>
  );
}

/** A speech bubble with a heart — for messages and kind words. */
export function MessageBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <path
        d="M8 16h48v30H30L18 56V46H8V16Z"
        fill="var(--toy-cream)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 38S21 31 21 25c0-5 6-8 11-3 5-5 11-2 11 3 0 6-11 13-11 13Z"
        fill="var(--toy-coral)"
        stroke="var(--toy-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </ToySvg>
  );
}

/** A friendly magnifier for empty states. */
export function SearchBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <circle
        cx="27"
        cy="27"
        r="16"
        fill="var(--toy-cream)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
      />
      <path
        d="M39 39l13 13"
        stroke="var(--toy-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="23" cy="25" r="2" fill="var(--toy-ink)" />
      <circle cx="31" cy="25" r="2" fill="var(--toy-ink)" />
      <path
        d="M22 32c3 2 7 2 10 0"
        stroke="var(--toy-ink)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </ToySvg>
  );
}

/** A green check sticker for trust points. */
export function CheckBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="var(--toy-leaf)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
      />
      <path
        d="M21 33l7 7 15-17"
        stroke="var(--toy-cream)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 14l1.5 3.5L51 19l-3.5 1.5L46 24l-1.5-3.5L41 19l3.5-1.5L46 14Z"
        fill="var(--toy-bread)"
        stroke="var(--toy-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </ToySvg>
  );
}

/** A little danfo bus, because Lagos. */
export function DanfoBuddy(props: ToyIconProps) {
  return (
    <ToySvg {...props}>
      <rect
        x="8"
        y="20"
        width="48"
        height="28"
        rx="8"
        fill="var(--toy-lime)"
        stroke="var(--toy-ink)"
        strokeWidth="4"
      />
      <rect
        x="14"
        y="26"
        width="15"
        height="10"
        rx="3"
        fill="var(--toy-cream)"
        stroke="var(--toy-ink)"
        strokeWidth="3"
      />
      <rect
        x="34"
        y="26"
        width="16"
        height="10"
        rx="3"
        fill="var(--toy-cream)"
        stroke="var(--toy-ink)"
        strokeWidth="3"
      />
      <path
        d="M8 39h48"
        stroke="var(--toy-ink)"
        strokeWidth="3"
      />
      <circle cx="20" cy="49" r="5" fill="var(--toy-ink)" />
      <circle cx="44" cy="49" r="5" fill="var(--toy-ink)" />
      <circle cx="20" cy="49" r="2" fill="var(--toy-lime)" />
      <circle cx="44" cy="49" r="2" fill="var(--toy-lime)" />
      <path
        d="M12 44h8M44 44h8"
        stroke="var(--toy-coral)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </ToySvg>
  );
}

/** Sticker frame for toy icons. */
export function ToySticker({
  children,
  className,
  tone = "cream",
}: {
  children: ReactNode;
  className?: string;
  tone?: "cream" | "ochre" | "coral" | "leaf" | "indigo";
}) {
  return (
    <span
      className={cn(
        "toy-sticker inline-flex items-center justify-center gap-2 px-3 py-2",
        className,
      )}
      style={{ background: `var(--toy-${tone})` }}
    >
      {children}
    </span>
  );
}
