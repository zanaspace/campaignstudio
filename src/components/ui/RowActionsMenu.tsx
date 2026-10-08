"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon?: React.ElementType;
  onSelect: () => void;
  /** Danger actions are grouped at the bottom, in red, after a divider. */
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
};

const MENU_W = 220;

export function RowActionsMenu({ actions, label = "More actions", triggerClassName }: { actions: RowAction[]; label?: string; triggerClassName?: string }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const safe = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);

  const estimatedH = actions.length * 38 + 16;
  /** Anchor under the trigger (or above it near the bottom of the screen). Returns false when the trigger is off-screen. */
  const place = React.useCallback(() => {
    if (!btnRef.current) return false;
    const r = btnRef.current.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return false;
    const top = r.bottom + estimatedH > window.innerHeight ? r.top - estimatedH - 4 : r.bottom + 4;
    setPos({ top, left: Math.max(8, r.right - MENU_W) });
    return true;
  }, [estimatedH]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) place();
    setOpen((o) => !o);
  };

  React.useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node))) return;
      setOpen(false);
    };
    // Follow the trigger while the page scrolls; only close once it has scrolled out of view.
    const follow = () => { if (!place()) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, place]);

  const run = (a: RowAction) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    a.onSelect();
  };

  const item = (a: RowAction) => (
    <button
      key={a.label}
      role="menuitem"
      disabled={a.disabled}
      title={a.hint}
      onClick={run(a)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left text-[0.85rem] rounded transition-colors disabled:opacity-40 disabled:pointer-events-none",
        a.danger ? "text-[var(--destructive)] hover:bg-[rgba(239,68,68,.1)]" : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
      )}
    >
      {a.icon && <a.icon className="w-4 h-4 shrink-0" />}
      {a.label}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn("w-8 h-8 inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors", triggerClassName)}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, left: pos.left, width: MENU_W }}
          className="fixed z-[60] rounded-md shadow-lg bg-[var(--popover)] border border-[var(--border)] p-1"
        >
          {safe.map(item)}
          {danger.length > 0 && safe.length > 0 && <div className="my-1 h-px bg-[var(--border)]" />}
          {danger.map(item)}
        </div>,
        document.body,
      )}
    </>
  );
}
