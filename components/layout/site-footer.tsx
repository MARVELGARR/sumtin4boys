import { APP_NAME } from "@/lib/constants";

/** Static site footer. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. Support your favourite creators.
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
    </footer>
  );
}
