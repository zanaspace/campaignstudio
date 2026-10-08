// contactStore.js
// ─────────────────────────────────────────────────────────────────────────────
// CONTACT MODULE.  Chain: Sources → Contacts → Groups → Campaigns → Runs.
//
// Key rules:
//   • Email is the primary identifier and is UNIQUE within a tenant.
//   • Contacts imported from multiple sources are MERGED by email.
//   • Static groups = a frozen list of contacts.
//   • Dynamic groups = a rule; they re-resolve the latest matching contacts on
//     every campaign run (parallels the template "always latest" strategy).
//   • Audience = union of selected groups, DEDUPED by email, minus the
//     suppression list (unsubscribed / bounced / blacklisted). Resolved at run time.
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 300;
const nextId = (p) => `${p}_${++_seq}`;
const now = () => new Date().toISOString();
const norm = (e) => (e || "").trim().toLowerCase();

// ─── Sources ─────────────────────────────────────────────────────────────────
export const SOURCE_TYPE = { CSV: "CSV", EXCEL: "Excel", API: "API", MANUAL: "Manual Entry", REST: "Custom REST API" };
export const SOURCE_STATUS = { ACTIVE: "Active", DISABLED: "Disabled" };

// ─── Group rules (dynamic) ───────────────────────────────────────────────────
export const RULE_KINDS = {
  orgNotNull:  { label: "Organisation IS NOT NULL", needsValue: false },
  orgContains: { label: "Organisation contains", needsValue: true },
  orgEquals:   { label: "Organisation equals", needsValue: true },
  emailEnds:   { label: "Email ends with", needsValue: true },
  firstStarts: { label: "First name starts with", needsValue: true },
};

export function matchesRule(c, rule) {
  switch (rule.kind) {
    case "orgNotNull":  return !!(c.organisation && c.organisation.trim());
    case "orgContains": return (c.organisation || "").toLowerCase().includes((rule.value || "").toLowerCase());
    case "orgEquals":   return (c.organisation || "").toLowerCase() === (rule.value || "").toLowerCase();
    case "emailEnds":   return c.email.toLowerCase().endsWith((rule.value || "").toLowerCase());
    case "firstStarts": return (c.firstName || "").toLowerCase().startsWith((rule.value || "").toLowerCase());
    default: return false;
  }
}

// ─── Email validation ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e) => EMAIL_RE.test(norm(e));

// ─── Seed data ───────────────────────────────────────────────────────────────
export function createInitialContactData() {
  const sources = [
    { id: "src_evt", name: "Event Registration CSV", type: SOURCE_TYPE.CSV,   status: SOURCE_STATUS.ACTIVE, lastSync: "2026-05-12" },
    { id: "src_crm", name: "CRM Export",             type: SOURCE_TYPE.EXCEL, status: SOURCE_STATUS.ACTIVE, lastSync: "2026-05-20" },
    { id: "src_api", name: "Customer API",           type: SOURCE_TYPE.API,   status: SOURCE_STATUS.ACTIVE, lastSync: "2026-05-29" },
    { id: "src_manual", name: "Manual Entry",        type: SOURCE_TYPE.MANUAL,status: SOURCE_STATUS.ACTIVE, lastSync: "—" },
  ];

  // raw rows (note duplicates across sources → merge by email)
  const raw = [
    { email: "john.doe@acme.com",   firstName: "John",  lastName: "Doe",   organisation: "Acme Ltd",            source: "src_crm" },
    { email: "john.doe@acme.com",   firstName: "John",  lastName: "Doe",   organisation: "Acme Ltd",            source: "src_evt" },
    { email: "mary@xyz.com",        firstName: "Mary",  lastName: "Smith", organisation: "XYZ Ltd",             source: "src_evt" },
    { email: "ada@works.gov.ng",    firstName: "Ada",   lastName: "Okoro", organisation: "Ministry of Works",   source: "src_api" },
    { email: "bola@health.gov.ng",  firstName: "Bola",  lastName: "Ade",   organisation: "Government of Lagos", source: "src_api" },
    { email: "chidi@acme.com",      firstName: "Chidi", lastName: "Nwosu", organisation: "Acme Ltd",            source: "src_crm" },
    { email: "sam@trial.io",        firstName: "Sam",   lastName: "",      organisation: "",                    source: "src_evt" },
    { email: "ngozi@finance.gov.ng",firstName: "Ngozi", lastName: "Eze",   organisation: "Government of Nigeria",source: "src_api" },
    { email: "mary@xyz.com",        firstName: "Mary",  lastName: "Smith", organisation: "XYZ Ltd",             source: "src_crm" },
    { email: "tunde@startup.io",    firstName: "Tunde", lastName: "Bello", organisation: "",                    source: "src_evt" },
    { email: "grace@gov.ng",        firstName: "Grace", lastName: "Udo",   organisation: "Government Agency",   source: "src_api" },
    { email: "peter@acme.com",      firstName: "Peter", lastName: "Obi",   organisation: "Acme Ltd",            source: "src_crm" },
  ];
  const { contacts } = mergeRows([], raw);

  const groups = [
    { id: "grp_evt", name: "Lagos Event Participants", description: "Attendees of the Lagos launch event", type: "static",
      sourceIds: ["src_evt"], members: ["john.doe@acme.com", "mary@xyz.com", "sam@trial.io", "tunde@startup.io"] },
    { id: "grp_gov", name: "Government Agencies", description: "All government contacts", type: "dynamic",
      sourceIds: ["src_api"], rules: [{ kind: "emailEnds", value: ".gov.ng" }, { kind: "orgContains", value: "Government" }] },
    { id: "grp_ent", name: "Enterprise Customers", description: "Any contact with an organisation", type: "dynamic",
      sourceIds: ["src_crm", "src_api"], rules: [{ kind: "orgNotNull" }] },
  ];

  // suppression list (unsubscribed / bounced / blacklisted)
  const suppression = [
    { email: "sam@trial.io", reason: "Unsubscribed", since: "2026-04-10" },
    { email: "peter@acme.com", reason: "Bounced", since: "2026-05-01" },
  ];

  const importHistory = [
    { id: "imp_1", importedBy: "marketing@gbb", date: "2026-05-12", sourceFile: "lagos_event.csv", added: 1180, updated: 20, rejected: 14 },
    { id: "imp_2", importedBy: "marketing@gbb", date: "2026-05-20", sourceFile: "crm_export.xlsx", added: 940, updated: 60, rejected: 8 },
  ];

  return { sources, contacts, groups, suppression, importHistory };
}

// ─── Merge by email (the dedup-at-contact-level rule) ────────────────────────
// Returns { contacts, added, updated } given an existing contact array + new rows.
export function mergeRows(existing, rows) {
  const map = new Map(existing.map((c) => [norm(c.email), { ...c, sources: Array.isArray(c.sources) ? [...c.sources] : (c.sources instanceof Set ? Array.from(c.sources) : []) }]));
  let added = 0, updated = 0;
  for (const r of rows) {
    const k = norm(r.email);
    if (map.has(k)) {
      const e = map.get(k);
      e.firstName = e.firstName || r.firstName;
      e.lastName = e.lastName || r.lastName;
      e.organisation = e.organisation || r.organisation;
      if (r.source && !e.sources.includes(r.source)) e.sources.push(r.source);
      e.updatedAt = now();
      updated++;
    } else {
      map.set(k, { email: norm(r.email), firstName: r.firstName || "", lastName: r.lastName || "", organisation: r.organisation || "", sources: r.source ? [r.source] : [], createdAt: now(), updatedAt: now() });
      added++;
    }
  }
  return { contacts: [...map.values()], added, updated };
}

// ─── Import with validation report ───────────────────────────────────────────
// rows: [{ email, firstName, lastName, organisation, source }]
export function importContacts(existing, rows, source) {
  const valid = [], rejected = [];
  const seenInBatch = new Set();
  for (const r of rows) {
    const e = norm(r.email);
    if (!e) { rejected.push({ row: r, reason: "Missing email (required)" }); continue; }
    if (!isValidEmail(e)) { rejected.push({ row: r, reason: "Invalid email format" }); continue; }
    if (seenInBatch.has(e)) { rejected.push({ row: r, reason: "Duplicate within file" }); continue; }
    seenInBatch.add(e);
    valid.push({ ...r, source });
  }
  const { contacts, added, updated } = mergeRows(existing, valid);
  const report = { added, updated, rejected: rejected.length, rejectedRows: rejected, total: rows.length };
  return { contacts, report };
}

// ─── Manual Add Contact ──────────────────────────────────────────────────────
export function findContactByEmail(contacts, email) {
  return contacts.find((c) => norm(c.email) === norm(email)) || null;
}

// Validate a single manual contact entry. Returns { ok, error, duplicate }.
// `duplicate` is the existing contact when the email already exists (the caller
// shows a warning with view/update options).
export function validateContactEntry(contacts, email) {
  const e = norm(email);
  if (!e) return { ok: false, error: "Email address is required." };
  if (!isValidEmail(e)) return { ok: false, error: "Email address must be valid." };
  const existing = findContactByEmail(contacts, e);
  if (existing) return { ok: false, error: "A contact with this email already exists in this tenant.", duplicate: existing };
  return { ok: true };
}

// Manually create a contact. Tagged with Source Type: Manual Entry, Created By,
// Created Date/Time. Optionally assigns the contact to one or more groups.
// Returns { contacts, groups, contact } or { error, duplicate }.
export function addContact(state, { email, firstName = "", lastName = "", organisation = "", groupIds = [], createdBy = "current.user", sourceId = "src_manual" }) {
  const { contacts, groups } = state;
  const check = validateContactEntry(contacts, email);
  if (!check.ok) return { error: check.error, duplicate: check.duplicate || null };

  const contact = {
    email: norm(email),
    firstName, lastName, organisation,
    sources: [sourceId],
    sourceType: SOURCE_TYPE.MANUAL,
    createdBy,
    createdAt: now(),
    updatedAt: now(),
  };
  const nextContacts = [...contacts, contact];

  // Optional: assign to static groups by appending the email to their member list.
  // (Dynamic groups pick the contact up automatically if it matches their rules.)
  const nextGroups = groups.map((g) => {
    if (!groupIds.includes(g.id)) return g;
    if (g.type !== "static") return g; // dynamic groups resolve by rule, no manual member add
    if (g.members.map(norm).includes(norm(email))) return g;
    return { ...g, members: [...g.members, norm(email)] };
  });

  return { contacts: nextContacts, groups: nextGroups, contact };
}

// Update an existing contact (used from the duplicate-warning "Update" path).
export function updateContact(contacts, email, patch) {
  return contacts.map((c) => (norm(c.email) === norm(email) ? { ...c, ...patch, updatedAt: now() } : c));
}

// Add multiple manual contacts at once (manual entry, multi-row).
// Returns { contacts, groups, added, skipped, skippedRows }.
export function addContactsBatch(state, rows, { groupIds = [], createdBy = "current.user", sourceId = "src_manual" } = {}) {
  let { contacts, groups } = state;
  let added = 0; const skippedRows = [];
  for (const r of rows) {
    const res = addContact({ contacts, groups }, { ...r, groupIds, createdBy, sourceId });
    if (res.error) { skippedRows.push({ row: r, reason: res.error }); continue; }
    contacts = res.contacts; groups = res.groups; added++;
  }
  return { contacts, groups, added, skipped: skippedRows.length, skippedRows };
}

// ─── Group resolution ────────────────────────────────────────────────────────
export function resolveGroup(group, contacts) {
  if (group.type === "static") {
    const set = new Set(group.members.map(norm));
    return contacts.filter((c) => set.has(norm(c.email)));
  }
  // dynamic: OR across rules, resolved live against the current contact set
  return contacts.filter((c) => (group.rules || []).some((r) => matchesRule(c, r)));
}

// ─── ★ Audience resolution (union → dedup → minus suppression) ───────────────
// Resolve at RUN TIME. Returns the math + the final contact list.
export function resolveAudience(groupIds, groups, contacts, suppression) {
  const selected = groups.filter((g) => groupIds.includes(g.id));
  const suppressed = new Set((suppression || []).map((s) => norm(s.email)));

  let totalAcross = 0;
  const seen = new Map(); // email -> contact (dedup)
  for (const g of selected) {
    const members = resolveGroup(g, contacts);
    totalAcross += members.length;
    for (const c of members) seen.set(norm(c.email), c);
  }
  const unique = [...seen.values()];
  const duplicatesRemoved = totalAcross - unique.length;
  const finalList = unique.filter((c) => !suppressed.has(norm(c.email)));
  const suppressedRemoved = unique.length - finalList.length;

  return {
    groupsSelected: selected.length,
    totalAcross,
    duplicatesRemoved,
    uniqueContacts: unique.length,
    suppressedRemoved,
    finalCount: finalList.length,
    finalList,
  };
}

// ─── Group CRUD ──────────────────────────────────────────────────────────────
export function createGroup(groups, { name, description, type, sourceIds = [], members = [], rules = [] }) {
  return [...groups, { id: nextId("grp"), name, description, type, sourceIds, members, rules }];
}
export function updateGroup(groups, id, patch) {
  return groups.map((g) => (g.id === id ? { ...g, ...patch } : g));
}
