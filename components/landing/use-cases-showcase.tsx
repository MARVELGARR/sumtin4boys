"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BreadBuddy,
  HeartBuddy,
  SparkBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const USE_CASES = [
  {
    id: "creators",
    label: "Creators & Entertainers",
    role: "Lagos Storyteller & Skit Maker",
    exampleName: "Ada_SkitMaker",
    handle: "anything4boys.com/ada",
    avatar: "🎬",
    quote:
      "“I post small small skits about Lagos life. My people tear bread when a video hits home. It pays for data, props and the occasional shawarma break.”",
    popularTiers: ["₦1,000 data bread", "₦3,000 shoot support"],
  },
  {
    id: "artists",
    label: "Artists & Designers",
    role: "Illustrator & Print Maker",
    exampleName: "Amara_Designs",
    handle: "anything4boys.com/amara",
    avatar: "🎨",
    quote:
      "“I share my art process and print drops online. Getting a small alert that says ‘someone tore 3 breads for you’ can turn a dry studio day around.”",
    popularTiers: ["₦1,000 art supply bread", "₦3,000 design tip"],
  },
  {
    id: "podcasters",
    label: "Musicians & Podcasters",
    role: "Podcast Host & Afrobeat Head",
    exampleName: "LagosBoysTalk",
    handle: "anything4boys.com/lagosboys",
    avatar: "🎙️",
    quote:
      "“We don’t need corporate sponsors dictating our talking points. Our listeners tear small bread after every episode. It funds our studio time and keeps the conversation free.”",
    popularTiers: ["₦2,000 episode shoutout", "₦10,000 season supporter"],
  },
  {
    id: "writers",
    label: "Writers & Storytellers",
    role: "Essayist & Culture Writer",
    exampleName: "Chioma_Writes",
    handle: "anything4boys.com/chioma",
    avatar: "✍🏾",
    quote:
      "“My essays are free and open to everyone. Having an anything4boys link at the bottom lets true fans say thank you. Over 40 readers have torn bread this month alone.”",
    popularTiers: ["₦1,000 essay bread", "₦4,000 monthly patron"],
  },
  {
    id: "hustlers",
    label: "Small Businesses & Hustlers",
    role: "Thrift Vendor & Weekend Stylist",
    exampleName: "Tunde_Thrifts",
    handle: "anything4boys.com/tunde",
    avatar: "🛍️",
    quote:
      "“I sell affordable thrift finds from Yaba. My customers tear small bread when I style them for a big event. Every bread goes straight back into new stock.”",
    popularTiers: ["₦1,000 styling tip", "₦5,000 new stock support"],
  },
  {
    id: "students",
    label: "Students & Everyday People",
    role: "Final-year Student & Content Creator",
    exampleName: "Kemi_Uni",
    handle: "anything4boys.com/kemi",
    avatar: "📚",
    quote:
      "“I share study tips and campus stories. Supporters tear bread for data and printing. Small small is literally keeping me in school — and keeping the jokes coming.”",
    popularTiers: ["₦500 data bread", "₦2,000 printing fund"],
  },
];

export function UseCasesShowcase() {
  const [selectedId, setSelectedId] = useState("creators");

  const activeCase = USE_CASES.find((c) => c.id === selectedId) || USE_CASES[0];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Badge
          variant="secondary"
          className="h-auto gap-1.5 border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 px-3.5 py-1 text-xs font-semibold text-foreground"
        >
          <HeartBuddy className="size-4" />
          Who it&apos;s for
        </Badge>
        <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Made for every kind of person
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Whether you make people laugh, cook, sing, write, design, sell, study
          or just live your life — there&apos;s a bread link for you.
        </p>

        {/* Scrollable / responsive category pills */}
        <div className="scrollbar-none -mx-4 mt-4 flex w-full max-w-4xl items-center justify-start gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0">
          {USE_CASES.map((uc) => {
            const isSelected = uc.id === selectedId;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => setSelectedId(uc.id)}
                aria-pressed={isSelected}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "border-[var(--toy-ink)]/10 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {uc.avatar}
                </span>
                <span>{uc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured persona card */}
      <Card className="toy-card overflow-hidden bg-card shadow-xl shadow-primary/5">
        <CardContent className="p-5 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="space-y-4 lg:col-span-8">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/35 text-2xl">
                  {activeCase.avatar}
                </span>
                <div className="min-w-0">
                  <h3 className="font-toy text-lg font-bold text-foreground">
                    {activeCase.exampleName}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {activeCase.handle} · {activeCase.role}
                  </p>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground italic sm:text-base">
                {activeCase.quote}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Popular bread sizes:
                </span>
                {activeCase.popularTiers.map((tier) => (
                  <Badge
                    key={tier}
                    variant="outline"
                    className="h-auto gap-1.5 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 text-xs text-foreground"
                  >
                    <BreadBuddy className="size-3.5" />
                    {tier}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-gradient-to-br from-[var(--toy-ochre)]/30 to-transparent p-5 text-center lg:col-span-4">
              <SparkBuddy className="mx-auto size-8" />
              <h4 className="font-toy text-sm font-bold">
                Ready to claim your link?
              </h4>
              <p className="text-xs text-muted-foreground">
                Join creators, artists, cooks, students and everyday people
                making small small support add up.
              </p>
              <div className="font-mono text-xs font-semibold text-primary">
                anything4boys.com/you
              </div>
              <Button asChild size="sm" className="w-full">
                <Link href="/signin?flow=signUp">Claim my link</Link>
              </Button>
              <p className="font-toy text-[11px] text-muted-foreground">
                Naija no dey carry last.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
