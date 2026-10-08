"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Right-hand panel for details that should keep the list in view. Same keyboard behaviour as Modal. */
export function Drawer({ isOpen, onClose, title, subtitle, children, footer }: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 modal-backdrop-enter" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-[520px] h-full bg-[var(--card)] border-l border-[var(--border)] shadow-2xl flex flex-col focus:outline-none drawer-enter"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[1.1rem] font-heading font-bold text-[var(--foreground)] m-0">{title}</h2>
            {subtitle && <div className="mt-1 text-[0.85rem] text-[var(--muted-foreground)]">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--background)] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
