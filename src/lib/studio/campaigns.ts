/**
 * Campaign Studio campaigns and runs (ported from campaignStore.js).
 * A campaign points to a template (it doesn't copy it) and chooses a version strategy: always latest, or a pinned version.
 * A run works out the version and the audience at send time, then freezes both, so later edits never change a past run.
 * Which version a run uses: 1) the run's override, 2) the campaign's pinned version, 3) the latest version right now.
 */
import { createStore, useStore } from "@/lib/store";
import { studioTemplatesStore, currentVersion, currentVersionNumber, markVersionUsed, type StudioTemplate } from "./templates";
import { studioContactsStore, resolveAudience } from "./contacts";
import type { DeliveryProfile } from "./delivery";

export type VersionStrategy = "latest" | "specific";
export type CampaignStatus = "Draft" | "Active" | "Paused";
export type Run = {
  id: string; executedAt: string; resolvedVia: string;
  templateId: string; templateName: string; templateVersion: number; subject: string;
  audience: { groupsSelected: number; totalAcross: number; duplicatesRemoved: number; suppressedRemoved: number; finalCount: number; recipients: string[] };
  recipientCount: number; deliveryProfile: string | null; status: "Sent";
};
export type StudioCampaign = {
  id: string; name: string; purpose: string; status: CampaignStatus;
  defaultTemplateId: string | null; versionStrategy: VersionStrategy; pinnedVersion: number | null;
  audienceGroupIds: string[]; createdAt: string; updatedAt: string; runs: Run[];
};
export type RunOverride = { versionId: number | null } | null;

let seq = 200;
const now = () => new Date().toISOString();
const tplByName = (n: string) => studioTemplatesStore.get().find((t) => t.name === n);

export const studioCampaignsStore = createStore<StudioCampaign[]>([
  { id: "cmp_201", name: "GA Rollout", purpose: "Announce general availability of Workflow Manager to every merchant", status: "Active",
    defaultTemplateId: tplByName("Workflow Manager Launch")?.id ?? null, versionStrategy: "latest", pinnedVersion: null,
    audienceGroupIds: ["grp_ng", "grp_ent"], createdAt: now(), updatedAt: now(), runs: [] },
  { id: "cmp_202", name: "Supply Chain Pilot — Wave 1", purpose: "Roll out live delivery tracking to pilot merchants", status: "Active",
    defaultTemplateId: tplByName("Delivery Tracking Update")?.id ?? null, versionStrategy: "specific", pinnedVersion: 1,
    audienceGroupIds: ["grp_evt"], createdAt: now(), updatedAt: now(), runs: [] },
]);
export const useStudioCampaigns = () => useStore(studioCampaignsStore);

/** Which template version a run would send, and how that was decided. */
export function resolveVersionForRun(c: StudioCampaign, templates: StudioTemplate[], override: RunOverride) {
  const t = templates.find((x) => x.id === c.defaultTemplateId);
  if (!t) return { error: "No template is linked to this campaign." } as const;
  if (!t.versions.length) return { error: "The linked template has no published version." } as const;
  let vNum: number; let resolvedVia: string;
  if (override && override.versionId != null) { vNum = override.versionId; resolvedVia = "Run override · pinned version"; }
  else if (override) { vNum = currentVersionNumber(t)!; resolvedVia = "Run override · latest version"; }
  else if (c.versionStrategy === "specific" && c.pinnedVersion != null) { vNum = c.pinnedVersion; resolvedVia = "Campaign default · pinned version"; }
  else { vNum = currentVersionNumber(t)!; resolvedVia = "Campaign default · latest version"; }
  const version = t.versions.find((v) => v.v === vNum) ?? currentVersion(t)!;
  return { template: t, version, resolvedVia } as const;
}

export function createStudioCampaign(input: Pick<StudioCampaign, "name" | "purpose" | "defaultTemplateId" | "versionStrategy" | "pinnedVersion" | "audienceGroupIds">) {
  const c: StudioCampaign = { ...input, id: `cmp_${Date.now()}${++seq}`, status: "Active", createdAt: now(), updatedAt: now(), runs: [] };
  studioCampaignsStore.set((l) => [...l, c]);
  return c;
}
export const updateStudioCampaign = (id: string, patch: Partial<StudioCampaign>) =>
  studioCampaignsStore.set((l) => l.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)));

/** Send a run now: lock the version and the audience, and add the run to the history. */
export function executeRun(campaignId: string, override: RunOverride, profile: DeliveryProfile): { run?: Run; error?: string } {
  const c = studioCampaignsStore.get().find((x) => x.id === campaignId);
  if (!c) return { error: "Campaign not found." };
  const r = resolveVersionForRun(c, studioTemplatesStore.get(), override);
  if ("error" in r) return { error: r.error };
  const d = studioContactsStore.get();
  const a = resolveAudience(c.audienceGroupIds, d.groups, d.contacts, d.suppression);
  const run: Run = {
    id: `run_${Date.now()}${++seq}`, executedAt: now(), resolvedVia: r.resolvedVia,
    templateId: r.template.id, templateName: r.template.name, templateVersion: r.version.v, subject: r.version.subject,
    audience: { groupsSelected: a.groupsSelected, totalAcross: a.totalAcross, duplicatesRemoved: a.duplicatesRemoved, suppressedRemoved: a.suppressedRemoved, finalCount: a.finalCount, recipients: a.finalList.map((x) => x.email) },
    recipientCount: a.finalCount, deliveryProfile: profile.name, status: "Sent",
  };
  updateStudioCampaign(campaignId, { runs: [run, ...c.runs] });
  markVersionUsed(r.template.id, r.version.v, c.name);
  return { run };
}
