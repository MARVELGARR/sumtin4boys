"use client";

import { useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import {
  BowlBuddy,
  BreadBuddy,
  CheckBuddy,
  CoinBuddy,
  HeartBuddy,
  MessageBuddy,
  SparkBuddy,
} from "@/components/brand/toy-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    message: "Take fuel for generator my bro! Your food videos dey make me hungry",
    timeAgo: "2m ago",
  },
  {
    id: "2",
    name: "Chidinma O.",
    amount: 5000,
    breads: 5,
    message: "Keep inspiring us! Your weekly style drop is my small joy",
    timeAgo: "14m ago",
  },
  {
    id: "3",
    name: "Naija_Anonymous",
    amount: 1000,
    breads: 1,
    message: "Small bread for the late-night editing sessions",
    timeAgo: "1h ago",
  },
];

const QUICK_MESSAGES = [
  "Take data",
  "Fuel for the gen",
  "For the late nights",
  "You too much",
  "Small something",
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
    <section id="demo" className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      {/* Section Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-toy text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Try am yourself
        </p>
        <h2 className="font-toy text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          See how the boys do it
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Toggle between how your people tear small bread in three taps, and how
          creators collect earnings with bank withdrawals.
        </p>

        {/* Mode Switcher */}
        <div className="mt-4 flex w-full max-w-xs items-center rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("supporter")}
            aria-pressed={activeTab === "supporter"}
            className={`flex-1 rounded-md px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
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
            aria-pressed={activeTab === "creator"}
            className={`flex-1 rounded-md px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
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
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Support Form Mockup */}
          <div className="lg:col-span-7">
            <div className="toy-card overflow-hidden rounded-3xl bg-card">
              {/* Creator header strip */}
              <div className="border-b border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-5 sm:p-6">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
                    <BowlBuddy size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-toy text-lg font-bold">Amara</h3>
                      <Badge
                        variant="outline"
                        className="h-auto border-[var(--toy-ink)]/10 text-[11px] font-normal text-foreground"
                      >
                        Creator
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      anything4boys.com/amara
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      Lagos food stories, market finds &amp; everyday wahala on
                      camera
                    </p>
                  </div>
                </div>

                {/* Simulated Goal Progress */}
                <div className="mt-4 rounded-lg border border-[var(--toy-ink)]/10 bg-background p-3">
                  <div className="mb-1.5 flex justify-between gap-2 text-xs font-medium">
                    <span className="text-muted-foreground">
                      Goal: new camera for my food series
                    </span>
                    <span className="font-semibold text-primary">
                      ₦{totalRaised.toLocaleString()} / ₦100,000
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(100, (totalRaised / 100000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tipping Controls */}
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                        className={`flex touch-manipulation flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-colors sm:p-3 ${
                          breadCount === item.count
                            ? "border-primary bg-[var(--toy-ochre)]/25"
                            : "border-[var(--toy-ink)]/10 hover:border-[var(--toy-ink)]/30 hover:bg-muted/50"
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
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quick message presets (tap to pick)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_MESSAGES.map((msg) => (
                      <button
                        key={msg}
                        type="button"
                        onClick={() => setSupporterMessage(msg)}
                        aria-pressed={supporterMessage === msg}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          supporterMessage === msg
                            ? "border-primary bg-primary font-medium text-primary-foreground"
                            : "border-[var(--toy-ink)]/10 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom message field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                  className="h-11 w-full text-sm font-semibold"
                >
                  <BreadBuddy size={21} />
                  <span>
                    Tear {breadCount} bread{breadCount > 1 ? "s" : ""} · ₦
                    {(breadCount * pricePerBread).toLocaleString()}
                  </span>
                </Button>

                {isSent && (
                  <div className="animate-fade-in-up flex items-center justify-center gap-2 rounded-lg border border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 p-3.5 text-center text-xs font-medium text-[var(--toy-leaf)] sm:text-sm">
                    <CheckBuddy className="size-5 shrink-0" />
                    <span>
                      Woohoo! ₦
                      {(breadCount * pricePerBread).toLocaleString()} sent to
                      Amara. Watch the kind words wall update.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Feed Simulator Preview */}
          <div className="space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-toy text-base font-bold">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-[var(--toy-leaf)]"
                />
                Kind words wall
              </h3>
              <span className="text-xs text-muted-foreground">Simulated feed</span>
            </div>

            <div className="space-y-3">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-4 transition-colors hover:border-[var(--toy-ink)]/25"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--toy-ochre)]/50 bg-[var(--toy-ochre)]/30 text-xs font-bold text-foreground">
                        {d.isPrivate ? (
                          <Lock className="size-3.5" aria-hidden="true" />
                        ) : (
                          d.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        {d.isPrivate ? "Private supporter" : d.name}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-auto gap-1 border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 px-2 py-1 text-[11px] font-semibold text-foreground"
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
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
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
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Creator Dashboard Mockup */}
          <div className="lg:col-span-7">
            <div className="toy-card overflow-hidden rounded-3xl bg-card">
              <div className="border-b border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
                      <BreadBuddy size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-toy text-base font-bold sm:text-lg">
                        Amara&apos;s Creator Dashboard
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Live overview &amp; balances
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="h-auto gap-1.5 border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 text-[11px] text-[var(--toy-leaf)]"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-[var(--toy-leaf)]"
                    />
                    Active &amp; receiving
                  </Badge>
                </div>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CoinBuddy className="size-4" />
                      Available balance
                    </p>
                    <p className="mt-1.5 font-toy text-xl font-bold tracking-tight text-primary sm:text-2xl">
                      ₦{totalRaised.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <HeartBuddy className="size-4" />
                      Supporters
                    </p>
                    <p className="mt-1.5 font-toy text-xl font-bold tracking-tight sm:text-2xl">
                      {donations.length + 18}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-3.5 sm:col-span-1">
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
                <div className="space-y-3 rounded-2xl border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/15 p-4 sm:p-5">
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
                    className="h-11 w-full text-sm font-semibold"
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
                    <div className="animate-fade-in-up flex items-center justify-center gap-2 rounded-lg border border-[var(--toy-leaf)]/30 bg-[var(--toy-leaf)]/10 p-3 text-center text-xs font-medium text-[var(--toy-leaf)]">
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
              </div>
            </div>
          </div>

          {/* Educational Highlights for Creators */}
          <div className="space-y-5 lg:col-span-5">
            <h3 className="font-toy text-xl font-bold tracking-tight sm:text-2xl">
              Why creators love{" "}
              <span className="text-primary">anything4boys</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
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
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
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
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25">
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
