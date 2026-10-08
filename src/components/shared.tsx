"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

/** Pill tabs with counts, the same look as Customers and Leads. */
export function Tabs<T extends string>({ tabs, value, onChange, label, counts, urgent = [] }: {
  tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string; counts?: Partial<Record<T, number>>; urgent?: T[];
}) {
  return (
    <div role="tablist" aria-label={label} className="flex items-center bg-[var(--muted)] p-1.5 rounded-lg w-max max-w-full gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.id === value;
        const n = counts?.[t.id];
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)}
            className={cn("px-4 py-2 rounded-md font-heading font-semibold text-[0.85rem] transition-all whitespace-nowrap flex items-center gap-2", active ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]")}>
            {t.label}
            {n !== undefined && (
              <span className={cn("min-w-6 px-1.5 py-0.5 rounded-full text-[0.72rem] font-bold", urgent.includes(t.id) && n > 0 ? "bg-[rgba(245,158,11,.15)] text-[var(--warning)]" : active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--card)]/60")}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ id, value, onChange, placeholder, label = "Global Search", width = "w-[280px]" }: { id: string; value: string; onChange: (v: string) => void; placeholder: string; label?: string; width?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.85rem] font-bold">{label}</label>
      <div className={cn("relative", width)}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--muted-foreground)]" />
        <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full h-[2.8rem] pl-10 pr-4 rounded-[8px] border-[1.5px] border-[var(--input)] bg-[var(--card)] text-[0.95rem] focus:outline-none focus:border-[var(--ring)]" />
      </div>
    </div>
  );
}

/** A bare on/off switch (SwitchRow without the card), for table rows. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn("relative w-11 h-6 shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed", checked ? "bg-[var(--primary)]" : "bg-[var(--input)]")}>
      <span className={cn("absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export function Avatar({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <span aria-hidden className={cn("w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-heading font-bold text-[0.78rem]", muted ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : "bg-[var(--accent)] text-[var(--primary)]")}>
      {initials(name)}
    </span>
  );
}

/** Whole days since an ISO timestamp. */
export function daysSince(iso: string): number {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - d.getTime()) / 86_400_000);
}
export function ago(iso: string | null | undefined, never = "Never"): string {
  if (!iso) return never;
  const n = daysSince(iso);
  return n <= 0 ? "Today" : n === 1 ? "Yesterday" : n < 60 ? `${n} days ago` : n < 730 ? `${Math.round(n / 30)} months ago` : `${Math.round(n / 365)} years ago`;
}
export function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function Panel({ title, actions, children, className }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden", className)}>
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between gap-4">
        <h3 className="text-[0.95rem] font-heading font-bold m-0">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** county → counties, LGA → LGAs. */
export const plural = (w: string) => (/[^aeiou]y$/i.test(w) ? w.slice(0, -1) + "ies" : w + "s");
