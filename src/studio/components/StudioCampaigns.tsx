"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Eye } from "lucide-react";
import { Table, TableActionsCell, TableActionsHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { currentVersion, currentVersionNumber, useStudioTemplates } from "@/lib/studio/templates";
import { createStudioCampaign, useStudioCampaigns, type VersionStrategy } from "@/lib/studio/campaigns";
import { resolveAudience, resolveGroup, useStudioContacts } from "@/lib/studio/contacts";
import { useStudioPermissions } from "@/lib/studio/access";
import { CampaignStatusBadge, NoAccess, Segmented, inputCls, labelCls } from "./shared";

export const strategyLabel = (s: VersionStrategy, pinned: number | null) => (s === "specific" ? `Pinned to v${pinned}` : "Always latest");

export function StudioCampaigns() {
  const router = useRouter();
  const campaigns = useStudioCampaigns();
  const templates = useStudioTemplates();
  const { canView, canManage } = useStudioPermissions("campaigns");
  const [creating, setCreating] = React.useState(false);
  if (!canView) return <NoAccess module="Studio campaigns" />;

  return (
    <div className="max-w-[1600px] w-full mx-auto">
      <PageHeader
        title="Campaigns"
        subtitle="Each Studio campaign links a template, a version strategy and contact groups. Every run is kept exactly as it was sent."
        actions={canManage && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> New campaign</Button>}
      />
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-full border-none shadow-none rounded-none">
            <TableHeader><TableRow className="hover:bg-transparent">
              {["Campaign", "Default template", "Version strategy", "Runs", "Status"].map((h) => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
              <TableActionsHead />
            </TableRow></TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const t = templates.find((x) => x.id === c.defaultTemplateId);
                return (
                  <TableRow key={c.id} onClick={() => router.push(`/campaigns/${c.id}`)} className="cursor-pointer group">
                    <TableCell><div className="font-semibold group-hover:text-[var(--primary)]">{c.name}</div><div className="text-[0.8rem] text-[var(--muted-foreground)] max-w-[420px] truncate">{c.purpose}</div></TableCell>
                    <TableCell className="text-[0.88rem]">{t?.name ?? <span className="text-[var(--muted-foreground)]">—</span>}</TableCell>
                    <TableCell className="text-[0.88rem] whitespace-nowrap">{strategyLabel(c.versionStrategy, c.pinnedVersion)}</TableCell>
                    <TableCell className="text-[0.88rem]">{c.runs.length} run{c.runs.length === 1 ? "" : "s"}</TableCell>
                    <TableCell><CampaignStatusBadge status={c.status} /></TableCell>
                    <TableActionsCell><RowActionsMenu label={`Actions for ${c.name}`} actions={[{ label: "Open campaign", icon: Eye, onSelect: () => router.push(`/campaigns/${c.id}`) }]} /></TableActionsCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {creating && <NewCampaignModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const templates = useStudioTemplates();
  const data = useStudioContacts();
  const published = templates.filter((t) => t.versions.length > 0 && t.status !== "Archived");
  const label = (t: (typeof published)[number]) => `${t.name} (current v${currentVersionNumber(t)})`;
  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [templateId, setTemplateId] = React.useState(published[0]?.id ?? "");
  const [strategy, setStrategy] = React.useState<VersionStrategy>("latest");
  const [pinned, setPinned] = React.useState<number | null>(null);
  const [groupIds, setGroupIds] = React.useState<string[]>([]);
  const tpl = published.find((t) => t.id === templateId);
  const aud = resolveAudience(groupIds, data.groups, data.contacts, data.suppression);
  const toggle = (id: string) => setGroupIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const ready = !!name.trim() && !!templateId && (strategy === "latest" || pinned != null);

  const create = () => {
    createStudioCampaign({ name: name.trim(), purpose: purpose.trim(), defaultTemplateId: templateId, versionStrategy: strategy, pinnedVersion: strategy === "specific" ? pinned : null, audienceGroupIds: groupIds });
    toast.success(`Campaign “${name.trim()}” created`);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="New campaign" maxWidth="max-w-xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!ready}>Create campaign</Button></>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Campaign name</span><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 feature launch" /></label>
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Purpose</span><textarea className={cn(inputCls, "h-auto min-h-[64px] py-2 resize-y")} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is this campaign for?" /></label>
        <div className="flex flex-col gap-1.5"><span className={labelCls}>Default template</span>
          <Select ariaLabel="Default template" options={published.map(label)} value={tpl ? label(tpl) : ""} onChange={(v) => { setTemplateId(published.find((t) => label(t) === v)!.id); setPinned(null); }} />
          {tpl && <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[0.84rem]"><span className="font-semibold text-[var(--accent-foreground)]">Preview · v{currentVersionNumber(tpl)}</span><div>“{currentVersion(tpl)?.subject}”</div></div>}
        </div>
        <div className="flex flex-col gap-1.5"><span className={labelCls}>Version strategy</span>
          <Segmented label="Version strategy" value={strategy} onChange={setStrategy} options={[["latest", "Always latest"], ["specific", "Pin a version"]]} />
          {strategy === "specific" && tpl && <Select ariaLabel="Pinned version" placeholder="Choose a version…" options={tpl.versions.map((v) => `v${v.v} — ${v.subject}`)} value={pinned != null ? `v${pinned} — ${tpl.versions.find((v) => v.v === pinned)?.subject}` : ""} onChange={(v) => setPinned(Number(v.slice(1, v.indexOf(" "))))} />}
        </div>
        <div className="flex flex-col gap-1.5"><span className={labelCls}>Audience: contact groups</span>
          {data.groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2.5 text-[0.88rem] cursor-pointer">
              <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggle(g.id)} className="w-4 h-4 accent-[var(--primary)]" />
              {g.name} <span className="text-[0.78rem] text-[var(--muted-foreground)]">{g.type} · {resolveGroup(g, data.contacts).length}</span>
            </label>
          ))}
          {groupIds.length > 0 && <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[0.84rem]">Final audience: <b>{aud.finalCount}</b> <span className="text-[var(--muted-foreground)]">({aud.totalAcross} − {aud.duplicatesRemoved} duplicates − {aud.suppressedRemoved} unsubscribed or bounced)</span></div>}
        </div>
      </div>
    </Modal>
  );
}

