/**
 * Campaign Studio templates with immutable versioning (ported from templateStore.js).
 * Rule: publishing never overwrites a version. Edits go to a separate draft; publishing appends v1, v2, v3…
 * Campaign runs record the exact version they sent.
 */
import { createStore, useStore } from "@/lib/store";
import { daysFromToday } from "@/lib/format";
import { block, DEFAULT_GLOBAL_FONT, type Block, type GlobalFont } from "./blocks";

export const TEMPLATE_TYPES = ["Transactional", "Marketing", "System"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];
export type TemplateStatus = "Draft" | "Published" | "Archived";
export type Version = { v: number; subject: string; blocks: Block[]; global?: GlobalFont; publishedAt: string; usedIn: string[]; note: string };
export type Draft = { subject: string; blocks: Block[]; global?: GlobalFont; note: string };
export type StudioTemplate = { id: string; name: string; type: TemplateType; status: TemplateStatus; createdAt: string; updatedAt: string; versions: Version[]; draft: Draft | null };

const today = () => daysFromToday(0);
let seq = 100;
const nextId = (p: string) => `${p}_${++seq}`;

/* ---------------- Seed emails (CICOD) ---------------- */

const head = () => block("header");
const foot = () => block("footer");
const wmEmail = (headline: string, extra: boolean) => [
  head(), block("hero-title", { title: headline }), block("hero-image", { alt: "Workflow Manager" }), block("salutation"),
  block("paragraph", { content: "Running your business across teams is about to get simpler. Workflow Manager lets ${businessName} turn everyday processes (purchase requests, refunds, stock adjustments) into clear steps with owners and deadlines." }),
  block("subheading", { text: "What is Workflow Manager?" }),
  block("paragraph", { content: "Create a workflow, assign each step to a person or team, and see where every request is at a glance." }),
  ...(extra ? [
    block("subheading", { text: "Here's what to expect:" }),
    block("bullets", { items: ["Private or shared workflows for each team.", "Approvals before money or stock moves.", "A full history of who did what, and when."] }),
  ] : []),
  block("cta", { label: "Open Workflow Manager" }),
  block("signoff"), foot(),
];
const trackingEmail = (fixed: boolean) => [
  head(), block("hero-title", { title: "New in CICOD Supply Chain: live delivery tracking" }), block("salutation"),
  block("paragraph", { content: "Your customers can now follow their orders from your warehouse to their door, with live status updates by SMS and email." }),
  block("subheading", { text: fixed ? "Turn it on in three steps" : "How to turn it on" }),
  block("bullets", { items: fixed
    ? ["Go to Supply Chain › Settings › Deliveries.", "Switch on Live tracking.", "Choose whether customers get SMS, email or both."]
    : ["Go to Settings.", "Switch on tracking."] }),
  block("signoff"), foot(),
];
const simpleEmail = (headline: string, body: string, button?: string) => [head(), block("hero-title", { title: headline }), block("salutation"), block("paragraph", { content: body }), ...(button ? [block("cta", { label: button })] : []), block("signoff"), foot()];

function version(v: number, subject: string, blocks: Block[], publishedAt: string, usedIn: string[], note: string): Version {
  return { v, subject, blocks, global: { ...DEFAULT_GLOBAL_FONT }, publishedAt, usedIn, note };
}
function template(name: string, type: TemplateType, status: TemplateStatus, updatedAt: string, versions: Version[], draft: Draft | null = null): StudioTemplate {
  return { id: nextId("tpl"), name, type, status, createdAt: versions[0]?.publishedAt ?? updatedAt, updatedAt, versions, draft };
}

const SEED: StudioTemplate[] = [
  template("Workflow Manager Launch", "Marketing", "Published", daysFromToday(-140), [
    version(1, "Workflow Manager is coming to CICOD", wmEmail("Workflow Manager is coming to CICOD", false), daysFromToday(-188), ["April Feature Blast"], "Initial launch announcement"),
    version(2, "Workflow Manager is coming to CICOD", wmEmail("Workflow Manager is coming to CICOD", true), daysFromToday(-162), ["Merchant Pilot Wave 1"], "Added the What to expect section"),
    version(3, "Workflow Manager: now live for every merchant", wmEmail("Workflow Manager: now live for every merchant", true), daysFromToday(-140), ["GA Rollout"], "Updated headline and button for general availability"),
  ]),
  template("Delivery Tracking Update", "Marketing", "Published", daysFromToday(-206), [
    version(1, "New in CICOD Supply Chain: live delivery tracking", trackingEmail(false), daysFromToday(-220), ["Supply Chain Update Mar"], "First Supply Chain feature email"),
    version(2, "New in CICOD Supply Chain: live delivery tracking", trackingEmail(true), daysFromToday(-206), ["Supply Chain Update Mar (resend)"], "Fixed the set-up steps"),
  ]),
  template("Password Reset", "Transactional", "Published", daysFromToday(-240), [
    version(1, "Reset your CICOD password", simpleEmail("Reset your password", "We received a request to reset the password for ${email}. If this was you, use the button below. The link expires in 30 minutes.", "Reset password"), daysFromToday(-269), ["(system trigger)"], "Standard reset flow"),
  ]),
  template("Monthly Merchant Digest", "Marketing", "Draft", daysFromToday(-131), [], {
    subject: "Your CICOD activity this month",
    blocks: simpleEmail("Your month on CICOD", "Here's a summary of ${businessName}'s orders, payments and customers this month."),
    global: { ...DEFAULT_GLOBAL_FONT }, note: "Work in progress",
  }),
  template("Account Suspension Notice", "System", "Archived", daysFromToday(-321), [
    version(1, "Important: your CICOD account status", simpleEmail("Your account status", "Your ${planName} subscription is overdue, so ${businessName}'s account will be suspended soon. Renew now to keep your store and data available."), daysFromToday(-371), ["Q4 Cleanup"], ""),
    version(2, "Important: your CICOD account status", simpleEmail("Your account status", "We couldn't renew your ${planName} subscription. To keep ${businessName} running without interruption, please update your payment details."), daysFromToday(-321), [], "Softened tone (never sent)"),
  ]),
];

export const studioTemplatesStore = createStore<StudioTemplate[]>(SEED);
export const useStudioTemplates = () => useStore(studioTemplatesStore);

/* ---------------- Selectors ---------------- */

export const currentVersion = (t: StudioTemplate) => (t.versions.length ? t.versions[t.versions.length - 1] : null);
export const currentVersionNumber = (t: StudioTemplate) => currentVersion(t)?.v ?? null;
/** Campaigns that used any version (system triggers in brackets are not campaigns). */
export const campaignCount = (t: StudioTemplate) => t.versions.reduce((n, v) => n + v.usedIn.filter((u) => u && !u.startsWith("(")).length, 0);

/* ---------------- Mutations (each returns the new list via the store) ---------------- */

const set = (fn: (list: StudioTemplate[]) => StudioTemplate[]) => studioTemplatesStore.set(fn);
const copyBlocks = (b: Block[]) => b.map((x) => ({ ...x, props: { ...x.props, items: x.props.items ? [...x.props.items] : undefined } }));

/** A new template always starts as a draft. Returns its id. */
export function createTemplate(input: { name: string; type: TemplateType; subject: string; blocks: Block[]; global: GlobalFont }) {
  // Seeds use stable ids (tpl_101…); new templates get a time-based id so they never clash after a reload.
  const t: StudioTemplate = { id: `tpl_${Date.now()}${++seq}`, name: input.name, type: input.type, status: "Draft", createdAt: today(), updatedAt: today(), versions: [], draft: { subject: input.subject, blocks: input.blocks, global: input.global, note: "New template" } };
  set((l) => [...l, t]);
  return t.id;
}
/** Edit the draft only; published versions are never touched. */
export function updateDraft(id: string, patch: Partial<Draft>) {
  set((l) => l.map((t) => (t.id !== id ? t : { ...t, updatedAt: today(), draft: { ...(t.draft ?? { subject: "", blocks: [], note: "" }), ...patch } })));
}
/** Start editing a published template: copy the current version into a fresh draft. */
export function startNewVersionFromCurrent(id: string) {
  set((l) => l.map((t) => {
    if (t.id !== id || t.draft) return t;
    const cur = currentVersion(t);
    return { ...t, updatedAt: today(), draft: cur ? { subject: cur.subject, blocks: copyBlocks(cur.blocks), global: cur.global, note: `Editing from v${cur.v}` } : { subject: "", blocks: [], note: "New template" } };
  }));
}
/** Publish the draft as a new immutable version. */
export function publishDraft(id: string) {
  set((l) => l.map((t) => {
    if (t.id !== id || !t.draft) return t;
    const v: Version = { v: (currentVersionNumber(t) ?? 0) + 1, subject: t.draft.subject, blocks: copyBlocks(t.draft.blocks), global: t.draft.global, publishedAt: today(), usedIn: [], note: t.draft.note || "Newly published" };
    return { ...t, versions: [...t.versions, v], draft: null, status: "Published", updatedAt: today() };
  }));
}
/** Copy any version into the draft (history is untouched). */
export function duplicateVersionToDraft(id: string, vNum: number) {
  set((l) => l.map((t) => {
    const src = t.id === id ? t.versions.find((v) => v.v === vNum) : undefined;
    return src ? { ...t, updatedAt: today(), draft: { subject: src.subject, blocks: copyBlocks(src.blocks), global: src.global, note: `Duplicated from v${src.v}` } } : t;
  }));
}
/** Archived templates can't be picked for new campaigns. */
export function setArchived(id: string, archived: boolean) {
  set((l) => l.map((t) => (t.id === id ? { ...t, status: archived ? "Archived" : t.versions.length ? "Published" : "Draft", updatedAt: today() } : t)));
}
/** Record that a campaign run used a version (shown as "used in"). */
export function markVersionUsed(id: string, vNum: number, campaignName: string) {
  set((l) => l.map((t) => (t.id !== id ? t : { ...t, versions: t.versions.map((v) => (v.v === vNum && !v.usedIn.includes(campaignName) ? { ...v, usedIn: [...v.usedIn, campaignName] } : v)) })));
}

/** Field-level differences between two versions, for the compare view. */
export function diffVersions(t: StudioTemplate, a: number, b: number) {
  const va = t.versions.find((v) => v.v === a);
  const vb = t.versions.find((v) => v.v === b);
  if (!va || !vb) return null;
  const text = (v: Version) => v.blocks.map((x) => x.type).join(",");
  return { va, vb, subjectChanged: va.subject !== vb.subject, blocksChanged: va.blocks.length !== vb.blocks.length || text(va) !== text(vb) };
}
