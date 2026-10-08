"use client";

import * as React from "react";
import { Plus, Power, PowerOff, Trash2, Braces, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Drawer } from "@/components/ui/Drawer";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { PROVIDERS, SYNC_FREQUENCIES, createIntegration, integrationError, providerLabel, removeIntegration, setIntegrationStatus, useIntegrations, type Integration, type ProviderKey } from "@/lib/studio/integrations";
import { studioMe, useStudioPermissions } from "@/lib/studio/access";
import { NoAccess, inputCls, labelCls } from "./shared";

const STATUS: Record<Integration["status"], string> = { Connected: "Active", Disabled: "Draft", Error: "Failed" };

function ProviderBadge({ provider, size = 40 }: { provider: ProviderKey; size?: number }) {
  return (
    <span className="rounded-lg flex items-center justify-center text-white shrink-0" style={{ width: size, height: size, background: PROVIDERS[provider].color }} aria-hidden>
      {provider === "rest" ? <Braces className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
    </span>
  );
}

export function StudioIntegrations() {
  const integrations = useIntegrations();
  const { canView, canManage } = useStudioPermissions("integrations");
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState<Integration | null>(null);
  if (!canView) return <NoAccess module="Studio integrations" />;
  const freqLabel = (f: string) => SYNC_FREQUENCIES.find(([v]) => v === f)?.[1] ?? f;

  return (
    <div className="max-w-[1200px] w-full mx-auto">
      <PageHeader title="Integrations" subtitle="Saved connections to outside systems. Contacts can sync from them by name."
        actions={canManage && <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-2" /> Add integration</Button>} />
      {integrations.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">No integrations yet. Add one to get started.</p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-3" aria-label="Integrations">
          {integrations.map((i) => (
            <li key={i.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4 flex items-center gap-4">
              <ProviderBadge provider={i.provider} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-heading font-bold">{i.name}</span><StatusBadge status={STATUS[i.status]} label={i.status} /></div>
                <div className="text-[0.82rem] text-[var(--muted-foreground)] mt-0.5 truncate">
                  {providerLabel(i.provider)}{i.config.endpoint ? <> · <span className="font-mono">{i.config.endpoint}</span></> : null} · sync: {freqLabel(i.config.syncFrequency)} · {i.contactCount.toLocaleString()} contacts{i.lastSync ? ` · last sync ${formatDate(i.lastSync)}` : ""}
                </div>
              </div>
              {canManage && <RowActionsMenu label={`Actions for ${i.name}`} actions={[
                { label: i.status === "Connected" ? "Disable" : "Enable", icon: i.status === "Connected" ? PowerOff : Power, onSelect: () => { setIntegrationStatus(i.id, i.status === "Connected" ? "Disabled" : "Connected"); toast.success(`${i.name} ${i.status === "Connected" ? "disabled" : "enabled"}`); } },
                { label: "Remove", icon: Trash2, danger: true, onSelect: () => setRemoving(i) },
              ]} />}
            </li>
          ))}
        </ul>
      )}
      {adding && <AddIntegrationDrawer onClose={() => setAdding(false)} />}
      <ConfirmDialog isOpen={!!removing} onClose={() => setRemoving(null)}
        onConfirm={() => { if (removing) { removeIntegration(removing.id); toast.success(`${removing.name} removed`); } setRemoving(null); }}
        tone="danger" icon={<Trash2 className="w-6 h-6" />} title={`Remove “${removing?.name}”?`}
        description="Contacts already synced stay. Future syncs from this connection stop." confirmLabel="Remove integration" />
    </div>
  );
}

function AddIntegrationDrawer({ onClose }: { onClose: () => void }) {
  const [provider, setProvider] = React.useState<ProviderKey | null>(null);
  const [name, setName] = React.useState("");
  const [endpoint, setEndpoint] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [freq, setFreq] = React.useState("hourly");
  const [tested, setTested] = React.useState(false);
  const isRest = provider === "rest";
  const config = isRest ? { endpoint, apiKey, syncFrequency: freq } : { syncFrequency: freq };
  const error = integrationError({ name, provider, config });
  const save = () => { const i = createIntegration({ name, provider: provider!, config }, studioMe().email); toast.success(`${i.name} added`); onClose(); };

  return (
    <Drawer isOpen onClose={onClose} title="Add an integration" subtitle="Connections are mocked in the prototype: nothing is called."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!!error} onClick={save}>Add integration</Button></>}>
      <div className="flex flex-col gap-5">
        <div>
          <span className={labelCls}>Provider</span>
          <div role="radiogroup" aria-label="Provider" className="grid grid-cols-2 gap-2 mt-1.5">
            {(Object.keys(PROVIDERS) as ProviderKey[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={provider === k} onClick={() => { setProvider(k); setTested(false); }}
                className={cn("flex items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-left", provider === k ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--primary)]/50")}>
                <ProviderBadge provider={k} size={32} /><span className="font-semibold text-[0.88rem]">{PROVIDERS[k].label}</span>
              </button>
            ))}
          </div>
        </div>
        {provider && <>
          <label className="flex flex-col gap-1.5"><span className={labelCls}>Name</span>
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`${providerLabel(provider)} (production)`} />
            <span className="text-[0.75rem] text-[var(--muted-foreground)]">A name you&apos;ll recognise later.</span>
          </label>
          {isRest && <>
            <label className="flex flex-col gap-1.5"><span className={labelCls}>Endpoint URL</span>
              <input className={cn(inputCls, "font-mono")} value={endpoint} onChange={(e) => { setEndpoint(e.target.value); setTested(false); }} placeholder="https://api.example.com/contacts" />
              <span className="text-[0.75rem] text-[var(--muted-foreground)]">Must return JSON. Called with GET on each sync.</span>
            </label>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="int-key" className={labelCls}>API key or token</label>
              <div className="relative">
                <input id="int-key" type={showKey ? "text" : "password"} className={cn(inputCls, "font-mono pr-16")} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTested(false); }} placeholder="sk_live_••••••••" />
                <button type="button" onClick={() => setShowKey((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.8rem] font-semibold text-[var(--primary)]">{showKey ? "Hide" : "Show"}</button>
              </div>
              <span className="text-[0.75rem] text-[var(--muted-foreground)]">Sent as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>.</span>
            </div>
          </>}
          <div className="flex flex-col gap-1.5"><span className={labelCls}>Sync frequency</span>
            <Select ariaLabel="Sync frequency" options={SYNC_FREQUENCIES.map(([, l]) => l)} value={SYNC_FREQUENCIES.find(([v]) => v === freq)?.[1]} onChange={(l) => setFreq(SYNC_FREQUENCIES.find(([, x]) => x === l)![0])} />
          </div>
          {isRest && <div className="flex flex-col gap-2">
            <span className={labelCls}>Expected response</span>
            <pre className="m-0 rounded-lg bg-[var(--secondary)] text-[#E1E5EB] p-3.5 font-mono text-[0.78rem] leading-relaxed overflow-x-auto">{`[\n  {\n    "email": "kunle@ibadanprints.com",\n    "firstName": "Kunle",\n    "lastName": "Adeyemi",\n    "organisation": "Ibadan Prints"\n  }\n]`}</pre>
            <p className="m-0 text-[0.75rem] text-[var(--muted-foreground)]">Only <code className="font-mono">email</code> is required; other fields are optional and merged by email.</p>
            {!error && <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setTested(true)}>Test connection</Button>{tested && <span className="text-[0.8rem] text-[var(--success)] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 3 sample contacts received</span>}</div>}
          </div>}
          <Alert tone="info" title="How synced contacts are tagged">Contacts from this integration are tagged with its name and the source type {providerLabel(provider)}.</Alert>
          {error && name && <p className="m-0 text-[0.8rem] text-[var(--destructive)]">{error}</p>}
        </>}
      </div>
    </Drawer>
  );
}
