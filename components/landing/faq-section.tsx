import { ChevronDown } from "lucide-react";
import { HOME_FAQS, type FaqItem } from "@/lib/faq";
import { cn } from "@/lib/utils";

type FaqSectionProps = {
  items?: readonly FaqItem[];
  badgeLabel?: string;
  title?: string;
  description?: string;
  id?: string;
  className?: string;
};

/**
 * Native `<details>` accordion: every answer is present in the server-rendered
 * HTML (good for crawlers and no-JS readers) and it needs no client bundle.
 */
export function FaqSection({
  items = HOME_FAQS,
  badgeLabel = "Frequently Asked Questions",
  title = "Everything you need to know",
  description = "Clear answers about the slang, payouts, supporter checkout, and how anything4boys helps you thrive. No long talk.",
  id,
  className,
}: FaqSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "border-t border-[var(--toy-ink)]/10 bg-background",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {badgeLabel}
          </p>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {title}
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {items.map((faq, index) => (
            <details
              key={faq.q}
              open={index === 0}
              className="group overflow-hidden rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card transition-colors open:border-primary/40 hover:border-[var(--toy-ink)]/25"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left transition-colors [&::-webkit-details-marker]:hidden">
                <span className="font-toy text-sm font-semibold text-foreground sm:text-base">
                  {faq.q}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-primary" />
              </summary>
              <div className="px-5 pb-5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
