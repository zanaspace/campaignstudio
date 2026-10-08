import { useState } from "react";
import {
  PROVIDERS, SYNC_FREQUENCIES, INTEGRATION_STATUS,
  createIntegration, removeIntegration, setIntegrationStatus,
  validateIntegration, providerLabel, providerColor,
} from "./integrationStore";

const GREEN = "#055F36", GREEN_MID = "#21714B";

const STATUS_COLORS = {
  [INTEGRATION_STATUS.CONNECTED]: { bg: "#E1F5EE", fg: "#0F6E56" },
  [INTEGRATION_STATUS.DISABLED]:  { bg: "#F1EFE8", fg: "#5F5E5A" },
  [INTEGRATION_STATUS.ERROR]:     { bg: "#FCEBEB", fg: "#A32D2D" },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS[INTEGRATION_STATUS.DISABLED];
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 11, fontSize: 11, fontWeight: 500, background: c.bg, color: c.fg }}>{status}</span>;
}

function ProviderBadge({ provider, size = 34 }) {
  return <div style={{ width: size, height: size, borderRadius: 8, background: providerColor(provider), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, fontSize: size > 30 ? 15 : 12, fontFamily: provider === "rest" ? "monospace" : "inherit" }}>{provider === "rest" ? "{ }" : "⚡"}</div>;
}

// ─── List ────────────────────────────────────────────────────────────────────
function IntegrationList({ integrations, onAdd, onToggle, onRemove, canManage = true }) {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#666" }}>Reusable connections to external systems. Other modules reference these by name.</div>
        {canManage && <button style={btnPrimary} onClick={onAdd}>+ Add integration</button>}
      </div>
      {integrations.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#bbb", fontSize: 13 }}>No integrations yet. Add one to get started.</div>
      ) : integrations.map((i) => (
        <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: 14, border: "0.5px solid #eee", borderRadius: 11, marginBottom: 10 }}>
          <ProviderBadge provider={i.provider} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{i.name}</span>
              <StatusPill status={i.status} />
            </div>
            <div style={{ fontSize: 11.5, color: "#999", marginTop: 2 }}>
              {providerLabel(i.provider)}
              {i.config.endpoint ? <> · <span style={{ fontFamily: "monospace" }}>{i.config.endpoint}</span></> : null}
              {" · "}sync: {i.config.syncFrequency || "manual"}
              {" · "}{i.contactCount.toLocaleString()} contacts
              {i.lastSync && i.lastSync !== "—" ? <> · last sync {i.lastSync}</> : null}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={btnSm} onClick={() => onToggle(i.id)}>{i.status === INTEGRATION_STATUS.CONNECTED ? "Disable" : "Enable"}</button>
            <button style={{ ...btnSm, color: "#A32D2D" }} onClick={() => { if (confirm(`Remove integration “${i.name}”?`)) onRemove(i.id); }}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add integration ─────────────────────────────────────────────────────────
function AddIntegration({ onCreate, onCancel }) {
  const [provider, setProvider] = useState(null);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [freq, setFreq] = useState("hourly");
  const [tested, setTested] = useState(false);

  const isRest = provider === "rest";
  const config = isRest ? { endpoint, apiKey, syncFrequency: freq } : { syncFrequency: freq };
  const check = provider ? validateIntegration({ name, provider, config }) : { ok: false };

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Choose a provider</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {Object.entries(PROVIDERS).map(([key, p]) => (
          <div key={key} onClick={() => setProvider(key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 13, border: `0.5px solid ${provider === key ? GREEN : "#eee"}`, borderRadius: 8, cursor: "pointer", background: provider === key ? "#f0f9f5" : "transparent" }}>
            <ProviderBadge provider={key} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.label}</div>
          </div>
        ))}
      </div>

      {provider && <>
        <Fld label="Integration name" hint="A name you'll recognise later, e.g. “Acme Salesforce (prod)”.">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${providerLabel(provider)} — production`} style={input} autoFocus />
        </Fld>

        {isRest && <>
          <Fld label="Endpoint URL" hint={<>Must return JSON. Called with <b>GET</b> on each sync.</>}>
            <input value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setTested(false); }} placeholder="https://crm.example.com/api/contacts" style={{ ...input, fontFamily: "monospace" }} />
          </Fld>
          <Fld label="API key / token" hint={<>Sent as <code style={mono}>Authorization: Bearer &lt;token&gt;</code>.</>}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTested(false); }} type={showKey ? "text" : "password"} placeholder="sk_live_••••••••" style={{ ...input, fontFamily: "monospace", paddingRight: 50 }} />
              <button type="button" onClick={() => setShowKey((s) => !s)} style={{ position: "absolute", right: 9, fontSize: 11, color: GREEN, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}>{showKey ? "Hide" : "Show"}</button>
            </div>
          </Fld>
        </>}

        <Fld label="Sync frequency">
          <select value={freq} onChange={(e) => setFreq(e.target.value)} style={input}>
            {SYNC_FREQUENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Fld>

        {isRest && <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#4B4D4C", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>Expected response</div>
          <pre style={{ background: "#1c1c1a", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.7, color: "#d6d6cf", overflowX: "auto", margin: "0 0 6px" }}>{`[
  {
    "email": "john@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "organisation": "Acme Ltd"
  }
]`}</pre>
          <p style={{ fontSize: 11, color: "#aaa", marginBottom: 10, lineHeight: 1.5 }}>Only <code style={mono}>email</code> is required per record; other fields are optional and merged by email.</p>
          {check.ok && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <button onClick={() => setTested(true)} style={{ fontSize: 12, padding: "7px 12px", borderRadius: 7, border: "0.5px solid #2cb173", background: "#f0f9f5", color: GREEN, cursor: "pointer", fontFamily: "inherit" }}>Test connection</button>
              {tested && <span style={{ fontSize: 11, color: "#1E6B3C" }}>✓ 3 sample contacts received</span>}
            </div>
          )}
        </>}

        <div style={{ fontSize: 11, color: "#777", background: "#fafafa", borderRadius: 8, padding: "9px 11px", lineHeight: 1.7, marginTop: 6 }}>
          Contacts synced from this integration are tagged with its name and Source Type: <b style={{ color: GREEN }}>{providerLabel(provider)}</b>.
        </div>
      </>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <button style={btnSm} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnSm, ...btnSmPrimary, opacity: check.ok ? 1 : 0.45, cursor: check.ok ? "pointer" : "not-allowed" }} disabled={!check.ok}
          onClick={() => onCreate({ name, provider, config })}>Add integration</button>
      </div>
    </div>
  );
}

function Fld({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#4B4D4C", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ─── Module root ─────────────────────────────────────────────────────────────
export default function IntegrationModule({ integrations, setIntegrations, canManage = true }) {
  const [view, setView] = useState("list"); // list | add

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 18px", borderBottom: "0.5px solid #eee", fontSize: 15, fontWeight: 500 }}>
        {view === "add" && <span onClick={() => setView("list")} style={{ cursor: "pointer", color: "#888", fontSize: 16 }}>←</span>}
        <span style={{ color: GREEN }}>⚡</span> {view === "add" ? "Add integration" : "Integrations"}
      </div>
      {view === "list"
        ? <IntegrationList integrations={integrations} canManage={canManage} onAdd={() => setView("add")}
            onToggle={(id) => setIntegrations((l) => setIntegrationStatus(l, id, l.find((x) => x.id === id).status === INTEGRATION_STATUS.CONNECTED ? INTEGRATION_STATUS.DISABLED : INTEGRATION_STATUS.CONNECTED))}
            onRemove={(id) => setIntegrations((l) => removeIntegration(l, id))} />
        : <AddIntegration onCancel={() => setView("list")}
            onCreate={(payload) => { const res = createIntegration(integrations, payload); if (res.error) { alert(res.error); return; } setIntegrations(res.list); setView("list"); }} />}
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const btnPrimary = { padding: "7px 14px", borderRadius: 8, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#222" };
const btnSmPrimary = { background: GREEN, color: "#fff", borderColor: GREEN };
const input = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fafafa" };
const mono = { fontFamily: "monospace", fontSize: 11.5, background: "#f0f0ee", padding: "1px 4px", borderRadius: 4 };
