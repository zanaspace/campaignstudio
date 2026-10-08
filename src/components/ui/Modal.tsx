"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    // Focus the first field (or the dialog) so keyboard users land inside it.
    const first = dialogRef.current?.querySelector<HTMLElement>(`[data-modal-body] ${FOCUSABLE}`) ?? dialogRef.current;
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const [firstItem, lastItem] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-backdrop-enter">

      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col modal-dialog-enter focus:outline-none`}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <h2 id={titleId} className="text-[1.1rem] font-heading font-bold text-[var(--foreground)] m-0">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div data-modal-body className="px-6 py-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-5 border-t border-[var(--border)] bg-[var(--background)] rounded-b-2xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
