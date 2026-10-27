import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CircleHelp,
  CreditCard,
  KeyRound,
  LifeBuoy,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { FaqSection } from "@/components/landing/faq-section";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { SUPPORT_FAQS } from "@/lib/faq";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Support & FAQ — payments and payouts",
  description:
    "Help for anything4boys supporters and creators: pending payments, refunds, creator payouts, sign-in codes, account safety, and how to contact a human.",
  path: "/support",
  keywords: [
    "anything4boys support",
    "creator payout help Nigeria",
    "pending payment support",
    "anything4boys FAQ",
    "creator support refund",
  ],
});

const QUICK_LINKS = [
  {
    href: "#supporters",
    icon: UserRound,
    title: "I'm supporting a creator",
    body: "Checkout, kind words, and what to do if a payment looks stuck.",
  },
  {
    href: "#creators",
    icon: Banknote,
    title: "I'm a creator",
    body: "Balances, payout requests, page settings, and account questions.",
  },
  {
    href: "#payments",
    icon: CreditCard,
    title: "Payments & refunds",
    body: "Failed payments, duplicate charges, refunds, and receipts.",
  },
  {
    href: "#account",
    icon: KeyRound,
    title: "Sign-in & account",
    body: "Email codes, password resets, and keeping your account safe.",
  },
];

const SUPPORTER_STEPS = [
  {
    title: "Open the creator's link",
    body: "The link looks like anything4boys.com/username. You can open it in any browser — no app, account, or password needed.",
  },
  {
    title: "Choose your bread",
    body: "Pick how many loaves you want to tear. The creator sets the price per loaf. Add a kind word if you like; it may appear publicly on their wall.",
  },
  {
    title: "Pay securely",
    body: "Checkout is handled by Bachs. Follow the prompt on your bank app or card. Keep the receipt and payment reference until the creator page shows the support.",
  },
];

const CREATOR_STEPS = [
  {
    title: "Publish your page",
    body: "Claim a username, add a display name, a short bio, and a profile photo. Share the public link anywhere you already talk to your people.",
  },
  {
    title: "Watch confirmed support land",
    body: "Only completed and paid checkouts count toward your available balance. Pending checkouts are shown separately until the payment provider confirms them.",
  },
  {
    title: "Request a payout",
    body: "From the dashboard, open Payouts and request a payout to your linked Nigerian bank account or mobile wallet. The team reviews the request before sending it.",
  },
];

export default function SupportPage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Support", path: "/support" },
        ])}
      />
      <JsonLd data={faqJsonLd(SUPPORT_FAQS)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Support & FAQ",
          url: absoluteUrl("/support"),
          description:
            "Help for anything4boys supporters and creators: pending payments, refunds, creator payouts, sign-in codes, account safety, and how to contact a human.",
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          author: {
            "@type": "Organization",
            name: `${APP_NAME} team`,
            url: absoluteUrl("/about/author"),
          },
          publisher: { "@id": `${absoluteUrl("/")}#organization` },
          dateModified: "2026-10-25",
          inLanguage: "en-NG",
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[360px] w-[320px] -translate-x-1/2 rounded-full bg-[var(--toy-lime)]/30 blur-3xl sm:w-[620px]" />
        <div className="absolute top-1/2 -right-24 h-[300px] w-[260px] rounded-full bg-[var(--toy-bread)]/20 blur-3xl" />
      </div>

      <section className="relative mx-auto w-full max-w-5xl px-4 pt-10 pb-12 sm:pt-16 sm:pb-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-xs font-semibold text-foreground"
          >
            <LifeBuoy className="size-4" />
            Support & help
          </Badge>
          <h1 className="max-w-2xl font-toy text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Stuck? Let&apos;s sort it.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
            Plain answers for supporters, creators, and anybody trying to get a
            payment to behave. Start with the section that sounds like you — or
            skip straight to the contact form.
          </p>
          <div className="flex w-full flex-col items-stretch gap-2.5 pt-2 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-11 px-6">
              <Link href="/contact">
                <Mail className="mr-1 size-4" />
                Contact support
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6">
              <Link href="#faq">
                Read the FAQ
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            We never ask for your password, OTP, full card number, or bank PIN.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-start gap-3 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--toy-ochre)]/10 sm:p-5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--toy-lime)]/20">
                <link.icon className="size-5 text-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center justify-between gap-2 font-toy text-sm font-bold sm:text-base">
                  {link.title}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {link.body}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="supporters"
        aria-labelledby="supporters-heading"
        className="scroll-mt-20 border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              For supporters
            </p>
            <h2
              id="supporters-heading"
              className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Support in three taps
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              You do not need to create an account to support a creator. If you
              choose to leave a kind word, it may be shown publicly on their
              page — so only share what you are comfortable sharing.
            </p>
            <div className="mt-5 rounded-2xl border border-[var(--toy-ink)]/10 bg-card p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <CircleHelp className="size-4 text-primary" aria-hidden="true" />
                Payment still pending?
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Give it a few minutes, then refresh the creator page. If it is
                still pending after 15 minutes, contact us with the payment
                reference from your receipt. Do not pay a second time just to
                “push” the first payment through.
              </p>
            </div>
          </div>

          <ol className="space-y-3">
            {SUPPORTER_STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-toy text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-toy text-base font-bold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="creators"
        aria-labelledby="creators-heading"
        className="mx-auto grid w-full max-w-6xl scroll-mt-20 gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14"
      >
        <div>
          <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            For creators
          </p>
          <h2
            id="creators-heading"
            className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            Your page, your balance, your payout
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The dashboard is the source of truth. It shows confirmed support,
            pending checkout attempts, your available balance, and every payout
            request you have made.
          </p>
          <div className="mt-5 rounded-2xl border border-[var(--toy-ink)]/10 bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
              Why payouts are reviewed
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Payout requests are checked by the team before money leaves the
              platform. This protects creators and supporters from mistakes and
              fraud. The status in your dashboard will move from requested to
              paid or failed; if it fails, the amount is returned to your
              available balance and the reason is shown where possible.
            </p>
          </div>
        </div>

        <ol className="space-y-3">
          {CREATOR_STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-toy text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-toy text-base font-bold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="payments"
        aria-labelledby="payments-heading"
        className="scroll-mt-20 border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/10"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Payments & refunds
            </p>
            <h2
              id="payments-heading"
              className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              When money does something strange
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Most payment issues are timing, not disappearance. Start with the
              status shown on the creator page or in your receipt, then contact
              us with the reference if it does not resolve.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Payment failed",
                body: "No support is recorded and no creator balance changes. Try another payment method or check with your bank. If your bank says the money left, contact us before trying again.",
              },
              {
                title: "Duplicate charge",
                body: "Send both payment references and the times. We will trace them with the payment provider and explain what happened. Do not send card numbers or bank credentials.",
              },
              {
                title: "Refund request",
                body: "Refunds are reviewed against the payment provider's records and the creator's page. Contact us with the reference, creator username, amount, and reason. We cannot promise an instant refund.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5"
              >
                <h3 className="font-toy text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-[var(--toy-ink)]/10 bg-card p-4">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">
                Keep these private:
              </span>{" "}
              passwords, one-time codes, full card numbers, CVV, bank PINs, and
              screenshots of your banking app. Anyone who asks for them — even
              if they claim to be from {APP_NAME} — is not us.
            </p>
          </div>
        </div>
      </section>

      <section
        id="account"
        aria-labelledby="account-heading"
        className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-14 sm:py-20"
      >
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Sign-in & account
            </p>
            <h2
              id="account-heading"
              className="mt-3 font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              Codes, resets, and access
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Accounts use an email address. Password accounts need a verified
              email before the dashboard unlocks. We send short-lived codes for
              sign-in and password resets.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "I did not get my code",
                body: "Check spam and promotions. Confirm you typed the same email that is on the account, then request a new code. Codes expire after 15 minutes.",
              },
              {
                title: "I need to change my email",
                body: "Contact us from the current email address on the account. For security, we may ask you to confirm details before changing the sign-in address.",
              },
              {
                title: "I think someone else has access",
                body: "Reset your password immediately, then contact us. Do not reuse the same password on your email, bank, or social accounts.",
              },
              {
                title: "I want to delete my page or account",
                body: "Tell us whether you want the public page unpublished or the account removed. We will explain what is deleted and what payment records must be retained for accounting and legal reasons.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-4 sm:p-5"
              >
                <h3 className="font-toy text-base font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection
        id="faq"
        items={SUPPORT_FAQS}
        badgeLabel="Support FAQ"
        title="Quick answers, no long talk"
        description="The questions that reach our inbox most often, answered in plain language."
        className="scroll-mt-20"
      />

      <p className="mx-auto w-full max-w-4xl px-4 pt-6 text-center text-xs text-muted-foreground">
        Reviewed by the{" "}
        <Link
          href="/about/author"
          className="font-medium text-foreground underline underline-offset-4"
        >
          {APP_NAME} team
        </Link>{" "}
        · Last reviewed 25 October 2026
      </p>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:py-20">
        <div className="rounded-[2rem] border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/20 p-6 text-center sm:p-10">
          <Mail className="mx-auto size-7 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-toy text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Still need a human?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Use the contact form and choose the closest topic. Include the
            creator username and payment reference where relevant. We will
            reply by email.
          </p>
          <Button asChild size="lg" className="mt-6 h-11 px-6">
            <Link href="/contact">
              Open the contact form
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Prefer to read first? See{" "}
            <Link
              href="/about"
              className="font-medium text-foreground underline underline-offset-4"
            >
              about {APP_NAME}
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
