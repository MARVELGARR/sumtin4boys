"use client";

import { useState } from "react";
import {
  Code2,
  Headphones,
  Palette,
  PenTool,
  Sparkles,
  Users2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const USE_CASES = [
  {
    id: "devs",
    label: "Developers & Builders",
    icon: Code2,
    role: "Open Source Contributor & Dev Advocate",
    exampleName: "Tobe_Codes",
    handle: "anything4boys.com/tobecodes",
    avatar: "👨🏾‍💻",
    quote:
      "“I publish free TypeScript and Next.js libraries. My followers tear small bread whenever a package saves their weekend. It pays for my cloud servers and internet without having to sell expensive courses.”",
    popularTiers: ["₦1,500 fuel for late-night coding", "₦5,000 package sponsor"],
  },
  {
    id: "designers",
    label: "Designers & Illustrators",
    icon: Palette,
    role: "Brand & UI/UX Designer",
    exampleName: "Amara_Designs",
    handle: "anything4boys.com/amara",
    avatar: "🎨",
    quote:
      "“I share Figma templates and design breakdowns on Twitter. People love showing love. Getting a direct alert on my phone saying 'Someone tore 3 breads for you' brightens my entire creative day!”",
    popularTiers: ["₦1,000 Figma asset coffee", "₦3,000 design audit tip"],
  },
  {
    id: "podcasters",
    label: "Podcasters & Media",
    icon: Headphones,
    role: "Tech & Culture Podcast Host",
    exampleName: "LagosBoysTalk",
    handle: "anything4boys.com/lagosboys",
    avatar: "🎙️",
    quote:
      "“We don't need corporate sponsors dictating our talking points. Our listeners tear small bread at the end of every episode. It completely funds our studio time and audio engineer.”",
    popularTiers: ["₦2,000 episode shoutout", "₦10,000 season supporter"],
  },
  {
    id: "writers",
    label: "Writers & Curators",
    icon: PenTool,
    role: "Substack Tech Essayist",
    exampleName: "Chioma_Writes",
    handle: "anything4boys.com/chioma",
    avatar: "✍🏾",
    quote:
      "“My essays are always free and open to everyone. But having an anything4boys link at the bottom lets true fans say thank you. Over 40 readers have sent tips this month alone!”",
    popularTiers: ["₦1,000 essay coffee", "₦4,000 monthly patron"],
  },
  {
    id: "streamers",
    label: "Gamers & Streamers",
    icon: Video,
    role: "Gaming & IRL Creator",
    exampleName: "KaysenGaming",
    handle: "anything4boys.com/kaysen",
    avatar: "🎮",
    quote:
      "“International tipping platforms decline Nigerian cards 90% of the time. anything4boys works immediately via local bank transfer or card. My viewers drop bread live while I play FIFA & Warzone!”",
    popularTiers: ["₦1,000 stream fuel", "₦5,000 ragequit bribe 🤣"],
  },
];

export function UseCasesShowcase() {
  const [selectedId, setSelectedId] = useState("devs");

  const activeCase = USE_CASES.find((c) => c.id === selectedId) || USE_CASES[0];
  const Icon = activeCase.icon;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Badge
          variant="secondary"
          className="gap-1.5 border-primary/20 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold"
        >
          <Users2 className="size-3.5" />
          Who It&apos;s For
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Built for every kind of creator
        </h2>
        <p className="max-w-xl text-base sm:text-lg text-muted-foreground">
          Whether you write code, design graphics, host a podcast, or create vibes — anything4boys is the simplest way to get supported.
        </p>

        {/* Scrollable / Responsive Category Pills */}
        <div className="mt-4 flex w-full max-w-4xl items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {USE_CASES.map((uc) => {
            const isSelected = uc.id === selectedId;
            const PillIcon = uc.icon;
            return (
              <button
                key={uc.id}
                type="button"
                onClick={() => setSelectedId(uc.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <PillIcon className="size-3.5" />
                <span>{uc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Persona Card */}
      <Card className="overflow-hidden border-border/80 bg-card shadow-xl shadow-primary/5">
        <CardContent className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                  {activeCase.avatar}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {activeCase.exampleName}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {activeCase.handle} · {activeCase.role}
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground italic">
                {activeCase.quote}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Typical bread types:
                </span>
                {activeCase.popularTiers.map((tier) => (
                  <Badge
                    key={tier}
                    variant="outline"
                    className="border-primary/20 bg-primary/5 text-primary text-xs"
                  >
                    🍞 {tier}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5 text-center space-y-3">
              <Sparkles className="size-6 text-primary mx-auto" />
              <h4 className="text-sm font-bold">Ready to claim your link?</h4>
              <p className="text-xs text-muted-foreground">
                Join hundreds of African creators monetizing their craft directly.
              </p>
              <div className="font-mono text-xs text-primary font-semibold">
                anything4boys.com/you
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
