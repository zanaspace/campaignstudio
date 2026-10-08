import { Badge, type BadgeProps } from "./Badge";
import { cn } from "@/lib/utils";

type Variant = NonNullable<BadgeProps["variant"]>;

/** One place that decides the colour of every status in the app. */
const VARIANTS: Record<string, Variant> = {
  // customer status
  Active: "success",
  Suspended: "destructive",
  Inactive: "destructive",
  // health
  healthy: "success",
  trial: "info",
  trial_ending: "warning",
  due_soon: "warning",
  overdue: "destructive",
  suspended: "destructive",
  // dunning stages
  reminder: "info",
  warning: "warning",
  grace: "warning",
  ready_to_suspend: "destructive",
  paused: "muted",
  no_policy: "secondary",
  // catalogue
  Live: "success",
  Draft: "muted",
  Archived: "secondary",
  // invoices / tickets
  Paid: "success",
  Failed: "destructive",
  Refunded: "muted",
  Pending: "warning",
  Open: "info",
  Resolved: "success",
};

export function StatusBadge({ status, label, className, dot = true }: { status: string; label?: string; className?: string; dot?: boolean }) {
  return (
    <Badge variant={VARIANTS[status] ?? "muted"} className={cn("gap-1.5 whitespace-nowrap", className)}>
      {dot && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label ?? status}
    </Badge>
  );
}
