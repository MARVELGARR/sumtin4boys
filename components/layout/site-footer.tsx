import Link from "next/link";
import { BreadBuddy } from "@/components/brand/toy-icons";
import { APP_NAME } from "@/lib/constants";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/about/author", label: "Author" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

/** Static site footer. Uses the same base theme as every other surface. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center [overflow-wrap:anywhere] sm:justify-start sm:text-left">
            <BreadBuddy size={18} />
            <span>
              © {new Date().getFullYear()} {APP_NAME}. Tear small bread. No
              wahala.
            </span>
          </p>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-4 text-center text-xs sm:flex-row sm:items-center sm:text-left">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 sm:justify-start">
            <span>Made for the boys — and everybody else.</span>
            <span aria-hidden="true">·</span>
            <span>Nigeria</span>
          </p>
          <p>
            Payments by{" "}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="https://docs.bachs.io"
              target="_blank"
              rel="noreferrer"
            >
              Bachs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
