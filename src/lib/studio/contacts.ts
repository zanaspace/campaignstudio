/**
 * Campaign Studio contacts (ported from contactStore.js). Chain: Sources → Contacts → Groups → Campaigns → Runs.
 * - Email is the identifier and is unique; rows from several sources are merged by email.
 * - Static groups are a fixed list; dynamic groups are rules re-checked on every run (OR across rules).
 * - Audience = union of groups, de-duplicated by email, minus the suppression list. Worked out at run time.
 */
import { createStore, useStore } from "@/lib/store";
import { daysFromToday } from "@/lib/format";
import { CURRENT_USER } from "@/lib/format";

export const SOURCE_TYPE = { CSV: "CSV", EXCEL: "Excel", API: "API", MANUAL: "Manual entry", REST: "Custom REST API" } as const;
export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];
export type Source = { id: string; name: string; type: SourceType; status: "Active" | "Disabled"; lastSync: string | null };
export type StudioContact = { email: string; firstName: string; lastName: string; organisation: string; sources: string[]; createdBy?: string; createdAt: string; updatedAt: string };
export type RuleKind = "orgNotNull" | "orgContains" | "orgEquals" | "emailEnds" | "firstStarts";
export type Rule = { kind: RuleKind; value?: string };
export type Group = { id: string; name: string; description: string; type: "static" | "dynamic"; sourceIds: string[]; members: string[]; rules: Rule[] };
export type Suppression = { email: string; reason: "Unsubscribed" | "Bounced" | "Blocked"; since: string };
export type ImportRecord = { id: string; importedBy: string; date: string; sourceFile: string; added: number; updated: number; rejected: number };
export type ContactData = { sources: Source[]; contacts: StudioContact[]; groups: Group[]; suppression: Suppression[]; importHistory: ImportRecord[] };

export const RULE_KINDS: Record<RuleKind, { label: string; needsValue: boolean }> = {
  orgNotNull: { label: "Organisation is not empty", needsValue: false },
  orgContains: { label: "Organisation contains", needsValue: true },
  orgEquals: { label: "Organisation equals", needsValue: true },
  emailEnds: { label: "Email ends with", needsValue: true },
  firstStarts: { label: "First name starts with", needsValue: true },
};

const norm = (e?: string) => (e ?? "").trim().toLowerCase();
const now = () => new Date().toISOString();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e: string) => EMAIL_RE.test(norm(e));
let seq = 300;
// New records get a time-based id so they never clash with saved ones after a reload.
const nextId = (p: string) => `${p}_${Date.now()}${++seq}`;

export function matchesRule(c: StudioContact, r: Rule) {
  const v = norm(r.value);
  switch (r.kind) {
    case "orgNotNull": return !!c.organisation.trim();
    case "orgContains": return c.organisation.toLowerCase().includes(v);
    case "orgEquals": return c.organisation.toLowerCase() === v;
    case "emailEnds": return c.email.toLowerCase().endsWith(v);
    case "firstStarts": return c.firstName.toLowerCase().startsWith(v);
  }
}

type Row = { email: string; firstName?: string; lastName?: string; organisation?: string; source?: string };

/** Merge rows into contacts by email. New emails are added; known emails gain the new source and any missing fields. */
export function mergeRows(existing: StudioContact[], rows: Row[]) {
  const map = new Map(existing.map((c) => [norm(c.email), { ...c, sources: [...c.sources] }]));
  let added = 0, updated = 0;
  for (const r of rows) {
    const k = norm(r.email);
    const e = map.get(k);
    if (e) {
      e.firstName ||= r.firstName ?? ""; e.lastName ||= r.lastName ?? ""; e.organisation ||= r.organisation ?? "";
      if (r.source && !e.sources.includes(r.source)) e.sources.push(r.source);
      e.updatedAt = now(); updated++;
    } else {
      map.set(k, { email: k, firstName: r.firstName ?? "", lastName: r.lastName ?? "", organisation: r.organisation ?? "", sources: r.source ? [r.source] : [], createdAt: now(), updatedAt: now() });
      added++;
    }
  }
  return { contacts: [...map.values()], added, updated };
}

/** Import with a validation report: missing or invalid emails and duplicates within the file are rejected. */
export function importRows(existing: StudioContact[], rows: Row[], source: string) {
  const valid: Row[] = []; const rejected: { row: Row; reason: string }[] = []; const seen = new Set<string>();
  for (const r of rows) {
    const e = norm(r.email);
    if (!e) { rejected.push({ row: r, reason: "Missing email (required)" }); continue; }
    if (!EMAIL_RE.test(e)) { rejected.push({ row: r, reason: "Invalid email format" }); continue; }
    if (seen.has(e)) { rejected.push({ row: r, reason: "Duplicate within file" }); continue; }
    seen.add(e); valid.push({ ...r, source });
  }
  const { contacts, added, updated } = mergeRows(existing, valid);
  return { contacts, report: { added, updated, rejected: rejected.length, rejectedRows: rejected, total: rows.length } };
}

export function resolveGroup(g: Group, contacts: StudioContact[]) {
  if (g.type === "static") { const set = new Set(g.members.map(norm)); return contacts.filter((c) => set.has(norm(c.email))); }
  return contacts.filter((c) => g.rules.some((r) => matchesRule(c, r)));
}

/** Union of groups → duplicates removed → suppressed removed. */
export function resolveAudience(groupIds: string[], groups: Group[], contacts: StudioContact[], suppression: Suppression[]) {
  const selected = groups.filter((g) => groupIds.includes(g.id));
  const suppressed = new Set(suppression.map((s) => norm(s.email)));
  let totalAcross = 0;
  const seen = new Map<string, StudioContact>();
  for (const g of selected) { const m = resolveGroup(g, contacts); totalAcross += m.length; m.forEach((c) => seen.set(norm(c.email), c)); }
  const unique = [...seen.values()];
  const finalList = unique.filter((c) => !suppressed.has(norm(c.email)));
  return { groupsSelected: selected.length, totalAcross, duplicatesRemoved: totalAcross - unique.length, uniqueContacts: unique.length, suppressedRemoved: unique.length - finalList.length, finalCount: finalList.length, finalList };
}
export type Audience = ReturnType<typeof resolveAudience>;

/* ---------------- Seed (rebranded: CICOD merchants instead of government contacts) ---------------- */

function seed(): ContactData {
  const sources: Source[] = [
    { id: "src_evt", name: "Event registration CSV", type: SOURCE_TYPE.CSV, status: "Active", lastSync: daysFromToday(-148) },
    { id: "src_crm", name: "CRM export", type: SOURCE_TYPE.EXCEL, status: "Active", lastSync: daysFromToday(-140) },
    { id: "src_api", name: "Merchant API", type: SOURCE_TYPE.API, status: "Active", lastSync: daysFromToday(-131) },
    { id: "src_manual", name: "Manual entry", type: SOURCE_TYPE.MANUAL, status: "Active", lastSync: null },
  ];
  const raw: Row[] = [
    { email: "kunle@ibadanprints.com", firstName: "Kunle", lastName: "Adeyemi", organisation: "Ibadan Prints", source: "src_crm" },
    { email: "kunle@ibadanprints.com", firstName: "Kunle", lastName: "Adeyemi", organisation: "Ibadan Prints", source: "src_evt" },
    { email: "ronke@lekkibakehouse.ng", firstName: "Ronke", lastName: "Ade", organisation: "Lekki Bakehouse", source: "src_evt" },
    { email: "musa@kanograins.com", firstName: "Musa", lastName: "Abdullahi", organisation: "Kano Grains Ltd", source: "src_api" },
    { email: "hadiza@zariapharma.ng", firstName: "Hadiza", lastName: "Bello", organisation: "Zaria Pharma", source: "src_api" },
    { email: "chidi@abaleather.com", firstName: "Chidi", lastName: "Nnamdi", organisation: "Aba Leatherworks", source: "src_crm" },
    { email: "sam@trialshop.io", firstName: "Sam", lastName: "", organisation: "", source: "src_evt" },
    { email: "tamara@bayelsafresh.ng", firstName: "Tamara", lastName: "Ebi", organisation: "Bayelsa Fresh Fish", source: "src_api" },
    { email: "ronke@lekkibakehouse.ng", firstName: "Ronke", lastName: "Ade", organisation: "Lekki Bakehouse", source: "src_crm" },
    { email: "tunde@startup.io", firstName: "Tunde", lastName: "Bello", organisation: "", source: "src_evt" },
    { email: "obinna@enugucoal.com", firstName: "Obinna", lastName: "Eze", organisation: "Enugu Coal Logistics Ltd", source: "src_api" },
    { email: "femi@abaleather.com", firstName: "Femi", lastName: "Lawal", organisation: "Aba Leatherworks", source: "src_crm" },
  ];
  const { contacts } = mergeRows([], raw);
  const groups: Group[] = [
    { id: "grp_evt", name: "Lagos Event Participants", description: "Attendees of the Lagos merchant meetup", type: "static", sourceIds: ["src_evt"], rules: [],
      members: ["kunle@ibadanprints.com", "ronke@lekkibakehouse.ng", "sam@trialshop.io", "tunde@startup.io"] },
    { id: "grp_ng", name: "Nigerian Businesses", description: "Merchants on a .ng domain, or registered companies (Ltd)", type: "dynamic", sourceIds: ["src_api"], members: [],
      rules: [{ kind: "emailEnds", value: ".ng" }, { kind: "orgContains", value: "Ltd" }] },
    { id: "grp_ent", name: "Enterprise Customers", description: "Any contact with an organisation", type: "dynamic", sourceIds: ["src_crm", "src_api"], members: [], rules: [{ kind: "orgNotNull" }] },
  ];
  const suppression: Suppression[] = [
    { email: "sam@trialshop.io", reason: "Unsubscribed", since: daysFromToday(-180) },
    { email: "femi@abaleather.com", reason: "Bounced", since: daysFromToday(-159) },
  ];
  const importHistory: ImportRecord[] = [
    { id: "imp_1", importedBy: "marketing@cicod.com", date: daysFromToday(-148), sourceFile: "lagos_meetup.csv", added: 1180, updated: 20, rejected: 14 },
    { id: "imp_2", importedBy: "marketing@cicod.com", date: daysFromToday(-140), sourceFile: "crm_export.xlsx", added: 940, updated: 60, rejected: 8 },
  ];
  return { sources, contacts, groups, suppression, importHistory };
}

export const studioContactsStore = createStore<ContactData>(seed());
export const useStudioContacts = () => useStore(studioContactsStore);

/* ---------------- Mutations ---------------- */

/** Add several manual contacts; invalid or duplicate emails are skipped. Static groups get the new members. */
export function addContactsBatch(rows: Row[], groupIds: string[]) {
  const d = studioContactsStore.get();
  const existing = new Set(d.contacts.map((c) => norm(c.email)));
  const added: StudioContact[] = []; const skipped: { row: Row; reason: string }[] = [];
  for (const r of rows) {
    const e = norm(r.email);
    if (!e) { skipped.push({ row: r, reason: "Email address is required." }); continue; }
    if (!EMAIL_RE.test(e)) { skipped.push({ row: r, reason: "Email address must be valid." }); continue; }
    if (existing.has(e)) { skipped.push({ row: r, reason: "A contact with this email already exists." }); continue; }
    existing.add(e);
    added.push({ email: e, firstName: r.firstName ?? "", lastName: r.lastName ?? "", organisation: r.organisation ?? "", sources: ["src_manual"], createdBy: CURRENT_USER, createdAt: now(), updatedAt: now() });
  }
  studioContactsStore.set({
    ...d,
    contacts: [...d.contacts, ...added],
    groups: d.groups.map((g) => (groupIds.includes(g.id) && g.type === "static" ? { ...g, members: [...new Set([...g.members, ...added.map((c) => c.email)])] } : g)),
  });
  return { added: added.length, skipped: skipped.length, skippedRows: skipped };
}

/** Record an import (file or integration sync) and merge its rows. */
export function recordImport(rows: Row[], source: Source, fileLabel: string) {
  const d = studioContactsStore.get();
  const { contacts, report } = importRows(d.contacts, rows, source.id);
  const entry: ImportRecord = { id: nextId("imp"), importedBy: CURRENT_USER, date: daysFromToday(0), sourceFile: fileLabel, added: report.added, updated: report.updated, rejected: report.rejected };
  studioContactsStore.set({
    ...d, contacts,
    sources: d.sources.some((s) => s.id === source.id) ? d.sources.map((s) => (s.id === source.id ? { ...s, lastSync: daysFromToday(0) } : s)) : [...d.sources, source],
    importHistory: [entry, ...d.importHistory],
  });
  return report;
}

export function createGroup(g: Omit<Group, "id">) {
  const d = studioContactsStore.get();
  studioContactsStore.set({ ...d, groups: [...d.groups, { ...g, id: nextId("grp") }] });
}
