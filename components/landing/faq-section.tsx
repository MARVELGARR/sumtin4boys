"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FAQS = [
  {
    q: "What does 'Tear small bread' mean?",
    a: "In Nigerian street slang, 'Tearing small bread' means sharing a portion of your blessings or sending a friendly tip to show appreciation for someone's hard work. On anything4boys, it's the digital equivalent of buying someone a coffee or saying 'I see you, take this one hold body!'.",
  },
  {
    q: "How do I get my money out into my Nigerian bank account?",
    a: "Whenever you have a balance, you simply click 'Request Payout' in your creator dashboard. Payouts are routed directly to your linked commercial bank account (GTBank, Access, Zenith, Kuda, OPay, etc.) via our Bachs Node infrastructure.",
  },
  {
    q: "Do my supporters need an account or an app?",
    a: "Not at all! That's the best part. Your supporters don't need to download anything, remember a password, or sign up. They click your link in your bio, select bread count, type a message, and check out securely in seconds.",
  },
  {
    q: "Are there any upfront or monthly fees to use anything4boys?",
    a: "Zero! It is completely free to create your page, customize your profile, set goals, and share your link. There are no monthly subscription fees. We only apply standard payment processing fees when you actually receive support.",
  },
  {
    q: "Can supporters pay from outside Nigeria?",
    a: "Yes! While our default currency is Naira (NGN), supporters worldwide can use standard debit/credit cards (Visa, Mastercard) to tear bread for you, converted seamlessly at checkout.",
  },
  {
    q: "Can I set goals (e.g. for a camera, internet, or software)?",
    a: "Yes! You can set an optional public goal in your dashboard (e.g. 'Goal: ₦150,000 for Starlink dish'). A live progress bar will display on your public page showing your community how close you are to reaching it.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggleFaq(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <Badge
            variant="secondary"
            className="gap-1.5 border-primary/20 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold"
          >
            <HelpCircle className="size-3.5" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to know
          </h2>
          <p className="max-w-lg text-base sm:text-lg text-muted-foreground">
            Clear answers about payouts, supporter checkout, and how anything4boys helps you thrive.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  isOpen
                    ? "border-primary/40 bg-card shadow-sm"
                    : "border-border/70 bg-card/60 hover:border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-semibold text-foreground">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm leading-relaxed text-muted-foreground animate-fade-in-up">
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
