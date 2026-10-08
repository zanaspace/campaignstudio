/**
 * Standalone only: keep Campaign Studio's data in this browser between visits (the original app did the same).
 * Every store is saved whenever any of them changes, so they always reload as a consistent set.
 */
import { studioTemplatesStore } from "@/lib/studio/templates";
import { studioCampaignsStore } from "@/lib/studio/campaigns";
import { studioContactsStore } from "@/lib/studio/contacts";
import { integrationsStore } from "@/lib/studio/integrations";
import { studioAccessStore } from "@/lib/studio/access";
import { deliveryStore } from "@/lib/studio/delivery";

type AnyStore = { get: () => unknown; set: (v: never) => void; subscribe: (l: () => void) => () => void };
const KEY = "cs2_data_v1";
const STORES: [string, AnyStore][] = [
  ["templates", studioTemplatesStore as AnyStore],
  ["campaigns", studioCampaignsStore as AnyStore],
  ["contacts", studioContactsStore as AnyStore],
  ["integrations", integrationsStore as AnyStore],
  ["access", studioAccessStore as AnyStore],
  ["delivery", deliveryStore as AnyStore],
];

export function loadAndPersist() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (saved) for (const [name, store] of STORES) if (saved[name] !== undefined) store.set(saved[name] as never);
  } catch { /* corrupt or blocked storage: start from the demo data */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(STORES.map(([n, s]) => [n, s.get()])))); } catch { /* quota or blocked */ }
  };
  for (const [, s] of STORES) s.subscribe(save);
}

/** Forget everything saved in this browser and go back to the demo data. */
export function resetDemoData() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  window.location.assign("/");
}
