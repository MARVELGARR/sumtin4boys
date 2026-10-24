import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { formatMoney, formatRelativeTime } from "@/lib/format";

type PublicDonation =
  FunctionReturnType<typeof api.creators.getByUsername>["recentDonations"][number];

/** Recent public (non-private) paid donations for a creator page. */
export function SupportersFeed({
  donations,
  displayName,
}: {
  donations: PublicDonation[];
  displayName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent supporters</CardTitle>
        <CardDescription>
          Messages from supporters for {displayName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <Empty className="p-6">
            <EmptyTitle>No bread torn yet — be the first.</EmptyTitle>
          </Empty>
        ) : (
          <ul className="divide-y divide-border">
            {donations.map((donation) => (
              <SupporterRow key={donation._id} donation={donation} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SupporterRow({ donation }: { donation: PublicDonation }) {
  const initial = donation.supporterName.trim().charAt(0).toUpperCase() || "?";

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium">
            {donation.supporterName}
          </span>
          {donation.paidAt !== undefined ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(donation.paidAt)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {formatMoney(donation.amount, donation.currency)}
          </span>{" "}
          · {donation.quantity}{" "}
          {donation.quantity === 1 ? "bread" : "breads"}
        </p>
        {donation.message ? (
          <p className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {donation.message}
          </p>
        ) : null}
      </div>
    </li>
  );
}
