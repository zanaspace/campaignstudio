"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GitCompare, Archive, ArchiveRestore, Pencil, Copy, Send, SearchX, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { campaignCount, currentVersionNumber, duplicateVersionToDraft, publishDraft, setArchived, startNewVersionFromCurrent, useStudioTemplates } from "@/lib/studio/templates";
import { useStudioCampaigns } from "@/lib/studio/campaigns";
import { useStudioPermissions } from "@/lib/studio/access";
import { Immutable, NoAccess, TemplateStatusBadge, TypeBadge } from "./shared";

export function TemplateHistory({ id }: { id: string }) {
  const router = useRouter();
  const templates = useStudioTemplates();
  const campaigns = useStudioCampaigns();
  const { canView, canManage } = useStudioPermissions("templates");
  const [publishing, setPublishing] = React.useState(false);
  const [replacing, setReplacing] = React.useState<number | null>(null);
  const t = templates.find((x) => x.id === id);
  if (!canView) return <NoAccess module="the Template Library" />;
  if (!t) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 py-24 border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
        <SearchX className="w-6 h-6 text-[var(--primary)]" />
        <p className="font-heading font-bold m-0">No template with ID “{id}”</p>
        <Link href="/templates"><Button variant="outline">Back to the library</Button></Link>
      </div>
    );
  }
  const cur = currentVersionNumber(t);
  const next = (cur ?? 0) + 1;
  const latestUsers = campaigns.filter((c) => c.defaultTemplateId === t.id && c.versionStrategy === "latest");
  const archived = t.status === "Archived";
  const edit = () => { startNewVersionFromCurrent(t.id); router.push(`/templates/${t.id}/edit`); };
  const duplicate = (v: number) => { duplicateVersionToDraft(t.id, v); toast.success(`v${v} copied into the draft`); };

  return (
    <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Link href="/templates" className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"><ArrowLeft className="w-4 h-4" /> Template Library</Link>
          <h1 className="text-2xl font-heading font-extrabold m-0 flex items-center gap-3 flex-wrap">{t.name}<TypeBadge type={t.type} /><TemplateStatusBadge status={t.status} /></h1>
          <p className="text-[0.88rem] text-[var(--muted-foreground)] mt-1.5 mb-0">{campaignCount(t)} campaigns · {t.versions.length} version{t.versions.length === 1 ? "" : "s"} · updated {formatDate(t.updatedAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-7">
          {t.versions.length >= 2 && <Link href={`/templates/${t.id}/compare`}><Button variant="outline"><GitCompare className="w-4 h-4 mr-2" /> Compare</Button></Link>}
          {canManage && <Button variant="outline" onClick={() => { setArchived(t.id, !archived); toast.success(`${t.name} ${archived ? "unarchived" : "archived"}`); }}>{archived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}{archived ? "Unarchive" : "Archive"}</Button>}
          {canManage && !archived && <Button onClick={edit}><Pencil className="w-4 h-4 mr-2" /> {t.draft ? "Continue draft" : "Edit → new version"}</Button>}
        </div>
      </div>

      <Alert tone="info" title="Published versions can't be changed">Editing works on a draft. Publishing the draft adds a new version, and past campaign runs keep the version they sent.</Alert>
      {archived && <Alert tone="default" title="Archived">Archived templates can&apos;t be chosen for new campaigns. Unarchive to use it again.</Alert>}

      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden" aria-label="Versions">
        <ol className="m-0 p-0 list-none divide-y divide-[var(--border)]">
          {t.draft && (
            <li className="flex items-center gap-4 px-6 py-4 bg-[rgba(245,158,11,.04)]">
              <span className="w-9 h-9 rounded-full bg-[rgba(245,158,11,.15)] text-[var(--warning)] flex items-center justify-center shrink-0"><PenLine className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{t.draft.subject || "(untitled draft)"}</span><Badge variant="warning">Draft</Badge></div>
                <div className="text-[0.8rem] text-[var(--muted-foreground)]">{t.draft.blocks.length} blocks · working copy you can edit · {t.draft.note}</div>
              </div>
              {canManage && <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => router.push(`/templates/${t.id}/edit`)}>Edit</Button>
                <Button size="sm" onClick={() => setPublishing(true)}><Send className="w-3.5 h-3.5 mr-1.5" /> Publish v{next}</Button>
              </div>}
            </li>
          )}
          {[...t.versions].reverse().map((v, i) => (
            <li key={v.v} className="flex items-center gap-4 px-6 py-4">
              <span className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-mono text-[0.78rem] font-bold", i === 0 ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--accent)] text-[var(--accent-foreground)]")}>v{v.v}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{v.subject}</span>{i === 0 && <Badge variant="success">Current</Badge>}<Immutable /></div>
                <div className="text-[0.8rem] text-[var(--muted-foreground)]">
                  Published {formatDate(v.publishedAt)} · {v.blocks.length} blocks · {v.usedIn.length ? `used in: ${v.usedIn.join(", ")}` : "not used yet"}{v.note ? ` · ${v.note}` : ""}
                </div>
              </div>
              {canManage && !archived && <Button size="sm" variant="outline" onClick={() => (t.draft ? setReplacing(v.v) : duplicate(v.v))}><Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate</Button>}
            </li>
          ))}
          {!t.versions.length && !t.draft && <li className="px-6 py-12 text-center text-[var(--muted-foreground)]">No versions yet.</li>}
        </ol>
      </section>

      <ConfirmDialog
        isOpen={publishing}
        onClose={() => setPublishing(false)}
        onConfirm={() => { publishDraft(t.id); setPublishing(false); toast.success(`v${next} published`); }}
        icon={<Send className="w-6 h-6" />}
        title={`Publish v${next} of ${t.name}?`}
        description="The draft becomes a new version that can't be changed."
        impact={[
          latestUsers.length ? `${latestUsers.map((c) => c.name).join(", ")} ${latestUsers.length === 1 ? "uses" : "use"} “Always latest” and will send v${next} on the next run` : "No campaign follows the latest version automatically",
          "Past runs keep the version they sent",
        ]}
        confirmLabel={`Publish v${next}`}
      />
      <ConfirmDialog
        isOpen={replacing != null}
        onClose={() => setReplacing(null)}
        onConfirm={() => { if (replacing != null) duplicate(replacing); setReplacing(null); }}
        tone="danger"
        icon={<Copy className="w-6 h-6" />}
        title={`Replace the current draft with v${replacing}?`}
        description="Unpublished changes in the draft will be lost."
        confirmLabel="Replace draft"
      />
    </div>
  );
}
