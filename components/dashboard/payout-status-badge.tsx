import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  requested: {
    label: "Requested",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  processing: {
    label: "Processing",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
} as const;

export type PayoutStatus = keyof typeof STATUS_MAP;

/** Small colour-coded badge for a payout's status. */
export function PayoutStatusBadge({
  status,
  className,
}: {
  status: PayoutStatus;
  className?: string;
}) {
  const entry = STATUS_MAP[status];
  return (
    <Badge
      variant="secondary"
      className={cn("border-0", entry.className, className)}
    >
      {entry.label}
    </Badge>
  );
}
