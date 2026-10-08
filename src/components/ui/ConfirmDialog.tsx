"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Select } from "./Select";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: { reason: string; note: string }) => void;
  title: string;
  /** What will happen, in plain words. */
  description: React.ReactNode;
  /** Optional bullet list of side-effects ("Visible on cicod.com pricing", "3 bundles include this plan"). */
  impact?: string[];
  confirmLabel: string;
  tone?: "danger" | "primary";
  /** When set, the user must pick a reason before confirming (kept in the activity log). */
  reasons?: string[];
  icon?: React.ReactNode;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, impact, confirmLabel, tone = "primary", reasons, icon }: ConfirmDialogProps) {
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const close = () => {
    if (busy) return;
    setReason("");
    setNote("");
    onClose();
  };

  const confirm = () => {
    setBusy(true);
    // Short pause so the action feels deliberate; the prototype has no network.
    setTimeout(() => {
      onConfirm(reasons ? { reason, note } : undefined);
      setBusy(false);
      setReason("");
      setNote("");
    }, 500);
  };

  const blocked = !!reasons && !reason;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant={tone === "danger" ? "destructive" : "default"} onClick={confirm} disabled={busy || blocked} className="min-w-[130px]">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…</> : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {icon && (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tone === "danger" ? "bg-[rgba(239,68,68,.12)] text-[var(--destructive)]" : "bg-[var(--accent)] text-[var(--primary)]"}`}>
            {icon}
          </div>
        )}
        <div className="text-[0.9rem] text-[var(--muted-foreground)] leading-relaxed">{description}</div>

        {impact && impact.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-[0.85rem] text-[var(--foreground)]">
            {impact.map((i) => (
              <li key={i} className="flex gap-2"><span className="text-[var(--primary)]">•</span>{i}</li>
            ))}
          </ul>
        )}

        {reasons && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.85rem] font-bold text-[var(--foreground)]">Reason <span className="text-[var(--destructive)]">*</span></label>
              <Select options={reasons} value={reason} onChange={setReason} placeholder="Select a reason" ariaLabel="Reason" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-note" className="text-[0.85rem] font-bold text-[var(--foreground)]">Note <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></label>
              <textarea
                id="confirm-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Visible in the customer's activity log"
                className="w-full p-3 rounded-md border-[1.5px] border-[var(--input)] bg-[var(--background)] text-[0.9rem] focus:outline-none focus:border-[var(--ring)] resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
