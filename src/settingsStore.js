// settingsStore.js
// ─────────────────────────────────────────────────────────────────────────────
// Email delivery PROFILES. Instead of one global config, the workspace can hold
// multiple named senders — e.g. "Transactional (SendGrid)" and "Bulk Marketing
// (SMTP)" — and a Test Send or Campaign Run chooses which profile to send through.
//
// Each profile is either a SendGrid API sender or an SMTP sender, has its own
// from-address, and must be verified ("Test connection") before it can deliver.
// One profile is the default (used unless a sender is explicitly chosen).
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_MODE = { SENDGRID: "SendGrid API", SMTP: "SMTP" };

let _seq = 700;
const nextId = () => "eml_" + (++_seq);
const now = () => new Date().toISOString();

const blankSendgrid = () => ({ apiKey: "", fromEmail: "1govecms@galaxybackbone.com.ng", fromName: "1Government Cloud" });
const blankSmtp = () => ({ host: "", port: 587, username: "", password: "", fromEmail: "1govecms@galaxybackbone.com.ng", fromName: "1Government Cloud", secure: true });

export function createInitialEmailProfiles() {
  return [
    { id: "eml_default", name: "Transactional (SendGrid)", mode: DELIVERY_MODE.SENDGRID,
      sendgrid: { apiKey: "SG.demo-transactional-key", fromEmail: "1govecms@galaxybackbone.com.ng", fromName: "1Government Cloud" },
      smtp: blankSmtp(), isDefault: true, verified: true, lastVerifiedAt: now() },
    { id: "eml_bulk", name: "Bulk Marketing (SMTP)", mode: DELIVERY_MODE.SMTP,
      sendgrid: blankSendgrid(),
      smtp: { host: "smtp.galaxybackbone.com.ng", port: 587, username: "marketing@galaxybackbone.com.ng", password: "", fromEmail: "campaigns@galaxybackbone.com.ng", fromName: "1Gov Campaigns", secure: true },
      isDefault: false, verified: false, lastVerifiedAt: null },
  ];
}

// ─── Per-profile helpers ─────────────────────────────────────────────────────
export function isProfileConfigured(p) {
  if (!p) return false;
  if (p.mode === DELIVERY_MODE.SENDGRID) {
    const s = p.sendgrid; return !!(s.apiKey && s.apiKey.trim() && s.fromEmail && s.fromEmail.trim());
  }
  const s = p.smtp; return !!(s.host && s.host.trim() && s.port && s.username && s.username.trim() && s.fromEmail && s.fromEmail.trim());
}
export function fromAddress(p) {
  const s = p.mode === DELIVERY_MODE.SENDGRID ? p.sendgrid : p.smtp;
  return s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail;
}
// A profile can send only if configured AND verified.
export const canProfileSend = (p) => isProfileConfigured(p) && !!p.verified;

// ─── List-level helpers ──────────────────────────────────────────────────────
export const sendableProfiles = (list) => (list || []).filter(canProfileSend);
export const anyProfileSendable = (list) => sendableProfiles(list).length > 0;
export const defaultProfile = (list) => (list || []).find((p) => p.isDefault) || (list || [])[0] || null;
export const profileById = (list, id) => (list || []).find((p) => p.id === id) || null;
// Best profile to preselect: the default if it can send, else the first that can.
export function preferredSendProfile(list) {
  const d = defaultProfile(list);
  if (d && canProfileSend(d)) return d;
  return sendableProfiles(list)[0] || null;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────
export function createProfile(list, { name, mode = DELIVERY_MODE.SENDGRID }) {
  if (!name || !name.trim()) return { error: "Profile name is required." };
  if (list.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) return { error: "A profile with that name already exists." };
  const profile = { id: nextId(), name: name.trim(), mode, sendgrid: blankSendgrid(), smtp: blankSmtp(), isDefault: list.length === 0, verified: false, lastVerifiedAt: null };
  return { list: [...list, profile], profile };
}
// Any edit invalidates verification for that profile.
export function updateProfile(list, id, patch) {
  return list.map((p) => (p.id === id ? { ...p, ...patch, verified: false, lastVerifiedAt: null } : p));
}
export function updateProfileSection(list, id, section, patch) {
  return list.map((p) => (p.id === id ? { ...p, [section]: { ...p[section], ...patch }, verified: false, lastVerifiedAt: null } : p));
}
export function markProfileVerified(list, id) {
  return list.map((p) => (p.id === id ? { ...p, verified: true, lastVerifiedAt: now() } : p));
}
export function setDefaultProfile(list, id) {
  return list.map((p) => ({ ...p, isDefault: p.id === id }));
}
export function removeProfile(list, id) {
  const next = list.filter((p) => p.id !== id);
  // if we removed the default, promote the first remaining
  if (next.length && !next.some((p) => p.isDefault)) next[0] = { ...next[0], isDefault: true };
  return next;
}
