"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastEvent {
  id: number;
  message: string;
  type: ToastType;
}

// Global event emitter for toasts
export const toast = {
  success: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("add-toast", { detail: { message, type: "success" } }));
    }
  },
  error: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("add-toast", { detail: { message, type: "error" } }));
    }
  },
  info: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("add-toast", { detail: { message, type: "info" } }));
    }
  }
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const handleAddToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newToast: ToastEvent = {
        id: Date.now(),
        message: customEvent.detail.message,
        type: customEvent.detail.type
      };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3000);
    };

    window.addEventListener("add-toast", handleAddToast);
    return () => window.removeEventListener("add-toast", handleAddToast);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className="pointer-events-auto flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] shadow-xl rounded-xl p-4 w-[350px] animate-in slide-in-from-top-5 fade-in duration-300"
        >
          {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />}
          {t.type === "error" && <XCircle className="w-5 h-5 text-[var(--destructive)]" />}
          
          <span className="flex-1 text-[0.85rem] font-semibold text-[var(--foreground)]">{t.message}</span>
          
          <button 
            onClick={() => removeToast(t.id)}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
