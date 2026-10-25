"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MessageBuddy } from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";

const FAQS = [
  {
    q: "What does “tear small bread” mean?",
    a: "In Nigerian Pidgin, “tearing small bread” is a playful way of saying “share a small portion” — like buying someone a loaf or saying “take small something.” On anything4boys, it is always voluntary. Small small is enough.",
  },
  {
    q: "Why “anything for the boys”?",
    a: "It is a familiar Naija phrase you will hear when friends ask for a small share. We are using it for good: no pressure, no extortion, just voluntary support for creators you love. “Boys” here means your people — the crew, the gang, everybody. All genders are welcome.",
  },
  {
    q: "Is this only for male creators or supporters?",
    a: "Not at all. “The boys” is slang for your people, not a men-only club. anything4boys is for creators and supporters of every gender, craft and city — from Lagos to London.",
  },
  {
    q: "Is this begging?",
    a: "No. This is a tip jar with manners. Supporters give only if they want to, and only if they can. If you can't give, sharing the page or leaving a kind word is more than enough. No pressure, no wahala.",
  },
  {
    q: "I only have small money — is that okay?",
    a: "That's the whole point. Small bread is still bread. Every creator sets their own price, and a kind word costs nothing. Small small dey go far.",
  },
  {
    q: "How do I get my money out into my Nigerian bank account?",
    a: "Whenever you have a balance, click “Request Payout” in your creator dashboard. Payouts go directly to your linked Nigerian commercial bank account or mobile wallet (GTBank, Access, Zenith, Kuda, OPay, etc.) through our Bachs payment infrastructure.",
  },
  {
    q: "Do my supporters need an account or an app?",
    a: "Not at all. Your supporters don’t need to download anything, remember a password, or sign up. They click your link in your bio, choose their bread count, drop a kind word, and check out securely in seconds.",
  },
  {
    q: "Are there any upfront or monthly fees to use anything4boys?",
    a: "Zero. It is completely free to create your page, customise your profile, set goals, and share your link. There are no monthly subscription fees. We only apply standard payment processing fees when you actually receive support.",
  },
  {
    q: "Can supporters pay from outside Nigeria?",
    a: "Yes. While our default currency is Naira (NGN), supporters worldwide can use standard debit or credit cards (Visa, Mastercard) to tear bread for you, converted at checkout.",
  },
  {
    q: "Can I set goals (e.g. for a camera, internet, or software)?",
    a: "Yes. You can set an optional public goal in your dashboard (e.g. “Goal: ₦150,000 for a Starlink dish”). A live progress bar will show on your public page so your people can see how close you are.",
  },
];

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
          {FAQS.map((faq, index) => {
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
