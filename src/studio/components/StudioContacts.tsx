"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, PenLine, Upload, Zap, ChevronRight, ArrowLeft, X, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  RULE_KINDS, SOURCE_TYPE, addContactsBatch, createGroup, isValidEmail, recordImport, resolveAudience, resolveGroup, useStudioContacts,
  type Group, type Rule, type RuleKind, type SourceType,
} from "@/lib/studio/contacts";
import { providerLabel, useIntegrations } from "@/lib/studio/integrations";
import { useStudioPermissions } from "@/lib/studio/access";
import { Tabs } from "@/components/shared";
import { AudienceMath, NoAccess, inputCls, labelCls } from "./shared";

const TABS = [
  { id: "sources", label: "Sources" },
  { id: "contacts", label: "Contacts" },
  { id: "groups", label: "Groups" },
  { id: "governance", label: "Suppression & history" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const SOURCE_VARIANT: Record<SourceType, "info" | "success" | "secondary" | "warning" | "muted"> = { CSV: "info", Excel: "success", API: "secondary", "Manual entry": "warning", "Custom REST API": "muted" };

/** Tables here have no row actions in Campaign Studio, so they don't get a ⋯ column. */
export function StudioContacts() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const data = useStudioContacts();
  const { canView, canManage } = useStudioPermissions("contacts");
  const tab = (params.get("tab") as TabId) ?? "sources";
  const [adding, setAdding] = React.useState(false);
  const [newGroup, setNewGroup] = React.useState(false);
  if (!canView) return <NoAccess module="Studio contacts" />;
  const supp = new Set(data.suppression.map((s) => s.email));
  const srcName = (id: string) => data.sources.find((s) => s.id === id)?.name ?? id;
  const thead = (cols: string[]) => <TableHeader><TableRow className="hover:bg-transparent">{cols.map((h) => <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>;
  const card = (children: React.ReactNode) => <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden"><div className="w-full overflow-x-auto">{children}</div></div>;

  return (
    <div className="max-w-[1600px] w-full mx-auto">
      <PageHeader title="Contacts" subtitle="Studio contacts from every source, merged by email and organised into static and dynamic groups."
        actions={canManage && <Button onClick={() => setAdding(true)}><UserPlus className="w-4 h-4 mr-2" /> Add contacts</Button>} />
      <div className="mb-6"><Tabs label="Contacts sections" tabs={[...TABS]} value={tab} onChange={(t) => router.replace(t === "sources" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
        counts={{ sources: data.sources.length, contacts: data.contacts.length, groups: data.groups.length }} /></div>

      {tab === "sources" && <div className="flex flex-col gap-6">
        <Alert tone="info" title="Merged by email">The same person from two sources becomes one contact. Email is the identifier and must be unique.</Alert>
        {card(<Table className="min-w-full border-none shadow-none rounded-none">{thead(["Source", "Type", "Status", "Last sync", "Contacts"])}<TableBody>
          {data.sources.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-semibold">{s.name}</TableCell>
              <TableCell><Badge variant={SOURCE_VARIANT[s.type]}>{s.type}</Badge></TableCell>
              <TableCell><StatusBadge status={s.status === "Active" ? "Active" : "Draft"} label={s.status} /></TableCell>
              <TableCell className="text-[0.85rem] text-[var(--muted-foreground)]">{s.lastSync ? formatDate(s.lastSync) : "—"}</TableCell>
              <TableCell>{data.contacts.filter((c) => c.sources.includes(s.id)).length}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table>)}
        <div>
          <div className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Field mapping (CSV and Excel imports)</div>
          {card(<Table className="min-w-full border-none shadow-none rounded-none">{thead(["Uploaded column", "Contact field"])}<TableBody>
            {[["Email Address", "Email"], ["Surname", "Last name"], ["Company", "Organisation"]].map(([a, b]) => <TableRow key={a}><TableCell className="font-mono text-[0.84rem]">{a}</TableCell><TableCell>{b}</TableCell></TableRow>)}
          </TableBody></Table>)}
        </div>
      </div>}

      {tab === "contacts" && <div className="flex flex-col gap-4">
        <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]"><b className="text-[var(--foreground)]">{data.contacts.length} unique contacts.</b> Contacts found in two or more sources are tagged “merged”.</p>
        {card(<Table className="min-w-full border-none shadow-none rounded-none">{thead(["Email (identifier)", "Name", "Organisation", "Sources"])}<TableBody>
          {data.contacts.map((c) => (
            <TableRow key={c.email}>
              <TableCell className="font-mono text-[0.84rem] whitespace-nowrap">{c.email} {supp.has(c.email) && <Badge variant="destructive" className="ml-1.5">Suppressed</Badge>}</TableCell>
              <TableCell>{`${c.firstName} ${c.lastName}`.trim() || <span className="text-[var(--muted-foreground)]">—</span>}</TableCell>
              <TableCell>{c.organisation || <span className="text-[var(--muted-foreground)]">—</span>}</TableCell>
              <TableCell className="text-[0.86rem]">{c.sources.map(srcName).join(", ")} {c.sources.length > 1 && <Badge variant="muted" className="ml-1.5">Merged</Badge>}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table>)}
      </div>}

      {tab === "groups" && <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]"><b className="text-[var(--foreground)]">Static</b> = a fixed list. <b className="text-[var(--foreground)]">Dynamic</b> = rules checked again on every run.</p>
          {canManage && <Button variant="outline" onClick={() => setNewGroup(true)}><Plus className="w-4 h-4 mr-2" /> New group</Button>}
        </div>
        {data.groups.map((g) => {
          const n = resolveGroup(g, data.contacts).length;
          return (
            <section key={g.id} aria-label={g.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2"><span className="font-heading font-bold">{g.name}</span><Badge variant={g.type === "static" ? "muted" : "success"}>{g.type}</Badge></div>
              {g.description && <p className="m-0 text-[0.86rem] text-[var(--muted-foreground)]">{g.description}</p>}
              {g.type === "dynamic"
                ? <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 font-mono text-[0.8rem]">{g.rules.map((r) => RULE_KINDS[r.kind].label + (r.value ? ` “${r.value}”` : "")).join("   OR   ")}</div>
                : <div className="text-[0.8rem] text-[var(--muted-foreground)]">Fixed list · {g.members.length} contacts</div>}
              <div className="text-[0.86rem]"><b>{n}</b> contacts {g.type === "dynamic" ? "(checked live)" : "(fixed)"}</div>
            </section>
          );
        })}
      </div>}

      {tab === "governance" && <div className="flex flex-col gap-6">
        <div>
          <div className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Suppression list: left out of every send</div>
          {card(<Table className="min-w-full border-none shadow-none rounded-none">{thead(["Email", "Reason", "Since"])}<TableBody>
            {data.suppression.map((s) => <TableRow key={s.email}><TableCell className="font-mono text-[0.84rem]">{s.email}</TableCell><TableCell>{s.reason}</TableCell><TableCell className="text-[0.85rem] text-[var(--muted-foreground)]">{formatDate(s.since)}</TableCell></TableRow>)}
          </TableBody></Table>)}
        </div>
        <div>
          <div className="text-[0.75rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Import history: where did these contacts come from?</div>
          {card(<Table className="min-w-full border-none shadow-none rounded-none">{thead(["Imported by", "Date", "Source file", "Added", "Updated", "Rejected"])}<TableBody>
            {data.importHistory.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{h.importedBy}</TableCell><TableCell className="text-[0.85rem] text-[var(--muted-foreground)]">{formatDate(h.date)}</TableCell>
                <TableCell className="font-mono text-[0.84rem]">{h.sourceFile}</TableCell>
                <TableCell className="text-[var(--success)] font-semibold">{h.added}</TableCell><TableCell>{h.updated}</TableCell><TableCell className="text-[var(--destructive)] font-semibold">{h.rejected}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>)}
        </div>
      </div>}

      {adding && <AddContactsFlow onClose={() => setAdding(false)} />}
      {newGroup && <NewGroupModal onClose={() => setNewGroup(false)} />}
    </div>
  );
}

/* ---------------- Add contacts: choose a method → manual / bulk / CRM sync ---------------- */

type Method = "chooser" | "manual" | "bulk" | "crm";
const blankRow = () => ({ email: "", firstName: "", lastName: "", organisation: "" });

function AddContactsFlow({ onClose }: { onClose: () => void }) {
  const data = useStudioContacts();
  const integrations = useIntegrations();
  const [view, setView] = React.useState<Method>("chooser");
  const [rows, setRows] = React.useState([blankRow()]);
  const [groupIds, setGroupIds] = React.useState<string[]>([]);
  const [pick, setPick] = React.useState<string | null>(null);
  const existing = new Set(data.contacts.map((c) => c.email.toLowerCase()));
  const rowState = (r: { email: string }) => { const e = r.email.trim().toLowerCase(); return !e ? "empty" : !isValidEmail(e) ? "invalid" : existing.has(e) ? "dup" : "ok"; };
  const valid = rows.filter((r) => rowState(r) === "ok");
  const connected = integrations.filter((i) => i.status === "Connected");
  const titles: Record<Method, string> = { chooser: "Add contacts", manual: "Manual entry", bulk: "Bulk upload", crm: "Sync from an integration" };

  const addManual = () => {
    const res = addContactsBatch(valid, groupIds);
    toast.success(`Added ${res.added} contact${res.added === 1 ? "" : "s"}${res.skipped ? `. ${res.skipped} skipped (duplicate or invalid).` : ""}`);
    onClose();
  };
  // Mock import, as in Campaign Studio: a real build parses the file with the chosen mapping.
  const importFile = () => {
    const r = recordImport([
      { email: "orders@ikejaauto.ng", firstName: "Femi", lastName: "Lawal", organisation: "Ikeja Auto Parts" },
      { email: "hello@glowbeauty.ng", firstName: "Ijeoma", lastName: "Obi", organisation: "Glow Beauty" },
      { email: "kunle@ibadanprints.com", firstName: "Kunle", lastName: "Adeyemi", organisation: "Ibadan Prints" },
    ], { id: "src_bulk", name: "contacts_upload.xlsx", type: SOURCE_TYPE.EXCEL, status: "Active", lastSync: null }, "contacts_upload.xlsx");
    toast.success(`Imported contacts_upload.xlsx: ${r.added} added, ${r.updated} updated, ${r.rejected} rejected`);
    onClose();
  };
  const sync = () => {
    const i = connected.find((x) => x.id === pick)!;
    const r = recordImport([
      { email: "sales@sokotoagro.com", firstName: "Sani", lastName: "Musa", organisation: "Sokoto Agro" },
      { email: "info@surulerefoods.ng", firstName: "Bisi", lastName: "Ola", organisation: "Surulere Foods" },
    ], { id: `src_${i.id}`, name: i.name, type: i.provider === "rest" ? SOURCE_TYPE.REST : SOURCE_TYPE.API, status: "Active", lastSync: null }, `${i.name} (sync)`);
    toast.success(`Synced from ${i.name}: ${r.added} added, ${r.updated} updated`);
    onClose();
  };

  const footer = view === "chooser" ? <Button variant="outline" onClick={onClose}>Cancel</Button>
    : view === "manual" ? <><span className="mr-auto self-center text-[0.84rem] text-[var(--muted-foreground)]"><b className="text-[var(--foreground)]">{valid.length}</b> valid of {rows.length} row{rows.length === 1 ? "" : "s"}</span><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!valid.length} onClick={addManual}>Add {valid.length} contact{valid.length === 1 ? "" : "s"}</Button></>
    : view === "bulk" ? <><span className="mr-auto self-center text-[0.84rem] text-[var(--muted-foreground)]">A validation report follows the upload</span><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={importFile}><Upload className="w-4 h-4 mr-2" /> Import file</Button></>
    : <><Button variant="outline" onClick={onClose}>Cancel</Button>{connected.length > 0 && <Button disabled={!pick} onClick={sync}>Sync now</Button>}</>;

  return (
    <Modal isOpen onClose={onClose} title={titles[view]} maxWidth="max-w-2xl" footer={footer}>
      {view !== "chooser" && <button type="button" onClick={() => setView("chooser")} className="mb-4 text-[0.84rem] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Choose another method</button>}

      {view === "chooser" && <div className="flex flex-col gap-2.5">
        {([["manual", PenLine, "Manual entry", "Type contacts in. Add several at once."], ["bulk", Upload, "Bulk upload", "Import a CSV or Excel file, then map the columns."], ["crm", Zap, "Integration sync", "Sync contacts from a connected CRM or API."]] as const).map(([k, Icon, name, desc]) => (
          <button key={k} type="button" onClick={() => setView(k)} className="flex items-center gap-3.5 rounded-xl border-[1.5px] border-[var(--border)] p-4 text-left hover:border-[var(--primary)] hover:bg-[var(--accent)] transition-colors">
            <span className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-[var(--primary)]" /></span>
            <span className="flex-1"><span className="block font-heading font-semibold">{name}</span><span className="block text-[0.82rem] text-[var(--muted-foreground)]">{desc}</span></span>
            <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
          </button>
        ))}
      </div>}

      {view === "manual" && <div className="flex flex-col gap-3">
        <Alert tone="info" title="Email is required and must be unique">The source is set to Manual entry automatically.</Alert>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr_32px] gap-2 text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]"><span>Email *</span><span>First name</span><span>Last name</span><span>Organisation</span><span /></div>
        {rows.map((r, i) => {
          const st = rowState(r);
          const set = (k: keyof typeof r, v: string) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
          return (
            <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr_32px] gap-2 items-center">
              <input aria-label={`Row ${i + 1} email`} className={cn(inputCls, (st === "invalid" || st === "dup") && "border-[var(--destructive)]")} value={r.email} placeholder="name@business.com" onChange={(e) => set("email", e.target.value)} title={st === "dup" ? "This email already exists" : st === "invalid" ? "Not a valid email" : undefined} />
              <input aria-label={`Row ${i + 1} first name`} className={inputCls} value={r.firstName} placeholder="First" onChange={(e) => set("firstName", e.target.value)} />
              <input aria-label={`Row ${i + 1} last name`} className={inputCls} value={r.lastName} placeholder="Last" onChange={(e) => set("lastName", e.target.value)} />
              <input aria-label={`Row ${i + 1} organisation`} className={inputCls} value={r.organisation} placeholder="Business" onChange={(e) => set("organisation", e.target.value)} />
              {rows.length > 1 ? <button type="button" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-[var(--destructive)] flex justify-center"><X className="w-4 h-4" /></button> : <span />}
              {st === "dup" && <span className="col-span-5 -mt-1 text-[0.75rem] text-[var(--destructive)]">This email already exists.</span>}
            </div>
          );
        })}
        <button type="button" onClick={() => setRows((rs) => [...rs, blankRow()])} className="w-fit text-[0.84rem] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)] rounded-lg px-3 py-1.5">+ Add another row</button>
        <div className="mt-2">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">Add all to groups (optional)</div>
          {data.groups.map((g) => (
            <label key={g.id} className="flex items-center gap-2.5 py-1 text-[0.88rem] cursor-pointer">
              <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => setGroupIds((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))} className="w-4 h-4 accent-[var(--primary)]" />
              {g.name} <span className="text-[0.78rem] text-[var(--muted-foreground)]">({g.type}{g.type === "dynamic" ? ": joins by rule" : ""})</span>
            </label>
          ))}
        </div>
      </div>}

      {view === "bulk" && <div className="flex flex-col gap-4">
        <button type="button" onClick={importFile} className="rounded-xl border-[1.5px] border-dashed border-[var(--input)] bg-[var(--background)] p-8 text-center text-[0.88rem] text-[var(--muted-foreground)] hover:border-[var(--primary)]">
          <Upload className="w-7 h-7 mx-auto mb-2 text-[var(--primary)]" />Drag a file here or <b className="text-[var(--primary)]">browse</b><span className="block text-[0.78rem] mt-1">.csv, .xlsx and .xls</span>
        </button>
        <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Field mapping</div>
        {([["Email Address", ["Email"]], ["Surname", ["Last name", "First name", "Ignore"]], ["Company", ["Organisation", "Ignore"]]] as const).map(([from, to]) => (
          <div key={from} className="grid grid-cols-[1fr_24px_1fr] gap-2 items-center">
            <span className="px-3 py-2 rounded-md bg-[var(--background)] border border-[var(--border)] font-mono text-[0.82rem]">{from}</span>
            <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select aria-label={`Map ${from}`} className={inputCls}>{to.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
        ))}
      </div>}

      {view === "crm" && <div className="flex flex-col gap-3">
        <Alert tone="info" title="Sync from a saved integration">Connections are managed in <Link href="/integrations" className="font-semibold text-[var(--primary)]" onClick={onClose}>Campaign Studio › Integrations</Link>.</Alert>
        {connected.length === 0 ? <p className="m-0 py-6 text-center text-[var(--muted-foreground)]">No connected integrations yet.</p> : connected.map((i) => (
          <button key={i.id} type="button" role="radio" aria-checked={pick === i.id} onClick={() => setPick(i.id)}
            className={cn("flex items-center gap-3 rounded-xl border-[1.5px] p-3.5 text-left", pick === i.id ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--primary)]/50")}>
            <Zap className="w-5 h-5 text-[var(--primary)]" />
            <span className="flex-1"><span className="block font-semibold">{i.name}</span><span className="block text-[0.8rem] text-[var(--muted-foreground)]">{providerLabel(i.provider)} · sync {i.config.syncFrequency} · {i.contactCount.toLocaleString()} contacts</span></span>
          </button>
        ))}
      </div>}
    </Modal>
  );
}

/* ---------------- New group: 5 steps, as in Campaign Studio ---------------- */

const STEPS = ["Name", "Sources", "Type", "Rules", "Preview"];

function NewGroupModal({ onClose }: { onClose: () => void }) {
  const data = useStudioContacts();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [sourceIds, setSourceIds] = React.useState<string[]>([]);
  const [type, setType] = React.useState<Group["type"]>("dynamic");
  const [rules, setRules] = React.useState<Rule[]>([{ kind: "orgNotNull", value: "" }]);
  const members = data.contacts.filter((c) => sourceIds.some((s) => c.sources.includes(s))).map((c) => c.email);
  const draft: Group = { id: "__preview__", name, description, type, sourceIds, rules, members };
  const preview = resolveAudience(["__preview__"], [draft], data.contacts, data.suppression);
  const create = () => { createGroup({ name: name.trim(), description: description.trim(), type, sourceIds, rules: type === "dynamic" ? rules : [], members: type === "static" ? members : [] }); toast.success(`Group “${name.trim()}” created`); onClose(); };

  return (
    <Modal isOpen onClose={onClose} title="New group" maxWidth="max-w-xl"
      footer={<><Button variant="outline" className="mr-auto" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</Button>
        {step < 4 ? <Button disabled={step === 0 && !name.trim()} onClick={() => setStep(step + 1)}>Next</Button> : <Button onClick={create}>Create group</Button>}</>}>
      <ol className="flex gap-1.5 mb-5 m-0 p-0 list-none" aria-label="Steps">
        {STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={cn("text-[0.75rem] px-2.5 py-1 rounded-full font-semibold", i === step ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]")}>{i + 1} {s}</li>)}
      </ol>
      {step === 0 && <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Group name</span><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Enterprise Customers" /></label>
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Description</span><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></label>
      </div>}
      {step === 1 && <div className="flex flex-col gap-1"><span className={cn(labelCls, "mb-1")}>Contact sources</span>
        {data.sources.map((s) => (
          <label key={s.id} className="flex items-center gap-2.5 py-1.5 text-[0.88rem] cursor-pointer">
            <input type="checkbox" checked={sourceIds.includes(s.id)} onChange={() => setSourceIds((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))} className="w-4 h-4 accent-[var(--primary)]" />
            {s.name} <span className="text-[0.78rem] text-[var(--muted-foreground)]">({s.type})</span>
          </label>
        ))}
      </div>}
      {step === 2 && <div role="radiogroup" aria-label="Group type" className="flex flex-col gap-2">
        {([["static", "Static", "A fixed list of the contacts in the chosen sources."], ["dynamic", "Dynamic", "Rules that pick up the latest matching contacts on every run."]] as const).map(([v, l, d]) => (
          <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => setType(v)}
            className={cn("text-left rounded-xl border-[1.5px] p-3.5", type === v ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)]")}>
            <span className="block font-heading font-semibold">{l}</span><span className="block text-[0.82rem] text-[var(--muted-foreground)]">{d}</span>
          </button>
        ))}
      </div>}
      {step === 3 && (type === "dynamic" ? <div className="flex flex-col gap-2">
        <span className={labelCls}>Rules (a contact matching any rule is included)</span>
        {rules.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select aria-label={`Rule ${i + 1}`} className={inputCls} value={r.kind} onChange={(e) => setRules((rs) => rs.map((x, j) => (j === i ? { ...x, kind: e.target.value as RuleKind } : x)))}>
              {Object.entries(RULE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {RULE_KINDS[r.kind].needsValue && <input aria-label={`Rule ${i + 1} value`} className={inputCls} value={r.value ?? ""} placeholder="Value" onChange={(e) => setRules((rs) => rs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />}
            {rules.length > 1 && <button type="button" aria-label={`Remove rule ${i + 1}`} onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))} className="w-9 h-9 shrink-0 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--destructive)]"><X className="w-4 h-4" /></button>}
          </div>
        ))}
        <button type="button" onClick={() => setRules((rs) => [...rs, { kind: "orgContains", value: "" }])} className="w-fit text-[0.84rem] font-semibold text-[var(--primary)]">+ Add rule</button>
      </div> : <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]">Static groups include everyone from the chosen sources, so there are no rules.</p>)}
      {step === 4 && <AudienceMath a={preview} title="Who's in this group today" />}
    </Modal>
  );
}
