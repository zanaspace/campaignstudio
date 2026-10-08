/**
 * Campaign Studio access control: Studio users, roles, and the signed-in user.
 * Standalone version: in the CRM the signed-in CRM user is the Studio user; here you sign in with a Studio user's email.
 * A permission is (module, view | manage); manage implies view. The system role is locked.
 */
import { createStore, useStore } from "@/lib/store";
import { daysFromToday, setCurrentUser } from "@/lib/format";

export const STUDIO_MODULES = [
  ["templates", "Template Library"],
  ["contacts", "Contacts"],
  ["campaigns", "Campaigns"],
  ["integrations", "Integrations"],
  ["admin", "Studio Admin"],
] as const;
export type StudioModule = (typeof STUDIO_MODULES)[number][0];
export type Perm = { view: boolean; manage: boolean };
export type StudioRole = { id: string; name: string; system: boolean; description: string; perms: Record<StudioModule, Perm> };
export type StudioUser = { id: string; crmUserId?: string; name: string; email: string; roleId: string; status: "Active" | "Invited"; createdAt: string };

const all = (v: boolean) => Object.fromEntries(STUDIO_MODULES.map(([k]) => [k, { view: v, manage: v }])) as Record<StudioModule, Perm>;
const p = (t: [boolean, boolean], c: [boolean, boolean], cm: [boolean, boolean], i: [boolean, boolean], a: [boolean, boolean]): Record<StudioModule, Perm> => ({
  templates: { view: t[0], manage: t[1] }, contacts: { view: c[0], manage: c[1] }, campaigns: { view: cm[0], manage: cm[1] }, integrations: { view: i[0], manage: i[1] }, admin: { view: a[0], manage: a[1] },
});

export const studioAccessStore = createStore<{ roles: StudioRole[]; users: StudioUser[] }>({
  roles: [
    { id: "role_admin", name: "Administrator", system: true, description: "Full access, including Studio users and roles.", perms: all(true) },
    { id: "role_mkt", name: "Marketer", system: false, description: "Builds and sends campaigns; manages contacts.", perms: p([true, true], [true, true], [true, true], [true, false], [false, false]) },
    { id: "role_view", name: "Viewer", system: false, description: "Read-only across Campaign Studio.", perms: p([true, false], [true, false], [true, false], [true, false], [false, false]) },
  ],
  users: [
    { id: "su_1", name: "Adeola Adesina", email: "adeola.adesina@cicod.com", roleId: "role_admin", status: "Active", createdAt: daysFromToday(-200) },
    { id: "su_2", name: "Tolu Animashaun", email: "tolu.animashaun@cicod.com", roleId: "role_mkt", status: "Active", createdAt: daysFromToday(-180) },
    { id: "su_3", name: "Kelechi Nnaji", email: "kelechi.nnaji@cicod.com", roleId: "role_view", status: "Active", createdAt: daysFromToday(-120) },
    { id: "su_4", name: "Ngozi Eze", email: "ngozi.eze@cicod.com", roleId: "role_mkt", status: "Invited", createdAt: daysFromToday(-3) },
  ],
});
export const useStudioAccess = () => useStore(studioAccessStore);

/* ---------------- Session (standalone only) ---------------- */

const SESSION_KEY = "cs2_session";
function readSession(): string | null { try { return localStorage.getItem(SESSION_KEY); } catch { return null; } }
/** The id of the signed-in Studio user, or null. */
export const sessionStore = createStore<string | null>(readSession());
export const useSessionUserId = () => useStore(sessionStore);

/** Sign in with a Studio user's email. Any password is accepted in this demo. Returns an error message, or null. */
export function signIn(email: string): string | null {
  const e = email.trim().toLowerCase();
  const u = studioAccessStore.get().users.find((x) => x.email.toLowerCase() === e);
  if (!u) return "There's no Campaign Studio account for this email. Ask a Studio administrator to invite you.";
  if (u.status === "Invited") studioAccessStore.set((s) => ({ ...s, users: s.users.map((x) => (x.id === u.id ? { ...x, status: "Active" } : x)) }));
  try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* storage blocked: session lasts until reload */ }
  setCurrentUser(u.name);
  sessionStore.set(u.id);
  return null;
}
export function signOut() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  sessionStore.set(null);
}
/** Keep CURRENT_USER in step with a session restored from a previous visit. */
export function restoreSessionUser() {
  const u = studioAccessStore.get().users.find((x) => x.id === sessionStore.get());
  if (u) setCurrentUser(u.name); else if (sessionStore.get()) signOut();
}

/* ---------------- Permissions ---------------- */

export function can(role: StudioRole | undefined, m: StudioModule, action: "view" | "manage" = "view") {
  const x = role?.perms[m];
  if (!x) return false;
  return action === "view" ? x.view || x.manage : x.manage;
}
/** The signed-in Studio user and what their role allows in a module. */
export function useStudioPermissions(m: StudioModule) {
  const { roles, users } = useStudioAccess();
  const sessionId = useSessionUserId();
  const me = users.find((u) => u.id === sessionId);
  const role = roles.find((r) => r.id === me?.roleId);
  return { me, role, canView: can(role, m, "view"), canManage: can(role, m, "manage") };
}
export const studioMe = () => studioAccessStore.get().users.find((u) => u.id === sessionStore.get()) ?? { name: "", email: "" };

/* ---------------- Users and roles ---------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let seq = 500;
const set = studioAccessStore.set;

export function inviteStudioUser(input: { name: string; email: string; roleId: string }): string | null {
  const e = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return "Enter a valid email address.";
  const { users } = studioAccessStore.get();
  if (users.some((u) => u.email.toLowerCase() === e)) return "A user with that email already exists.";
  set((s) => ({ ...s, users: [...s.users, { id: `su_${Date.now()}${++seq}`, name: input.name.trim() || e.split("@")[0], email: e, roleId: input.roleId, status: "Invited", createdAt: daysFromToday(0) }] }));
  return null;
}
export const setStudioUserRole = (id: string, roleId: string) => set((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, roleId } : u)) }));
export const removeStudioUser = (id: string) => set((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));

export function createStudioRole(input: { name: string; description: string }): string | null {
  const name = input.name.trim();
  if (!name) return "Role name is required.";
  if (studioAccessStore.get().roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) return "A role with that name already exists.";
  set((s) => ({ ...s, roles: [...s.roles, { id: `role_${Date.now()}${++seq}`, name, description: input.description.trim(), system: false, perms: all(false) }] }));
  return null;
}
/** Manage implies view; removing view removes manage. System roles can't change. */
export function setStudioPerm(roleId: string, m: StudioModule, action: "view" | "manage", value: boolean) {
  set((s) => ({ ...s, roles: s.roles.map((r) => {
    if (r.id !== roleId || r.system) return r;
    const x = { ...r.perms[m], [action]: value };
    if (action === "manage" && value) x.view = true;
    if (action === "view" && !value) x.manage = false;
    return { ...r, perms: { ...r.perms, [m]: x } };
  }) }));
}
export const removeStudioRole = (id: string) => set((s) => ({ ...s, roles: s.roles.filter((r) => r.id !== id) }));
