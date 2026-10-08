import { useState, useMemo } from "react";
import {
  SOURCE_TYPE, RULE_KINDS, resolveGroup, resolveAudience,
  createGroup, updateGroup, addContact, addContactsBatch, validateContactEntry,
  importContacts, isValidEmail,
} from "./contactStore";
import { providerLabel, providerColor } from "./integrationStore";

const GREEN = "#055F36";

const TYPE_PILL = {
  [SOURCE_TYPE.CSV]:    { bg: "#E6F1FB", fg: "#0C447C" },
  [SOURCE_TYPE.EXCEL]:  { bg: "#EAF3DE", fg: "#27500A" },
  [SOURCE_TYPE.API]:    { bg: "#EEEDFE", fg: "#3C3489" },
  [SOURCE_TYPE.MANUAL]: { bg: "#FAEEDA", fg: "#854F0B" },
  [SOURCE_TYPE.REST]:   { bg: "#E1F5EE", fg: "#0F6E56" },
};
const FALLBACK_PILL = { bg: "#F1EFE8", fg: "#5F5E5A" };

function Pill({ text, colors }) {
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: colors.bg, color: colors.fg }}>{text}</span>;
}

// ─── Sources ─────────────────────────────────────────────────────────────────
function SourcesView({ sources, contacts }) {
  return (
    <div>
      <div style={note}><b>Merge by email:</b> the same person from two sources becomes one contact. Email is the primary identifier, unique per tenant.</div>
      <table style={tbl}>
        <thead><tr>{["Source name", "Type", "Status", "Last sync", "Contacts"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {sources.map((s) => {
            const cnt = contacts.filter((c) => (Array.isArray(c.sources) ? c.sources : []).includes(s.id)).length;
            return (
              <tr key={s.id}>
                <td style={td}><span style={{ fontWeight: 500 }}>{s.name}</span></td>
                <td style={td}><Pill text={s.type} colors={TYPE_PILL[s.type] || FALLBACK_PILL} /></td>
                <td style={td}><Pill text={s.status} colors={{ bg: "#E1F5EE", fg: "#0F6E56" }} /></td>
                <td style={td}><span style={{ color: "#999", fontSize: 12 }}>{s.lastSync}</span></td>
                <td style={td}>{cnt}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ ...secH, marginTop: 16 }}>Field mapping (CSV / Excel import)</div>
      <table style={tbl}>
        <thead><tr><th style={th}>Uploaded column</th><th style={th}>→ Contact field</th></tr></thead>
        <tbody>
          {[["Email Address", "Email"], ["Surname", "Last Name"], ["Company", "Organisation"]].map(([a, b], i) => (
            <tr key={i}><td style={td}>{a}</td><td style={td}>{b}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Contacts ────────────────────────────────────────────────────────────────
function ContactsView({ contacts, sources, suppression, onAdd }) {
  const sName = (id) => (sources.find((s) => s.id === id) || {}).name || id;
  const supp = new Set(suppression.map((s) => s.email));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={note0}><b>{contacts.length} unique contacts.</b> Contacts in 2+ sources are tagged “merged”.</div>
        {onAdd && <button style={btnPrimary} onClick={onAdd}>+ Add contact</button>}
      </div>
      <table style={tbl}>
        <thead><tr>{["Email (identifier)", "Name", "Organisation", "Sources"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.email}>
              <td style={{ ...td, fontFamily: "monospace", fontSize: 11.5 }}>
                {c.email} {supp.has(c.email) && <span style={{ ...tag, background: "#FDECEA", color: "#A32D2D" }}>suppressed</span>}
              </td>
              <td style={td}>{(c.firstName + " " + c.lastName).trim() || <span style={{ color: "#bbb" }}>—</span>}</td>
              <td style={td}>{c.organisation || <span style={{ color: "#bbb" }}>—</span>}</td>
              <td style={td}>{(Array.isArray(c.sources) ? c.sources : []).map(sName).join(", ")} {(Array.isArray(c.sources) ? c.sources : []).length > 1 && <span style={tag}>merged</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Groups ──────────────────────────────────────────────────────────────────
function GroupsView({ groups, contacts, onNew }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={note0}><b>Static</b> = frozen list. <b>Dynamic</b> = a rule re-resolved live on every run.</div>
        {onNew && <button style={btnPrimary} onClick={onNew}>+ New group</button>}
      </div>
      {groups.map((g) => {
        const m = resolveGroup(g, contacts);
        return (
          <div key={g.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</span>
              <Pill text={g.type} colors={g.type === "static" ? { bg: "#F1EFE8", fg: "#5F5E5A" } : { bg: "#E1F5EE", fg: "#0F6E56" }} />
            </div>
            {g.description && <div style={{ fontSize: 12, color: "#777", marginBottom: 5 }}>{g.description}</div>}
            {g.type === "dynamic"
              ? <div style={ruleBox}>{g.rules.map((r) => RULE_KINDS[r.kind].label + (r.value ? ` “${r.value}”` : "")).join("   OR   ")}</div>
              : <div style={{ fontSize: 11, color: "#999" }}>Frozen list · {g.members.length} contacts</div>}
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}><b style={{ color: GREEN }}>{m.length}</b> contacts {g.type === "dynamic" ? "(resolved live)" : "(fixed)"}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── New group flow (5 steps) ────────────────────────────────────────────────
function NewGroupModal({ sources, contacts, suppression, onCreate, onCancel }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceIds, setSourceIds] = useState([]);
  const [type, setType] = useState("dynamic");
  const [rules, setRules] = useState([{ kind: "orgNotNull", value: "" }]);

  const draftGroup = { type, sourceIds, rules, members: contacts.filter((c) => sourceIds.some((s) => (Array.isArray(c.sources) ? c.sources : []).includes(s))).map((c) => c.email) };
  const preview = useMemo(() => resolveAudience(["__preview__"], [{ id: "__preview__", ...draftGroup }], contacts, suppression), [type, sourceIds, rules]);

  const toggleSource = (id) => setSourceIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const setRule = (i, patch) => setRules((rs) => rs.map((r, x) => x === i ? { ...r, ...patch } : r));
  const addRule = () => setRules((rs) => [...rs, { kind: "orgContains", value: "" }]);
  const removeRule = (i) => setRules((rs) => rs.filter((_, x) => x !== i));

  return (
    <div style={{ minHeight: 460, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["Create", "Sources", "Type", "Filters", "Preview"].map((s, i) => (
            <div key={s} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 10, background: step === i + 1 ? "#f0f9f5" : "#f3f3f3", color: step === i + 1 ? GREEN : "#999", fontWeight: step === i + 1 ? 600 : 400, border: step === i + 1 ? "0.5px solid #c5e8d8" : "0.5px solid transparent" }}>{i + 1} {s}</div>
          ))}
        </div>

        {step === 1 && <>
          <label style={fieldLbl}>Group name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Enterprise Customers" style={inpSt} autoFocus />
          <label style={{ ...fieldLbl, marginTop: 14 }}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" style={inpSt} />
        </>}

        {step === 2 && <>
          <label style={fieldLbl}>Select contact source(s)</label>
          {sources.map((s) => (
            <label key={s.id} style={checkRow}>
              <input type="checkbox" checked={sourceIds.includes(s.id)} onChange={() => toggleSource(s.id)} style={{ accentColor: GREEN }} />
              <span>{s.name} <span style={{ color: "#aaa", fontSize: 11 }}>({s.type})</span></span>
            </label>
          ))}
        </>}

        {step === 3 && <>
          <label style={fieldLbl}>Group type</label>
          {[["static", "Static — a frozen snapshot of contacts from the selected sources"], ["dynamic", "Dynamic — a rule that re-resolves the latest matching contacts on every run"]].map(([val, desc]) => (
            <label key={val} style={{ ...checkRow, alignItems: "flex-start" }}>
              <input type="radio" name="gtype" checked={type === val} onChange={() => setType(val)} style={{ accentColor: GREEN, marginTop: 2 }} />
              <span><b style={{ textTransform: "capitalize" }}>{val}</b><br /><span style={{ fontSize: 11, color: "#777" }}>{desc}</span></span>
            </label>
          ))}
        </>}

        {step === 4 && <>
          <label style={fieldLbl}>Filters {type === "static" ? "(dynamic only — static uses the source list)" : "(OR across rules)"}</label>
          {type === "dynamic" ? <>
            {rules.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <select value={r.kind} onChange={(e) => setRule(i, { kind: e.target.value })} style={{ ...inpSt, flex: 1 }}>
                  {Object.entries(RULE_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {RULE_KINDS[r.kind].needsValue && <input value={r.value} onChange={(e) => setRule(i, { value: e.target.value })} placeholder="value" style={{ ...inpSt, flex: 1 }} />}
                {rules.length > 1 && <button onClick={() => removeRule(i)} style={{ ...btnSm, padding: "6px 9px" }}>✕</button>}
              </div>
            ))}
            <button onClick={addRule} style={{ ...btnSm, marginTop: 4 }}>+ Add rule</button>
          </> : <p style={{ fontSize: 12, color: "#777" }}>Static groups include everyone from the selected sources.</p>}
        </>}

        {step === 5 && <>
          <label style={fieldLbl}>Preview audience</label>
          <div style={mathBox}>
            <Row label="Matching contacts" value={preview.totalAcross} />
            <Row label="Duplicates removed" value={`− ${preview.duplicatesRemoved}`} minus />
            <Row label="Suppressed removed" value={`− ${preview.suppressedRemoved}`} minus />
            <Row label="Final" value={preview.finalCount} total />
          </div>
        </>}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "space-between" }}>
          <button style={btnSm} onClick={step === 1 ? onCancel : () => setStep(step - 1)}>{step === 1 ? "Cancel" : "← Back"}</button>
          {step < 5
            ? <button style={{ ...btnSm, ...btnSmPrimary, opacity: step === 1 && !name.trim() ? 0.5 : 1 }} disabled={step === 1 && !name.trim()} onClick={() => setStep(step + 1)}>Next →</button>
            : <button style={{ ...btnSm, ...btnSmPrimary }} onClick={() => onCreate({ name: name.trim(), description: description.trim(), type, sourceIds, rules: type === "dynamic" ? rules : [], members: type === "static" ? draftGroup.members : [] })}>Create group</button>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, minus, total }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: total ? 15 : 13, fontWeight: total ? 600 : 400, color: total ? GREEN : "#666", borderTop: total ? "0.5px solid #c5e8d8" : "none", marginTop: total ? 6 : 0, paddingTop: total ? 10 : 5 }}>
      <span>{label}</span><span style={{ fontFamily: "monospace", color: minus ? "#A32D2D" : "inherit" }}>{value}</span>
    </div>
  );
}

// ─── Suppression + import history ────────────────────────────────────────────
function GovernanceView({ suppression, importHistory }) {
  return (
    <div>
      <div style={secH}>Suppression list — excluded before every send</div>
      <table style={tbl}>
        <thead><tr>{["Email", "Reason", "Since"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{suppression.map((s) => (
          <tr key={s.email}><td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{s.email}</td><td style={td}>{s.reason}</td><td style={td}><span style={{ color: "#999", fontSize: 12 }}>{s.since}</span></td></tr>
        ))}</tbody>
      </table>
      <div style={{ ...secH, marginTop: 16 }}>Import history — “where did these contacts come from?”</div>
      <table style={tbl}>
        <thead><tr>{["Imported by", "Date", "Source file", "Added", "Updated", "Rejected"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{importHistory.map((h) => (
          <tr key={h.id}>
            <td style={td}>{h.importedBy}</td><td style={td}><span style={{ color: "#999", fontSize: 12 }}>{h.date}</span></td>
            <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{h.sourceFile}</td>
            <td style={{ ...td, color: "#27500A" }}>{h.added}</td><td style={td}>{h.updated}</td><td style={{ ...td, color: "#A32D2D" }}>{h.rejected}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── Add Contact: method chooser → manual / bulk / CRM ───────────────────────
function AddContactsFlow({ contacts, groups, integrations, onAddBatch, onImport, onSyncFrom, onGoToIntegrations, onCancel }) {
  const [view, setView] = useState("chooser"); // chooser | manual | bulk | crm

  const Header = ({ title }) => (
    <div style={{ padding: "15px 20px", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 500 }}>
      {view !== "chooser" && <span onClick={() => setView("chooser")} style={{ cursor: "pointer", color: "#888", fontSize: 16 }}>←</span>}
      <span style={{ color: GREEN }}>＋</span> {title}
    </div>
  );

  return (
    <div style={{ minHeight: 460, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
        {view === "chooser" && <><Header title="Add contacts" /><Chooser onPick={setView} onCancel={onCancel} /></>}
        {view === "manual" && <><Header title="Manual entry" /><ManualEntry contacts={contacts} groups={groups} onAddMany={onAddBatch} onCancel={onCancel} /></>}
        {view === "bulk" && <><Header title="Bulk upload" /><BulkUpload onImport={onImport} onCancel={onCancel} /></>}
        {view === "crm" && <><Header title="CRM integration" /><CrmIntegration integrations={integrations} onSyncFrom={onSyncFrom} onGoToIntegrations={onGoToIntegrations} onCancel={onCancel} /></>}
      </div>
    </div>
  );
}

function Chooser({ onPick, onCancel }) {
  const opts = [
    ["manual", "✎", "Manual entry", "Type contacts in one by one. Add several at once."],
    ["bulk", "↥", "Bulk upload", "Import a CSV or Excel file, then map the columns."],
    ["crm", "⚡", "CRM integration", "Sync contacts from a connected CRM or external API."],
  ];
  return (
    <>
      <div style={{ padding: "18px 20px" }}>
        {opts.map(([key, icon, name, desc]) => (
          <div key={key} onClick={() => onPick(key)} style={choiceCard}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = GREEN_MID; e.currentTarget.style.background = "#f0f9f5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#eee"; e.currentTarget.style.background = "transparent"; }}>
            <div style={choiceIc}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{name}</div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
            </div>
            <span style={{ color: "#bbb", fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
      <div style={flowFoot}><span style={{ fontSize: 12, color: "#777" }}>Pick how you'd like to add contacts</span><button style={btnSm} onClick={onCancel}>Cancel</button></div>
    </>
  );
}

const EMAIL_RE_UI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blankRow = () => ({ email: "", firstName: "", lastName: "", organisation: "" });

function ManualEntry({ contacts, groups, onAddMany, onCancel }) {
  const [rows, setRows] = useState([blankRow()]);
  const [groupIds, setGroupIds] = useState([]);
  const existing = new Set(contacts.map((c) => (c.email || "").toLowerCase()));

  const setCell = (i, k, v) => setRows((rs) => rs.map((r, x) => x === i ? { ...r, [k]: v } : r));
  const addRow = () => setRows((rs) => [...rs, blankRow()]);
  const delRow = (i) => setRows((rs) => rs.filter((_, x) => x !== i));
  const toggleGroup = (id) => setGroupIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const rowState = (r) => {
    const e = r.email.trim().toLowerCase();
    if (!e) return "empty";
    if (!EMAIL_RE_UI.test(e)) return "invalid";
    if (existing.has(e)) return "dup";
    return "ok";
  };
  const validRows = rows.filter((r) => rowState(r) === "ok");

  return (
    <>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ fontSize: 11, color: "#0C447C", background: "#E6F1FB", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6, marginBottom: 14 }}>
          Email is required and must be unique. Source is tagged <b>Manual Entry</b> automatically.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.3fr 26px", gap: 7, fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 5 }}>
          <div>Email *</div><div>First name</div><div>Last name</div><div>Organisation</div><div />
        </div>
        {rows.map((r, i) => {
          const st = rowState(r);
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.3fr 26px", gap: 7, marginBottom: 7, alignItems: "center" }}>
              <input value={r.email} placeholder="name@org.com" onChange={(e) => setCell(i, "email", e.target.value)}
                style={{ ...cellInput, borderColor: st === "invalid" || st === "dup" ? "#E0584F" : "#ddd", background: st === "invalid" || st === "dup" ? "#FDECEA" : "#fafafa" }} title={st === "dup" ? "Email already exists" : ""} />
              <input value={r.firstName} placeholder="First" onChange={(e) => setCell(i, "firstName", e.target.value)} style={cellInput} />
              <input value={r.lastName} placeholder="Last" onChange={(e) => setCell(i, "lastName", e.target.value)} style={cellInput} />
              <input value={r.organisation} placeholder="Org" onChange={(e) => setCell(i, "organisation", e.target.value)} style={cellInput} />
              {rows.length > 1 ? <button onClick={() => delRow(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 14 }} aria-label="Remove row">✕</button> : <span />}
            </div>
          );
        })}
        <button onClick={addRow} style={{ fontSize: 12, color: GREEN, background: "none", border: "0.5px dashed #2cb173", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>+ Add another row</button>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Assign all to groups (optional)</div>
          {groups.map((g) => (
            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} style={{ accentColor: GREEN }} />
              {g.name} <span style={{ color: "#aaa", fontSize: 11 }}>({g.type})</span>
            </label>
          ))}
        </div>
      </div>
      <div style={flowFoot}>
        <span style={{ fontSize: 12, color: "#777" }}><b style={{ color: GREEN }}>{validRows.length}</b> valid of {rows.length} row{rows.length > 1 ? "s" : ""}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSm} onClick={onCancel}>Cancel</button>
          <button style={{ ...btnSm, ...btnSmPrimary, opacity: validRows.length ? 1 : 0.45, cursor: validRows.length ? "pointer" : "not-allowed" }} disabled={!validRows.length}
            onClick={() => onAddMany(validRows, groupIds)}>Add {validRows.length} contact{validRows.length === 1 ? "" : "s"}</button>
        </div>
      </div>
    </>
  );
}

function BulkUpload({ onImport, onCancel }) {
  return (
    <>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ border: "1.5px dashed #c5d6cd", borderRadius: 8, padding: 30, textAlign: "center", color: "#777", fontSize: 13, background: "#fafafa" }}>
          <div style={{ fontSize: 30, color: "#2cb173", marginBottom: 8 }}>↥</div>
          Drag a file here or <b style={{ color: GREEN, cursor: "pointer" }} onClick={() => onImport && onImport({ fileName: "contacts_upload.xlsx" })}>browse</b>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>Supports .csv, .xlsx, .xls</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", margin: "16px 0 9px" }}>Field mapping</div>
        {[["Email Address", ["Email"]], ["Surname", ["Last Name", "First Name", "Ignore"]], ["Company", ["Organisation", "Ignore"]]].map(([from, to], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 22px 1fr", gap: 8, alignItems: "center", marginBottom: 7, fontSize: 12.5 }}>
            <div style={{ padding: "7px 9px", background: "#fafafa", borderRadius: 6, border: "0.5px solid #ddd", fontFamily: "monospace", fontSize: 11.5 }}>{from}</div>
            <span style={{ color: "#aaa", textAlign: "center" }}>→</span>
            <select style={cellInput}>{to.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        ))}
      </div>
      <div style={flowFoot}>
        <span style={{ fontSize: 12, color: "#777" }}>Validation report shown after upload</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSm} onClick={onCancel}>Cancel</button>
          <button style={{ ...btnSm, ...btnSmPrimary }} onClick={() => onImport && onImport({ fileName: "contacts_upload.xlsx" })}>Import file</button>
        </div>
      </div>
    </>
  );
}

function CrmIntegration({ integrations = [], onSyncFrom, onGoToIntegrations, onCancel }) {
  const [pick, setPick] = useState(null);
  const connected = integrations.filter((i) => i.status === "Connected");

  return (
    <>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ fontSize: 11, color: "#0C447C", background: "#E6F1FB", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6, marginBottom: 14 }}>
          Sync contacts from a configured integration. Manage connections in the <b>Integrations</b> module.
        </div>
        {connected.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#999", fontSize: 13 }}>
            No connected integrations yet.
            <div style={{ marginTop: 10 }}>
              <button style={{ ...btnSm, ...btnSmPrimary }} onClick={onGoToIntegrations}>Go to Integrations →</button>
            </div>
          </div>
        ) : connected.map((i) => (
          <div key={i.id} onClick={() => setPick(i.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: 13, border: `0.5px solid ${pick === i.id ? GREEN : "#eee"}`, borderRadius: 8, cursor: "pointer", background: pick === i.id ? "#f0f9f5" : "transparent", marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: providerColor(i.provider), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontFamily: i.provider === "rest" ? "monospace" : "inherit", flexShrink: 0 }}>{i.provider === "rest" ? "{ }" : "⚡"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{i.name}</div>
              <div style={{ fontSize: 11, color: "#999" }}>{providerLabel(i.provider)} · sync {i.config.syncFrequency || "manual"} · {i.contactCount.toLocaleString()} contacts</div>
            </div>
          </div>
        ))}
      </div>
      <div style={flowFoot}>
        <span style={{ fontSize: 12, color: "#777" }}>{pick ? <>Sync from <b style={{ color: GREEN }}>{connected.find((i) => i.id === pick).name}</b></> : "Select a configured integration"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSm} onClick={onCancel}>Cancel</button>
          {connected.length > 0 && <button style={{ ...btnSm, ...btnSmPrimary, opacity: pick ? 1 : 0.45, cursor: pick ? "pointer" : "not-allowed" }} disabled={!pick} onClick={() => onSyncFrom && onSyncFrom(pick)}>Sync now</button>}
        </div>
      </div>
    </>
  );
}

// ─── Module root ─────────────────────────────────────────────────────────────
export default function ContactModule({ contactData, setContactData, integrations = [], onGoToIntegrations, canManage = true }) {
  const { sources, contacts, groups, suppression, importHistory } = contactData;
  const [tab, setTab] = useState("sources");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const TABS = [["sources", "Sources", sources.length], ["contacts", "Contacts", contacts.length], ["groups", "Groups", groups.length], ["governance", "Suppression & history", null]];

  const handleAddBatch = (rows, groupIds) => {
    const res = addContactsBatch({ contacts, groups }, rows, { groupIds, createdBy: "current.user" });
    setContactData((d) => ({ ...d, contacts: res.contacts, groups: res.groups }));
    setShowAddContact(false);
    if (res.skipped) alert(`Added ${res.added} contact(s). ${res.skipped} skipped (duplicate or invalid).`);
  };

  const handleImport = ({ fileName }) => {
    // Mock bulk import — a real build parses the file with the chosen mapping.
    const mockRows = [
      { email: "import1@bigco.com", firstName: "Imp", lastName: "One", organisation: "BigCo" },
      { email: "import2@bigco.com", firstName: "Imp", lastName: "Two", organisation: "BigCo" },
      { email: "john.doe@acme.com", firstName: "John", lastName: "Doe", organisation: "Acme Ltd" }, // existing → merge
    ];
    const { contacts: nextContacts, report } = importContacts(contacts, mockRows, "src_bulk");
    const src = sources.find((s) => s.id === "src_bulk") || { id: "src_bulk", name: fileName, type: SOURCE_TYPE.EXCEL, status: "Active", lastSync: new Date().toISOString().slice(0, 10) };
    const nextSources = sources.find((s) => s.id === "src_bulk") ? sources : [...sources, src];
    const histEntry = { id: "imp_" + Date.now(), importedBy: "current.user", date: new Date().toISOString().slice(0, 10), sourceFile: fileName, added: report.added, updated: report.updated, rejected: report.rejected };
    setContactData((d) => ({ ...d, contacts: nextContacts, sources: nextSources, importHistory: [histEntry, ...d.importHistory] }));
    setShowAddContact(false);
    alert(`Imported ${fileName}: ${report.added} added, ${report.updated} updated, ${report.rejected} rejected.`);
  };

  const handleSyncFrom = (integrationId) => {
    const integ = integrations.find((i) => i.id === integrationId);
    if (!integ) return;
    // Mock sync — a real build calls the integration's endpoint/SDK and merges results.
    const mockRows = [
      { email: "synced1@acme.com", firstName: "Sync", lastName: "One", organisation: "Acme Ltd" },
      { email: "synced2@xyz.com", firstName: "Sync", lastName: "Two", organisation: "XYZ Ltd" },
    ];
    // ensure a source exists for this integration, then import + record history
    const srcId = "src_" + integ.id;
    const { contacts: nextContacts, report } = importContacts(contacts, mockRows, srcId);
    const srcType = integ.provider === "rest" ? SOURCE_TYPE.REST : SOURCE_TYPE.API;
    const src = sources.find((s) => s.id === srcId) || { id: srcId, name: integ.name, type: srcType, status: "Active", lastSync: new Date().toISOString().slice(0, 10) };
    const nextSources = sources.find((s) => s.id === srcId) ? sources : [...sources, src];
    const histEntry = { id: "imp_" + Date.now(), importedBy: "current.user", date: new Date().toISOString().slice(0, 10), sourceFile: `${integ.name} (sync)`, added: report.added, updated: report.updated, rejected: report.rejected };
    setContactData((d) => ({ ...d, contacts: nextContacts, sources: nextSources, importHistory: [histEntry, ...d.importHistory] }));
    setShowAddContact(false);
    alert(`Synced from ${integ.name}: ${report.added} added, ${report.updated} updated.`);
  };

  return (
    <div>
      {showNewGroup && (
        <NewGroupModal sources={sources} contacts={contacts} suppression={suppression}
          onCancel={() => setShowNewGroup(false)}
          onCreate={(payload) => { setContactData((d) => ({ ...d, groups: createGroup(d.groups, payload) })); setShowNewGroup(false); }} />
      )}
      {showAddContact && (
        <AddContactsFlow contacts={contacts} groups={groups} integrations={integrations} onCancel={() => setShowAddContact(false)} onAddBatch={handleAddBatch} onImport={handleImport} onSyncFrom={handleSyncFrom} onGoToIntegrations={onGoToIntegrations} />
      )}
      <div style={{ display: "flex", gap: 2, padding: "10px 16px 0", borderBottom: "0.5px solid #eee", alignItems: "center" }}>
        {TABS.map(([k, lbl, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 13px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: tab === k ? GREEN : "#888", borderBottom: tab === k ? `2px solid ${GREEN}` : "2px solid transparent", fontWeight: tab === k ? 600 : 400, fontFamily: "inherit" }}>
            {lbl}{n != null && <span style={{ marginLeft: 6, fontSize: 10, background: "#f0f0ee", color: "#999", padding: "0 6px", borderRadius: 8 }}>{n}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: 18 }}>
        {tab === "sources" && <SourcesView sources={sources} contacts={contacts} />}
        {tab === "contacts" && <ContactsView contacts={contacts} sources={sources} suppression={suppression} onAdd={canManage ? () => setShowAddContact(true) : null} />}
        {tab === "groups" && <GroupsView groups={groups} contacts={contacts} onNew={canManage ? () => setShowNewGroup(true) : null} />}
        {tab === "governance" && <GovernanceView suppression={suppression} importHistory={importHistory} />}
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };
const th = { textAlign: "left", padding: "9px 12px", fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "0.5px solid #eee", background: "#fafafa" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid #eee", color: "#222" };
const secH = { fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 };
const note = { fontSize: 12, color: "#0C447C", background: "#E6F1FB", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6, marginBottom: 12 };
const note0 = { fontSize: 12, color: "#666" };
const card = { border: "0.5px solid #eee", borderRadius: 8, padding: 13, marginBottom: 10 };
const ruleBox = { fontSize: 11, color: "#444", fontFamily: "monospace", background: "#f7f7f6", padding: "6px 9px", borderRadius: 6, marginTop: 2 };
const tag = { fontSize: 9, fontWeight: 600, color: "#854F0B", background: "#FAEEDA", padding: "1px 5px", borderRadius: 7 };
const mathBox = { border: "0.5px solid #c5e8d8", borderRadius: 8, padding: 14, background: "#f0f9f5" };
const checkRow = { display: "flex", alignItems: "center", gap: 9, padding: "8px 0", fontSize: 13, cursor: "pointer" };
const btnPrimary = { padding: "7px 14px", borderRadius: 8, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#222" };
const btnSmPrimary = { background: GREEN, color: "#fff", borderColor: GREEN };
const choiceCard = { display: "flex", alignItems: "center", gap: 14, padding: 15, border: "0.5px solid #eee", borderRadius: 11, cursor: "pointer", background: "transparent", transition: "all .15s", marginBottom: 10 };
const choiceIc = { width: 42, height: 42, borderRadius: 10, background: "#f0f9f5", border: "0.5px solid #c5e8d8", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, fontSize: 20, flexShrink: 0 };
const cellInput = { fontSize: 12.5, padding: "8px 9px", borderRadius: 7, border: "0.5px solid #ddd", background: "#fafafa", color: "#222", fontFamily: "inherit", width: "100%" };
const flowFoot = { padding: "14px 20px", borderTop: "0.5px solid #eee", display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" };
const inpSt = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fafafa", color: "#222" };
const fieldLbl = { display: "block", fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" };
