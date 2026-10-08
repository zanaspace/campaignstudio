import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import TemplateBuilder1Gov from "./TemplateBuilder1Gov";
import CampaignModule from "./CampaignModule";
import ContactModule from "./ContactModule";
import IntegrationModule from "./IntegrationModule";
import AdminModule from "./AdminModule";
import Login from "./Login";
import TemplateEditorPage from "./TemplateEditorPage";
import { DataProvider, useData } from "./DataContext";
import { useLocalState } from "./hooks/useLocalState";
import { createInitialAuth, visibleModules, can, MODULES } from "./authStore";
import { sendableProfiles } from "./settingsStore";
import { THEMES, THEME_CATEGORIES, instantiateTheme, themeById } from "./themes";
import {
  STATUS, TEMPLATE_TYPES,
  currentVersion, currentVersionNumber, campaignCount,
  createTemplate, updateDraft, startNewVersionFromCurrent,
  publishDraft, duplicateVersionToDraft, setArchived, diffVersions,
} from "./templateStore";
import { useState, useMemo, useCallback } from "react";

const GREEN = "#055F36";
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const TYPE_COLORS = {
  Transactional: { bg: "#E6F1FB", fg: "#0C447C" },
  Marketing:     { bg: "#EEEDFE", fg: "#3C3489" },
  System:        { bg: "#F1EFE8", fg: "#444441" },
};
const STATUS_COLORS = {
  [STATUS.PUBLISHED]: { bg: "#E1F5EE", fg: "#0F6E56" },
  [STATUS.DRAFT]:     { bg: "#FAEEDA", fg: "#854F0B" },
  [STATUS.ARCHIVED]:  { bg: "#F1EFE8", fg: "#5F5E5A" },
};

function Pill({ text, colors }) {
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 11, fontSize: 11, fontWeight: 500, background: colors.bg, color: colors.fg, whiteSpace: "nowrap" }}>{text}</span>;
}

// ─── Library list view ────────────────────────────────────────────────────────
function Library({ templates, onOpen, onCompare, onNew }) {
  return (
    <div>
      <div style={hdr}>
        <div style={title}><span style={{ color: GREEN }}>▤</span> Template library</div>
        {onNew && <button style={btnPrimary} onClick={onNew}>+ New template</button>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{["Template name", "Type", "Current version", "Last updated", "Used in", "Status", ""].map((h, i) =>
            <th key={i} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const cv = currentVersionNumber(t);
            const camps = campaignCount(t);
            const statusKey = t.status;
            return (
              <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => onOpen(t.id)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{cv ? currentVersion(t).subject : (t.draft?.subject || "")}</div>
                </td>
                <td style={td}><Pill text={t.type} colors={TYPE_COLORS[t.type]} /></td>
                <td style={td}>{cv ? <span style={verTag}>v{cv}</span> : <span style={{ color: "#bbb", fontSize: 12 }}>— draft —</span>}</td>
                <td style={td}><span style={{ color: "#999", fontSize: 12 }}>{fmt(t.updatedAt)}</span></td>
                <td style={td}><span style={{ color: "#666", fontSize: 12 }}>✉ {camps} {camps === 1 ? "campaign" : "campaigns"}</span></td>
                <td style={td}><Pill text={t.status} colors={STATUS_COLORS[statusKey]} /></td>
                <td style={td} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={iconBtn} title="Version history" onClick={() => onOpen(t.id)}>⟲</button>
                    {t.versions.length >= 2 && <button style={iconBtn} title="Compare" onClick={() => onCompare(t.id)}>⇄</button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Version history ──────────────────────────────────────────────────────────
function VersionHistory({ template, onBack, onCompare, onPublish, onEditDraft, onDuplicate, onArchive }) {
  const t = template;
  const cvNum = currentVersionNumber(t);
  return (
    <div>
      <div style={hdr}>
        <div style={title}><span style={{ color: GREEN }}>▤</span> Version history</div>
        {t.status !== STATUS.ARCHIVED &&
          <button style={btnPrimary} onClick={() => onEditDraft(t.id)}>Edit → new version</button>}
      </div>
      <div style={{ padding: 18, borderBottom: "0.5px solid #eee" }}>
        <div style={backLink} onClick={onBack}>← Template library</div>
        <div style={{ fontSize: 18, fontWeight: 500, margin: "8px 0 8px" }}>{t.name}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Pill text={t.type} colors={TYPE_COLORS[t.type]} />
          <Pill text={t.status} colors={STATUS_COLORS[t.status]} />
          <span style={{ color: "#999", fontSize: 12 }}>{campaignCount(t)} campaigns · {t.versions.length} version{t.versions.length === 1 ? "" : "s"}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {t.versions.length >= 2 && <button style={btnSm} onClick={() => onCompare(t.id)}>⇄ Compare</button>}
            <button style={btnSm} onClick={() => onArchive(t.id, t.status !== STATUS.ARCHIVED)}>
              {t.status === STATUS.ARCHIVED ? "Unarchive" : "Archive"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 18px", background: "#E6F1FB", borderBottom: "0.5px solid #b5d4f4", fontSize: 12, color: "#0C447C" }}>
        🔒 Published versions are immutable. Editing creates a new version — past campaigns keep rendering the version they ran on.
      </div>

      <div style={{ padding: "8px 0" }}>
        {t.draft && (
          <div style={verItem}>
            <div style={{ ...verDot, background: "#FAEEDA", borderColor: "#f0d9a8", color: "#854F0B" }}>✎</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.draft.subject || "(untitled draft)"}</span>
                <Pill text="Draft" colors={STATUS_COLORS[STATUS.DRAFT]} />
              </div>
              <div style={verSub}>{t.draft.blocks.length} blocks · editable working copy · {t.draft.note}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={btnSm} onClick={() => onEditDraft(t.id)}>Edit</button>
              <button style={{ ...btnSm, ...btnSmPrimary }} onClick={() => onPublish(t.id)}>Publish v{(cvNum || 0) + 1}</button>
            </div>
          </div>
        )}
        {[...t.versions].reverse().map((v, idx) => {
          const isCurrent = idx === 0;
          return (
            <div key={v.v} style={verItem}>
              <div style={{ ...verDot, ...(isCurrent ? { background: GREEN, color: "#fff", borderColor: GREEN } : {}) }}>v{v.v}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v.subject}</span>
                  {isCurrent && <Pill text="Current" colors={STATUS_COLORS[STATUS.PUBLISHED]} />}
                  <span style={{ fontSize: 10, color: "#5F5E5A" }}>🔒 immutable</span>
                </div>
                <div style={verSub}>
                  Published {fmt(v.publishedAt)} · {v.blocks.length} blocks
                  {v.usedIn.length ? ` · used in: ${v.usedIn.join(", ")}` : " · not yet used"}
                  {v.note ? ` · ${v.note}` : ""}
                </div>
              </div>
              {t.status !== STATUS.ARCHIVED &&
                <button style={btnSm} onClick={() => onDuplicate(t.id, v.v)}>Duplicate</button>}
            </div>
          );
        })}
        {t.versions.length === 0 && !t.draft && <div style={{ padding: 40, textAlign: "center", color: "#bbb" }}>No versions yet.</div>}
      </div>
    </div>
  );
}

// ─── Version compare ──────────────────────────────────────────────────────────
function Compare({ template, onBack }) {
  const t = template;
  const nums = t.versions.map((v) => v.v);
  const [a, setA] = useState(nums[nums.length - 2]);
  const [b, setB] = useState(nums[nums.length - 1]);
  const d = diffVersions(t, a, b);
  if (!d) return null;
  const cvNum = currentVersionNumber(t);

  const Col = ({ v }) => (
    <div style={{ borderRight: "0.5px solid #eee" }}>
      <div style={{ padding: "10px 16px", background: "#fafafa", borderBottom: "0.5px solid #eee", display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 500 }}>
        <span><span style={verTag}>v{v.v}</span> {v.v === cvNum ? "current" : "older"}</span><span>🔒</span>
      </div>
      <Field label="Subject" changed={d.subjectChanged}>{v.subject}</Field>
      <Field label="Blocks" changed={d.blocksChanged}>{v.blocks.length} blocks</Field>
      <Field label="Published">{fmt(v.publishedAt)}</Field>
      <Field label="Used in">{v.usedIn.length ? v.usedIn.join(", ") : <span style={{ color: "#bbb" }}>not yet used</span>}</Field>
      <Field label="Change note">{v.note || <span style={{ color: "#bbb" }}>—</span>}</Field>
    </div>
  );

  return (
    <div>
      <div style={hdr}><div style={title}><span style={{ color: GREEN }}>▤</span> Compare versions</div></div>
      <div style={{ padding: "12px 18px" }}>
        <div style={backLink} onClick={onBack}>← {t.name}</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 18px", background: "#fafafa", borderBottom: "0.5px solid #eee", borderTop: "0.5px solid #eee", fontSize: 12 }}>
        <span>Comparing</span>
        <select value={`v${a}`} onChange={(e) => setA(parseInt(e.target.value.slice(1)))} style={sel}>{nums.map((n) => <option key={n}>v{n}</option>)}</select>
        →
        <select value={`v${b}`} onChange={(e) => setB(parseInt(e.target.value.slice(1)))} style={sel}>{nums.map((n) => <option key={n}>v{n}</option>)}</select>
        <span style={{ marginLeft: "auto", color: "#999" }}>{d.subjectChanged || d.blocksChanged ? "Differences highlighted" : "No structural differences"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <Col v={d.va} /><Col v={d.vb} />
      </div>
    </div>
  );
}

function Field({ label, changed, children }) {
  return (
    <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #eee", fontSize: 12, background: changed ? "#FAEEDA" : "transparent" }}>
      <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 3 }}>{label}</div>
      <div style={{ color: "#222", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ─── New template modal ───────────────────────────────────────────────────────
function NewTemplateModal({ onCreate, onCancel }) {
  const [step, setStep] = useState("theme");
  const [themeId, setThemeId] = useState("blank");
  const [name, setName] = useState("");
  const [type, setType] = useState("Marketing");

  const grouped = THEMES.reduce((acc, t) => {
    const key = t.category || "blank";
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});
  const order = ["blank", "seasonal", "notification", "announcement"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: step === "theme" ? 620 : 380, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
        {step === "theme" ? (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Start from a theme</h3>
            <p style={{ fontSize: 12.5, color: "#777", marginBottom: 16 }}>Pick a starting point — you can edit everything afterwards.</p>
            {order.filter((k) => grouped[k]).map((k) => (
              <div key={k} style={{ marginBottom: 16 }}>
                {k !== "blank" && <div style={{ fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{THEME_CATEGORIES[k]}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {grouped[k].map((t) => {
                    const on = themeId === t.id;
                    return (
                      <div key={t.id} onClick={() => setThemeId(t.id)} style={{ border: `${on ? 2 : 0.5}px solid ${on ? GREEN : "#e4e4e4"}`, borderRadius: 10, padding: 12, cursor: "pointer", background: on ? "#f0f9f5" : "#fff", display: "flex", gap: 11, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#10301F" }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2, lineHeight: 1.5 }}>{t.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
              <button style={btnSm} onClick={onCancel}>Cancel</button>
              <button style={{ ...btnSm, ...btnSmPrimary }} onClick={() => { const t = themeById(themeId); if (t && !name) setName(t.id === "blank" ? "" : t.name); setStep("details"); }}>Next →</button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Name your template</h3>
            <p style={{ fontSize: 12.5, color: "#777", marginBottom: 16 }}>Based on <b style={{ color: GREEN }}>{themeById(themeId).name}</b>.</p>
            <label style={fieldLbl}>Template name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Feature Launch" style={inp} autoFocus />
            <label style={{ ...fieldLbl, marginTop: 14 }}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inp}>{TEMPLATE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "space-between" }}>
              <button style={btnSm} onClick={() => setStep("theme")}>← Back</button>
              <button style={{ ...btnSm, ...btnSmPrimary, opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), type, themeId })}>Create draft</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Template module ──────────────────────────────────────────────────────────
function TemplateModule({ canManage = true, toast, sendProfiles = [], onGoToSettings }) {
  const { templates, setTemplates } = useData();
  const navigate = useNavigate();
  const [view, setView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const active = useMemo(() => templates.find((t) => t.id === activeId) || null, [templates, activeId]);

  const open = (id) => { setActiveId(id); setView("history"); };
  const compare = (id) => { setActiveId(id); setView("compare"); };
  const back = () => setView("library");

  // Navigate to full-screen editor
  const editDraft = (id) => {
    setTemplates((l) => startNewVersionFromCurrent(l, id));
    navigate(`/app/templates/${id}/edit`);
  };

  return (
    <div style={{ fontFamily: "Poppins, system-ui, sans-serif" }}>
      {showNew && (
        <NewTemplateModal
          onCancel={() => setShowNew(false)}
          onCreate={({ name, type, themeId }) => {
            const seed = instantiateTheme(themeId);
            const next = createTemplate(templates, { name, type, subject: seed.subject, blocks: seed.blocks, global: seed.global });
            setTemplates(next);
            setShowNew(false);
            const created = next[next.length - 1];
            navigate(`/app/templates/${created.id}/edit`);
            toast && toast(`"${name}" created — start editing.`);
          }}
        />
      )}
      {!showNew && view === "library" &&
        <Library templates={templates} onOpen={open} onCompare={compare} onNew={canManage ? () => setShowNew(true) : null} />}
      {!showNew && view === "history" && active &&
        <VersionHistory
          template={active} onBack={back} onCompare={compare}
          onPublish={(id) => { setTemplates((l) => publishDraft(l, id)); toast && toast("New version published."); }}
          onEditDraft={editDraft}
          onDuplicate={(id, v) => setTemplates((l) => duplicateVersionToDraft(l, id, v))}
          onArchive={(id, arch) => setTemplates((l) => setArchived(l, id, arch))}
        />}
      {!showNew && view === "compare" && active &&
        <Compare template={active} onBack={() => open(active.id)} />}
    </div>
  );
}

// ─── Sidebar icons ────────────────────────────────────────────────────────────
const SIDEBAR_BG = "#055F36";
const PAGE_BG = "#EDF1EF";
const NAV_ICONS = {
  templates: "M4 4h16v4H4zM4 11h7v9H4zM14 11h6v9h-6z",
  contacts: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 10-2-5.2M21 20a6 6 0 00-4-5.6",
  campaigns: "M3 11l18-8-8 18-2-7-8-3z",
  integrations: "M10 7V3M14 7V3M8 7h8v4a4 4 0 01-8 0V7zM12 15v6",
  admin: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
};
function NavIcon({ name }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={NAV_ICONS[name] || ""} />
    </svg>
  );
}

// ─── Toast stack ─────────────────────────────────────────────────────────────
function ToastStack() {
  const { toasts } = useData();
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 90 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", borderLeft: `3px solid ${t.kind === "error" ? "#A32D2D" : t.kind === "info" ? "#185FA5" : "#0F6E56"}`, boxShadow: "0 4px 16px rgba(0,0,0,.14)", borderRadius: 8, padding: "11px 14px", minWidth: 240, maxWidth: 360, fontSize: 13, color: "#222" }}>
          <span style={{ fontSize: 15 }}>{t.kind === "error" ? "⚠" : t.kind === "info" ? "ℹ" : "✓"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── App shell (authenticated) ────────────────────────────────────────────────
function AppShell({ user, onSignOut }) {
  const navigate = useNavigate();
  const { module: moduleParam } = useParams();
  const { auth, campaigns, setCampaigns, contactData, setContactData, integrations, setIntegrations, profiles, setProfiles, setAuth, templates, setTemplates, toast } = useData();

  const MODULE_LABELS = Object.fromEntries(MODULES);
  const role = auth.roles.find((r) => r.id === user.roleId) || auth.roles[0];
  const allowed = visibleModules(role).map(([k]) => k);
  const current = allowed.includes(moduleParam) ? moduleParam : (allowed[0] || "templates");
  const canManage = (m) => can(role, m, "manage");

  // Keep URL in sync if the role doesn't allow current module
  useEffect(() => {
    if (moduleParam && !allowed.includes(moduleParam)) {
      navigate(`/app/${allowed[0] || "templates"}`, { replace: true });
    }
  }, [moduleParam, allowed.join(",")]); // eslint-disable-line

  const goTo = (m) => navigate(`/app/${m}`);

  return (
    <div style={{ fontFamily: "Poppins, system-ui, sans-serif", minHeight: "100vh", width: "100%", background: PAGE_BG, display: "flex" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        .cs-nav-item:hover { background: rgba(255,255,255,.10); color: #fff; }
        @media (max-width: 760px) {
          .cs-side { width: 60px !important; }
          .cs-side-label, .cs-side-brandsub, .cs-side-user-text { display: none !important; }
          .cs-side-brand-main { font-size: 0 !important; }
        }
      `}</style>

      <aside className="cs-side" style={{ width: 196, flexShrink: 0, background: SIDEBAR_BG, display: "flex", flexDirection: "column", padding: "16px 12px", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh" }}>
        <div style={{ color: "#fff", padding: "4px 10px 14px", borderBottom: "1px solid rgba(255,255,255,.16)", marginBottom: 10 }}>
          <div className="cs-side-brand-main" style={{ fontSize: 14, fontWeight: 600 }}>Campaign Studio</div>
          <div className="cs-side-brandsub" style={{ fontSize: 9, color: "#A8D8C3", marginTop: 2 }}>1Government Cloud</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {allowed.map((m) => {
            const on = current === m;
            return (
              <button key={m} className="cs-nav-item" onClick={() => goTo(m)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textAlign: "left",
                  background: on ? "rgba(255,255,255,.14)" : "transparent", color: on ? "#fff" : "#CDE8DC", fontWeight: on ? 600 : 400 }}>
                <NavIcon name={m} /><span className="cs-side-label">{MODULE_LABELS[m]}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.16)", paddingTop: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.16)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, textTransform: "uppercase", flexShrink: 0 }}>{(user.name || "?")[0]}</div>
          <div className="cs-side-user-text" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: "#A8D8C3" }}>{role ? role.name : "—"}</div>
          </div>
          <button onClick={onSignOut} aria-label="Sign out" title="Sign out"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,.22)", borderRadius: 7, color: "#CDE8DC", cursor: "pointer", padding: "5px 7px", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "18px clamp(12px,2vw,24px)", overflowX: "hidden" }}>
        <div style={{ background: "#fff", border: "0.5px solid #e6e8e6", borderRadius: 14, boxShadow: "0 1px 3px rgba(5,40,25,.06), 0 1px 2px rgba(5,40,25,.04)", overflow: "hidden", minHeight: "calc(100vh - 36px)" }}>
          {current === "templates" && <TemplateModule canManage={canManage("templates")} toast={toast} sendProfiles={sendableProfiles(profiles)} onGoToSettings={canManage("admin") ? () => goTo("admin") : null} />}
          {current === "contacts" && <ContactModule contactData={contactData} setContactData={setContactData} integrations={integrations} onGoToIntegrations={() => goTo("integrations")} canManage={canManage("contacts")} toast={toast} />}
          {current === "campaigns" && <CampaignModule templates={templates} campaigns={campaigns} setCampaigns={setCampaigns} contactData={contactData} canManage={canManage("campaigns")} toast={toast} sendProfiles={sendableProfiles(profiles)} onGoToSettings={canManage("admin") ? () => goTo("admin") : null} />}
          {current === "integrations" && <IntegrationModule integrations={integrations} setIntegrations={setIntegrations} canManage={canManage("integrations")} toast={toast} />}
          {current === "admin" && <AdminModule auth={auth} setAuth={setAuth} currentUser={user} canManage={canManage("admin")} profiles={profiles} setProfiles={setProfiles} toast={toast} />}
        </div>
      </main>
    </div>
  );
}

// ─── Root with router ─────────────────────────────────────────────────────────
function AuthGate() {
  const [user, setUser] = useLocalState("cs_user", null);
  const { auth } = useData();

  const handleLogin = (u) => {
    const match = auth.users.find((x) => x.email.toLowerCase() === (u.email || "").toLowerCase());
    setUser(match || { id: "self", name: u.name, email: u.email, roleId: "role_admin" });
  };

  const handleSignOut = () => setUser(null);

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/app/templates" replace /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/app/:module"
        element={user
          ? <AppShell user={user} onSignOut={handleSignOut} />
          : <Navigate to="/login" replace />
        }
      />
      {/* Full-screen editor — no sidebar */}
      <Route
        path="/app/templates/:id/edit"
        element={user
          ? <TemplateEditorPage user={user} />
          : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to={user ? "/app/templates" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AuthGate />
        <ToastStack />
      </DataProvider>
    </BrowserRouter>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hdr = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "0.5px solid #eee" };
const title = { display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 600, color: "#10301F" };
const th = { textAlign: "left", padding: "11px 18px", fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "0.5px solid #eee", background: "#fafafa" };
const td = { padding: "13px 18px", borderBottom: "0.5px solid #eee", verticalAlign: "middle" };
const verTag = { fontFamily: "monospace", fontSize: 12, fontWeight: 500, color: GREEN, background: "#f0f9f5", padding: "1px 7px", borderRadius: 5, border: "0.5px solid #c5e8d8" };
const verItem = { display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "0.5px solid #eee" };
const verDot = { width: 30, height: 30, borderRadius: "50%", background: "#f0f9f5", border: "0.5px solid #c5e8d8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: GREEN, flexShrink: 0, fontFamily: "monospace" };
const verSub = { fontSize: 11, color: "#999" };
const backLink = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: GREEN, cursor: "pointer" };
const btnPrimary = { padding: "7px 14px", borderRadius: 8, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#222" };
const btnSmPrimary = { background: GREEN, color: "#fff", borderColor: GREEN };
const iconBtn = { width: 26, height: 26, borderRadius: 6, border: "0.5px solid #eee", background: "#fff", cursor: "pointer", color: "#666", fontSize: 13 };
const sel = { padding: "5px 9px", borderRadius: 6, border: "0.5px solid #ddd", background: "#fff", fontSize: 12, fontFamily: "inherit", color: "#222" };
const inp = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fafafa", color: "#222" };
const fieldLbl = { display: "block", fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" };
