"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Plus, Shield, Trash2, ArrowLeft, Star, Settings2, Lock, CheckCircle2 } from "lucide-react";
import { Table, TableActionsCell, TableActionsHead, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { STUDIO_MODULES, can, createStudioRole, inviteStudioUser, removeStudioRole, removeStudioUser, setStudioPerm, setStudioUserRole, useStudioAccess, useStudioPermissions, type StudioRole, type StudioUser } from "@/lib/studio/access";
import { DELIVERY_MODE, canSend, createProfile, fromAddress, isConfigured, markVerified, removeProfile, setDefault, updateProfile, updateSection, useDeliveryProfiles, type DeliveryMode, type DeliveryProfile } from "@/lib/studio/delivery";
import { Avatar, Tabs, dateTime } from "@/components/shared";
import { NoAccess, inputCls, labelCls } from "./shared";

const TABS = [{ id: "users", label: "Users" }, { id: "roles", label: "Roles & permissions" }, { id: "email", label: "Email settings" }] as const;
type TabId = (typeof TABS)[number]["id"];

export function StudioAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { canView, canManage, me } = useStudioPermissions("admin");
  const tab = (params.get("tab") as TabId) ?? "users";
  const profileId = params.get("profile");
  if (!canView) return <NoAccess module="Studio Admin" />;
  const go = (q: string) => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });

  return (
    <div className="max-w-[1200px] w-full mx-auto">
      <PageHeader title="Studio Admin" subtitle="Who can use Campaign Studio, what each role can do, and which senders it emails from. Separate from CRM Settings while the team reviews it." />
      <div className="mb-6"><Tabs label="Studio Admin sections" tabs={[...TABS]} value={tab} onChange={(t) => go(t === "users" ? "" : `tab=${t}`)} /></div>
      {tab === "users" && <UsersTab canManage={canManage} meId={me?.id} />}
      {tab === "roles" && <RolesTab canManage={canManage} />}
      {tab === "email" && (profileId ? <ProfileEditor id={profileId} canManage={canManage} onBack={() => go("tab=email")} /> : <EmailTab canManage={canManage} onOpen={(id) => go(`tab=email&profile=${id}`)} />)}
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersTab({ canManage, meId }: { canManage: boolean; meId?: string }) {
  const { users, roles } = useStudioAccess();
  const [inviting, setInviting] = React.useState(false);
  const [roleFor, setRoleFor] = React.useState<StudioUser | null>(null);
  const [removing, setRemoving] = React.useState<StudioUser | null>(null);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "—";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]">A user&apos;s <b className="text-[var(--foreground)]">role</b> decides what they can see and do in Campaign Studio. Changes apply straight away.</p>
        {canManage && <Button onClick={() => setInviting(true)}><UserPlus className="w-4 h-4 mr-2" /> Invite user</Button>}
      </div>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <Table className="min-w-full border-none shadow-none rounded-none">
          <TableHeader><TableRow className="hover:bg-transparent">{["User", "Role", "Status"].map((h) => <TableHead key={h}>{h}</TableHead>)}<TableActionsHead /></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell><span className="flex items-center gap-3"><Avatar name={u.name} /><span><span className="block font-semibold">{u.name}{u.id === meId && <span className="ml-2 text-[0.75rem] text-[var(--muted-foreground)]">(you)</span>}</span><span className="block text-[0.8rem] text-[var(--muted-foreground)]">{u.email}</span></span></span></TableCell>
                <TableCell><Badge variant={u.roleId === "role_admin" ? "secondary" : "muted"}>{roleName(u.roleId)}</Badge></TableCell>
                <TableCell><StatusBadge status={u.status === "Active" ? "Active" : "Pending"} label={u.status} /></TableCell>
                <TableActionsCell>{canManage && <RowActionsMenu label={`Actions for ${u.name}`} actions={[
                  { label: "Change role…", icon: Shield, onSelect: () => setRoleFor(u) },
                  ...(u.id !== meId ? [{ label: "Remove", icon: Trash2, danger: true, onSelect: () => setRemoving(u) }] : []),
                ]} />}</TableActionsCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {inviting && <InviteModal roles={roles} onClose={() => setInviting(false)} />}
      {roleFor && <ChangeRoleModal user={roleFor} roles={roles} onClose={() => setRoleFor(null)} />}
      <ConfirmDialog isOpen={!!removing} onClose={() => setRemoving(null)} onConfirm={() => { if (removing) { removeStudioUser(removing.id); toast.success(`${removing.name} removed from Campaign Studio`); } setRemoving(null); }}
        tone="danger" icon={<Trash2 className="w-6 h-6" />} title={`Remove ${removing?.name}?`} description="They lose access to Campaign Studio. Their CRM access isn't affected." confirmLabel="Remove" />
    </div>
  );
}

function InviteModal({ roles, onClose }: { roles: StudioRole[]; onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [roleId, setRoleId] = React.useState(roles[0]?.id ?? "");
  const [error, setError] = React.useState("");
  const send = () => { const err = inviteStudioUser({ name, email, roleId }); if (err) return setError(err); toast.success(`Invite sent to ${email.trim()}`); onClose(); };
  return (
    <Modal isOpen onClose={onClose} title="Invite a Studio user" maxWidth="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={send}>Send invite</Button></>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Full name <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></span><input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Amaka Okeke" /></label>
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Email</span><input className={inputCls} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="name@cicod.com" />{error && <span className="text-[0.78rem] text-[var(--destructive)]">{error}</span>}</label>
        <div className="flex flex-col gap-1.5"><span className={labelCls}>Role</span><Select ariaLabel="Role" options={roles.map((r) => r.name)} value={roles.find((r) => r.id === roleId)?.name} onChange={(n) => setRoleId(roles.find((r) => r.name === n)!.id)} /></div>
      </div>
    </Modal>
  );
}

function ChangeRoleModal({ user, roles, onClose }: { user: StudioUser; roles: StudioRole[]; onClose: () => void }) {
  const [roleId, setRoleId] = React.useState(user.roleId);
  const save = () => { setStudioUserRole(user.id, roleId); toast.success(`${user.name} is now ${roles.find((r) => r.id === roleId)?.name}`); onClose(); };
  return (
    <Modal isOpen onClose={onClose} title={`Change role: ${user.name}`} maxWidth="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={roleId === user.roleId} onClick={save}>Save role</Button></>}>
      <div role="radiogroup" aria-label="Role" className="flex flex-col gap-2">
        {roles.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={roleId === r.id} onClick={() => setRoleId(r.id)}
            className={cn("text-left rounded-xl border-[1.5px] px-4 py-3", roleId === r.id ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)]")}>
            <span className="block font-heading font-semibold text-[0.9rem]">{r.name}</span><span className="block text-[0.8rem] text-[var(--muted-foreground)]">{r.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- Roles ---------------- */

function RolesTab({ canManage }: { canManage: boolean }) {
  const { roles, users } = useStudioAccess();
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<StudioRole | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]"><b className="text-[var(--foreground)]">View</b> shows the module. <b className="text-[var(--foreground)]">Manage</b> allows creating, editing and deleting. Changes apply straight away.</p>
        {canManage && <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" /> New role</Button>}
      </div>
      {roles.map((r) => {
        const locked = r.system || !canManage;
        const n = users.filter((u) => u.roleId === r.id).length;
        return (
          <section key={r.id} aria-label={`${r.name} role`} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading font-bold">{r.name}</span>
              {r.system && <Badge variant="muted" className="gap-1"><Lock className="w-3 h-3" /> System</Badge>}
              <span className="text-[0.8rem] text-[var(--muted-foreground)]">{n} user{n === 1 ? "" : "s"}</span>
              {canManage && !r.system && n === 0 && <Button size="sm" variant="ghost" className="ml-auto text-[var(--destructive)]" onClick={() => setDeleting(r)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>}
            </div>
            <p className="m-0 mb-3 text-[0.86rem] text-[var(--muted-foreground)]">{r.description}</p>
            <table className="w-full text-[0.88rem] border-collapse">
              <thead><tr className="text-[0.75rem] uppercase tracking-wider text-[var(--muted-foreground)]"><th className="text-left py-1.5 font-bold">Module</th><th className="py-1.5 font-bold w-24">View</th><th className="py-1.5 font-bold w-24">Manage</th></tr></thead>
              <tbody>
                {STUDIO_MODULES.map(([k, l]) => (
                  <tr key={k} className="border-t border-[var(--border)]">
                    <td className="py-2">{l}</td>
                    {(["view", "manage"] as const).map((a) => (
                      <td key={a} className="py-2 text-center">
                        <input type="checkbox" aria-label={`${r.name}: ${l} ${a}`} disabled={locked} checked={can(r, k, a)} onChange={(e) => setStudioPerm(r.id, k, a, e.target.checked)} className="w-4 h-4 accent-[var(--primary)] disabled:opacity-50" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 rounded-lg border border-dashed border-[var(--primary)] bg-[var(--accent)] p-3">
              <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--accent-foreground)] mb-2">Someone with the {r.name} role sees</div>
              <div className="flex flex-wrap gap-1.5">
                {STUDIO_MODULES.map(([k, l]) => {
                  const v = can(r, k, "view"), m = can(r, k, "manage");
                  return <span key={k} className={cn("text-[0.8rem] px-2.5 py-1 rounded-md bg-[var(--card)] border border-[var(--border)]", !v && "opacity-40 line-through")}>{l}{v && !m ? " (read-only)" : ""}</span>;
                })}
              </div>
            </div>
          </section>
        );
      })}
      {creating && <NewRoleModal onClose={() => setCreating(false)} />}
      <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => { if (deleting) { removeStudioRole(deleting.id); toast.success(`${deleting.name} role deleted`); } setDeleting(null); }}
        tone="danger" icon={<Trash2 className="w-6 h-6" />} title={`Delete the ${deleting?.name} role?`} description="Nobody has this role, so no one loses access." confirmLabel="Delete role" />
    </div>
  );
}

function NewRoleModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");
  const create = () => { const err = createStudioRole({ name, description }); if (err) return setError(err); toast.success(`${name.trim()} role created. Set its permissions below.`); onClose(); };
  return (
    <Modal isOpen onClose={onClose} title="New Studio role" maxWidth="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} onClick={create}>Create role</Button></>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Role name</span><input autoFocus className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Campaign ops" />{error && <span className="text-[0.78rem] text-[var(--destructive)]">{error}</span>}</label>
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Description</span><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" /></label>
        <p className="m-0 text-[0.8rem] text-[var(--muted-foreground)]">The role starts with no permissions. Set them in the grid after creating it.</p>
      </div>
    </Modal>
  );
}

/* ---------------- Email settings: delivery profiles ---------------- */

function EmailTab({ canManage, onOpen }: { canManage: boolean; onOpen: (id: string) => void }) {
  const profiles = useDeliveryProfiles();
  const [creating, setCreating] = React.useState(false);
  const [removing, setRemoving] = React.useState<DeliveryProfile | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-[0.88rem] text-[var(--muted-foreground)]">Delivery profiles let you send through different senders for different purposes. Test sends and campaign runs choose one (or the default). A profile must be verified before it can send.</p>
        {canManage && <Button onClick={() => setCreating(true)} className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Add profile</Button>}
      </div>
      {profiles.map((p) => {
        const ready = canSend(p);
        return (
          <section key={p.id} aria-label={p.name} className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="font-heading font-bold">{p.name}</span>{p.isDefault && <Badge variant="info">Default</Badge>}<StatusBadge status={ready ? "Active" : "Pending"} label={ready ? "Verified" : isConfigured(p) ? "Not verified" : "Incomplete"} /></div>
              <div className="text-[0.84rem] text-[var(--muted-foreground)] mt-0.5">{p.mode} · from {fromAddress(p)}</div>
            </div>
            {canManage && <>
              <Button variant="outline" size="sm" onClick={() => onOpen(p.id)}><Settings2 className="w-4 h-4 mr-1.5" /> Configure</Button>
              <RowActionsMenu label={`Actions for ${p.name}`} actions={[
                ...(!p.isDefault ? [{ label: "Set as default", icon: Star, onSelect: () => { setDefault(p.id); toast.success(`${p.name} is now the default sender`); } }] : []),
                ...(profiles.length > 1 ? [{ label: "Remove", icon: Trash2, danger: true, onSelect: () => setRemoving(p) }] : []),
              ]} />
            </>}
          </section>
        );
      })}
      {creating && <NewProfileModal onClose={() => setCreating(false)} onCreated={onOpen} />}
      <ConfirmDialog isOpen={!!removing} onClose={() => setRemoving(null)} onConfirm={() => { if (removing) { removeProfile(removing.id); toast.success(`${removing.name} removed`); } setRemoving(null); }}
        tone="danger" icon={<Trash2 className="w-6 h-6" />} title={`Remove “${removing?.name}”?`}
        description={removing?.isDefault ? "This is the default sender, so the next profile becomes the default." : "Campaigns choose a sender each run, so nothing else changes."} confirmLabel="Remove profile" />
    </div>
  );
}

function NewProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = React.useState("");
  const [mode, setMode] = React.useState<DeliveryMode>(DELIVERY_MODE.SENDGRID);
  const [error, setError] = React.useState("");
  const create = () => { const r = createProfile(name, mode); if (r.error) return setError(r.error); onClose(); onCreated(r.id!); };
  return (
    <Modal isOpen onClose={onClose} title="Add a delivery profile" maxWidth="max-w-md" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} onClick={create}>Create and configure</Button></>}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5"><span className={labelCls}>Profile name</span><input autoFocus className={inputCls} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Bulk marketing (SMTP)" />{error && <span className="text-[0.78rem] text-[var(--destructive)]">{error}</span>}</label>
        <ModePicker value={mode} onChange={setMode} />
      </div>
    </Modal>
  );
}

function ModePicker({ value, onChange, disabled }: { value: DeliveryMode; onChange: (m: DeliveryMode) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5"><span className={labelCls}>Delivery method</span>
      <div role="radiogroup" aria-label="Delivery method" className="grid grid-cols-2 gap-2">
        {Object.values(DELIVERY_MODE).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} disabled={disabled} onClick={() => onChange(m)}
            className={cn("rounded-xl border-[1.5px] py-2.5 font-heading font-semibold text-[0.88rem]", value === m ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--border)]")}>{m}</button>
        ))}
      </div>
    </div>
  );
}

function ProfileEditor({ id, canManage, onBack }: { id: string; canManage: boolean; onBack: () => void }) {
  const profiles = useDeliveryProfiles();
  const p = profiles.find((x) => x.id === id);
  if (!p) return <div className="flex flex-col items-center gap-3 py-16"><p className="m-0 font-semibold">Profile not found</p><Button variant="outline" onClick={onBack}>All profiles</Button></div>;
  const lock = !canManage;
  const sg = p.mode === DELIVERY_MODE.SENDGRID;
  const field = (label: string, value: string | number, onChange: (v: string) => void, type = "text", placeholder?: string) => (
    <label className="flex flex-col gap-1.5"><span className={labelCls}>{label}</span><input type={type} disabled={lock} className={cn(inputCls, type === "password" && "font-mono")} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>
  );
  const verify = () => {
    if (!isConfigured(p)) return toast.error("Fill in the required fields first.");
    markVerified(p.id); toast.success(`“${p.name}” verified and ready to send`);
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> All profiles</Button>
        <h2 className="m-0 text-[1.15rem] font-heading font-extrabold">{p.name}</h2>
        <StatusBadge status={canSend(p) ? "Active" : "Pending"} label={canSend(p) ? "Verified" : "Not verified"} />
      </div>
      <Alert tone="info" title="Any change needs verifying again">Editing a field marks the profile as not verified until you test the connection.</Alert>
      <section className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <ModePicker value={p.mode} disabled={lock} onChange={(m) => updateProfile(p.id, { mode: m })} />
        {sg ? <>
          {field("SendGrid API key", p.sendgrid.apiKey, (v) => updateSection(p.id, "sendgrid", { apiKey: v }), "password", "SG.xxxxxxxx")}
          <div className="grid grid-cols-2 gap-4">{field("From email", p.sendgrid.fromEmail, (v) => updateSection(p.id, "sendgrid", { fromEmail: v }))}{field("From name", p.sendgrid.fromName, (v) => updateSection(p.id, "sendgrid", { fromName: v }))}</div>
        </> : <>
          <div className="grid grid-cols-[2fr_1fr] gap-4">{field("SMTP host", p.smtp.host, (v) => updateSection(p.id, "smtp", { host: v }), "text", "smtp.cicod.com")}{field("Port", p.smtp.port, (v) => updateSection(p.id, "smtp", { port: Number(v) || 0 }), "number")}</div>
          <div className="grid grid-cols-2 gap-4">{field("Username", p.smtp.username, (v) => updateSection(p.id, "smtp", { username: v }))}{field("Password", p.smtp.password, (v) => updateSection(p.id, "smtp", { password: v }), "password")}</div>
          <div className="grid grid-cols-2 gap-4">{field("From email", p.smtp.fromEmail, (v) => updateSection(p.id, "smtp", { fromEmail: v }))}{field("From name", p.smtp.fromName, (v) => updateSection(p.id, "smtp", { fromName: v }))}</div>
          <label className="flex items-center gap-2.5 text-[0.88rem]"><input type="checkbox" disabled={lock} checked={p.smtp.secure} onChange={(e) => updateSection(p.id, "smtp", { secure: e.target.checked })} className="w-4 h-4 accent-[var(--primary)]" /> Use TLS/SSL</label>
        </>}
      </section>
      {canManage && (
        <div className="flex items-center gap-3">
          <Button onClick={verify} disabled={!isConfigured(p)}>Test and verify connection</Button>
          {p.verified && p.lastVerifiedAt && <span className="text-[0.84rem] text-[var(--success)] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Verified {dateTime(p.lastVerifiedAt)}</span>}
        </div>
      )}
    </div>
  );
}
