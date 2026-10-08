"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { currentVersionNumber, diffVersions, useStudioTemplates, type Version } from "@/lib/studio/templates";
import { useStudioPermissions } from "@/lib/studio/access";
import { Immutable, NoAccess, VersionTag } from "./shared";

export function TemplateCompare({ id }: { id: string }) {
  const templates = useStudioTemplates();
  const { canView } = useStudioPermissions("templates");
  const t = templates.find((x) => x.id === id);
  const nums = t?.versions.map((v) => v.v) ?? [];
  const [a, setA] = React.useState(nums[nums.length - 2] ?? nums[0]);
  const [b, setB] = React.useState(nums[nums.length - 1]);
  if (!canView) return <NoAccess module="the Template Library" />;
  if (!t || nums.length < 2) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)] text-center">
        <p className="font-heading font-bold m-0">{t ? "This template needs at least two versions to compare" : `No template with ID “${id}”`}</p>
        <Link href={t ? `/templates/${id}` : "/templates"}><Button variant="outline">Back</Button></Link>
      </div>
    );
  }
  const d = diffVersions(t, a, b)!;
  const cur = currentVersionNumber(t);
  const opts = nums.map((n) => `v${n}`);
  return (
    <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-6">
      <div>
        <Link href={`/templates/${t.id}`} className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-2"><ArrowLeft className="w-4 h-4" /> {t.name}</Link>
        <h1 className="text-2xl font-heading font-extrabold m-0">Compare versions</h1>
      </div>
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] text-[0.86rem] flex-wrap">
          <span>Comparing</span>
          <Select ariaLabel="First version" className="w-[110px] h-9" options={opts} value={`v${a}`} onChange={(v) => setA(Number(v.slice(1)))} />
          <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
          <Select ariaLabel="Second version" className="w-[110px] h-9" options={opts} value={`v${b}`} onChange={(v) => setB(Number(v.slice(1)))} />
          <span className="ml-auto text-[var(--muted-foreground)]">{d.subjectChanged || d.blocksChanged ? "Differences are highlighted" : "No differences in subject or layout"}</span>
        </div>
        <div className="grid grid-cols-2"><VersionColumn v={d.va} cur={cur} d={d} /><VersionColumn v={d.vb} cur={cur} d={d} /></div>
      </section>
    </div>
  );
}

function CompareField({ label, changed, children }: { label: string; changed?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("px-5 py-3.5 border-b border-[var(--border)]", changed && "bg-[var(--accent)]")}>
      <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1 flex items-center gap-2">{label}{changed && <span className="normal-case tracking-normal font-semibold text-[var(--accent-foreground)]">changed</span>}</div>
      <div className="text-[0.9rem]">{children}</div>
    </div>
  );
}

function VersionColumn({ v, cur, d }: { v: Version; cur: number | null; d: { subjectChanged: boolean; blocksChanged: boolean } }) {
  return (
    <section aria-label={`Version ${v.v}`} className="border-r last:border-r-0 border-[var(--border)]">
      <div className="px-5 py-3 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between">
        <span className="flex items-center gap-2"><VersionTag v={v.v} /><span className="text-[0.82rem] text-[var(--muted-foreground)]">{v.v === cur ? "current" : "older"}</span></span><Immutable />
      </div>
      <CompareField label="Subject" changed={d.subjectChanged}>{v.subject}</CompareField>
      <CompareField label="Blocks" changed={d.blocksChanged}>{v.blocks.length} blocks</CompareField>
      <CompareField label="Published">{formatDate(v.publishedAt)}</CompareField>
      <CompareField label="Used in">{v.usedIn.length ? v.usedIn.join(", ") : <span className="text-[var(--muted-foreground)]">Not used yet</span>}</CompareField>
      <CompareField label="Change note">{v.note || <span className="text-[var(--muted-foreground)]">—</span>}</CompareField>
    </section>
  );
}
