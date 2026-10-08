import { createContext, useContext, useCallback, useState } from "react";
import { useLocalState } from "./hooks/useLocalState";
import { createInitialData } from "./templateStore";
import { createInitialCampaigns } from "./campaignStore";
import { createInitialContactData } from "./contactStore";
import { createInitialIntegrations } from "./integrationStore";
import { createInitialAuth } from "./authStore";
import { createInitialEmailProfiles } from "./settingsStore";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Seed templates once, then seed campaigns from THAT same instance so
  // campaign template-pointers reference real template ids.
  const [{ templates: seedTemplates, campaigns: seedCampaigns }] = useState(() => {
    // Only run this once — check localStorage first
    try {
      const rawT = localStorage.getItem("cs_templates");
      const rawC = localStorage.getItem("cs_campaigns");
      if (rawT && rawC) {
        // Data already exists — return dummy seed (won't be used)
        return { templates: [], campaigns: [] };
      }
    } catch {
      // ignore
    }
    const templates = createInitialData();
    const campaigns = createInitialCampaigns(templates);
    return { templates, campaigns };
  });

  const [templates, setTemplates] = useLocalState("cs_templates", () => seedTemplates.length ? seedTemplates : createInitialData());
  const [campaigns, setCampaigns] = useLocalState("cs_campaigns", () => {
    if (seedCampaigns.length) return seedCampaigns;
    // Campaigns need real template ids — seed from current templates
    return createInitialCampaigns(templates);
  });
  const [contactData, setContactData] = useLocalState("cs_contacts", createInitialContactData);
  const [integrations, setIntegrations] = useLocalState("cs_integrations", createInitialIntegrations);
  const [auth, setAuth] = useLocalState("cs_auth", createInitialAuth);
  const [profiles, setProfiles] = useLocalState("cs_profiles", createInitialEmailProfiles);

  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, kind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <DataContext.Provider value={{
      templates, setTemplates,
      campaigns, setCampaigns,
      contactData, setContactData,
      integrations, setIntegrations,
      auth, setAuth,
      profiles, setProfiles,
      toasts, toast,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
