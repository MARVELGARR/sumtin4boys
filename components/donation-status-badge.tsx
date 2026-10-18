import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  unresolved: {
    label: "Unresolved",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  refunded: {
    label: "Refunded",
    className: "bg-muted text-muted-foreground",
  },
} as const;

export type DonationStatus = keyof typeof STATUS_MAP;

/** Small colour-coded badge for a donation's status. */
export function DonationStatusBadge({
  status,
  className,
}: {
  status: DonationStatus;
  className?: string;
}) {
  const entry = STATUS_MAP[status];
  return (
    <Badge variant="secondary" className={cn("border-0", entry.className, className)}>
      {entry.label}
    </Badge>
  );
}
