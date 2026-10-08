"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { TemplateStatus, TemplateType } from "@/lib/studio/templates";
import type { CampaignStatus } from "@/lib/studio/campaigns";
import type { Audience } from "@/lib/studio/contacts";

/** Campaign Studio statuses mapped onto the CRM's shared badge colours. */
const TYPE_VARIANT: Record<TemplateType, "info" | "warning" | "muted"> = { Transactional: "info", Marketing: "warning", System: "muted" };
export const TypeBadge = ({ type }: { type: TemplateType }) => <Badge variant={TYPE_VARIANT[type]}>{type}</Badge>;
const TPL_STATUS: Record<TemplateStatus, string> = { Published: "Live", Draft: "Pending", Archived: "Draft" };
export const TemplateStatusBadge = ({ status }: { status: TemplateStatus }) => <StatusBadge status={TPL_STATUS[status]} label={status} />;
const CMP_STATUS: Record<CampaignStatus, string> = { Active: "Active", Paused: "Pending", Draft: "Draft" };
export const CampaignStatusBadge = ({ status }: { status: CampaignStatus }) => <StatusBadge status={CMP_STATUS[status]} label={status} />;

export const VersionTag = ({ v, className }: { v: number; className?: string }) => (
  <span className={cn("inline-block font-mono text-[0.78rem] font-semibold text-[var(--accent-foreground)] bg-[var(--accent)] px-2 py-0.5 rounded-md", className)}>v{v}</span>
);
export const Immutable = () => <span className="inline-flex items-center gap-1 text-[0.72rem] text-[var(--muted-foreground)]"><Lock className="w-3 h-3" /> Can&apos;t be changed</span>;

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-[0.75rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3", className)}>{children}</div>;
}

/** Union → duplicates removed → suppressed removed = final, as Campaign Studio shows it. */
export function AudienceMath({ a, title = "Audience preview · worked out when the run is sent" }: { a: Audience; title?: string }) {
  const row = (label: string, value: string, tone?: "minus" | "total") => (
    <div className={cn("flex justify-between py-1.5 text-[0.86rem]", tone === "total" && "border-t border-[var(--border)] mt-1.5 pt-2.5 font-heading font-bold text-[0.95rem]")}>
      <span>{label}</span><span className={cn("font-mono", tone === "minus" && "text-[var(--destructive)]")}>{value}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4" aria-label="Audience preview">
      <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">{title}</div>
      {row(`${a.groupsSelected} group${a.groupsSelected === 1 ? "" : "s"}, total across`, String(a.totalAcross))}
      {row("Duplicates removed", `− ${a.duplicatesRemoved}`, "minus")}
      {row("Unsubscribed or bounced removed", `− ${a.suppressedRemoved}`, "minus")}
      {row("Final audience", String(a.finalCount), "total")}
    </div>
  );
}

/** Shown when the signed-in user's Studio role can't view a module. */
export function NoAccess({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-24 border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
      <Lock className="w-6 h-6 text-[var(--muted-foreground)]" />
      <p className="font-heading font-bold m-0">You don&apos;t have access to {module}</p>
      <p className="m-0 text-[0.86rem] text-[var(--muted-foreground)]">Ask a Campaign Studio administrator to change your Studio role.</p>
    </div>
  );
}

export const inputCls = "w-full h-10 px-3 rounded-md border-[1.5px] border-[var(--input)] bg-[var(--background)] text-[0.9rem] focus:outline-none focus:border-[var(--ring)] disabled:opacity-60";
export const labelCls = "text-[0.82rem] font-bold";

export function Segmented<T extends string>({ value, options, onChange, label, disabled }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center bg-[var(--muted)] p-1 rounded-lg gap-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)}
          className={cn("flex-1 px-3 py-1.5 rounded-md text-[0.84rem] font-heading font-semibold transition-colors disabled:cursor-not-allowed", value === v ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
          {l}
        </button>
      ))}
    </div>
  );
}
