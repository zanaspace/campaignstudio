"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, History, GitCompare, Pencil, Archive, ArchiveRestore, Mail, Check } from "lucide-react";
import { Table, TableActionsCell, TableActionsHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { THEMES, THEME_CATEGORIES, instantiateTheme, themeById } from "@/lib/studio/blocks";
import { TEMPLATE_TYPES, campaignCount, createTemplate, currentVersion, setArchived, startNewVersionFromCurrent, useStudioTemplates, type TemplateType } from "@/lib/studio/templates";
import { useStudioPermissions } from "@/lib/studio/access";
import { NoAccess, TemplateStatusBadge, TypeBadge, VersionTag, inputCls, labelCls } from "./shared";

export function TemplateLibrary() {
  const router = useRouter();
  const templates = useStudioTemplates();
  const { canView, canManage } = useStudioPermissions("templates");
  const [creating, setCreating] = React.useState(false);
  if (!canView) return <NoAccess module="the Template Library" />;

  const edit = (id: string) => { startNewVersionFromCurrent(id); router.push(`/templates/${id}/edit`); };

  return (
    <div className="max-w-[1600px] w-full mx-auto">
      <PageHeader
        title="Template Library"
        subtitle="Email templates with full version history. Publishing adds a new version and never overwrites an old one."
        actions={canManage && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> New template</Button>}
      />
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="min-w-full border-none shadow-none rounded-none">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Template", "Type", "Current version", "Last updated", "Used in", "Status"].map((h) => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}
                <TableActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const cur = currentVersion(t);
                const n = campaignCount(t);
                return (
                  <TableRow key={t.id} onClick={() => router.push(`/templates/${t.id}`)} className="cursor-pointer group">
                    <TableCell>
                      <div className="font-semibold group-hover:text-[var(--primary)]">{t.name}</div>
                      <div className="text-[0.8rem] text-[var(--muted-foreground)] max-w-[360px] truncate">{cur?.subject ?? t.draft?.subject ?? ""}</div>
                    </TableCell>
                    <TableCell><TypeBadge type={t.type} /></TableCell>
                    <TableCell>{cur ? <VersionTag v={cur.v} /> : <span className="text-[0.82rem] text-[var(--muted-foreground)]">Draft only</span>}</TableCell>
                    <TableCell className="whitespace-nowrap text-[0.85rem] text-[var(--muted-foreground)]">{formatDate(t.updatedAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-[0.85rem]"><span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />{n} campaign{n === 1 ? "" : "s"}</span></TableCell>
                    <TableCell><TemplateStatusBadge status={t.status} /></TableCell>
                    <TableActionsCell><RowActionsMenu label={`Actions for ${t.name}`} actions={[
                      { label: "Version history", icon: History, onSelect: () => router.push(`/templates/${t.id}`) },
                      ...(t.versions.length >= 2 ? [{ label: "Compare versions", icon: GitCompare, onSelect: () => router.push(`/templates/${t.id}/compare`) }] : []),
                      ...(canManage && t.status !== "Archived" ? [{ label: t.draft ? "Continue draft" : "Edit → new version", icon: Pencil, onSelect: () => edit(t.id) }] : []),
                      ...(canManage ? [{ label: t.status === "Archived" ? "Unarchive" : "Archive", icon: t.status === "Archived" ? ArchiveRestore : Archive, onSelect: () => { setArchived(t.id, t.status !== "Archived"); toast.success(`${t.name} ${t.status === "Archived" ? "unarchived" : "archived"}`); } }] : []),
                    ]} /></TableActionsCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      {creating && <NewTemplateModal onClose={() => setCreating(false)} onCreated={(id) => router.push(`/templates/${id}/edit`)} />}
    </div>
  );
}

/** Two steps, as in Campaign Studio: pick a starting theme, then name the template. */
function NewTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = React.useState<"theme" | "details">("theme");
  const [themeId, setThemeId] = React.useState("blank");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<TemplateType>("Marketing");
  const groups = ["blank", "seasonal", "notification", "announcement"].map((k) => ({ key: k, themes: THEMES.filter((t) => (t.category ?? "blank") === k) })).filter((g) => g.themes.length);

  const create = () => {
    const seed = instantiateTheme(themeId);
    const id = createTemplate({ name: name.trim(), type, subject: seed.subject, blocks: seed.blocks, global: seed.global });
    toast.success(`“${name.trim()}” created. Start editing.`);
    onClose(); onCreated(id);
  };

  return (
    <Modal isOpen onClose={onClose} title={step === "theme" ? "Start from a theme" : "Name your template"} maxWidth={step === "theme" ? "max-w-2xl" : "max-w-md"}
      footer={step === "theme"
        ? <><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { const t = themeById(themeId); if (t && !name) setName(t.id === "blank" ? "" : t.name); setStep("details"); }}>Next</Button></>
        : <><Button variant="outline" className="mr-auto" onClick={() => setStep("theme")}>Back</Button><Button disabled={!name.trim()} onClick={create}>Create draft</Button></>}>
      {step === "theme" ? (
        <div className="flex flex-col gap-5">
          <p className="m-0 text-[0.86rem] text-[var(--muted-foreground)]">Pick a starting point. You can change everything afterwards.</p>
          {groups.map((g) => (
            <div key={g.key}>
              {g.key !== "blank" && <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">{THEME_CATEGORIES[g.key]}</div>}
              <div role="radiogroup" aria-label={g.key === "blank" ? "Blank" : THEME_CATEGORIES[g.key]} className="grid grid-cols-2 gap-2.5">
                {g.themes.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={themeId === t.id} onClick={() => setThemeId(t.id)}
                    className={cn("text-left rounded-xl border-[1.5px] p-3.5 transition-colors flex gap-3", themeId === t.id ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--primary)]/50")}>
                    <span className={cn("mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center", themeId === t.id ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--input)]")}>{themeId === t.id && <Check className="w-3 h-3 text-[var(--primary-foreground)]" />}</span>
                    <span><span className="block font-heading font-semibold text-[0.9rem]">{t.name}</span><span className="block text-[0.78rem] text-[var(--muted-foreground)] mt-0.5">{t.description}</span></span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[0.86rem] text-[var(--muted-foreground)]">Based on <b className="text-[var(--foreground)]">{themeById(themeId)?.name}</b>.</p>
          <label className="flex flex-col gap-1.5"><span className={labelCls}>Template name</span>
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 feature launch" />
          </label>
          <div className="flex flex-col gap-1.5"><span className={labelCls}>Type</span>
            <Select ariaLabel="Type" options={[...TEMPLATE_TYPES]} value={type} onChange={(v) => setType(v as TemplateType)} />
          </div>
        </div>
      )}
    </Modal>
  );
}
