import { BreadBuddy } from "@/components/brand/toy-icons";
import { APP_NAME } from "@/lib/constants";

/** Static site footer. Uses the same base theme as every other surface. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:py-8 sm:text-left">
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 [overflow-wrap:anywhere] sm:justify-start">
          <BreadBuddy size={18} />
          <span>
            © {new Date().getFullYear()} {APP_NAME}. Tear small bread. No
            wahala.
          </span>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 sm:justify-end">
          <span>Made for the boys — and everybody else.</span>
          <span aria-hidden="true">·</span>
          <span>
            Payments by{" "}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="https://docs.bachs.io"
              target="_blank"
              rel="noreferrer"
            >
              Bachs
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
