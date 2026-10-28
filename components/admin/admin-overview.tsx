"use client";

import { Component, type ReactNode } from "react";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import {
  Activity,
  Banknote,
  Clock3,
  HandCoins,
  Info,
  Mail,
  ReceiptText,
  Settings2,
  TriangleAlert,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatMoney, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Overview = FunctionReturnType<typeof api.adminTelemetry.overview>;
type CurrencyBucket = Overview["currencies"][number];

const percentFormatter = new Intl.NumberFormat("en-NG", {
  style: "percent",
  maximumFractionDigits: 2,
});

const DAY_MS = 24 * 60 * 60 * 1000;

const SAMPLED_LABELS: Record<keyof Overview["sampled"], string> = {
  creators: "creators",
  ledger: "ledger entries",
  platformLedger: "platform ledger entries",
  donations: "donations",
  payouts: "payouts",
  webhooks: "webhook events",
  operations: "payment operations",
  messages: "contact messages",
};

export function AdminOverview() {
  return (
    <OverviewErrorBoundary>
      <AdminOverviewContent />
    </OverviewErrorBoundary>
  );
}

function AdminOverviewContent() {
  const overview = useQuery(api.adminTelemetry.overview, {});

  if (overview === undefined) {
    return <OverviewSkeleton />;
  }

  const sampledAreas = (
    Object.keys(SAMPLED_LABELS) as Array<keyof Overview["sampled"]>
  ).filter((key) => overview.sampled[key]);

  return (
    <div className="flex flex-col gap-6">
      {sampledAreas.length > 0 ? (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Some figures are based on a recent sample</AlertTitle>
          <AlertDescription>
            The {sampledAreas.map((key) => SAMPLED_LABELS[key]).join(", ")}{" "}
            reached the read cap. Treat these totals as at least this much, not
            as a full-database count.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Money by currency
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Each currency is shown on its own. Amounts in different currencies
            are never added together.
          </p>
        </div>

        {overview.currencies.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Banknote />
              </EmptyMedia>
              <EmptyTitle>No money movement yet</EmptyTitle>
              <EmptyDescription>
                Once bread is paid for and fees land in the ledger, per-currency
                totals will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {overview.currencies.map((bucket) => (
              <CurrencyCard key={bucket.currency} bucket={bucket} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Activity at a glance
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            icon={<Users />}
            label="Creators"
            value={overview.counts.creatorsTotal.toLocaleString()}
            detail={`${overview.counts.creatorsActive.toLocaleString()} active · ${overview.counts.creatorsSuspended.toLocaleString()} suspended`}
          />
          <KpiCard
            icon={<HandCoins />}
            label="Donations paid"
            value={overview.counts.donationsPaid.toLocaleString()}
            detail={`of ${overview.counts.donationsTotal.toLocaleString()} recent`}
          />
          <KpiCard
            icon={<Clock3 />}
            label="Donations pending"
            value={overview.counts.donationsPending.toLocaleString()}
            detail={`${overview.counts.donationsUnresolved.toLocaleString()} unresolved`}
          />
          <KpiCard
            icon={<ReceiptText />}
            label="Payouts requested"
            value={overview.counts.payoutsRequested.toLocaleString()}
            detail="waiting to be sent"
          />
          <KpiCard
            icon={<Wallet />}
            label="Payouts processing"
            value={overview.counts.payoutsProcessing.toLocaleString()}
            detail="in flight"
          />
          <KpiCard
            icon={<Mail />}
            label="New messages"
            value={overview.counts.newMessages.toLocaleString()}
            detail="unread contact inbox"
          />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <HealthCard overview={overview} />
        <ConfigCard overview={overview} />
      </div>

      <DefinitionsCard />
    </div>
  );
}

function CurrencyCard({ bucket }: { bucket: CurrencyBucket }) {
  const feeReversals =
    bucket.platformFeeReversals === 0
      ? formatMoney(0, bucket.currency)
      : formatMoney(-bucket.platformFeeReversals, bucket.currency);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{bucket.currency}</CardTitle>
          <Badge variant="outline">{bucket.currency} only</Badge>
        </div>
        <CardDescription>
          {bucket.nextSettlementAt
            ? `Next unlock ${formatDateTime(bucket.nextSettlementAt)} (${formatRelativeTime(bucket.nextSettlementAt)})`
            : "No pending settlement entries."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="rounded-lg bg-muted/60 p-3">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Total platform net
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(bucket.platformTotalNet, bucket.currency)}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fees + tips + payout fees − processing costs + adjustments.
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div>
              <dt>Fee revenue (net)</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {formatMoney(bucket.platformNetRevenue, bucket.currency)}
              </dd>
            </div>
            <div>
              <dt>Tips (net)</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {formatMoney(bucket.platformTipsNet, bucket.currency)}
              </dd>
            </div>
            <div>
              <dt>Payout fees (net)</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {formatMoney(bucket.payoutFeesNet, bucket.currency)}
              </dd>
            </div>
            <div>
              <dt>Processing costs</dt>
              <dd className="font-medium text-foreground tabular-nums">
                {formatMoney(
                  -bucket.processingFeeExpenses,
                  bucket.currency,
                )}
              </dd>
            </div>
            {bucket.platformAdjustments !== 0 ? (
              <div>
                <dt>Platform adjustments</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {formatMoney(bucket.platformAdjustments, bucket.currency)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Gross fees{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(bucket.platformGrossFees, bucket.currency)}
              </span>
            </span>
            <span>
              Fee reversals{" "}
              <span className="font-medium text-foreground tabular-nums">
                {feeReversals}
              </span>
            </span>
            <span>
              Tips gross{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(bucket.platformTipsGross, bucket.currency)}
              </span>
            </span>
            {bucket.platformTipReversals > 0 ? (
              <span>
                Tip reversals{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(
                    -bucket.platformTipReversals,
                    bucket.currency,
                  )}
                </span>
              </span>
            ) : null}
            {bucket.payoutFeeExpenses > 0 ? (
              <span>
                Payout fee cost{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(
                    -bucket.payoutFeeExpenses,
                    bucket.currency,
                  )}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <MoneyStat
            label="Creator-owned total"
            value={formatMoney(bucket.creatorOwned, bucket.currency)}
            hint="Held + available + payouts awaiting + their fees"
          />
          <MoneyStat
            label="Held for settlement"
            value={formatMoney(bucket.heldForSettlement, bucket.currency)}
            hint="Net pending; unlocks after the hold"
          />
          <MoneyStat
            label="Available to creators"
            value={formatMoney(bucket.creatorAvailable, bucket.currency)}
            hint="Ready to withdraw"
          />
          <MoneyStat
            label="Payouts awaiting"
            value={formatMoney(bucket.payoutsAwaiting, bucket.currency)}
            hint="Net amount for requested or processing withdrawals"
          />
          <MoneyStat
            label="Payout fees held"
            value={formatMoney(bucket.payoutFeesAwaiting, bucket.currency)}
            hint="Pass-through withdrawal fees reserved with open payouts"
          />
          <MoneyStat
            label="Paid out lifetime"
            value={formatMoney(bucket.paidOutLifetime, bucket.currency)}
            hint="Already sent"
          />
          <MoneyStat
            label="Pending deductions"
            value={formatMoney(bucket.pendingDeductions, bucket.currency)}
            hint="Fees, refunds, adjustments; already netted out"
          />
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
          <span>
            Gross donation volume{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(bucket.grossDonationVolume, bucket.currency)}
            </span>
          </span>
          <span>
            Refunded volume{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(bucket.refundedVolume, bucket.currency)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MoneyStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
      <dd className="text-[11px] text-muted-foreground">{hint}</dd>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {detail}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function HealthCard({ overview }: { overview: Overview }) {
  const webhookOk = overview.health.webhookFailures24h === 0;
  const operationsOk = overview.health.apiOperationIssues === 0;
  const lastWebhookAt = overview.health.lastWebhookAt;
  const webhookFresh =
    lastWebhookAt !== null && overview.now - lastWebhookAt < DAY_MS;
  const overallOk = webhookOk && operationsOk && webhookFresh;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            Payment health
          </CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              "border-0",
              overallOk
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          >
            {overallOk ? "Clear" : "Check"}
          </Badge>
        </div>
        <CardDescription>
          Provider callbacks and checkout/payout operation state.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <HealthRow
          icon={<Webhook />}
          label="Webhook failures (24h)"
          value={overview.health.webhookFailures24h.toLocaleString()}
          ok={webhookOk}
          hint="Events that neither processed nor duplicated."
        />
        <HealthRow
          icon={<Activity />}
          label="API operation issues"
          value={overview.health.apiOperationIssues.toLocaleString()}
          ok={operationsOk}
          hint="Calls still started or with an unknown outcome."
        />
        <HealthRow
          icon={<Clock3 />}
          label="Last webhook"
          value={lastWebhookAt ? formatDateTime(lastWebhookAt) : "Never"}
          ok={webhookFresh}
          hint={
            lastWebhookAt
              ? webhookFresh
                ? `${formatRelativeTime(lastWebhookAt)} — most recent event received.`
                : `${formatRelativeTime(lastWebhookAt)} — no webhook in the last 24 hours.`
              : "No webhook events recorded yet."
          }
        />
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon,
  label,
  value,
  hint,
  ok,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
          {label}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Badge
        variant="secondary"
        className={cn(
          "border-0 whitespace-nowrap tabular-nums",
          ok
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
        )}
      >
        {value}
      </Badge>
    </div>
  );
}

function ConfigCard({ overview }: { overview: Overview }) {
  const { config } = overview;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          Configuration
        </CardTitle>
        <CardDescription>
          The payment setup this deployment is running with.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ConfigRow
          label="Payments driver"
          value={config.paymentsDriver === "bachs" ? "Bachs" : "Simulated"}
          tone={config.paymentsDriver === "bachs" ? "neutral" : "warning"}
        />
        <ConfigRow
          label="Connect"
          value={config.connectEnabled ? "Enabled" : "Disabled"}
          tone={config.connectEnabled ? "good" : "muted"}
        />
        <ConfigRow
          label="Turnstile"
          value={config.turnstileConfigured ? "Configured" : "Not configured"}
          tone={config.turnstileConfigured ? "good" : "warning"}
        />
        <ConfigRow
          label="Platform fee (NGN)"
          value={`${config.platformFeeBps.toLocaleString()} bps (${percentFormatter.format(
            config.platformFeeBps / 10_000,
          )}) · USD 10%`}
          tone="neutral"
        />
        <ConfigRow
          label="Settlement hold"
          value={`${config.settlementHoldHours.toLocaleString()} ${
            config.settlementHoldHours === 1 ? "hour" : "hours"
          }`}
          tone="neutral"
        />
        <div className="rounded-lg bg-muted/60 p-2.5">
          <div className="text-xs font-medium text-muted-foreground">
            Bachs webhook URL
          </div>
          <code className="mt-1 block break-all text-xs font-semibold">
            {config.webhookUrl || "Deployment site URL is not configured"}
          </code>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Register this exact HTTPS URL in the Bachs dashboard. Never use the
            .convex.cloud URL or a trailing slash.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warning" | "muted" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge
        variant="secondary"
        className={cn(
          "border-0 whitespace-nowrap",
          tone === "good" &&
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          tone === "warning" &&
            "bg-amber-500/10 text-amber-700 dark:text-amber-400",
          tone === "muted" && "bg-muted text-muted-foreground",
          tone === "neutral" && "bg-muted text-foreground",
        )}
      >
        {value}
      </Badge>
    </div>
  );
}

function DefinitionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          What these numbers mean
        </CardTitle>
        <CardDescription>
          Plain-language definitions so a figure is never read as something it
          is not.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>
            <span className="font-medium text-foreground">Creator-owned</span> =
            held for settlement + available + payouts awaiting + payout fees
            held. This is the full amount reserved for creators and their
            requested withdrawals.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Held for settlement
            </span>{" "}
            = net pending entries that become available after the hold period.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Pending deductions
            </span>{" "}
            = negative pending entries such as fees, refunds and adjustments.
            They are already netted out of held for settlement.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Total platform net
            </span>{" "}
            = fee revenue + tips + payout fees − processing costs + platform
            adjustments. Fee revenue is fee entries minus refund reversals.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Payouts awaiting
            </span>{" "}
            = net amount for requested or processing withdrawals not yet paid.
            Payout fees held = the provider fee reserved on top of those
            withdrawals.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Available to creators
            </span>{" "}
            = settled creator money ready to withdraw.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Paid out lifetime
            </span>{" "}
            = bread money already sent to creators.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-80 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

class OverviewErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Could not load the overview</AlertTitle>
          <AlertDescription>
            The admin telemetry query failed. Refresh the page, or check that
            you are still signed in as an admin.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
