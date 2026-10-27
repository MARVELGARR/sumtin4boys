import { ChevronDown } from "lucide-react";
import { MessageBuddy } from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
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
        "border-t-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30 px-3.5 py-1 text-xs font-semibold text-foreground"
          >
            <MessageBuddy className="size-4" />
            {badgeLabel}
          </Badge>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>

        <div className="space-y-3">
          {items.map((faq, index) => (
            <details
              key={faq.q}
              open={index === 0}
              className="group overflow-hidden rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card/60 transition-colors open:border-primary/40 open:bg-card hover:border-[var(--toy-ink)]/20"
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
