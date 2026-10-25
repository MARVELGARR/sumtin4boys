"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { AnkaraPattern } from "@/components/brand/ankara-pattern";
import {
  BreadBuddy,
  CheckBuddy,
  CoinBuddy,
  HeartBuddy,
  MessageBuddy,
  SparkBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SimulatedDonation = {
  id: string;
  name: string;
  amount: number;
  breads: number;
  message: string;
  timeAgo: string;
  isPrivate?: boolean;
};

const INITIAL_DONATIONS: SimulatedDonation[] = [
  {
    id: "1",
    name: "Tunde A.",
    amount: 3000,
    breads: 3,
    message: "Take fuel for generator my bro! Your food videos dey make me hungry 😂",
    timeAgo: "2m ago",
  },
  {
    id: "2",
    name: "Chidinma O.",
    amount: 5000,
    breads: 5,
    message: "Keep inspiring us! Your weekly style drop is my small joy 🌟",
    timeAgo: "14m ago",
  },
  {
    id: "3",
    name: "Naija_Anonymous",
    amount: 1000,
    breads: 1,
    message: "Small bread for the late-night editing sessions 🍞",
    timeAgo: "1h ago",
  },
];

const QUICK_MESSAGES = [
  "Take data 🌐",
  "Fuel for the gen ⛽",
  "For the late nights 🌙",
  "You too much 🔥",
  "Small something 💛",
];

export function InteractivePlayground() {
  const [activeTab, setActiveTab] = useState<"supporter" | "creator">("supporter");

  // Supporter simulator state
  const [breadCount, setBreadCount] = useState(3);
  const pricePerBread = 1000;
  const [supporterName, setSupporterName] = useState("You");
  const [supporterMessage, setSupporterMessage] = useState(
    "Small bread for the amazing work. You too much!",
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [donations, setDonations] = useState<SimulatedDonation[]>(INITIAL_DONATIONS);
  const [totalRaised, setTotalRaised] = useState(64000);
  const [isSent, setIsSent] = useState(false);

  // Creator simulator state
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  function handleSendBread() {
    const amount = breadCount * pricePerBread;
    const newDonation: SimulatedDonation = {
      id: Date.now().toString(),
      name: supporterName.trim() || "Kind Supporter",
      amount,
      breads: breadCount,
      message: supporterMessage.trim() || "Sent you small bread!",
      timeAgo: "Just now",
      isPrivate,
    };

    setDonations([newDonation, ...donations]);
    setTotalRaised((prev) => prev + amount);
    setIsSent(true);

    setTimeout(() => {
      setIsSent(false);
    }, 3500);
  }

  function handleWithdraw() {
    setIsWithdrawing(true);
    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
      setTimeout(() => setWithdrawSuccess(false), 4000);
    }, 1200);
  }

  return (
    <section id="demo" className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      {/* Section Header */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <Badge
          variant="secondary"
          className="gap-1.5 border-primary/20 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold tracking-wide"
        >
          <SparkBuddy className="size-4" />
          Try am yourself
        </Badge>
        <h2 className="font-toy text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          See how the boys do it
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Toggle between how your people tear small bread in three taps, and how
          creators collect earnings with bank withdrawals.
        </p>

        {/* Mode Switcher */}
        <div className="mt-4 flex w-full max-w-xs items-center rounded-xl bg-muted p-1 border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab("supporter")}
            className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "supporter"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Supporter View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("creator")}
            className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === "creator"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Creator View
          </button>
        </div>
      </div>

      {activeTab === "supporter" ? (
        /* SUPPORTER VIEW */
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Support Form Mockup */}
          <div className="lg:col-span-7">
            <Card className="toy-card relative overflow-hidden bg-card">
              {/* Creator header strip */}
              <div className="relative overflow-hidden border-b border-[var(--toy-ink)]/10 bg-gradient-to-r from-[var(--toy-ochre)]/30 via-[var(--toy-ochre)]/10 to-transparent p-5 sm:p-6">
                <AnkaraPattern id="demo-supporter" opacity={0.12} />
                <div className="relative flex items-center gap-3.5">
                  <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/40 text-2xl">
                    👩🏾‍🍳
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-toy text-lg font-bold">Amara</h3>
                      <Badge
                        variant="outline"
                        className="h-auto border-[var(--toy-ink)]/10 bg-background/70 text-[11px] font-normal text-foreground"
                      >
                        Creator
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">anything4boys.com/amara</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      Lagos food stories, market finds & everyday wahala on camera 🇳🇬
                    </p>
                  </div>
                </div>

                {/* Simulated Goal Progress */}
                <div className="relative mt-4 rounded-xl border border-[var(--toy-ink)]/10 bg-background/80 p-3 backdrop-blur-sm">
                  <div className="mb-1.5 flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Goal: new camera for my food series 🎥</span>
                    <span className="font-semibold text-primary">
                      ₦{totalRaised.toLocaleString()} / ₦100,000
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--toy-ochre)]/25">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(100, (totalRaised / 100000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tipping Controls */}
              <CardContent className="p-5 sm:p-6 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose bread amount
                  </label>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { count: 1, label: "1 bread", price: "₦1,000" },
                      { count: 3, label: "3 breads", price: "₦3,000" },
                      { count: 5, label: "5 breads", price: "₦5,000" },
                      { count: 10, label: "10 breads", price: "₦10,000" },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setBreadCount(item.count)}
                        aria-pressed={breadCount === item.count}
                        className={`flex touch-manipulation flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all sm:p-3 ${
                          breadCount === item.count
                            ? "border-primary bg-[var(--toy-ochre)]/25 ring-2 ring-primary/20"
                            : "border-[var(--toy-ink)]/10 hover:border-[var(--toy-ink)]/20 hover:bg-muted/50"
                        }`}
                      >
                        <BreadBuddy size={25} />
                        <span className="mt-1 text-xs font-semibold">{item.label}</span>
                        <span className="text-[11px] text-muted-foreground">{item.price}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Message Chips */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick message presets (tap to pick)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_MESSAGES.map((msg) => (
                      <button
                        key={msg}
                        type="button"
                        onClick={() => setSupporterMessage(msg)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          supporterMessage === msg
                            ? "border-primary bg-primary font-medium text-primary-foreground"
                            : "border-[var(--toy-ink)]/10 bg-background/60 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom message field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Your message
                  </label>
                  <Input
                    value={supporterMessage}
                    onChange={(e) => setSupporterMessage(e.target.value)}
                    placeholder="Drop a kind word…"
                    className="h-10 text-base sm:text-sm"
                    maxLength={140}
                  />
                </div>

                {/* Name & Private toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Your name / handle</label>
                    <Input
                      value={supporterName}
                      onChange={(e) => setSupporterName(e.target.value)}
                      placeholder="e.g. Tunde"
                      className="h-10 text-base sm:text-sm"
                      maxLength={40}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 sm:pt-5">
                    <input
                      type="checkbox"
                      id="private-check"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="size-5 rounded border-border accent-primary cursor-pointer"
                    />
                    <label htmlFor="private-check" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Keep my support private
                    </label>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSendBread}
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 transition-transform active:scale-[0.99]"
                >
                  <BreadBuddy size={21} />
                  <span>
                    Tear {breadCount} bread{breadCount > 1 ? "s" : ""} · ₦
                    {(breadCount * pricePerBread).toLocaleString()}
                  </span>
                </Button>

                {isSent && (
                  <div className="animate-fade-in-up flex items-center justify-center gap-2 rounded-xl border border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 p-3.5 text-center text-xs font-medium text-[var(--toy-leaf)] sm:text-sm">
                    <CheckBuddy className="size-5 shrink-0" />
                    <span>
                      Woohoo! ₦
                      {(breadCount * pricePerBread).toLocaleString()} sent to
                      Amara. Watch the kind words wall update.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Feed Simulator Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-toy text-base font-bold">
                <span className="size-2 animate-pulse rounded-full bg-[var(--toy-leaf)]" />
                Kind words wall
              </h3>
              <span className="text-xs text-muted-foreground">Simulated feed</span>
            </div>

            <div className="space-y-3">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card/90 p-4 shadow-[0_3px_0_rgba(42,23,15,0.06)] backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--toy-ochre)]/50 bg-[var(--toy-ochre)]/30 text-xs font-bold text-foreground">
                        {d.isPrivate ? "🔒" : d.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold">
                        {d.isPrivate ? "Private supporter" : d.name}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-auto gap-1 border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 px-2 py-1 text-[10px] font-semibold text-foreground"
                    >
                      <BreadBuddy className="size-3.5" />
                      {d.breads} {d.breads === 1 ? "bread" : "breads"} · ₦
                      {d.amount.toLocaleString()}
                    </Badge>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {d.isPrivate
                      ? "“Support kept private between creator and fan.”"
                      : `“${d.message}”`}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                    {d.timeAgo}
                  </p>
                </div>
              ))}
            </div>

            <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-muted-foreground">
              <MessageBuddy className="size-4 shrink-0" />
              Public messages show up the instant a supporter pays.
            </p>
          </div>
        </div>
      ) : (
        /* CREATOR VIEW */
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Creator Dashboard Mockup */}
          <div className="lg:col-span-7">
            <Card className="toy-card overflow-hidden bg-card">
              <CardHeader className="border-b border-[var(--toy-ink)]/10 bg-gradient-to-r from-[var(--toy-ochre)]/30 via-[var(--toy-ochre)]/10 to-transparent pb-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/40">
                      <BreadBuddy size={24} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="font-toy text-base sm:text-lg">Amara&apos;s Creator Dashboard</CardTitle>
                      <CardDescription className="text-xs">Live overview &amp; balances</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="h-auto border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 text-xs text-[var(--toy-leaf)]"
                  >
                    ● Active &amp; receiving
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CoinBuddy className="size-4" />
                      Available balance
                    </p>
                    <p className="mt-1.5 font-toy text-xl font-bold tracking-tight text-primary sm:text-2xl">
                      ₦{totalRaised.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <HeartBuddy className="size-4" />
                      Supporters
                    </p>
                    <p className="mt-1.5 font-toy text-xl font-bold tracking-tight sm:text-2xl">
                      {donations.length + 18}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5 sm:col-span-1">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <SparkBuddy className="size-4" />
                      This month
                    </p>
                    <p className="mt-1.5 font-toy text-xl font-bold tracking-tight sm:text-2xl">
                      ₦{(totalRaised + 42000).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Instant Withdrawal Box */}
                <div className="space-y-3 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                        <CoinBuddy className="size-4" />
                        Direct bank payout
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Linked account: GTBank · Amara O. · 0123****89
                      </p>
                    </div>
                    <Badge variant="secondary" className="h-auto text-[11px]">Instant payout</Badge>
                  </div>

                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="h-11 w-full text-sm font-semibold shadow-md shadow-primary/20"
                  >
                    {isWithdrawing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="size-4 animate-spin" />
                        Sending to your bank…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CoinBuddy className="size-4" />
                        Withdraw ₦{totalRaised.toLocaleString()} to bank
                      </span>
                    )}
                  </Button>

                  {withdrawSuccess && (
                    <div className="animate-fade-in-up flex items-center justify-center gap-2 rounded-xl border border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 p-3 text-center text-xs font-medium text-[var(--toy-leaf)]">
                      <CheckBuddy className="size-5 shrink-0" />
                      <span>Payout dispatched! ₦{totalRaised.toLocaleString()} sent directly to your GTBank account.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CheckBuddy className="size-4 shrink-0" />
                    Zero setup fee · zero monthly hosting charge
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckBuddy className="size-4 shrink-0" />
                    Automated reconciliation &amp; transparent ledger
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Educational Highlights for Creators */}
          <div className="lg:col-span-5 space-y-5">
            <h3 className="font-toy text-2xl font-bold tracking-tight">
              Why creators love{" "}
              <span className="text-primary">anything4boys</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30">
                  <SparkBuddy className="size-5" />
                </div>
                <div>
                  <h4 className="font-toy text-sm font-semibold">Zero subscription friction</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Fans don&apos;t need to lock into a monthly Patreon-style recurring charge. They can tear bread whenever they love your content.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30">
                  <CoinBuddy className="size-5" />
                </div>
                <div>
                  <h4 className="font-toy text-sm font-semibold">Nigerian bank &amp; mobile payouts</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    No PayPal restrictions, no complicated wire transfers. Bachs handles payouts directly to your local Nigerian account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/30">
                  <MessageBuddy className="size-5" />
                </div>
                <div>
                  <h4 className="font-toy text-sm font-semibold">Public social proof</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    Every message doubles as a public review of your work, motivating other followers to show up for you too.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
