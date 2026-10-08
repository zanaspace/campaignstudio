// templateStore.js
// ─────────────────────────────────────────────────────────────────────────────
// The heart of the template management system: immutable versioning.
//
// CORE RULE (requirement 2.3):
//   Editing a published template NEVER overwrites an existing version.
//   It mutates a separate `draft` working copy. Publishing the draft APPENDS
//   a new immutable version (v1, v2, v3...). Campaigns reference a specific
//   version number, so a campaign that ran on v1 always renders v1 — even
//   after the template is edited to v3.
// ─────────────────────────────────────────────────────────────────────────────

export const TEMPLATE_TYPES = ["Transactional", "Marketing", "System"];
export const STATUS = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

let _seq = 100;
const nextId = (p) => `${p}_${++_seq}`;
const today = () => new Date().toISOString().slice(0, 10);

// ─── Shape ───────────────────────────────────────────────────────────────────
// Template {
//   id, name, type, status,
//   createdAt, updatedAt,
//   versions: [ Version ],   // immutable, append-only
//   draft: { subject, blocks } | null   // editable working copy
// }
// Version {
//   v, subject, blocks (array), publishedAt,
//   usedIn: [ campaignName ],  // which campaigns ran this exact version
//   note
// }

export function createInitialData() {
  return [
    mkTemplate({
      name: "Workgroups Announcement", type: "Marketing", status: STATUS.PUBLISHED, updatedAt: "2026-05-20",
      versions: [
        mkVersion(1, "Workgroups are coming to 1Gov", "2026-04-02", ["April Feature Blast"], 9, "Initial launch announcement"),
        mkVersion(2, "Workgroups are coming to 1Gov", "2026-04-28", ["MDA Pilot Wave 1"], 11, "Added private/public visibility section"),
        mkVersion(3, "Workgroups: now live for all MDAs", "2026-05-20", ["GA Rollout"], 11, "Updated headline + CTA for GA"),
      ],
    }),
    mkTemplate({
      name: "Memo & Document Classification", type: "Marketing", status: STATUS.PUBLISHED, updatedAt: "2026-03-15",
      versions: [
        mkVersion(1, "Plus added security with Document Classification", "2026-03-01", ["ECMS Update Mar"], 12, "First ECMS feature email"),
        mkVersion(2, "Plus added security with Document Classification", "2026-03-15", ["ECMS Update Mar (resend)"], 12, "Fixed Top Secret auth steps copy"),
      ],
    }),
    mkTemplate({
      name: "Password Reset", type: "Transactional", status: STATUS.PUBLISHED, updatedAt: "2026-02-10",
      versions: [ mkVersion(1, "Reset your 1Gov password", "2026-01-12", ["(system trigger)"], 5, "Standard reset flow") ],
    }),
    mkTemplate({
      name: "Monthly MDA Digest", type: "Marketing", status: STATUS.DRAFT, updatedAt: "2026-05-28",
      versions: [], draft: { subject: "Your 1Gov activity this month", blocks: mockBlocks(8), note: "Work in progress" },
    }),
    mkTemplate({
      name: "Account Suspension Notice", type: "System", status: STATUS.ARCHIVED, updatedAt: "2025-11-20",
      versions: [
        mkVersion(1, "Important: your 1Gov account status", "2025-10-01", ["Q4 Cleanup"], 6, ""),
        mkVersion(2, "Important: your 1Gov account status", "2025-11-20", [], 6, "Softened tone — never sent"),
      ],
    }),
  ];
}

function mkTemplate({ name, type, status, updatedAt, versions = [], draft = null }) {
  return { id: nextId("tpl"), name, type, status, createdAt: updatedAt, updatedAt, versions, draft };
}
function mkVersion(v, subject, publishedAt, usedIn, blockCount, note) {
  return { v, subject, blocks: mockBlocks(blockCount), publishedAt, usedIn, note };
}
function mockBlocks(n) { return Array.from({ length: n }, (_, i) => ({ type: "block", i })); }

// ─── Derived selectors ───────────────────────────────────────────────────────
export const currentVersion = (t) => (t.versions.length ? t.versions[t.versions.length - 1] : null);
export const currentVersionNumber = (t) => (t.versions.length ? t.versions[t.versions.length - 1].v : null);
export const campaignCount = (t) =>
  t.versions.reduce((n, v) => n + v.usedIn.filter((u) => u && !u.startsWith("(")).length, 0);

// ─── Mutations ───────────────────────────────────────────────────────────────

// Create a brand-new template, starting as a Draft.
export function createTemplate(list, { name, type, subject = "", blocks = [], global }) {
  const draft = { subject, blocks, note: "New template" };
  if (global) draft.global = global;
  const t = mkTemplate({ name, type, status: STATUS.DRAFT, updatedAt: today(), draft });
  return [...list, t];
}

// Edit the DRAFT working copy. Never touches published versions.
export function updateDraft(list, id, patch) {
  return list.map((t) => {
    if (t.id !== id) return t;
    const draft = { ...(t.draft || { subject: "", blocks: [], note: "" }), ...patch };
    return { ...t, draft, updatedAt: today() };
  });
}

// Begin editing a published template: clone its current version into a fresh draft.
// The published version stays immutable; the draft is what gets edited.
export function startNewVersionFromCurrent(list, id) {
  return list.map((t) => {
    if (t.id !== id) return t;
    if (t.draft) return t; // already editing
    const cur = currentVersion(t);
    const draft = cur
      ? { subject: cur.subject, blocks: cur.blocks.map((b) => ({ ...b })), note: `Editing from v${cur.v}` }
      : { subject: "", blocks: [], note: "New template" };
    return { ...t, draft, updatedAt: today() };
  });
}

// Publish the draft → append a NEW immutable version. This is the key operation.
export function publishDraft(list, id) {
  return list.map((t) => {
    if (t.id !== id || !t.draft) return t;
    const nextV = (currentVersionNumber(t) || 0) + 1;
    const newVersion = {
      v: nextV,
      subject: t.draft.subject,
      blocks: t.draft.blocks.map((b) => ({ ...b })), // frozen copy
      publishedAt: today(),
      usedIn: [],
      note: t.draft.note || "Newly published",
    };
    return {
      ...t,
      versions: [...t.versions, newVersion], // append, never overwrite
      draft: null,
      status: STATUS.PUBLISHED,
      updatedAt: today(),
    };
  });
}

// Duplicate any version into a new editable draft (without affecting history).
export function duplicateVersionToDraft(list, id, versionNumber) {
  return list.map((t) => {
    if (t.id !== id) return t;
    const src = t.versions.find((v) => v.v === versionNumber);
    if (!src) return t;
    return { ...t, draft: { subject: src.subject, blocks: src.blocks.map((b) => ({ ...b })), note: `Duplicated from v${src.v}` }, updatedAt: today() };
  });
}

// Archive / unarchive. Archived templates can't be picked for new campaigns.
export function setArchived(list, id, archived) {
  return list.map((t) =>
    t.id === id ? { ...t, status: archived ? STATUS.ARCHIVED : (t.versions.length ? STATUS.PUBLISHED : STATUS.DRAFT), updatedAt: today() } : t
  );
}

// Diff two versions of a template (shallow field-level diff for the compare view).
export function diffVersions(template, vaNum, vbNum) {
  const va = template.versions.find((v) => v.v === vaNum);
  const vb = template.versions.find((v) => v.v === vbNum);
  if (!va || !vb) return null;
  return {
    va, vb,
    subjectChanged: va.subject !== vb.subject,
    blocksChanged: va.blocks.length !== vb.blocks.length,
  };
}
