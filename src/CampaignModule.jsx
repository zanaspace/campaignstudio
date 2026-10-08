import { useState, useMemo } from "react";
import {
  VERSION_STRATEGY, CAMPAIGN_STATUS,
  createInitialCampaigns, createCampaign, updateCampaign,
  linkTemplate, unlinkTemplate, resolveTemplateForRun, executeRun,
} from "./campaignStore";
import { currentVersionNumber } from "./templateStore";
import { resolveAudience, resolveGroup } from "./contactStore";

const GREEN = "#055F36", GREEN_MID = "#21714B";
const fmtTime = (d) => new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ─── Campaign list ───────────────────────────────────────────────────────────
function CampaignList({ campaigns, templates, onOpen, onNew }) {
  return (
    <div>
      <div style={hdr}>
        <div style={title}><span style={{ color: GREEN }}>✉</span> Campaigns</div>
        {onNew && <button style={btnPrimary} onClick={onNew}>+ New campaign</button>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{["Campaign", "Default template", "Version strategy", "Runs", "Status"].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {campaigns.map((c) => {
            const t = templates.find((x) => x.id === c.defaultTemplateId);
            const stratLabel = c.versionStrategy === VERSION_STRATEGY.SPECIFIC ? `Pinned v${c.pinnedVersionId}` : "Always latest";
            return (
              <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => onOpen(c.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={td}><div style={{ fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{c.purpose}</div></td>
                <td style={td}>{t ? t.name : <span style={{ color: "#bbb" }}>—</span>}</td>
                <td style={td}><span style={{ fontSize: 12 }}>{stratLabel}</span></td>
                <td style={td}><span style={{ color: "#666", fontSize: 12 }}>{c.runs.length} run{c.runs.length === 1 ? "" : "s"}</span></td>
                <td style={td}><Pill text={c.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ text }) {
  const c = text === CAMPAIGN_STATUS.ACTIVE ? { bg: "#E1F5EE", fg: "#0F6E56" } : text === CAMPAIGN_STATUS.PAUSED ? { bg: "#FAEEDA", fg: "#854F0B" } : { bg: "#F1EFE8", fg: "#5F5E5A" };
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 11, fontSize: 11, fontWeight: 500, background: c.bg, color: c.fg }}>{text}</span>;
}

// ─── Campaign detail: config + run module ────────────────────────────────────
function CampaignDetail({ campaign, templates, contactData, onBack, onUpdate, onLink, onUnlink, onRun, sendProfiles = [], onGoToSettings }) {
  const c = campaign;
  const tpl = templates.find((t) => t.id === c.defaultTemplateId);
  const versions = tpl ? tpl.versions : [];
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideVer, setOverrideVer] = useState(""); // "" = latest
  const [sendProfileId, setSendProfileId] = useState(sendProfiles[0]?.id || "");
  const deliveryReady = sendProfiles.length > 0;
  const chosenProfile = sendProfiles.find((p) => p.id === sendProfileId) || sendProfiles[0] || null;

  const override = overrideOn ? { templateId: c.defaultTemplateId, versionId: overrideVer === "" ? null : parseInt(overrideVer) } : null;
  const preview = useMemo(() => resolveTemplateForRun(c, templates, override), [c, templates, overrideOn, overrideVer]);

  const groups = contactData ? contactData.groups : [];
  const audGroupIds = c.audienceGroupIds || [];
  const audience = useMemo(
    () => contactData ? resolveAudience(audGroupIds, groups, contactData.contacts, contactData.suppression) : null,
    [c.audienceGroupIds, contactData]
  );
  const toggleAudGroup = (gid) => {
    const next = audGroupIds.includes(gid) ? audGroupIds.filter((x) => x !== gid) : [...audGroupIds, gid];
    onUpdate(c.id, { audienceGroupIds: next });
  };

  return (
    <div>
      <div style={hdr}>
        <div style={title}><span style={{ color: GREEN }}>✉</span> {c.name}</div>
        <Pill text={c.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT — definition */}
        <div style={{ padding: 18, borderRight: "0.5px solid #eee" }}>
          <div style={backLink} onClick={onBack}>← Campaigns</div>
          <div style={{ ...secH, marginTop: 12 }}>Campaign definition · what + who</div>

          <Field label="Purpose">{c.purpose}</Field>

          <Field label="Default template (linked by reference, not copied)">
            {tpl ? (
              <div style={tplCard}>
                <div style={tplIc}>▤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                    Current published: v{currentVersionNumber(tpl)}
                  </div>
                </div>
              </div>
            ) : <span style={{ color: "#bbb" }}>No template linked</span>}
          </Field>

          <Field label="Version strategy">
            <div style={{ display: "flex", border: "0.5px solid #ddd", borderRadius: 6, overflow: "hidden", marginTop: 2 }}>
              {[[VERSION_STRATEGY.LATEST, "Always latest"], [VERSION_STRATEGY.SPECIFIC, "Pin specific"]].map(([val, lbl]) => (
                <button key={val} onClick={() => onUpdate(c.id, { versionStrategy: val, pinnedVersionId: val === VERSION_STRATEGY.SPECIFIC ? (c.pinnedVersionId || currentVersionNumber(tpl)) : null })}
                  style={{ flex: 1, padding: "8px 6px", fontSize: 12, border: "none", cursor: "pointer", background: c.versionStrategy === val ? "#f0f9f5" : "transparent", color: c.versionStrategy === val ? GREEN : "#888", fontWeight: c.versionStrategy === val ? 600 : 400, fontFamily: "inherit" }}>
                  {lbl}
                </button>
              ))}
            </div>
            {c.versionStrategy === VERSION_STRATEGY.SPECIFIC && (
              <select value={c.pinnedVersionId || ""} onChange={(e) => onUpdate(c.id, { pinnedVersionId: parseInt(e.target.value) })} style={{ ...selSt, marginTop: 6 }}>
                {versions.map((v) => <option key={v.v} value={v.v}>v{v.v} — {v.subject}</option>)}
              </select>
            )}
          </Field>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 6 }}>Audience · who (select contact groups)</div>
            {groups.map((g) => {
              const on = audGroupIds.includes(g.id);
              const members = resolveGroup(g, contactData.contacts);
              return (
                <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: "0.5px solid #eee", borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={on} onChange={() => toggleAudGroup(g.id)} style={{ accentColor: GREEN }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                    <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>{g.type} · {members.length}</span>
                  </span>
                </label>
              );
            })}
            {audience && (
              <div style={{ border: "0.5px solid #c5e8d8", borderRadius: 8, padding: 12, background: "#f0f9f5", marginTop: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: GREEN, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Audience preview · resolved at run time</div>
                <AudRow label={`${audience.groupsSelected} group(s) — total across`} value={audience.totalAcross} />
                <AudRow label="Duplicates removed" value={`− ${audience.duplicatesRemoved}`} minus />
                <AudRow label="Suppressed removed" value={`− ${audience.suppressedRemoved}`} minus />
                <AudRow label="Final audience" value={audience.finalCount} total />
              </div>
            )}
          </div>

          <div style={{ borderTop: "0.5px solid #eee", margin: "14px 0", paddingTop: 14 }}>
            <div style={secH}>Template module · independent lifecycle</div>
            <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
              The template evolves on its own. Editing it publishes a new version — it does not touch this campaign or any past run. Switch to the Templates tab and publish a new version, then come back and run again to watch “Always latest” pick it up while old runs stay frozen.
            </p>
          </div>
        </div>

        {/* RIGHT — run module */}
        <div style={{ padding: 18 }}>
          <div style={secH}>Run module · when + execution</div>
          <div style={{ border: "0.5px solid #eee", borderRadius: 8, padding: 13, background: "#fafafa", marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", marginBottom: overrideOn ? 8 : 0 }}>
              <input type="checkbox" checked={overrideOn} onChange={(e) => setOverrideOn(e.target.checked)} style={{ accentColor: GREEN }} />
              Override template version for this run
            </label>
            {overrideOn && (
              <select value={overrideVer} onChange={(e) => setOverrideVer(e.target.value)} style={selSt}>
                <option value="">Latest at run time (v{currentVersionNumber(tpl)})</option>
                {versions.map((v) => <option key={v.v} value={v.v}>Pin v{v.v} — {v.subject}</option>)}
              </select>
            )}
            <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#fff", border: "0.5px dashed #2cb173", fontSize: 11, color: "#666", lineHeight: 1.7 }}>
              {preview.error ? <span style={{ color: "#A32D2D" }}>{preview.error}</span> : <>
                <div>Resolution path: <b style={{ color: GREEN }}>{preview.resolvedVia}</b></div>
                <div>Will lock → <b style={{ color: GREEN }}>template_version_id = v{preview.templateVersionId}</b></div>
                <div style={{ color: "#999", marginTop: 2 }}>Subject: “{preview.snapshot.subject}”</div>
              </>}
            </div>
            {deliveryReady && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 4 }}>Send via</div>
                <select value={sendProfileId} onChange={(e) => setSendProfileId(e.target.value)} style={selSt}>
                  {sendProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>)}
                </select>
              </div>
            )}
            {!deliveryReady && (
              <div style={{ fontSize: 11, color: "#854F0B", background: "#FAEEDA", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5, marginTop: 10 }}>
                No verified delivery profile. {onGoToSettings ? <a onClick={onGoToSettings} style={{ color: GREEN, fontWeight: 600, cursor: "pointer" }}>Set one up in Admin → Email settings →</a> : "Ask an admin to configure Admin → Email settings."}
              </div>
            )}
            <button disabled={!!preview.error || !deliveryReady} onClick={() => onRun(c.id, override, chosenProfile)} style={{ ...btnPrimary, width: "100%", marginTop: 10, opacity: (preview.error || !deliveryReady) ? 0.5 : 1, cursor: (preview.error || !deliveryReady) ? "not-allowed" : "pointer" }}>Execute run &amp; freeze</button>
          </div>

          <div style={secH}>Run history · each run locks its own version</div>
          {c.runs.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#bbb", fontSize: 12 }}>No runs yet.</div> :
            c.runs.map((r) => (
              <div key={r.id} style={{ border: "0.5px solid #eee", borderRadius: 8, padding: "11px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#999" }}>{r.id}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#0C447C", background: "#E6F1FB", padding: "1px 6px", borderRadius: 8 }}>🔒 frozen snapshot</span>
                  <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>{fmtTime(r.executedAt)}</span>
                </div>
                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                  <span style={{ color: "#999" }}>resolved via</span> {r.resolvedVia}<br />
                  <span style={{ color: "#999" }}>template_id</span> <span style={{ fontFamily: "monospace" }}>{r.templateId}</span> · <span style={{ color: "#999" }}>version</span> <span style={{ fontFamily: "monospace" }}>v{r.templateVersionId}</span> · <span style={{ color: "#999" }}>sent to</span> <span style={{ fontFamily: "monospace" }}>{r.recipientCount}</span>{r.deliveryProfile ? <> · <span style={{ color: "#999" }}>via</span> {r.deliveryProfile}</> : null}
                  <div style={{ fontSize: 12, color: "#222", fontWeight: 500, marginTop: 3 }}>“{r.snapshot.subject}”</div>
                  {r.audienceSnapshot && (
                    <div style={{ marginTop: 5, fontSize: 10.5, color: "#777" }}>
                      <span style={{ color: "#999" }}>frozen audience:</span> {r.audienceSnapshot.totalAcross} across {r.audienceSnapshot.groupsSelected} group(s) − {r.audienceSnapshot.duplicatesRemoved} dupes − {r.audienceSnapshot.suppressedRemoved} suppressed = <b style={{ color: GREEN }}>{r.audienceSnapshot.finalCount}</b>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function AudRow({ label, value, minus, total }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: total ? 14 : 12.5, fontWeight: total ? 600 : 400, color: total ? GREEN : "#666", borderTop: total ? "0.5px solid #c5e8d8" : "none", marginTop: total ? 5 : 0, paddingTop: total ? 8 : 4 }}>
      <span>{label}</span><span style={{ fontFamily: "monospace", color: minus ? "#A32D2D" : "inherit" }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: "#888", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#222" }}>{children}</div>
    </div>
  );
}

// ─── New campaign modal (4.1) ────────────────────────────────────────────────
function NewCampaignModal({ templates, contactData, onCreate, onCancel }) {
  const publishedTemplates = templates.filter((t) => t.versions.length > 0 && t.status !== "Archived");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [templateId, setTemplateId] = useState(publishedTemplates[0]?.id || "");
  const [strategy, setStrategy] = useState(VERSION_STRATEGY.LATEST);
  const [pinned, setPinned] = useState("");
  const [audienceGroupIds, setAudienceGroupIds] = useState([]);
  const tpl = templates.find((t) => t.id === templateId);
  const groups = contactData ? contactData.groups : [];
  const audPreview = contactData ? resolveAudience(audienceGroupIds, groups, contactData.contacts, contactData.suppression) : null;
  const toggleAud = (gid) => setAudienceGroupIds((s) => s.includes(gid) ? s.filter((x) => x !== gid) : [...s, gid]);

  return (
    <div style={{ minHeight: 460, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.2)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>New campaign</h3>

        <label style={fieldLbl}>Campaign name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Feature Launch" style={inpSt} autoFocus />

        <label style={{ ...fieldLbl, marginTop: 14 }}>Purpose</label>
        <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is this campaign for?" style={{ ...inpSt, minHeight: 60, resize: "vertical" }} />

        <label style={{ ...fieldLbl, marginTop: 14 }}>Default template</label>
        <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setPinned(""); }} style={inpSt}>
          {publishedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name} (current v{currentVersionNumber(t)})</option>)}
        </select>

        {/* template preview */}
        {tpl && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "#f0f9f5", border: "0.5px solid #c5e8d8", fontSize: 12 }}>
            <div style={{ fontWeight: 500, color: GREEN }}>Preview · v{currentVersionNumber(tpl)}</div>
            <div style={{ color: "#444", marginTop: 2 }}>“{tpl.versions[tpl.versions.length - 1].subject}”</div>
          </div>
        )}

        <label style={{ ...fieldLbl, marginTop: 14 }}>Version strategy</label>
        <div style={{ display: "flex", border: "0.5px solid #ddd", borderRadius: 6, overflow: "hidden", marginTop: 2 }}>
          {[[VERSION_STRATEGY.LATEST, "Always latest"], [VERSION_STRATEGY.SPECIFIC, "Pin specific version"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setStrategy(val)} style={{ flex: 1, padding: "8px 6px", fontSize: 12, border: "none", cursor: "pointer", background: strategy === val ? "#f0f9f5" : "transparent", color: strategy === val ? GREEN : "#888", fontWeight: strategy === val ? 600 : 400, fontFamily: "inherit" }}>{lbl}</button>
          ))}
        </div>
        {strategy === VERSION_STRATEGY.SPECIFIC && tpl && (
          <select value={pinned} onChange={(e) => setPinned(e.target.value)} style={{ ...inpSt, marginTop: 6 }}>
            <option value="">Choose a version…</option>
            {tpl.versions.map((v) => <option key={v.v} value={v.v}>v{v.v} — {v.subject}</option>)}
          </select>
        )}

        <label style={{ ...fieldLbl, marginTop: 14 }}>Audience — contact groups</label>
        {groups.map((g) => (
          <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={audienceGroupIds.includes(g.id)} onChange={() => toggleAud(g.id)} style={{ accentColor: GREEN }} />
            <span>{g.name} <span style={{ color: "#aaa", fontSize: 11 }}>({g.type})</span></span>
          </label>
        ))}
        {audPreview && audienceGroupIds.length > 0 && (
          <div style={{ marginTop: 6, padding: 10, borderRadius: 8, background: "#f0f9f5", border: "0.5px solid #c5e8d8", fontSize: 12, color: "#444" }}>
            Final audience: <b style={{ color: GREEN }}>{audPreview.finalCount}</b>
            <span style={{ color: "#999" }}> ({audPreview.totalAcross} − {audPreview.duplicatesRemoved} dupes − {audPreview.suppressedRemoved} suppressed)</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={btnSm} onClick={onCancel}>Cancel</button>
          <button style={{ ...btnSm, ...btnSmPrimary, opacity: name.trim() && templateId ? 1 : 0.5 }} disabled={!name.trim() || !templateId}
            onClick={() => onCreate({ name: name.trim(), purpose: purpose.trim(), defaultTemplateId: templateId, versionStrategy: strategy, pinnedVersionId: strategy === VERSION_STRATEGY.SPECIFIC && pinned ? parseInt(pinned) : null, audienceGroupIds })}>
            Create campaign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module root ─────────────────────────────────────────────────────────────
export default function CampaignModule({ templates, campaigns, setCampaigns, contactData, canManage = true, toast, sendProfiles = [], onGoToSettings }) {
  const [view, setView] = useState("list");
  const [activeId, setActiveId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const active = useMemo(() => campaigns.find((c) => c.id === activeId) || null, [campaigns, activeId]);

  const open = (id) => { setActiveId(id); setView("detail"); };

  const doRun = (campaignId, override, profile) => {
    if (sendProfiles.length === 0) { toast && toast("Configure a delivery profile before running a campaign.", "error"); return; }
    let runResult = null;
    setCampaigns((list) => {
      const ctx = { groups: contactData.groups, contacts: contactData.contacts, suppression: contactData.suppression };
      const { list: next, run } = executeRun(list, campaignId, templates, override, ctx, resolveAudience, profile);
      runResult = run;
      return next;
    });
    setTimeout(() => { if (runResult) toast && toast(`Campaign run sent to ${runResult.recipientCount} recipients via ${profile ? profile.name : "default"}.`); }, 0);
  };

  return (
    <div>
      {showNew && (
        <NewCampaignModal templates={templates} contactData={contactData} onCancel={() => setShowNew(false)}
          onCreate={(payload) => { setCampaigns((l) => createCampaign(l, payload)); setShowNew(false); toast && toast(`Campaign “${payload.name}” created.`); }} />
      )}
      {!showNew && view === "list" &&
        <CampaignList campaigns={campaigns} templates={templates} onOpen={open} onNew={canManage ? () => setShowNew(true) : null} />}
      {!showNew && view === "detail" && active &&
        <CampaignDetail campaign={active} templates={templates} contactData={contactData} onBack={() => setView("list")}
          sendProfiles={sendProfiles} onGoToSettings={onGoToSettings}
          onUpdate={(id, patch) => setCampaigns((l) => updateCampaign(l, id, patch))}
          onLink={(id, t) => setCampaigns((l) => linkTemplate(l, id, t))}
          onUnlink={(id, t) => setCampaigns((l) => unlinkTemplate(l, id, t))}
          onRun={doRun} />}
    </div>
  );
}

// ─── shared styles ───────────────────────────────────────────────────────────
const hdr = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "0.5px solid #eee" };
const title = { display: "flex", alignItems: "center", gap: 9, fontSize: 15, fontWeight: 500 };
const th = { textAlign: "left", padding: "11px 18px", fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "0.5px solid #eee", background: "#fafafa" };
const td = { padding: "13px 18px", borderBottom: "0.5px solid #eee", verticalAlign: "middle" };
const secH = { fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 };
const backLink = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: GREEN, cursor: "pointer" };
const tplCard = { border: "0.5px solid #eee", borderRadius: 8, padding: "11px 13px", display: "flex", alignItems: "center", gap: 11, background: "#fafafa", marginTop: 4 };
const tplIc = { width: 34, height: 34, borderRadius: 7, background: "#f0f9f5", border: "0.5px solid #c5e8d8", display: "flex", alignItems: "center", justifyContent: "center", color: GREEN, flexShrink: 0 };
const btnPrimary = { padding: "7px 14px", borderRadius: 8, border: "none", background: GREEN, color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" };
const btnSm = { padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #ddd", background: "#fff", color: "#222" };
const btnSmPrimary = { background: GREEN, color: "#fff", borderColor: GREEN };
const selSt = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "0.5px solid #ddd", background: "#fff", fontSize: 12, fontFamily: "inherit" };
const inpSt = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "0.5px solid #ddd", fontSize: 13, fontFamily: "inherit", background: "#fafafa" };
const fieldLbl = { display: "block", fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" };
