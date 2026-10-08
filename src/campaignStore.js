// campaignStore.js
// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN MODULE + RUN MODULE.
//
// Architecture (the corrected model):
//   • Template module owns templates and their immutable versions (templateStore.js).
//   • Campaign module defines WHAT + WHO: a campaign references a template by id
//     (a pointer, NOT a copy) plus a version strategy and audience rules.
//   • Run module defines WHEN + execution: each run RESOLVES the template version
//     at execution time, then FREEZES a snapshot. Editing the template afterwards
//     never changes a past run.
//
// ★ THE RESOLUTION RULE (section 5):
//   1. If the run overrides the template → use the run's selection.
//   2. Else use the campaign's default template.
//   3. Always lock the resolved version at execution time (latest = "now").
// ─────────────────────────────────────────────────────────────────────────────

import { currentVersion, currentVersionNumber } from "./templateStore";

export const VERSION_STRATEGY = { LATEST: "latest", SPECIFIC: "specific" };
export const CAMPAIGN_STATUS = { DRAFT: "Draft", ACTIVE: "Active", PAUSED: "Paused" };

let _seq = 200;
const nextId = (p) => `${p}_${++_seq}`;
const now = () => new Date().toISOString();

// ─── Shapes ──────────────────────────────────────────────────────────────────
// Campaign {
//   id, name, purpose, status,
//   defaultTemplateId,                 // pointer into the template module
//   versionStrategy: "latest"|"specific",
//   pinnedVersionId: number|null,      // used when strategy = specific
//   linkedTemplateIds: [id],           // optional multi-template support
//   audience: { segment },             // who
//   createdAt, updatedAt,
//   runs: [ Run ]
// }
// Run {
//   id, executedAt,
//   resolvedVia,                       // human-readable resolution path
//   templateId, templateVersionId,     // the LOCKED resolution
//   snapshot: { subject, blocks, global },  // FROZEN content (recommended)
//   recipientCount, status
// }

export function createInitialCampaigns(templates) {
  const wg = templates.find((t) => t.name === "Workgroups Announcement");
  const memo = templates.find((t) => t.name.startsWith("Memo"));
  return [
    {
      id: nextId("cmp"),
      name: "GA Rollout",
      purpose: "Announce general availability of Workgroups to all MDAs",
      status: CAMPAIGN_STATUS.ACTIVE,
      defaultTemplateId: wg ? wg.id : null,
      versionStrategy: VERSION_STRATEGY.LATEST,
      pinnedVersionId: null,
      linkedTemplateIds: wg ? [wg.id] : [],
      audienceGroupIds: ["grp_gov", "grp_ent"],
      createdAt: now(), updatedAt: now(),
      runs: [],
    },
    {
      id: nextId("cmp"),
      name: "ECMS Pilot — Wave 1",
      purpose: "Roll out Memo & Document Classification to pilot MDAs",
      status: CAMPAIGN_STATUS.ACTIVE,
      defaultTemplateId: memo ? memo.id : null,
      versionStrategy: VERSION_STRATEGY.SPECIFIC,
      pinnedVersionId: memo ? 1 : null, // pinned to v1 deliberately
      linkedTemplateIds: memo ? [memo.id] : [],
      audienceGroupIds: ["grp_evt"],
      createdAt: now(), updatedAt: now(),
      runs: [],
    },
  ];
}

// ─── Campaign CRUD ───────────────────────────────────────────────────────────
export function createCampaign(list, { name, purpose, defaultTemplateId, versionStrategy = VERSION_STRATEGY.LATEST, pinnedVersionId = null, audienceGroupIds = [] }) {
  const c = {
    id: nextId("cmp"), name, purpose, status: CAMPAIGN_STATUS.ACTIVE,
    defaultTemplateId, versionStrategy, pinnedVersionId,
    linkedTemplateIds: defaultTemplateId ? [defaultTemplateId] : [],
    audienceGroupIds,
    createdAt: now(), updatedAt: now(), runs: [],
  };
  return [...list, c];
}

export function updateCampaign(list, id, patch) {
  return list.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c));
}

export function linkTemplate(list, id, templateId) {
  return list.map((c) => {
    if (c.id !== id) return c;
    if (c.linkedTemplateIds.includes(templateId)) return c;
    return { ...c, linkedTemplateIds: [...c.linkedTemplateIds, templateId], updatedAt: now() };
  });
}
export function unlinkTemplate(list, id, templateId) {
  return list.map((c) => {
    if (c.id !== id) return c;
    return { ...c, linkedTemplateIds: c.linkedTemplateIds.filter((t) => t !== templateId), updatedAt: now() };
  });
}

// ─── ★ Resolution rule ───────────────────────────────────────────────────────
// Pure function. Given a campaign, the templates list, and an optional run-level
// override, returns the LOCKED resolution + a frozen snapshot. Call this AT RUN
// TIME — not at campaign creation time.
export function resolveTemplateForRun(campaign, templates, override = null) {
  // 1. Override wins.
  const templateId = override && override.templateId ? override.templateId : campaign.defaultTemplateId;
  const template = templates.find((t) => t.id === templateId);
  if (!template) return { error: "No template linked to this campaign." };
  if (!template.versions.length) return { error: "Linked template has no published version." };

  // Decide which version to lock.
  let versionNumber;
  let resolvedVia;
  if (override && override.versionId != null) {
    versionNumber = override.versionId;
    resolvedVia = "Run override · pinned";
  } else if (override && override.templateId) {
    versionNumber = currentVersionNumber(template); // override template, latest of it
    resolvedVia = "Run override · latest";
  } else if (campaign.versionStrategy === VERSION_STRATEGY.SPECIFIC && campaign.pinnedVersionId != null) {
    versionNumber = campaign.pinnedVersionId;
    resolvedVia = "Campaign default · pinned";
  } else {
    // 3. latest, resolved at THIS moment
    versionNumber = currentVersionNumber(template);
    resolvedVia = "Campaign default · latest";
  }

  const version = template.versions.find((v) => v.v === versionNumber) || currentVersion(template);
  // Freeze: copy the exact content of the resolved version.
  const snapshot = {
    subject: version.subject,
    blocks: version.blocks.map((b) => ({ ...b })),
    global: version.global ? { ...version.global } : undefined,
  };
  return {
    resolvedVia,
    templateId: template.id,
    templateName: template.name,
    templateVersionId: version.v,
    snapshot,
  };
}

// Execute a run: resolve template + audience, freeze both, append to run history.
// `contactCtx` = { groups, contacts, suppression } so the audience resolves at run time.
export function executeRun(list, campaignId, templates, override = null, contactCtx = null, resolveAudienceFn = null, deliveryProfile = null) {
  const campaign = list.find((c) => c.id === campaignId);
  if (!campaign) return { list, error: "Campaign not found." };
  const r = resolveTemplateForRun(campaign, templates, override);
  if (r.error) return { list, error: r.error };

  // Resolve audience at run time (dynamic groups re-resolve, dedup + suppression applied).
  let audience = null;
  if (contactCtx && resolveAudienceFn) {
    audience = resolveAudienceFn(campaign.audienceGroupIds || [], contactCtx.groups, contactCtx.contacts, contactCtx.suppression);
  }

  const run = {
    id: nextId("run"),
    executedAt: now(),
    resolvedVia: r.resolvedVia,
    templateId: r.templateId,
    templateName: r.templateName,
    templateVersionId: r.templateVersionId, // LOCKED
    snapshot: r.snapshot,                    // FROZEN content
    audienceSnapshot: audience ? {           // FROZEN audience math + recipient emails
      groupsSelected: audience.groupsSelected,
      totalAcross: audience.totalAcross,
      duplicatesRemoved: audience.duplicatesRemoved,
      suppressedRemoved: audience.suppressedRemoved,
      finalCount: audience.finalCount,
      recipients: audience.finalList.map((c) => c.email),
    } : null,
    recipientCount: audience ? audience.finalCount : 0,
    deliveryProfile: deliveryProfile ? deliveryProfile.name : null,
    status: "Sent",
  };
  const next = list.map((c) => (c.id === campaignId ? { ...c, runs: [run, ...c.runs], updatedAt: now() } : c));
  return { list: next, run };
}
