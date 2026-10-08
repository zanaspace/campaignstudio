import * as React from "react";

/** Same title block the Customers and Service Types pages already use, so every page matches. */
export function PageHeader({ title, subtitle, actions, children }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div className="min-w-0">
        <h1 className="text-3xl font-heading font-extrabold text-[var(--foreground)] tracking-tight m-0">{title}</h1>
        {subtitle && <p className="text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
