/**
 * Campaign Studio email delivery profiles (ported from settingsStore.js): named senders (SendGrid API or SMTP).
 * A profile must be configured and verified before it can send. One profile is the default. Mocked.
 */
import { createStore, useStore } from "@/lib/store";

export const DELIVERY_MODE = { SENDGRID: "SendGrid API", SMTP: "SMTP" } as const;
export type DeliveryMode = (typeof DELIVERY_MODE)[keyof typeof DELIVERY_MODE];
export type SendgridConfig = { apiKey: string; fromEmail: string; fromName: string };
export type SmtpConfig = { host: string; port: number; username: string; password: string; fromEmail: string; fromName: string; secure: boolean };
export type DeliveryProfile = { id: string; name: string; mode: DeliveryMode; sendgrid: SendgridConfig; smtp: SmtpConfig; isDefault: boolean; verified: boolean; lastVerifiedAt: string | null };

const blankSendgrid = (): SendgridConfig => ({ apiKey: "", fromEmail: "notifications@cicod.com", fromName: "CICOD" });
const blankSmtp = (): SmtpConfig => ({ host: "", port: 587, username: "", password: "", fromEmail: "notifications@cicod.com", fromName: "CICOD", secure: true });

let seq = 700;
export const deliveryStore = createStore<DeliveryProfile[]>([
  { id: "eml_default", name: "Transactional (SendGrid)", mode: DELIVERY_MODE.SENDGRID, sendgrid: { apiKey: "SG.demo-transactional-key", fromEmail: "notifications@cicod.com", fromName: "CICOD" }, smtp: blankSmtp(), isDefault: true, verified: true, lastVerifiedAt: new Date(Date.now() - 86_400_000 * 6).toISOString() },
  { id: "eml_bulk", name: "Bulk Marketing (SMTP)", mode: DELIVERY_MODE.SMTP, sendgrid: blankSendgrid(), smtp: { host: "smtp.cicod.com", port: 587, username: "marketing@cicod.com", password: "", fromEmail: "campaigns@cicod.com", fromName: "CICOD Campaigns", secure: true }, isDefault: false, verified: false, lastVerifiedAt: null },
]);
export const useDeliveryProfiles = () => useStore(deliveryStore);

export function isConfigured(p: DeliveryProfile) {
  if (p.mode === DELIVERY_MODE.SENDGRID) return !!(p.sendgrid.apiKey.trim() && p.sendgrid.fromEmail.trim());
  return !!(p.smtp.host.trim() && p.smtp.port && p.smtp.username.trim() && p.smtp.fromEmail.trim());
}
export const canSend = (p: DeliveryProfile) => isConfigured(p) && p.verified;
export const sendable = (list: DeliveryProfile[]) => list.filter(canSend);
export const fromAddress = (p: DeliveryProfile) => { const s = p.mode === DELIVERY_MODE.SENDGRID ? p.sendgrid : p.smtp; return s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail; };
/** The default if it can send, otherwise the first that can. */
export function preferredProfile(list: DeliveryProfile[]) { const d = list.find((p) => p.isDefault); return d && canSend(d) ? d : sendable(list)[0] ?? null; }

export function createProfile(name: string, mode: DeliveryMode): { id?: string; error?: string } {
  const n = name.trim();
  if (!n) return { error: "Profile name is required." };
  const list = deliveryStore.get();
  if (list.some((p) => p.name.toLowerCase() === n.toLowerCase())) return { error: "A profile with that name already exists." };
  const p: DeliveryProfile = { id: `eml_${Date.now()}${++seq}`, name: n, mode, sendgrid: blankSendgrid(), smtp: blankSmtp(), isDefault: list.length === 0, verified: false, lastVerifiedAt: null };
  deliveryStore.set([...list, p]);
  return { id: p.id };
}
/** Any edit clears verification. */
export const updateProfile = (id: string, patch: Partial<Pick<DeliveryProfile, "mode">>) => deliveryStore.set((l) => l.map((p) => (p.id === id ? { ...p, ...patch, verified: false, lastVerifiedAt: null } : p)));
export function updateSection<K extends "sendgrid" | "smtp">(id: string, section: K, patch: Partial<DeliveryProfile[K]>) {
  deliveryStore.set((l) => l.map((p) => (p.id === id ? { ...p, [section]: { ...p[section], ...patch }, verified: false, lastVerifiedAt: null } : p)));
}
export const markVerified = (id: string) => deliveryStore.set((l) => l.map((p) => (p.id === id ? { ...p, verified: true, lastVerifiedAt: new Date().toISOString() } : p)));
export const setDefault = (id: string) => deliveryStore.set((l) => l.map((p) => ({ ...p, isDefault: p.id === id })));
export function removeProfile(id: string) {
  deliveryStore.set((l) => {
    const next = l.filter((p) => p.id !== id);
    if (next.length && !next.some((p) => p.isDefault)) next[0] = { ...next[0], isDefault: true };
    return next;
  });
}
