import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    
    const variants = {
      default: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm",
      secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] shadow-sm",
      outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
      ghost: "bg-transparent hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
      destructive: "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-full px-3 text-xs",
      lg: "h-11 rounded-full px-8",
      icon: "h-9 w-9 rounded-full",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold font-heading transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
