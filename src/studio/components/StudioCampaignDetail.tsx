"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, LayoutTemplate, Send, SearchX, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { currentVersionNumber, useStudioTemplates } from "@/lib/studio/templates";
import { executeRun, resolveVersionForRun, updateStudioCampaign, useStudioCampaigns, type RunOverride } from "@/lib/studio/campaigns";
import { resolveAudience, resolveGroup, useStudioContacts } from "@/lib/studio/contacts";
import { preferredProfile, sendable, useDeliveryProfiles } from "@/lib/studio/delivery";
import { useStudioPermissions } from "@/lib/studio/access";
import { Panel, dateTime } from "@/components/shared";
import { AudienceMath, CampaignStatusBadge, NoAccess, SectionLabel, Segmented, VersionTag } from "./shared";

export function StudioCampaignDetail({ id }: { id: string }) {
  const campaigns = useStudioCampaigns();
  const templates = useStudioTemplates();
  const data = useStudioContacts();
  const profiles = useDeliveryProfiles();
  const { canView, canManage } = useStudioPermissions("campaigns");
  const c = campaigns.find((x) => x.id === id);
  const [overrideOn, setOverrideOn] = React.useState(false);
  const [overrideVer, setOverrideVer] = React.useState<number | null>(null);
  const senders = sendable(profiles);
  const [senderName, setSenderName] = React.useState(preferredProfile(profiles)?.name ?? "");
  const [confirming, setConfirming] = React.useState(false);
  if (!canView) return <NoAccess module="Studio campaigns" />;
  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-24 border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
        <SearchX className="w-6 h-6 text-[var(--primary)]" /><p className="font-heading font-bold m-0">No campaign with ID “{id}”</p>
        <Link href="/campaigns"><Button variant="outline">Back to campaigns</Button></Link>
      </div>
    );
  }
  const tpl = templates.find((t) => t.id === c.defaultTemplateId);
  const override: RunOverride = overrideOn ? { versionId: overrideVer } : null;
  const resolved = resolveVersionForRun(c, templates, override);
  const audience = resolveAudience(c.audienceGroupIds, data.groups, data.contacts, data.suppression);
  const sender = senders.find((p) => p.name === senderName) ?? senders[0];
  const blocked = "error" in resolved ? resolved.error : !sender ? "No verified sender" : null;
  const toggleGroup = (gid: string) => updateStudioCampaign(c.id, { audienceGroupIds: c.audienceGroupIds.includes(gid) ? c.audienceGroupIds.filter((x) => x !== gid) : [...c.audienceGroupIds, gid] });
  const versionOptions = tpl?.versions.map((v) => `v${v.v} — ${v.subject}`) ?? [];

  const send = () => {
    if (!sender) return;
    const res = executeRun(c.id, override, sender);
    setConfirming(false);
    if (res.error) toast.error(res.error); else toast.success(`Sent to ${res.run!.recipientCount} recipients via ${sender.name}`);
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto flex flex-col gap-6">
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"><ArrowLeft className="w-4 h-4" /> Campaigns</Link>
        <h1 className="text-2xl font-heading font-extrabold m-0 flex items-center gap-3">{c.name}<CampaignStatusBadge status={c.status} /></h1>
        <p className="text-[0.9rem] text-[var(--muted-foreground)] mt-1.5 mb-0">{c.purpose}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <Panel title="Definition: what and who">
          <div className="p-6 flex flex-col gap-5">
            <div>
              <SectionLabel>Default template (linked, not copied)</SectionLabel>
              {tpl ? (
                <Link href={`/templates/${tpl.id}`} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--primary)]">
                  <span className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center"><LayoutTemplate className="w-4 h-4 text-[var(--primary)]" /></span>
                  <span><span className="block font-semibold">{tpl.name}</span><span className="block text-[0.8rem] text-[var(--muted-foreground)]">Current published version: v{currentVersionNumber(tpl)}</span></span>
                </Link>
              ) : <span className="text-[var(--muted-foreground)]">No template linked</span>}
            </div>
            <div className="flex flex-col gap-2">
              <SectionLabel className="mb-1">Version strategy</SectionLabel>
              <Segmented label="Version strategy" disabled={!canManage} value={c.versionStrategy} options={[["latest", "Always latest"], ["specific", "Pin a version"]]}
                onChange={(v) => updateStudioCampaign(c.id, { versionStrategy: v, pinnedVersion: v === "specific" ? c.pinnedVersion ?? (tpl ? currentVersionNumber(tpl) : null) : null })} />
              {c.versionStrategy === "specific" && tpl && (
                <Select ariaLabel="Pinned version" options={versionOptions} value={versionOptions.find((o) => o.startsWith(`v${c.pinnedVersion} `)) ?? ""}
                  onChange={(v) => updateStudioCampaign(c.id, { pinnedVersion: Number(v.slice(1, v.indexOf(" "))) })} />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <SectionLabel className="mb-1">Audience: contact groups</SectionLabel>
              {data.groups.map((g) => (
                <label key={g.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 cursor-pointer has-[:checked]:border-[var(--primary)]">
                  <input type="checkbox" disabled={!canManage} checked={c.audienceGroupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="w-4 h-4 accent-[var(--primary)]" />
                  <span className="flex-1 font-medium">{g.name}</span>
                  <span className="text-[0.78rem] text-[var(--muted-foreground)]">{g.type} · {resolveGroup(g, data.contacts).length}</span>
                </label>
              ))}
              <AudienceMath a={audience} />
            </div>
            <Alert tone="info" title="Templates have their own life cycle">Editing the template publishes a new version. It doesn&apos;t change this campaign or any past run. With “Always latest”, the next run picks up the newest version.</Alert>
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Run: send now">
            <div className="p-6 flex flex-col gap-4">
              <label className="flex items-center gap-2.5 text-[0.88rem] cursor-pointer">
                <input type="checkbox" disabled={!canManage} checked={overrideOn} onChange={(e) => setOverrideOn(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
                Use a different version for this run only
              </label>
              {overrideOn && tpl && (
                <Select ariaLabel="Version for this run" options={[`Latest when sent (v${currentVersionNumber(tpl)})`, ...versionOptions]}
                  value={overrideVer == null ? `Latest when sent (v${currentVersionNumber(tpl)})` : versionOptions.find((o) => o.startsWith(`v${overrideVer} `))}
                  onChange={(v) => setOverrideVer(v.startsWith("Latest") ? null : Number(v.slice(1, v.indexOf(" "))))} />
              )}
              <div className="rounded-xl border border-dashed border-[var(--primary)] bg-[var(--accent)] px-4 py-3 text-[0.86rem] leading-relaxed" aria-label="Version that will be sent">
                {"error" in resolved ? <span className="text-[var(--destructive)] font-semibold">{resolved.error}</span> : <>
                  <div>Version used: <b>{resolved.resolvedVia}</b></div>
                  <div className="flex items-center gap-2">This run will send <VersionTag v={resolved.version.v} /> and keep a copy with the run</div>
                  <div className="text-[var(--muted-foreground)] mt-0.5">Subject: “{resolved.version.subject}”</div>
                </>}
              </div>
              {senders.length > 0 ? (
                <div className="flex flex-col gap-1.5"><span className="text-[0.82rem] font-bold">Send via</span>
                  <Select ariaLabel="Send via" options={senders.map((p) => p.name)} value={sender?.name} onChange={setSenderName} />
                </div>
              ) : (
                <Alert tone="warning" title="No verified sender">Set one up in <Link href="/admin?tab=email" className="font-semibold text-[var(--primary)]">Studio Admin › Email settings</Link>.</Alert>
              )}
              {canManage && <Button className="w-full" disabled={!!blocked} onClick={() => setConfirming(true)}><Send className="w-4 h-4 mr-2" /> Send now</Button>}
            </div>
          </Panel>

          <Panel title="Run history: each run keeps its own version">
            {c.runs.length === 0 ? <p className="m-0 p-8 text-center text-[0.88rem] text-[var(--muted-foreground)]">No runs yet.</p> : (
              <ol className="m-0 p-0 list-none divide-y divide-[var(--border)]" aria-label="Run history">
                {c.runs.map((r) => (
                  <li key={r.id} className="px-6 py-4 text-[0.86rem]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[0.75rem] text-[var(--muted-foreground)]">{r.id}</span>
                      <Badge variant="info" className="gap-1"><Lock className="w-3 h-3" /> Kept as sent</Badge>
                      <span className="ml-auto text-[0.8rem] text-[var(--muted-foreground)]">{dateTime(r.executedAt)}</span>
                    </div>
                    <div className="font-semibold">“{r.subject}”</div>
                    <div className="text-[var(--muted-foreground)] mt-0.5">{r.templateName} <VersionTag v={r.templateVersion} className="mx-1" /> · {r.resolvedVia} · sent to <b className="text-[var(--foreground)]">{r.recipientCount}</b>{r.deliveryProfile ? ` · via ${r.deliveryProfile}` : ""}</div>
                    <div className="text-[0.8rem] text-[var(--muted-foreground)] mt-1">Audience when sent: {r.audience.totalAcross} across {r.audience.groupsSelected} group{r.audience.groupsSelected === 1 ? "" : "s"} − {r.audience.duplicatesRemoved} duplicates − {r.audience.suppressedRemoved} unsubscribed or bounced = <b className="text-[var(--foreground)]">{r.audience.finalCount}</b></div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {!("error" in resolved) && sender && (
        <ConfirmDialog
          isOpen={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={send}
          icon={<Send className="w-6 h-6" />}
          title={`Send “${c.name}” now?`}
          description="Emails go out straight away and can't be recalled."
          impact={[
            `${audience.finalCount} recipient${audience.finalCount === 1 ? "" : "s"} (${audience.duplicatesRemoved} duplicates and ${audience.suppressedRemoved} unsubscribed or bounced removed)`,
            `${resolved.template.name} v${resolved.version.v}: “${resolved.version.subject}”`,
            `Sent via ${sender.name}`,
            "A copy of the email version and the recipient list is kept with the run",
          ]}
          confirmLabel="Send now"
        />
      )}
    </div>
  );
}
