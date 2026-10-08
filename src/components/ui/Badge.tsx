import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "secondary" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-[var(--primary)] text-[var(--primary-foreground)]",
    success: "bg-[rgba(31,157,115,.12)] text-[var(--success)]",
    warning: "bg-[rgba(245,158,11,.12)] text-[var(--warning)]",
    destructive: "bg-[rgba(239,68,68,.12)] text-[var(--destructive)]",
    info: "bg-[rgba(59,130,246,.12)] text-[var(--info)]",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    muted: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.72rem] font-bold font-heading uppercase tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
