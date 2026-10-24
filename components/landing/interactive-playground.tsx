"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  DollarSign,
  Heart,
  Landmark,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from "lucide-react";
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
    message: "Take fuel for generator my bro! That React tutorial saved my exam yesterday 🚀",
    timeAgo: "2m ago",
  },
  {
    id: "2",
    name: "Chidinma O.",
    amount: 5000,
    breads: 5,
    message: "Keep inspiring us! Always look forward to your weekly newsletter 🌟",
    timeAgo: "14m ago",
  },
  {
    id: "3",
    name: "Dev_Anonymous",
    amount: 1000,
    breads: 1,
    message: "Small bread for the late night debugging sessions 🍞",
    timeAgo: "1h ago",
  },
];

const QUICK_MESSAGES = [
  "Take fuel for gen ⛽",
  "Great tutorial bro 💻",
  "Keep shipping! 🚀",
  "For the late nights 🌙",
  "Hold body with this 💪",
];

export function InteractivePlayground() {
  const [activeTab, setActiveTab] = useState<"supporter" | "creator">("supporter");

  // Supporter simulator state
  const [breadCount, setBreadCount] = useState(3);
  const pricePerBread = 1000;
  const [supporterName, setSupporterName] = useState("You");
  const [supporterMessage, setSupporterMessage] = useState("Tearing some bread for the amazing work! 🍞");
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
      message: supporterMessage.trim() || "Sent you bread! 🍞",
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
          <Sparkles className="size-3.5" />
          Interactive Experience
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          See how it works in real-time
        </h2>
        <p className="max-w-2xl text-base sm:text-lg text-muted-foreground">
          Toggle between how your fans tear bread for you in 3 taps, and how your creator dashboard collects earnings with instant bank withdrawals.
        </p>

        {/* Mode Switcher */}
        <div className="mt-4 flex w-full max-w-xs items-center rounded-xl bg-muted p-1 border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab("supporter")}
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all ${
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
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all ${
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
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl shadow-primary/5">
              {/* Creator header strip */}
              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 sm:p-6 border-b border-border/60">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary font-bold text-2xl text-primary-foreground shadow-md shadow-primary/20">
                    👨🏾‍💻
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">Kolawole</h3>
                      <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
                        Creator
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">anything4boys.com/kola</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      Building open-source dev tools & YouTube tutorials for Nigerian builders 🇳🇬
                    </p>
                  </div>
                </div>

                {/* Simulated Goal Progress */}
                <div className="mt-4 rounded-xl bg-background/80 p-3 border border-border/50 backdrop-blur-sm">
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-muted-foreground">Goal: New Studio Mic 🎙️</span>
                    <span className="text-primary font-semibold">
                      ₦{totalRaised.toLocaleString()} / ₦100,000
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-700 rounded-full"
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
                  <div className="mt-2.5 grid grid-cols-4 gap-2">
                    {[
                      { count: 1, label: "1 Bread", price: "₦1,000", emoji: "🍞" },
                      { count: 3, label: "3 Breads", price: "₦3,000", emoji: "🥖" },
                      { count: 5, label: "5 Breads", price: "₦5,000", emoji: "🥐" },
                      { count: 10, label: "10 Breads", price: "₦10,000", emoji: "🥪" },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => setBreadCount(item.count)}
                        className={`flex flex-col items-center justify-center rounded-xl p-2.5 sm:p-3 border text-center transition-all ${
                          breadCount === item.count
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm"
                            : "border-border/70 hover:border-border hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xl sm:text-2xl mb-1">{item.emoji}</span>
                        <span className="text-xs font-semibold">{item.label}</span>
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
                        className={`rounded-full px-3 py-1 text-xs transition-colors border ${
                          supporterMessage === msg
                            ? "border-primary bg-primary text-primary-foreground font-medium"
                            : "border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground"
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
                    placeholder="Say something nice…"
                    className="h-10 text-sm"
                    maxLength={140}
                  />
                </div>

                {/* Name & Private toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Your Name / Handle</label>
                    <Input
                      value={supporterName}
                      onChange={(e) => setSupporterName(e.target.value)}
                      placeholder="e.g. Tunde"
                      className="h-9 text-sm"
                      maxLength={40}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2 sm:pt-5">
                    <input
                      type="checkbox"
                      id="private-check"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="size-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <label htmlFor="private-check" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Keep message private
                    </label>
                  </div>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSendBread}
                  size="lg"
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 transition-transform active:scale-[0.99]"
                >
                  <Send className="mr-2 size-4" />
                  <span>Send {breadCount} Bread{breadCount > 1 ? "s" : ""} (₦{(breadCount * pricePerBread).toLocaleString()})</span>
                </Button>

                {isSent && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in-up">
                    🎉 Woohoo! ₦{(breadCount * pricePerBread).toLocaleString()} bread sent to Kolawole! Look at the live feed update on the right! 🍞✨
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live Feed Simulator Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Supporter Wall
              </h3>
              <span className="text-xs text-muted-foreground">Simulated Feed</span>
            </div>

            <div className="space-y-3">
              {donations.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {d.isPrivate ? "🔒" : d.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm">
                        {d.isPrivate ? "Private Supporter" : d.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                      🍞 {d.breads} {d.breads === 1 ? "bread" : "breads"} · ₦{d.amount.toLocaleString()}
                    </Badge>
                  </div>

                  <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {d.isPrivate ? "“Support kept private between creator and fan”" : `“${d.message}”`}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground/70 font-mono">
                    {d.timeAgo}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Every message appears on your public link the instant a supporter pays.
            </p>
          </div>
        </div>
      ) : (
        /* CREATOR VIEW */
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Creator Dashboard Mockup */}
          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl shadow-primary/5">
              <CardHeader className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border/60 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      🍞
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">Kolawole&apos;s Creator Dashboard</CardTitle>
                      <CardDescription className="text-xs">Live overview &amp; balances</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs">
                    ● Active &amp; Receiving
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wallet className="size-3.5 text-primary" />
                      Available Balance
                    </p>
                    <p className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-primary">
                      ₦{totalRaised.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Heart className="size-3.5 text-rose-500" />
                      Supporters
                    </p>
                    <p className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                      {donations.length + 18}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-muted/30 p-3.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      This Month
                    </p>
                    <p className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                      ₦{(totalRaised + 42000).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Instant Withdrawal Box */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <Landmark className="size-4 text-primary" />
                        Direct Bank Payout
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Linked Account: GTBank · Kolawole O. · 0123****89
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px]">Instant Payout</Badge>
                  </div>

                  <Button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20"
                  >
                    {isWithdrawing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="size-4 animate-spin" />
                        Initiating instant Bachs transfer…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="size-4" />
                        Withdraw ₦{totalRaised.toLocaleString()} to Bank
                      </span>
                    )}
                  </Button>

                  {withdrawSuccess && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in-up flex items-center justify-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Payout dispatched! ₦{totalRaised.toLocaleString()} sent directly to your GTBank account.</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-500" />
                    Zero setup fee · Zero monthly hosting charge
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-500" />
                    Automated reconciliation &amp; transparent ledger
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Educational Highlights for Creators */}
          <div className="lg:col-span-5 space-y-5">
            <h3 className="text-2xl font-bold tracking-tight">
              Why creators love <span className="hero-gradient-text">anything4boys</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Zap className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Zero Subscription Friction</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Fans don&apos;t need to lock into a monthly Patreon-style recurring charge. They can tear bread whenever they love your content.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Landmark className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Nigerian Bank &amp; Mobile Payouts</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    No PayPal restrictions, no complicated wire transfers. Supported by Bachs Node for automated payouts directly to your local Nigerian account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Public Social Proof</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
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
