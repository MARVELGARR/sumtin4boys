"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MessageBuddy } from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { HOME_FAQS } from "@/lib/faq";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggleFaq(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="border-t-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30 px-3.5 py-1 text-xs font-semibold text-foreground"
          >
            <MessageBuddy className="size-4" />
            Frequently Asked Questions
          </Badge>
          <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Everything you need to know
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
            Clear answers about the slang, payouts, supporter checkout, and how
            anything4boys helps you thrive. No long talk.
          </p>
        </div>

        <div className="space-y-3">
          {HOME_FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className={`overflow-hidden rounded-2xl border-2 transition-colors ${
                  isOpen
                    ? "border-primary/40 bg-card shadow-sm"
                    : "border-[var(--toy-ink)]/10 bg-card/60 hover:border-[var(--toy-ink)]/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-toy text-sm font-semibold text-foreground sm:text-base">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="animate-fade-in-up px-5 pt-0 pb-5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
