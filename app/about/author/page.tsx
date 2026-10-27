import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, PenLine, ShieldCheck } from "lucide-react";
import { BreadBuddy, HeartBuddy } from "@/components/brand/toy-icons";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const LAST_REVIEWED = "2026-10-25";

export const metadata: Metadata = pageMetadata({
  title: "About the author — editorial approach",
  description:
    "Who writes and maintains anything4boys, how we research payment and payout guidance, and how to report a correction.",
  path: "/about/author",
  keywords: [
    "anything4boys author",
    "anything4boys team",
    "Nigerian creator platform team",
    "creator support editorial policy",
  ],
  type: "article",
});

const PRINCIPLES = [
  {
    icon: PenLine,
    title: "We describe what we run",
    body: "Our payment, payout, and account guidance is written against the same product and backend the team operates. We do not publish generic finance advice dressed up as product documentation.",
  },
  {
    icon: ShieldCheck,
    title: "We do not invent credentials",
    body: "There is no named founder, fabricated headshot, or borrowed industry title on this page. The author is the anything4boys team because that is the honest answer today.",
  },
  {
    icon: HeartBuddy,
    title: "We write for real supporters",
    body: "Supporters and creators are not acronyms. We use plain language, Nigerian context, and real examples — including the awkward parts, like pending payments and failed payouts.",
  },
];

export default function AuthorPage() {
  return (
    <div className="relative overflow-x-clip bg-background text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
          { name: "Author", path: "/about/author" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: `About the author — ${APP_NAME}`,
          url: absoluteUrl("/about/author"),
          description:
            "The author and editorial approach behind anything4boys support and payment guidance.",
          isPartOf: { "@id": `${absoluteUrl("/")}#website` },
          author: {
            "@type": "Organization",
            name: `${APP_NAME} team`,
            url: absoluteUrl("/about/author"),
            parentOrganization: { "@id": `${absoluteUrl("/")}#organization` },
          },
          dateModified: LAST_REVIEWED,
          inLanguage: "en-NG",
        }}
      />

      <section className="relative mx-auto w-full max-w-4xl px-4 pt-10 pb-12 sm:pt-16 sm:pb-16">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to about
        </Link>

        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <Badge
            variant="secondary"
            className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1.5 text-xs font-semibold text-foreground"
          >
            <HeartBuddy className="size-4" />
            About the author
          </Badge>
          <h1 className="max-w-2xl font-toy text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            The team behind the bread
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
            {APP_NAME} is written, designed, built, and supported by a small
            independent team in Nigeria. We use the product, we read the support
            inbox, and we are accountable for the guidance published here.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border-2 border-[var(--toy-ink)]/10 bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-[var(--toy-bread)]/35">
                <BreadBuddy size={40} />
              </span>
              <div className="min-w-0">
                <p className="font-toy text-lg font-bold">
                  {APP_NAME} team
                </p>
                <p className="text-sm text-muted-foreground">
                  Product, support, and payment operations
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground sm:text-right">
              Based in Nigeria
              <br />
              Last reviewed: {LAST_REVIEWED}
            </p>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              The team owns the full surface: the creator dashboard, the public
              supporter flow, the payment integration, and this website. That
              means the person who writes an answer about payouts can also open
              the payout record and check the actual status.
            </p>
            <p>
              We do not have a separate content agency, a fake editorial board,
              or a sponsored ranking system. When a page says “last reviewed,”
              a member of the team checked it against the current product.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <article
              key={principle.title}
              className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card/70 p-5"
            >
              <principle.icon
                className="size-5 text-primary"
                aria-hidden="true"
              />
              <h2 className="mt-3 font-toy text-base font-bold">
                {principle.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {principle.body}
              </p>
            </article>
          ))}
        </div>

        <section
          aria-labelledby="corrections-heading"
          className="mt-12 rounded-3xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-6 sm:p-8"
        >
          <h2
            id="corrections-heading"
            className="font-toy text-2xl font-bold tracking-tight"
          >
            Corrections and contact
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            If an answer is wrong, out of date, or unclear, tell us. Include the
            page URL and what you expected to see. For payment issues, include
            the payment reference and creator username — never a card number,
            OTP, or bank password.
          </p>
          <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5">
              <Link href="/contact">
                <Mail className="mr-1 size-4" />
                Contact the team
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="/support">
                Read support answers
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}
