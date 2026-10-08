import { useState } from "react";
import {
  MODULES, can, roleById, createRole, updateRolePerm, updateRole, removeRole,
  inviteUser, setUserRole, removeUser, countUsersWithRole,
} from "./authStore";
import { DELIVERY_MODE, isProfileConfigured, canProfileSend, createProfile, updateProfile, updateProfileSection, markProfileVerified, setDefaultProfile, removeProfile, fromAddress } from "./settingsStore";

const GREEN = "#055F36";

export default function AdminModule({ auth, setAuth, currentUser, canManage, profiles, setProfiles, toast }) {
  const [tab, setTab] = useState("users");
  return (
    <div>
      <div style={{ display: "flex", gap: 2, padding: "0 16px", borderBottom: "0.5px solid #eee" }}>
        {[["users", "Users"], ["roles", "Roles & permissions"], ["email", "Email settings"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: tab === k ? GREEN : "#888", borderBottom: tab === k ? `2px solid ${GREEN}` : "2px solid transparent", fontWeight: tab === k ? 600 : 400, fontFamily: "inherit" }}>{lbl}</button>
        ))}
      </div>
      <div style={{ padding: "16px 18px" }}>
        {tab === "users" && <UsersTab auth={auth} setAuth={setAuth} currentUser={currentUser} canManage={canManage} />}
        {tab === "roles" && <RolesTab auth={auth} setAuth={setAuth} canManage={canManage} />}
        {tab === "email" && <EmailSettingsTab profiles={profiles} setProfiles={setProfiles} canManage={canManage} toast={toast} />}
      </div>
    </div>
  );
}

// ─── Users ───────────────────────────────────────────────────────────────────
function UsersTab({ auth, setAuth, currentUser, canManage }) {
  const { users, roles } = auth;
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div>
      {showInvite && <InviteModal roles={roles} onCancel={() => setShowInvite(false)}
        onInvite={(payload) => { const res = inviteUser(users, payload); if (res.error) { alert(res.error); return; } setAuth((a) => ({ ...a, users: res.users })); setShowInvite(false); }} />}
      <div style={note}>A user's <b>role</b> determines what they can see and do. Change a role and access updates immediately.</div>
      <div style={hd}>
        <span style={{ fontSize: 12, color: "#777" }}>{users.length} users</span>
        {canManage && <button style={btnPrimary} onClick={() => setShowInvite(true)}>+ Invite user</button>}
      </div>
      <table style={tbl}>
        <thead><tr>{["User", "Role", "Status", ""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={avatar}>{(u.name || "?")[0]}</div>
                <div><div>{u.name}{u.id === currentUser?.id && <span style={{ fontSize: 10, color: GREEN, marginLeft: 6 }}>you</span>}</div><div style={{ fontSize: 11, color: "#999" }}>{u.email}</div></div>
              </div></td>
              <td style={td}>
                {canManage
                  ? <select value={u.roleId} onChange={(e) => setAuth((a) => ({ ...a, users: setUserRole(a.users, u.id, e.target.value) }))} style={sel}>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  : (roleById(roles, u.roleId) || {}).name || "—"}
              </td>
              <td style={td}><span style={{ ...pill, ...(u.status === "Active" ? pillActive : pillInvited) }}>{u.status}</span></td>
              <td style={{ ...td, textAlign: "right" }}>
                {canManage && u.id !== currentUser?.id && <button style={btnGhostSm} onClick={() => { if (confirm(`Remove ${u.name}?`)) setAuth((a) => ({ ...a, users: removeUser(a.users, u.id) })); }}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InviteModal({ roles, onInvite, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id || "");
  return (
    <Modal title="Invite user" onCancel={onCancel}>
      <label style={fieldLbl}>Full name <span style={{ color: "#aaa", fontWeight: 400, textTransform: "none" }}>optional</span></label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" style={input} autoFocus />
      <label style={{ ...fieldLbl, marginTop: 12 }}>Email address</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@galaxybackbone.com.ng" style={input} />
      <label style={{ ...fieldLbl, marginTop: 12 }}>Role</label>
      <select value={roleId} onChange={(e) => setRoleId(e.target.value)} style={input}>
        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
        <button style={btnSm} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnSm, ...btnSmPrimary }} onClick={() => onInvite({ name, email, roleId })}>Send invite</button>
      </div>
    </Modal>
  );
}

// ─── Roles & permissions ─────────────────────────────────────────────────────
function RolesTab({ auth, setAuth, canManage }) {
  const { roles, users } = auth;
  const [showNew, setShowNew] = useState(false);

  const togglePerm = (roleId, mod, action, value) =>
    setAuth((a) => ({ ...a, roles: updateRolePerm(a.roles, roleId, mod, action, value) }));

  return (
    <div>
      {showNew && <NewRoleModal onCancel={() => setShowNew(false)}
        onCreate={({ name, description }) => { const res = createRole(roles, { name, description }); if (res.error) { alert(res.error); return; } setAuth((a) => ({ ...a, roles: res.roles })); setShowNew(false); }} />}
      <div style={note}>Toggle permissions per module. <b>View</b> shows the module; <b>Manage</b> allows create / edit / delete. {!canManage && <i>You don't have permission to edit roles.</i>}</div>
      <div style={hd}>
        <span style={{ fontSize: 12, color: "#777" }}>{roles.length} roles</span>
        {canManage && <button style={btnPrimary} onClick={() => setShowNew(true)}>+ New role</button>}
      </div>
      {roles.map((r) => {
        const locked = r.system || !canManage;
        const userCount = countUsersWithRole(users, r.id);
        return (
          <div key={r.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
              {r.system && <span style={tag}>system</span>}
              <span style={{ fontSize: 11, color: "#aaa" }}>{userCount} user{userCount === 1 ? "" : "s"}</span>
              {canManage && !r.system && userCount === 0 && (
                <button style={{ ...btnGhostSm, marginLeft: "auto" }} onClick={() => setAuth((a) => ({ ...a, roles: removeRole(a.roles, r.id) }))}>Delete</button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>{r.description}</div>
            <table style={matrix}>
              <thead><tr><th style={{ ...mth, textAlign: "left" }}>Module</th><th style={mth}>View</th><th style={mth}>Manage</th></tr></thead>
              <tbody>
                {MODULES.map(([k, lbl]) => (
                  <tr key={k}>
                    <td style={{ ...mtd, textAlign: "left", fontSize: 12.5 }}>{lbl}</td>
                    <td style={mtd}><input type="checkbox" disabled={locked} checked={can(r, k, "view")} onChange={(e) => togglePerm(r.id, k, "view", e.target.checked)} style={chk} /></td>
                    <td style={mtd}><input type="checkbox" disabled={locked} checked={can(r, k, "manage")} onChange={(e) => togglePerm(r.id, k, "manage", e.target.checked)} style={chk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={preview}>
              <div style={{ fontSize: 10, fontWeight: 600, color: GREEN, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>A {r.name} sees</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {MODULES.map(([k, lbl]) => {
                  const v = can(r, k, "view"), m = can(r, k, "manage");
                  return <span key={k} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, background: "#fff", border: "0.5px solid #e4e4e4", color: "#222", opacity: v ? 1 : 0.32, textDecoration: v ? "none" : "line-through" }}>{lbl}{v && !m ? " (read-only)" : ""}</span>;
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewRoleModal({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <Modal title="New role" onCancel={onCancel}>
      <label style={fieldLbl}>Role name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Campaign Ops" style={input} autoFocus />
      <label style={{ ...fieldLbl, marginTop: 12 }}>Description</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" style={input} />
      <p style={{ fontSize: 11, color: "#999", marginTop: 10, lineHeight: 1.5 }}>The role starts with no permissions — set them in the matrix after creating.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
        <button style={btnSm} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnSm, ...btnSmPrimary, opacity: name.trim() ? 1 : 0.45 }} disabled={!name.trim()} onClick={() => onCreate({ name, description })}>Create role</button>
      </div>
    </Modal>
  );
}

// ─── Email settings — multiple delivery profiles ─────────────────────────────
function EmailSettingsTab({ profiles, setProfiles, canManage, toast }) {
  const [editing, setEditing] = useState(null); // profile id being edited, or "new"
  const [showNew, setShowNew] = useState(false);

  if (editing) {
    const profile = editing === "new" ? null : profiles.find((p) => p.id === editing);
    return <ProfileEditor profile={profile} canManage={canManage} toast={toast}
      onBack={() => setEditing(null)}
      setProfiles={setProfiles} />;
  }

  return (
    <div>
      {showNew && <NewProfileModal profiles={profiles} onCancel={() => setShowNew(false)}
        onCreate={({ name, mode }) => { const res = createProfile(profiles, { name, mode }); if (res.error) { alert(res.error); return; } setProfiles(res.list); setShowNew(false); setEditing(res.profile.id); }} />}
      <div style={note}>Delivery profiles let you send through different senders for different scenarios. Test Send and Campaign Run pick a profile (or use the default). A profile must be verified before it can send.</div>
      <div style={hd}>
        <span style={{ fontSize: 12, color: "#777" }}>{profiles.length} profile{profiles.length === 1 ? "" : "s"}</span>
        {canManage && <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Add profile</button>}
      </div>
      {profiles.map((p) => {
        const ready = canProfileSend(p);
        return (
          <div key={p.id} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
              {p.isDefault && <span style={{ ...tag, background: "#E6F1FB", color: "#0C447C" }}>default</span>}
              <span style={{ ...pill, ...(ready ? pillActive : pillInvited), marginLeft: "auto" }}>{ready ? "Verified" : isProfileConfigured(p) ? "Not verified" : "Incomplete"}</span>
            </div>
            <div style={{ fontSize: 12, color: "#777" }}>{p.mode} · from {fromAddress(p)}</div>
            {canManage && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button style={btnSm} onClick={() => setEditing(p.id)}>Configure</button>
                {!p.isDefault && <button style={btnSm} onClick={() => setProfiles(setDefaultProfile(profiles, p.id))}>Set as default</button>}
                {profiles.length > 1 && <button style={{ ...btnGhostSm, marginLeft: "auto" }} onClick={() => { if (confirm(`Remove “${p.name}”?`)) setProfiles(removeProfile(profiles, p.id)); }}>Remove</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewProfileModal({ profiles, onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState(DELIVERY_MODE.SENDGRID);
  return (
    <Modal title="Add delivery profile" onCancel={onCancel}>
      <label style={fieldLbl}>Profile name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bulk Marketing (SMTP)" style={input} autoFocus />
      <label style={{ ...fieldLbl, marginTop: 12 }}>Delivery method</label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {Object.values(DELIVERY_MODE).map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${mode === m ? GREEN : "#ddd"}`, background: mode === m ? "#f0f9f5" : "#fff", color: mode === m ? GREEN : "#666", fontWeight: mode === m ? 600 : 400, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{m}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
        <button style={btnSm} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnSm, ...btnSmPrimary, opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()} onClick={() => onCreate({ name, mode })}>Create &amp; configure</button>
      </div>
    </Modal>
  );
}

function ProfileEditor({ profile, setProfiles, canManage, toast, onBack }) {
  if (!profile) { onBack(); return null; }
  const lock = !canManage;
  const isSG = profile.mode === DELIVERY_MODE.SENDGRID;
  const configured = isProfileConfigured(profile);
  const setSection = (section, patch) => setProfiles((list) => updateProfileSection(list, profile.id, section, patch));
  const setMode = (mode) => setProfiles((list) => updateProfile(list, profile.id, { mode }));
  const testConnection = () => {
    if (!configured) { toast && toast("Fill in the required fields first.", "error"); return; }
    setProfiles((list) => markProfileVerified(list, profile.id));
    toast && toast(`“${profile.name}” verified — ready to send.`);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <button style={btnSm} onClick={onBack}>← All profiles</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{profile.name}</span>
        <span style={{ ...pill, ...(canProfileSend(profile) ? pillActive : pillInvited) }}>{canProfileSend(profile) ? "Verified" : "Not verified"}</span>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={fieldLbl}>Delivery method</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {Object.values(DELIVERY_MODE).map((m) => (
            <button key={m} disabled={lock} onClick={() => setMode(m)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${profile.mode === m ? GREEN : "#ddd"}`, background: profile.mode === m ? "#f0f9f5" : "#fff", color: profile.mode === m ? GREEN : "#666", fontWeight: profile.mode === m ? 600 : 400, fontSize: 13, cursor: lock ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{m}</button>
          ))}
        </div>
      </div>

      {isSG ? (
        <div style={card}>
          <Field2 label="SendGrid API key" mono><input type="password" value={profile.sendgrid.apiKey} disabled={lock} placeholder="SG.xxxxxxxx" onChange={(e) => setSection("sendgrid", { apiKey: e.target.value })} style={input} /></Field2>
          <Field2 label="From email"><input value={profile.sendgrid.fromEmail} disabled={lock} onChange={(e) => setSection("sendgrid", { fromEmail: e.target.value })} style={input} /></Field2>
          <Field2 label="From name"><input value={profile.sendgrid.fromName} disabled={lock} onChange={(e) => setSection("sendgrid", { fromName: e.target.value })} style={input} /></Field2>
        </div>
      ) : (
        <div style={card}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 2 }}><Field2 label="SMTP host"><input value={profile.smtp.host} disabled={lock} placeholder="smtp.galaxybackbone.com.ng" onChange={(e) => setSection("smtp", { host: e.target.value })} style={input} /></Field2></div>
            <div style={{ flex: 1 }}><Field2 label="Port"><input type="number" value={profile.smtp.port} disabled={lock} onChange={(e) => setSection("smtp", { port: parseInt(e.target.value) || 0 })} style={input} /></Field2></div>
          </div>
          <Field2 label="Username"><input value={profile.smtp.username} disabled={lock} onChange={(e) => setSection("smtp", { username: e.target.value })} style={input} /></Field2>
          <Field2 label="Password" mono><input type="password" value={profile.smtp.password} disabled={lock} onChange={(e) => setSection("smtp", { password: e.target.value })} style={input} /></Field2>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field2 label="From email"><input value={profile.smtp.fromEmail} disabled={lock} onChange={(e) => setSection("smtp", { fromEmail: e.target.value })} style={input} /></Field2></div>
            <div style={{ flex: 1 }}><Field2 label="From name"><input value={profile.smtp.fromName} disabled={lock} onChange={(e) => setSection("smtp", { fromName: e.target.value })} style={input} /></Field2></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#555", marginTop: 4 }}>
            <input type="checkbox" checked={profile.smtp.secure} disabled={lock} onChange={(e) => setSection("smtp", { secure: e.target.checked })} style={{ accentColor: GREEN }} /> Use TLS/SSL
          </label>
        </div>
      )}

      {canManage && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <button onClick={testConnection} style={{ ...btnPrimary, opacity: configured ? 1 : 0.5, cursor: configured ? "pointer" : "not-allowed" }}>Test &amp; verify connection</button>
          {profile.verified && <span style={{ fontSize: 12, color: "#0F6E56" }}>✓ Verified {profile.lastVerifiedAt ? "on " + new Date(profile.lastVerifiedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>}
        </div>
      )}
    </div>
  );
}
function Field2({ label, mono, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", fontFamily: mono ? "monospace" : "inherit" }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onCancel}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 420, boxShadow: "0 8px 30px rgba(0,0,0,.2)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const note = { fontSize: 11, color: "#0C447C", background: "#E6F1FB", borderRadius: 8, padding: "9px 11px", lineHeight: 1.6, marginBottom: 14 };
const hd = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 };
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 12.5 };
const th = { textAlign: "left", padding: "9px 11px", fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "0.5px solid #eee", background: "#fafafa" };
const td = { padding: "10px 11px", borderBottom: "0.5px solid #eee", color: "#222", verticalAlign: "middle" };
const avatar = { width: 28, height: 28, borderRadius: "50%", background: "#f0f9f5", border: "0.5px solid #c5e8d8", color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, textTransform: "uppercase" };
const sel = { fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "0.5px solid #ddd", background: "#fafafa", fontFamily: "inherit", color: "#222" };
const pill = { fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 10 };
const pillActive = { background: "#E1F5EE", color: "#0F6E56" };
const pillInvited = { background: "#FAEEDA", color: "#854F0B" };
const card = { border: "0.5px solid #eee", borderRadius: 10, padding: 13, marginBottom: 10 };
const tag = { fontSize: 10, color: "#777", background: "#f0f0ee", padding: "1px 7px", borderRadius: 8 };
const matrix = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const mth = { textAlign: "center", padding: "7px 4px", fontSize: 10, fontWeight: 600, color: "#999", borderBottom: "0.5px solid #eee" };
const mtd = { padding: "7px 4px", textAlign: "center", borderBottom: "0.5px solid #f2f2f2", color: "#222" };
const chk = { accentColor: GREEN, width: 15, height: 15, cursor: "pointer" };
const preview = { marginTop: 8, border: "0.5px dashed #2cb173", borderRadius: 8, padding: "11px 13px", background: "#f0f9f5" };
const btnPrimary = { padding: "7px 13px", borderRadius: 8, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#222" };
const btnSmPrimary = { background: GREEN, color: "#fff", borderColor: GREEN };
const btnGhostSm = { padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#A32D2D" };
const input = { width: "100%", padding: "9px 11px", borderRadius: 7, border: "0.5px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fafafa", color: "#222" };
const fieldLbl = { display: "block", fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" };
