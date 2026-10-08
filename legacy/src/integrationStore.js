// integrationStore.js
// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION MODULE. Reusable, named connections to external systems.
// Other modules (e.g. Contacts → Add Contact → CRM) reference these by id rather
// than configuring a connection inline. One place to add, name, and manage them.
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 400;
const nextId = (p) => `${p}_${++_seq}`;
const now = () => new Date().toISOString();

export const PROVIDERS = {
  salesforce: { label: "Salesforce", color: "#00A1E0", kind: "crm" },
  hubspot:    { label: "HubSpot", color: "#FF7A59", kind: "crm" },
  zoho:       { label: "Zoho CRM", color: "#E42527", kind: "crm" },
  rest:       { label: "Custom REST API", color: "#055F36", kind: "rest" },
};

export const SYNC_FREQUENCIES = [
  ["manual", "Manual only"],
  ["hourly", "Every hour"],
  ["daily", "Daily"],
  ["weekly", "Weekly"],
];

export const INTEGRATION_STATUS = { CONNECTED: "Connected", DISABLED: "Disabled", ERROR: "Error" };

// ─── Shape ───────────────────────────────────────────────────────────────────
// Integration {
//   id, name,                       // human-given name, e.g. "Acme Salesforce (prod)"
//   provider,                       // key into PROVIDERS
//   status,
//   config: { endpoint?, apiKey?, syncFrequency? },  // rest: endpoint/apiKey/freq
//   lastSync, contactCount,
//   createdBy, createdAt, updatedAt
// }

export function createInitialIntegrations() {
  return [
    {
      id: "int_sf", name: "Galaxy Backbone Salesforce", provider: "salesforce",
      status: INTEGRATION_STATUS.CONNECTED, config: { syncFrequency: "daily" },
      lastSync: "2026-05-28", contactCount: 3120, createdBy: "ada@gbb", createdAt: now(), updatedAt: now(),
    },
    {
      id: "int_rest", name: "Customer API (prod)", provider: "rest",
      status: INTEGRATION_STATUS.CONNECTED,
      config: { endpoint: "https://crm.galaxybackbone.com.ng/api/contacts", apiKey: "sk_live_••••••", syncFrequency: "hourly" },
      lastSync: "2026-05-29", contactCount: 840, createdBy: "marketing@gbb", createdAt: now(), updatedAt: now(),
    },
  ];
}

// ─── Validation ──────────────────────────────────────────────────────────────
export function validateIntegration({ name, provider, config }) {
  if (!name || !name.trim()) return { ok: false, error: "Give this integration a name." };
  if (!provider || !PROVIDERS[provider]) return { ok: false, error: "Choose a provider." };
  if (PROVIDERS[provider].kind === "rest") {
    const url = (config && config.endpoint) || "";
    let urlOk = false;
    try { const u = new URL(url); urlOk = u.protocol === "https:" || u.protocol === "http:"; } catch { urlOk = false; }
    if (!urlOk) return { ok: false, error: "Enter a valid endpoint URL." };
    if (!config.apiKey || !config.apiKey.trim()) return { ok: false, error: "Enter an API key / token." };
  }
  return { ok: true };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────
export function createIntegration(list, { name, provider, config = {}, createdBy = "current.user" }) {
  const check = validateIntegration({ name, provider, config });
  if (!check.ok) return { error: check.error };
  const integration = {
    id: nextId("int"), name: name.trim(), provider,
    status: INTEGRATION_STATUS.CONNECTED,
    config: { syncFrequency: "manual", ...config },
    lastSync: (config.syncFrequency && config.syncFrequency !== "manual") ? new Date().toISOString().slice(0, 10) : "—",
    contactCount: 0, createdBy, createdAt: now(), updatedAt: now(),
  };
  return { list: [...list, integration], integration };
}

export function updateIntegration(list, id, patch) {
  return list.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i));
}
export function removeIntegration(list, id) {
  return list.filter((i) => i.id !== id);
}
export function setIntegrationStatus(list, id, status) {
  return list.map((i) => (i.id === id ? { ...i, status, updatedAt: now() } : i));
}

// Helpers for consumers (e.g. the Contacts CRM picker).
export const connectedIntegrations = (list) => list.filter((i) => i.status === INTEGRATION_STATUS.CONNECTED);
export const providerLabel = (key) => (PROVIDERS[key] || {}).label || key;
export const providerColor = (key) => (PROVIDERS[key] || {}).color || "#5F5E5A";
