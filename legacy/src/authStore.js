// authStore.js
// ─────────────────────────────────────────────────────────────────────────────
// Roles, permissions, and users (RBAC).
//
// Model:
//   • A permission is (module, action) where action ∈ {view, manage}.
//       - view   = can see the module
//       - manage = can create / edit / delete inside it (implies view)
//   • A role is a named set of permissions. System roles (Administrator) are locked.
//   • A user has exactly one role. The current user's role gates the whole UI.
//
// Enforcement (App.jsx): nav only shows modules the role can `view`; inside a
// module, `canManage` toggles whether create/edit/delete controls render.
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 500;
const nextId = (p) => `${p}_${++_seq}`;
const now = () => new Date().toISOString();

// Modules that can be gated. `admin` covers this Roles & Users area.
export const MODULES = [
  ["templates", "Templates"],
  ["contacts", "Contacts"],
  ["campaigns", "Campaigns"],
  ["integrations", "Integrations"],
  ["admin", "Admin"],
];

export const ACTIONS = ["view", "manage"];

const allPerms = (v) => MODULES.reduce((o, [k]) => { o[k] = { view: v, manage: v }; return o; }, {});
const noPerms = () => allPerms(false);

export function createInitialAuth() {
  const roles = [
    { id: "role_admin", name: "Administrator", system: true, description: "Full access including user management.", perms: allPerms(true) },
    { id: "role_mkt", name: "Marketer", system: false, description: "Build and send campaigns; manage contacts.", perms: {
      templates: { view: true, manage: true }, contacts: { view: true, manage: true },
      campaigns: { view: true, manage: true }, integrations: { view: true, manage: false }, admin: { view: false, manage: false } } },
    { id: "role_view", name: "Viewer", system: false, description: "Read-only across the workspace.", perms: {
      templates: { view: true, manage: false }, contacts: { view: true, manage: false },
      campaigns: { view: true, manage: false }, integrations: { view: true, manage: false }, admin: { view: false, manage: false } } },
  ];
  const users = [
    { id: "usr_1", name: "Ada Obi", email: "ada@galaxybackbone.com.ng", roleId: "role_admin", status: "Active", createdAt: now() },
    { id: "usr_2", name: "Bola Ade", email: "bola@galaxybackbone.com.ng", roleId: "role_mkt", status: "Active", createdAt: now() },
    { id: "usr_3", name: "Chidi Eze", email: "chidi@galaxybackbone.com.ng", roleId: "role_view", status: "Active", createdAt: now() },
    { id: "usr_4", name: "Ngozi Udo", email: "ngozi@galaxybackbone.com.ng", roleId: "role_mkt", status: "Invited", createdAt: now() },
  ];
  return { roles, users };
}

// ─── Permission helpers ──────────────────────────────────────────────────────
export function roleById(roles, id) { return roles.find((r) => r.id === id) || null; }

// can(role, module, action) — manage implies view.
export function can(role, module, action = "view") {
  if (!role || !role.perms || !role.perms[module]) return false;
  const p = role.perms[module];
  if (action === "view") return !!(p.view || p.manage);
  return !!p.manage;
}

// Convenience for the current user.
export function userRole(roles, user) {
  if (!user) return null;
  return roleById(roles, user.roleId);
}

// Modules a role may view, in nav order.
export function visibleModules(role) {
  return MODULES.filter(([k]) => can(role, k, "view"));
}

// ─── Role CRUD ───────────────────────────────────────────────────────────────
export function createRole(roles, { name, description = "" }) {
  if (!name || !name.trim()) return { error: "Role name is required." };
  if (roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) return { error: "A role with that name already exists." };
  const role = { id: nextId("role"), name: name.trim(), description: description.trim(), system: false, perms: noPerms() };
  return { roles: [...roles, role], role };
}

export function updateRolePerm(roles, roleId, module, action, value) {
  return roles.map((r) => {
    if (r.id !== roleId || r.system) return r;
    const mod = { ...r.perms[module], [action]: value };
    // manage implies view; removing view removes manage
    if (action === "manage" && value) mod.view = true;
    if (action === "view" && !value) mod.manage = false;
    return { ...r, perms: { ...r.perms, [module]: mod } };
  });
}

export function updateRole(roles, roleId, patch) {
  return roles.map((r) => (r.id === roleId ? { ...r, ...patch } : r));
}

export function removeRole(roles, roleId) {
  return roles.filter((r) => r.id !== roleId);
}

// ─── User CRUD ───────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function inviteUser(users, { name, email, roleId }) {
  const e = (email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { error: "Enter a valid email address." };
  if (users.some((u) => u.email.toLowerCase() === e)) return { error: "A user with that email already exists." };
  const user = { id: nextId("usr"), name: (name || "").trim() || e.split("@")[0], email: e, roleId, status: "Invited", createdAt: now() };
  return { users: [...users, user], user };
}

export function setUserRole(users, userId, roleId) {
  return users.map((u) => (u.id === userId ? { ...u, roleId } : u));
}

export function removeUser(users, userId) {
  return users.filter((u) => u.id !== userId);
}

export const countUsersWithRole = (users, roleId) => users.filter((u) => u.roleId === roleId).length;
