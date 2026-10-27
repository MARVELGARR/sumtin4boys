import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/constants";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us — payments, payouts, press",
  description:
    "Contact the anything4boys team about a payment, refund, creator payout, account issue, press request, or anything else. We reply by email.",
  path: "/contact",
  keywords: [
    "contact anything4boys",
    "anything4boys support email",
    "creator payout help",
    "payment refund request Nigeria",
    "anything4boys press",
  ],
});

const BEFORE_YOU_WRITE = [
  "The creator's username or page link.",
  "The payment reference from your receipt, if money is involved.",
  "The email address on your account, if you have one.",
  "What you expected to happen, and what actually happened.",
];

const PAYMENT_TIPS = [
  "Do not pay a second time just to make the first payment show up.",
  "Screenshots are helpful, but crop out card numbers, CVV codes, and bank balances.",
  "If your bank says the payment is still processing, tell us that too.",
  "Never send a one-time code (OTP), password, or bank PIN to anyone.",
];

export default function ContactPage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: `Contact ${APP_NAME}`,
          url: absoluteUrl("/contact"),
          description:
            "Contact the anything4boys team about payments, creator support, payouts, account access, press, or partnerships.",
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          mainEntity: {
            "@type": "ContactPoint",
            contactType: "customer support",
            url: absoluteUrl("/contact"),
            availableLanguage: ["en", "en-NG"],
          },
          dateModified: "2026-10-25",
          inLanguage: "en-NG",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-[340px] w-[300px] rounded-full bg-[var(--toy-lime)]/30 blur-3xl sm:w-[520px]" />
        <div className="absolute top-1/2 -left-20 h-[280px] w-[240px] rounded-full bg-[var(--toy-bread)]/20 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-xs font-semibold text-foreground"
          >
            <Mail className="size-4" />
            Contact us
          </Badge>
          <h1 className="font-toy text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Talk to a human.
          </h1>
          <p className="text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
            Questions, payment trouble, payout checks, press, or a correction —
            send it here. We read every message and reply by email. No bots on
            the other side, just the team.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="size-3.5" aria-hidden="true" />
              Replies by email
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Never ask for passwords or OTPs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Payment issues first
            </span>
          </div>
        </div>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div className="min-w-0">
            <ContactForm />
            <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
              By sending a message you agree that we may use your email address
              to reply. We do not sell contact details. Read the{" "}
              <Link
                href="/support#account"
                className="font-medium text-foreground underline underline-offset-4"
              >
                account and data guidance
              </Link>{" "}
              for deletion requests.
            </p>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-toy text-lg font-bold">
                <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
                Before you write
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                A little detail helps us find the answer faster:
              </p>
              <ul className="mt-3 space-y-2">
                {BEFORE_YOU_WRITE.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-5">
              <h2 className="font-toy text-lg font-bold">
                If it is about a payment
              </h2>
              <ul className="mt-2 space-y-2">
                {PAYMENT_TIPS.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--toy-ink)]/10 bg-card p-5">
              <h2 className="font-toy text-base font-bold">
                Looking for a quick answer?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Pending payments, payout reviews, sign-in codes, and refund
                steps are already documented.
              </p>
              <Link
                href="/support"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Visit the support centre
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-dashed border-[var(--toy-ink)]/20 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Press or partnerships:
                </span>{" "}
                choose “Press or partnerships” in the form and include your
                organisation, deadline, and what you need from us. We cannot
                guarantee a same-day reply.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
