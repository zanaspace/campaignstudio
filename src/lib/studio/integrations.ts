/**
 * Campaign Studio integrations (ported from integrationStore.js): named connections to external systems
 * that Contacts can sync from. Mocked: nothing is called.
 */
import { createStore, useStore } from "@/lib/store";
import { daysFromToday } from "@/lib/format";

export const PROVIDERS = {
  salesforce: { label: "Salesforce", color: "#00A1E0", kind: "crm" },
  hubspot: { label: "HubSpot", color: "#FF7A59", kind: "crm" },
  zoho: { label: "Zoho CRM", color: "#E42527", kind: "crm" },
  rest: { label: "Custom REST API", color: "#12253F", kind: "rest" },
} as const;
export type ProviderKey = keyof typeof PROVIDERS;
export const SYNC_FREQUENCIES: [string, string][] = [["manual", "Manual only"], ["hourly", "Every hour"], ["daily", "Daily"], ["weekly", "Weekly"]];
export type IntegrationStatus = "Connected" | "Disabled" | "Error";
export type Integration = {
  id: string; name: string; provider: ProviderKey; status: IntegrationStatus;
  config: { endpoint?: string; apiKey?: string; syncFrequency: string };
  lastSync: string | null; contactCount: number; createdBy: string; createdAt: string;
};

let seq = 400;
export const integrationsStore = createStore<Integration[]>([
  { id: "int_sf", name: "Sales team Salesforce", provider: "salesforce", status: "Connected", config: { syncFrequency: "daily" }, lastSync: daysFromToday(-132), contactCount: 3120, createdBy: "adeola.adesina@cicod.com", createdAt: daysFromToday(-300) },
  { id: "int_rest", name: "Merchant API (prod)", provider: "rest", status: "Connected", config: { endpoint: "https://api.cicod.com/crm/contacts", apiKey: "sk_live_••••••", syncFrequency: "hourly" }, lastSync: daysFromToday(-131), contactCount: 840, createdBy: "marketing@cicod.com", createdAt: daysFromToday(-260) },
]);
export const useIntegrations = () => useStore(integrationsStore);
export const providerLabel = (k: ProviderKey) => PROVIDERS[k]?.label ?? k;

/** Why an integration can't be saved yet, or null. */
export function integrationError(i: { name: string; provider: ProviderKey | null; config: Integration["config"] }): string | null {
  if (!i.provider) return "Choose a provider.";
  if (!i.name.trim()) return "Give this integration a name.";
  if (PROVIDERS[i.provider].kind === "rest") {
    let ok = false;
    try { const u = new URL(i.config.endpoint ?? ""); ok = u.protocol === "https:" || u.protocol === "http:"; } catch { ok = false; }
    if (!ok) return "Enter a valid endpoint URL.";
    if (!i.config.apiKey?.trim()) return "Enter an API key or token.";
  }
  return null;
}
export function createIntegration(input: { name: string; provider: ProviderKey; config: Integration["config"] }, createdBy: string) {
  const i: Integration = { id: `int_${Date.now()}${++seq}`, name: input.name.trim(), provider: input.provider, status: "Connected", config: input.config, lastSync: input.config.syncFrequency !== "manual" ? daysFromToday(0) : null, contactCount: 0, createdBy, createdAt: daysFromToday(0) };
  integrationsStore.set((l) => [...l, i]);
  return i;
}
export const setIntegrationStatus = (id: string, status: IntegrationStatus) => integrationsStore.set((l) => l.map((i) => (i.id === id ? { ...i, status } : i)));
export const removeIntegration = (id: string) => integrationsStore.set((l) => l.filter((i) => i.id !== id));
