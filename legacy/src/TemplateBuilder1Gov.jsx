import { useState, useCallback } from "react";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = { green:"#055F36", greenMid:"#21714B", greenLight:"#2cb173", textDark:"#121A26", textBody:"#4B4D4C" };
const GBB_LOGO = "https://res.cloudinary.com/dmwoafliu/image/upload/logo2019-1_sjmfo5";
const POP   = "'Poppins', sans-serif";
const INTER = "'Inter', sans-serif";

// ─── Mock data (mirrors your "Workgroups" Thymeleaf template) ────────────────
const DEFAULT_BLOCKS = [
  { id:"b1",  type:"header",     props:{ brand:"1Government Cloud", tagline:"Towards the Digitalization of the Public Service", logo:GBB_LOGO } },
  { id:"b2",  type:"hero-title", props:{ title:"Workgroups are coming to 1Gov", align:"center" } },
  { id:"b3",  type:"hero-image", props:{ src:"https://res.cloudinary.com/dmwoafliu/image/upload/v1780070425/workgroups_sqjaed.png", alt:"Workgroups feature", offset:-210, align:"center" } },
  { id:"b4",  type:"salutation", props:{ variable:"${userName}", align:"left" } },
  { id:"b5",  type:"paragraph",  props:{ content:"Managing work across teams is about to become simpler, secure and more organised. We're bringing Workgroups: a new feature that allows you to create dedicated teams around specific workflows and tasks, bringing the right people together while maintaining complete control over access and visibility.", align:"left" } },
  { id:"b6",  type:"subheading", props:{ text:"What are Workgroups?", align:"left" } },
  { id:"b7",  type:"paragraph",  props:{ content:"Workgroups let you create focused mini-teams around specific tasks or workflows. You can create private or public workgroups, assign members, control access to tasks, and collaborate without unnecessarily exposing sensitive information.", align:"left" } },
  { id:"b8",  type:"subheading", props:{ text:"Here's what to expect:", align:"left" } },
  { id:"b9",  type:"bullets",    props:{ items:["Create focused teams: Set up dedicated workgroups for specific workflows, projects, or operational tasks.","Control access with confidence: Decide who can join a workgroup, view tasks, and participate in execution.","Choose the right level of visibility: Private Workgroups keep membership and task activity restricted to authorised participants only while public Workgroups provide broader visibility while maintaining appropriate access controls.","Collaborate more effectively: Reduce unnecessary handoffs, streamline task ownership, and keep discussions and actions within the right team.","Maintain accountability: Every key action is tracked, providing a clear audit trail and greater transparency across processes."] } },
  { id:"b10", type:"paragraph",  props:{ content:"Whether you're coordinating work within a department or managing sensitive cross-functional activities, Workgroups help ensure that the right people have access to the right work at the right time.", align:"left" } },
  { id:"b11", type:"subheading", props:{ text:"Coming soon on 1Gov", align:"left" } },
  { id:"b12", type:"signoff",    props:{ closing:"Warm regards,", team:"The GBB 1Gov Team", align:"left" } },
  { id:"b13", type:"footer",     props:{ support:"http://support.1gov.ng", email:"1govecms@galaxybackbone.com.ng", align:"center" } },
];

const BLOCK_DEFAULTS = {
  "header":     { brand:"1Government Cloud", tagline:"Towards the Digitalization of the Public Service", logo:GBB_LOGO },
  "hero-title": { title:"Your feature headline here", align:"center" },
  "hero-image": { src:"", alt:"Feature image", offset:0, align:"center" },
  "salutation": { variable:"${userName}", align:"left" },
  "paragraph":  { content:"Your paragraph text here.", align:"left" },
  "subheading": { text:"Section heading", align:"left" },
  "bullets":    { items:["First bullet point","Second bullet point","Third bullet point"], align:"left" },
  "signoff":    { closing:"Warm regards,", team:"The GBB 1Gov Team", align:"left" },
  "cta":        { label:"See how it works", url:"#", align:"center" },
  "footer":     { support:"http://support.1gov.ng", email:"1govecms@galaxybackbone.com.ng", align:"center" },
};

const PALETTE = [
  ["header","Header"],["hero-title","Hero title"],["hero-image","Hero image"],
  ["salutation","Salutation"],["paragraph","Paragraph"],["subheading","Subheading"],
  ["bullets","Bullet list"],["cta","Button"],["signoff","Sign-off"],["footer","Footer"],
];

const THYMELEAF_VARS = ["${userName}", "${email}", "${planName}", "${mdaName}"];

// Replace ${var} and <span th:text="${var}"></span> with sample values for a test render.
export function resolveMergeVars(html, sample = {}) {
  let out = html;
  // Thymeleaf span form → sample value
  out = out.replace(/<span\s+th:text="\$\{(\w+)\}"\s*><\/span>/g, (_, k) => esc(sample[k] != null ? String(sample[k]) : `${k}`));
  // bare ${var}
  out = out.replace(/\$\{(\w+)\}/g, (_, k) => (sample[k] != null ? esc(String(sample[k])) : `\${${k}}`));
  return out;
}
const VAR_KEYS = ["userName", "email", "planName", "mdaName"];

// ─── Font system ─────────────────────────────────────────────────────────────
// Template-level defaults (global) + optional per-block override in props.font.
export const FONT_FAMILIES = [
  { label:"Poppins", value:"'Poppins', sans-serif" },
  { label:"Inter", value:"'Inter', sans-serif" },
  { label:"Arial", value:"Arial, sans-serif" },
  { label:"Verdana", value:"Verdana, sans-serif" },
  { label:"Tahoma", value:"Tahoma, sans-serif" },
  { label:"Georgia", value:"Georgia, serif" },
  { label:"Times New Roman", value:"'Times New Roman', serif" },
];
export const FONT_SIZES = [11,12,13,14,15,16,18,20,22,24,25,28,32];
export const FONT_WEIGHTS = [[400,"Regular"],[500,"Medium"],[600,"Semibold"],[700,"Bold"]];
export const DEFAULT_GLOBAL_FONT = { family:"'Poppins', sans-serif", size:16, weight:400 };

// Structural defaults: headings keep their own size/weight so the type hierarchy
// survives a global family change. `body:true` blocks inherit the global body size/weight.
const FONT_STRUCT = {
  "hero-title": { size:25, weight:600, body:false },
  "salutation": { size:20, weight:600, body:false },
  "paragraph":  { size:null, weight:null, body:true },
  "subheading": { size:16, weight:700, body:false },
  "bullets":    { size:null, weight:null, body:true },
  "signoff":    { size:null, weight:null, body:true },
  "cta":        { size:14, weight:600, body:false },
  "footer":     { size:13, weight:400, body:false },
};

// Resolve the effective font for a block, given the global template font.
export function resolveFont(block, global = DEFAULT_GLOBAL_FONT) {
  const st = FONT_STRUCT[block.type] || {};
  const f = block.props.font || {};
  const family = f.family || global.family;
  const size = f.size != null ? f.size : (st.body ? global.size : (st.size != null ? st.size : global.size));
  const weight = f.weight != null ? f.weight : (st.body ? global.weight : (st.weight != null ? st.weight : global.weight));
  return { family, size, weight };
}
// Inline CSS string for export. `forceWeight` lets sign-off bold its team line.
function fontCss(block, global, forceWeight) {
  const e = resolveFont(block, global);
  return `font-family:${e.family};font-size:${e.size}px;font-weight:${forceWeight != null ? forceWeight : e.weight}`;
}

const esc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ─── HTML export (matches your Thymeleaf template exactly) ───────────────────
function blockToHtml(b, global = DEFAULT_GLOBAL_FONT) {
  const p = b.props;
  const a = p.align || "left";
  const fc = fontCss(b, global);
  switch (b.type) {
    case "header": return `
          <tr>
            <td style="padding:30px;width:60%">
              <div style="font-size:24px;font-weight:600;color:${BRAND.green};font-family:${global.family}">${esc(p.brand)}</div>
              <div style="font-size:10px;color:${BRAND.green};font-family:${global.family}">${esc(p.tagline)}</div>
            </td>
            <td style="padding:30px 15px 30px 30px;text-align:right;width:40%">
              <img src="${p.logo}" alt="Galaxy Backbone" style="width:130px;height:auto">
            </td>
          </tr>`;
    case "hero-title": return `
          <tr><td colspan="2" style="text-align:${a};padding:10px 40px 20px">
            <div style="color:#01150C;${fc}">${esc(p.title)}</div>
          </td></tr>`;
    case "hero-image":
      if (!p.src) return `          <!-- hero image placeholder -->`;
      { const off=p.offset||0; const mm={left:`${off}px auto 0 0`,center:`${off}px auto 0`,right:`${off}px 0 0 auto`};
      return `
          <tr><td colspan="2" style="padding:0;text-align:${a}">
            <img src="${p.src}" alt="${esc(p.alt)}" style="width:100%;max-width:700px;height:auto;display:block;margin:${mm[a]};position:relative;z-index:1">
          </td></tr>`; }
    case "salutation": return `
          <tr><td colspan="2" style="padding:40px 40px 0;text-align:${a};color:${BRAND.textDark};${fc}">Dear <span th:text="${p.variable}"></span>,</td></tr>`;
    case "paragraph": return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a};color:${BRAND.textBody};line-height:26px;${fc}">${esc(p.content).replace(/\n/g,"<br>")}</td></tr>`;
    case "subheading": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};${fc}">${esc(p.text)}</td></tr>`;
    case "bullets": { const ls = a==="left" ? "padding:0 0 0 20px" : "list-style-position:inside;padding:0";
      return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a}">
            <ul style="margin:0;${ls};color:${BRAND.textBody};line-height:26px;${fc}">
              ${(p.items||[]).map((i,idx)=>`<li style="margin-bottom:${idx===p.items.length-1?0:12}px">${esc(i)}</li>`).join("\n              ")}
            </ul>
          </td></tr>`; }
    case "cta": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a||"center"}">
            <a href="${p.url||"#"}" style="display:inline-block;background:${BRAND.green};color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:30px;${fontCss(b, global, 600)}">${esc(p.label)}</a>
          </td></tr>`;
    case "signoff": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};line-height:26px;${fc}">${esc(p.closing)}<br><span style="${fontCss(b, global, 700)}">${esc(p.team)}</span></td></tr>`;
    case "footer": return `
          <tr><td colspan="2" style="padding:40px 40px 30px">
            <div style="border-top:1px solid #CCCCCC;padding-top:30px;text-align:${a};color:${BRAND.textDark};line-height:24px;${fc}">
              Questions about 1Gov? Visit our Knowledge base at <a href="${p.support}" style="color:${BRAND.greenMid};text-decoration:none">1Government Support</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};line-height:24px;${fc}">
              For Further enquiries, contact: <a href="mailto:${p.email}" style="color:${BRAND.greenMid};text-decoration:none">${esc(p.email)}</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};line-height:24px;padding-top:40px;${fc}">Powered by 1Government Cloud.</div>
          </td></tr>`;
    default: return "";
  }
}

export function buildHtml(subject, blocks, global = DEFAULT_GLOBAL_FONT) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${esc(subject)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 40px 0px; background-color: #F3F3F3; font-family: sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%">
    <tr><td>
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="700" style="background-color: #ffffff;">
${blocks.map((b) => blockToHtml(b, global)).join("\n")}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send test email (mock) ──────────────────────────────────────────────────
function TestSendModal({ subject, blocks, global, deliveryReady = true, sendProfiles = [], onGoToSettings, toast, onClose }) {
  const [email, setEmail] = useState("");
  const [profileId, setProfileId] = useState(sendProfiles[0]?.id || "");
  const [sample, setSample] = useState({ userName: "Ada Obi", email: "ada@galaxybackbone.com.ng", planName: "Enterprise", mdaName: "Ministry of Works" });
  const [sent, setSent] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = deliveryReady && sendProfiles.length > 0;

  const rawHtml = buildHtml(subject, blocks, global);
  const renderedHtml = resolveMergeVars(rawHtml, sample);
  const renderedSubject = resolveMergeVars(subject || "(no subject)", sample);
  const chosen = sendProfiles.find((p) => p.id === profileId) || sendProfiles[0];

  const send = () => { if (!emailOk || !ready) return; setSent(true); toast && toast(`Test email sent to ${email.trim()} via ${chosen ? chosen.name : "default"}.`); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 12, width: 720, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 30px rgba(0,0,0,.25)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "15px 20px", borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Send test email</span>
          <span style={{ fontSize: 11, color: "#999" }}>— before saving, no campaign affected</span>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 18, color: "#999", cursor: "pointer" }} aria-label="Close">×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, flex: 1, minHeight: 0 }}>
          {/* form */}
          <div style={{ padding: "16px 20px", borderRight: "0.5px solid #eee", overflowY: "auto" }}>
            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#EAF3DE", color: "#27500A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Test sent to {email}</div>
                <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>This was a test render with your sample values — it doesn't save the template or affect any campaign. The preview on the right is exactly what was delivered.</div>
                <button onClick={() => setSent(false)} style={btnGhostFull}>Send another</button>
              </div>
            ) : (
              <>
                {!ready && (
                  <div style={{ fontSize: 11.5, color: "#854F0B", background: "#FAEEDA", borderRadius: 8, padding: "9px 11px", lineHeight: 1.5, marginBottom: 12 }}>
                    No verified delivery profile yet. {onGoToSettings ? <a onClick={() => { onClose(); onGoToSettings(); }} style={{ color: "#055F36", fontWeight: 600, cursor: "pointer" }}>Set one up in Admin → Email settings →</a> : "Ask an admin to set up Admin → Email settings."}
                  </div>
                )}
                <label style={lblSt}>Send to</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@galaxybackbone.com.ng" autoFocus
                  style={{ ...inpSt, marginTop: 5, marginBottom: 14, borderColor: email && !emailOk ? "#E0584F" : "#ddd" }} />
                {sendProfiles.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={lblSt}>Send via</label>
                    <select value={profileId} onChange={(e) => setProfileId(e.target.value)} style={{ ...inpSt, marginTop: 5 }}>
                      {sendProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (default)" : ""}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Sample merge values</div>
                {VAR_KEYS.map((k) => (
                  <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 9 }}>
                    <label style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{"${" + k + "}"}</label>
                    <input value={sample[k] || ""} onChange={(e) => setSample((s) => ({ ...s, [k]: e.target.value }))} style={inpSt} />
                  </div>
                ))}
                <p style={{ fontSize: 10.5, color: "#aaa", lineHeight: 1.5, marginTop: 4 }}>These fill in the personalisation variables so the test looks like a real send.</p>
              </>
            )}
          </div>
          {/* live preview */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #eee", fontSize: 12 }}>
              <span style={{ color: "#999" }}>Subject:</span> <span style={{ fontWeight: 500 }}>{renderedSubject}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#F3F3F3", padding: 12 }}>
              <iframe title="Test email preview" srcDoc={renderedHtml} style={{ width: "100%", height: 460, border: "0.5px solid #e4e4e4", borderRadius: 6, background: "#fff" }} />
            </div>
          </div>
        </div>

        {!sent && (
          <div style={{ padding: "13px 20px", borderTop: "0.5px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={onClose} style={btnGhostSm2}>Cancel</button>
            <button onClick={send} disabled={!emailOk || !ready} style={{ ...btnGreenSm, opacity: (emailOk && ready) ? 1 : 0.45, cursor: (emailOk && ready) ? "pointer" : "not-allowed" }}>Send test</button>
          </div>
        )}
      </div>
    </div>
  );
}
const btnGreenSm = { padding: "8px 16px", borderRadius: 8, border: "none", background: BRAND.green, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit" };
const btnGhostSm2 = { padding: "8px 14px", borderRadius: 8, border: "0.5px solid #ddd", background: "#fff", color: "#222", fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const btnGhostFull = { padding: "7px 12px", borderRadius: 7, border: "0.5px solid #ddd", background: "#fff", color: "#222", fontSize: 12, cursor: "pointer", fontFamily: "inherit", marginTop: 4 };

// ─── React preview (uses tables to match real layout) ────────────────────────
function BlockPreview({ block, global = DEFAULT_GLOBAL_FONT }) {
  const p = block.props;
  const a = p.align || "left";
  const ef = resolveFont(block, global);
  const fstyle = { fontFamily: ef.family, fontSize: ef.size, fontWeight: ef.weight };
  const td = fstyle;
  switch (block.type) {
    case "header":
      return (<>
        <td style={{ padding:30, width:"60%" }}>
          <div style={{ fontSize:24, fontWeight:600, color:BRAND.green, fontFamily:global.family }}>{p.brand}</div>
          <div style={{ fontSize:10, color:BRAND.green, fontFamily:global.family }}>{p.tagline}</div>
        </td>
        <td style={{ padding:"30px 15px 30px 30px", textAlign:"right", width:"40%" }}>
          <img src={p.logo} alt="Galaxy Backbone" style={{ width:130, height:"auto" }} />
        </td>
      </>);
    case "hero-title":
      return <td colSpan={2} style={{ textAlign:a, padding:"10px 40px 20px" }}><div style={{ color:"#01150C", ...fstyle }}>{p.title}</div></td>;
    case "hero-image": {
      const off=p.offset||0; const mm={left:`${off}px auto 0 0`,center:`${off}px auto 0`,right:`${off}px 0 0 auto`};
      return <td colSpan={2} style={{ padding:0, textAlign:a }}>
        {p.src
          ? <img src={p.src} alt={p.alt} style={{ width:"100%", maxWidth:700, height:"auto", display:"block", margin:mm[a], position:"relative", zIndex:1 }} />
          : <div style={{ margin:"0 30px", background:"#f0f9f5", border:`1.5px dashed ${BRAND.greenLight}`, borderRadius:6, padding:36, color:BRAND.greenMid, fontSize:13, fontFamily:global.family }}>📷 Paste a Cloudinary image URL</div>}
      </td>; }
    case "salutation":
      return <td colSpan={2} style={{ padding:"40px 40px 0", textAlign:a, color:BRAND.textDark, ...fstyle }}>Dear <span style={{ color:BRAND.green }}>{p.variable}</span>,</td>;
    case "paragraph":
      return <td colSpan={2} style={{ padding:"16px 40px 0", textAlign:a, color:BRAND.textBody, lineHeight:"26px", ...fstyle }}>{p.content}</td>;
    case "subheading":
      return <td colSpan={2} style={{ padding:"24px 40px 0", textAlign:a, color:BRAND.textBody, ...fstyle }}>{p.text}</td>;
    case "bullets":
      return <td colSpan={2} style={{ padding:"16px 40px 0", textAlign:a }}>
        <ul style={{ margin:0, listStyleType:"disc", ...(a==="left"?{padding:"0 0 0 20px"}:{listStylePosition:"inside",padding:0}), color:BRAND.textBody, lineHeight:"26px", ...fstyle }}>
          {(p.items||[]).map((it,i)=><li key={i} style={{ marginBottom:i===p.items.length-1?0:12, paddingLeft:8 }}>{it}</li>)}
        </ul>
      </td>;
    case "cta":
      return <td colSpan={2} style={{ padding:"24px 40px 0", textAlign:a||"center" }}>
        <span style={{ display:"inline-block", background:BRAND.green, color:"#fff", padding:"14px 40px", borderRadius:30, ...fstyle, fontWeight:600 }}>{p.label}</span>
      </td>;
    case "signoff":
    case "footer":
      return <td colSpan={2} style={{ padding:"40px 40px 30px" }}>
        <div style={{ borderTop:"1px solid #CCCCCC", paddingTop:30, textAlign:a, color:BRAND.textDark, lineHeight:"24px", ...fstyle }}>Questions about 1Gov? Visit our Knowledge base at <a href={p.support} style={{ color:BRAND.greenMid, textDecoration:"none" }}>1Government Support</a></div>
        <div style={{ textAlign:a, color:BRAND.textDark, lineHeight:"24px", ...fstyle }}>For Further enquiries, contact: <a href={`mailto:${p.email}`} style={{ color:BRAND.greenMid, textDecoration:"none" }}>{p.email}</a></div>
        <div style={{ textAlign:a, color:BRAND.textDark, lineHeight:"24px", paddingTop:40, ...fstyle }}>Powered by 1Government Cloud.</div>
      </td>;
    default: return <td />;
  }
}

// ─── Properties panel ─────────────────────────────────────────────────────────
const inpSt = { fontSize:12, padding:"6px 9px", borderRadius:6, border:"0.5px solid #ddd", background:"#fafafa", color:"#111", width:"100%", fontFamily:"inherit" };
const lblSt = { fontSize:10, color:"#888", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" };

function AlignControl({ value, onChange }) {
  const opts = [["left","ti-align-left"],["center","ti-align-center"],["right","ti-align-right"]];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={lblSt}>Alignment</label>
      <div style={{ display:"flex", border:"0.5px solid #ddd", borderRadius:6, overflow:"hidden" }}>
        {opts.map(([v,icon])=>(
          <button key={v} onClick={()=>onChange("align",v)} aria-label={v}
            style={{ flex:1, padding:"6px 0", border:"none", cursor:"pointer", background:value===v?"#f0f9f5":"transparent", color:value===v?BRAND.green:"#888", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>
            <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize:15 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function FontControl({ block, global, onChangeFont, onClearFont }) {
  const ef = resolveFont(block, global);
  const f = block.props.font || {};
  const hasOverride = f.family || f.size != null || f.weight != null;
  const defFamLabel = (FONT_FAMILIES.find((x) => x.value === global.family) || {}).label || "Poppins";
  const defWeightLabel = (FONT_WEIGHTS.find((w) => w[0] === ef.weight) || [])[1] || ef.weight;
  return (
    <div style={{ borderTop: "0.5px solid #e8e8e8", marginTop: 2, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: BRAND.green, letterSpacing: ".06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
        Typography
        {hasOverride && <span onClick={onClearFont} title="Reset to template default" style={{ fontSize: 9, fontWeight: 600, color: "#854F0B", background: "#FAEEDA", padding: "1px 6px", borderRadius: 8, cursor: "pointer" }}>override ✕</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={lblSt}>Font family</label>
        <select value={f.family || ""} onChange={(e) => onChangeFont("family", e.target.value || null)} style={inpSt}>
          <option value="">Template default ({defFamLabel})</option>
          {FONT_FAMILIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <label style={lblSt}>Size</label>
          <select value={f.size != null ? f.size : ""} onChange={(e) => onChangeFont("size", e.target.value === "" ? null : parseInt(e.target.value))} style={inpSt}>
            <option value="">Default ({ef.size}px)</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <label style={lblSt}>Weight</label>
          <select value={f.weight != null ? f.weight : ""} onChange={(e) => onChangeFont("weight", e.target.value === "" ? null : parseInt(e.target.value))} style={inpSt}>
            <option value="">Default ({defWeightLabel})</option>
            {FONT_WEIGHTS.map((w) => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 10, color: "#bbb", lineHeight: 1.5 }}>Leave on “default” to inherit the template typography.</p>
    </div>
  );
}

function PropsPanel({ block, onChange, onInsertVar, global, onChangeFont, onClearFont }) {
  if (!block) return <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#aaa", fontSize:13, textAlign:"center", padding:24, gap:8 }}><span style={{ fontSize:24 }}>☞</span><span>Click a block to edit its content</span></div>;
  const p = block.props;
  const fontUI = block.type === "header"
    ? null
    : <FontControl block={block} global={global} onChangeFont={onChangeFont} onClearFont={onClearFont} />;
  const inp = (k,l) => <div key={k} style={{ display:"flex", flexDirection:"column", gap:4 }}><label style={lblSt}>{l}</label><input value={p[k]||""} onChange={e=>onChange(k,e.target.value)} style={inpSt} /></div>;
  const ta  = (k,l,v) => <div key={k} style={{ display:"flex", flexDirection:"column", gap:4 }}><label style={lblSt}>{l}</label><textarea data-pta value={v!==undefined?v:(p[k]||"")} onChange={e=>onChange(k,e.target.value)} style={{ ...inpSt, resize:"vertical", minHeight:72, lineHeight:1.6 }} /></div>;
  const vars = <div style={{ display:"flex", flexDirection:"column", gap:4 }}><div style={lblSt}>Insert variable</div><div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{THYMELEAF_VARS.map(v=><span key={v} onClick={()=>onInsertVar(v)} style={{ padding:"2px 8px", borderRadius:10, background:"#f0f9f5", color:BRAND.green, fontSize:10, fontWeight:600, cursor:"pointer", border:`0.5px solid ${BRAND.greenLight}` }}>{v}</span>)}</div></div>;

  switch (block.type) {
    case "header":     return <>{inp("brand","Brand name")}{inp("tagline","Tagline")}{inp("logo","Logo URL (Cloudinary)")}<p style={{ fontSize:10, color:"#bbb" }}>Header uses the template default family.</p></>;
    case "hero-title": return <>{ta("title","Headline")}<AlignControl value={p.align||"center"} onChange={onChange} />{fontUI}</>;
    case "hero-image": return <>
      {inp("src","Image URL (Cloudinary)")}{inp("alt","Alt text")}
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <label style={lblSt}>Vertical offset (overlap)</label>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="range" min={-300} max={40} step={5} value={p.offset||0} onChange={e=>onChange("offset",parseInt(e.target.value))} style={{ flex:1 }} />
          <span style={{ fontSize:11, fontWeight:600, color:BRAND.green, minWidth:42, textAlign:"right" }}>{p.offset||0}px</span>
        </div>
        <p style={{ fontSize:10, color:"#bbb", lineHeight:1.5 }}>Negative pulls the image up under the title (your template uses -210px). 0 = no overlap.</p>
      </div>
      <AlignControl value={p.align||"center"} onChange={onChange} />
    </>;
    case "salutation": return <>{inp("variable","Variable (Thymeleaf)")}<AlignControl value={p.align||"left"} onChange={onChange} /><p style={{ fontSize:10, color:"#bbb" }}>Exports as: Dear &lt;span th:text="{p.variable}"&gt;&lt;/span&gt;,</p>{fontUI}</>;
    case "paragraph":  return <>{ta("content","Body text")}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}{fontUI}</>;
    case "subheading": return <>{inp("text","Subheading text")}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}{fontUI}</>;
    case "bullets": {
      const txt = (p.items||[]).join("\n");
      return <>{ta("_items","Bullet points (one per line)",txt)}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}<p style={{ fontSize:10, color:"#bbb" }}>Centered/right bullets sit inline.</p>{fontUI}</>;
    }
    case "signoff":    return <>{inp("closing","Closing line")}{inp("team","Team name")}<AlignControl value={p.align||"left"} onChange={onChange} />{fontUI}</>;
    case "cta":        return <>{inp("label","Button text")}{inp("url","Button URL")}<AlignControl value={p.align||"center"} onChange={onChange} />{fontUI}</>;
    case "footer":     return <>{inp("support","Support URL")}{inp("email","Contact email")}<AlignControl value={p.align||"center"} onChange={onChange} />{fontUI}</>;
    default:           return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
let _id = 20;
const uid = () => "b"+(++_id);

export default function TemplateBuilder1Gov({ onSave, onContinue, onSaveDraft, onPublish, onBack, initialSubject, initialBlocks, initialGlobalFont, deliveryReady = true, sendProfiles = [], onGoToSettings, toast }) {
  const [blocks,   setBlocks]   = useState(() => (initialBlocks && initialBlocks.length ? initialBlocks : DEFAULT_BLOCKS));
  const [selId,    setSelId]    = useState(null);
  const [subject,  setSubject]  = useState(initialSubject != null ? initialSubject : "Workgroups are coming to 1Gov");
  const [preview,  setPreview]  = useState("desktop");
  const [dragOver, setDragOver] = useState(false);
  const [global,   setGlobal]   = useState(() => ({ ...DEFAULT_GLOBAL_FONT, ...(initialGlobalFont || {}) }));
  const [testOpen, setTestOpen] = useState(false);

  const selBlock = blocks.find(b=>b.id===selId) || null;

  const setGlobalFont = useCallback((k, v) => setGlobal((g) => ({ ...g, [k]: v })), []);
  const changeFont = useCallback((k, v) => setBlocks(p => p.map(b => {
    if (b.id !== selId) return b;
    const font = { ...(b.props.font || {}) };
    if (v == null) delete font[k]; else font[k] = v;
    const props = { ...b.props };
    if (Object.keys(font).length === 0) delete props.font; else props.font = font;
    return { ...b, props };
  })), [selId]);
  const clearFont = useCallback(() => setBlocks(p => p.map(b => {
    if (b.id !== selId) return b;
    const props = { ...b.props }; delete props.font; return { ...b, props };
  })), [selId]);

  const addBlock   = useCallback(t => { const b={id:uid(),type:t,props:{...BLOCK_DEFAULTS[t]}}; setBlocks(p=>[...p,b]); setSelId(b.id); }, []);
  const removeBlock = useCallback(id => { setBlocks(p=>p.filter(b=>b.id!==id)); setSelId(p=>p===id?null:p); }, []);
  const moveBlock  = useCallback((id,d) => setBlocks(p=>{ const a=[...p],i=a.findIndex(b=>b.id===id),j=i+d; if(j<0||j>=a.length)return a; [a[i],a[j]]=[a[j],a[i]]; return a; }), []);
  const updateProp = useCallback((k,v) => setBlocks(p=>p.map(b=>{ if(b.id!==selId)return b; if(k==="_items")return{...b,props:{...b.props,items:v.split("\n")}}; return {...b,props:{...b.props,[k]:v}}; })), [selId]);

  const insertVar = useCallback(v => {
    const ta = document.querySelector("[data-pta]");
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const key = selBlock?.type === "bullets" ? "_items" : (selBlock?.type === "paragraph" ? "content" : "text");
    updateProp(key, ta.value.slice(0,s)+v+ta.value.slice(e));
  }, [selBlock, updateProp]);

  const exportHtml = () => {
    const html = buildHtml(subject, blocks, global);
    if (onSave) { onSave({ subject, blocks, html, global }); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html],{type:"text/html"}));
    a.download = "1gov-template.html"; a.click();
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"185px 1fr 250px", height:"100vh", fontFamily:"Poppins, system-ui, sans-serif", background:"#fff" }}>
      <aside style={{ borderRight:"0.5px solid #e8e8e8", display:"flex", flexDirection:"column", background:"#fafafa" }}>
        <div style={ph}>Blocks</div>
        <div style={{ padding:10, display:"flex", flexDirection:"column", gap:5, overflowY:"auto", flex:1 }}>
          {PALETTE.map(([t,l])=><button key={t} onClick={()=>addBlock(t)} style={pbtn}>{l}</button>)}
        </div>
        <div style={{ padding:"11px 12px", borderTop:"0.5px solid #e8e8e8", display:"flex", flexDirection:"column", gap:8, background:"#fff" }}>
          <div style={{ fontSize:10, fontWeight:600, color:BRAND.green, letterSpacing:".06em", textTransform:"uppercase" }}>Template typography</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={lblSt}>Default family</label>
            <select value={global.family} onChange={e=>setGlobalFont("family", e.target.value)} style={inpSt}>
              {FONT_FAMILIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
              <label style={lblSt}>Body size</label>
              <select value={global.size} onChange={e=>setGlobalFont("size", parseInt(e.target.value))} style={inpSt}>
                {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
              <label style={lblSt}>Body weight</label>
              <select value={global.weight} onChange={e=>setGlobalFont("weight", parseInt(e.target.value))} style={inpSt}>
                {FONT_WEIGHTS.map(w=><option key={w[0]} value={w[0]}>{w[1]}</option>)}
              </select>
            </div>
          </div>
          <p style={{ fontSize:10, color:"#bbb", lineHeight:1.5 }}>Applies to every block unless a block sets its own override.</p>
        </div>
      </aside>

      <main style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderBottom:"0.5px solid #e8e8e8", flexWrap:"wrap" }}>
          {onBack && <button onClick={onBack} style={{ padding:"5px 9px", fontSize:11, borderRadius:6, border:"0.5px solid #e0e0e0", background:"transparent", cursor:"pointer", fontFamily:"inherit" }}>← Back</button>}
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject" style={{ ...inpSt, flex:1, minWidth:150 }} />
          <div style={{ display:"flex", border:"0.5px solid #e0e0e0", borderRadius:6, overflow:"hidden" }}>
            {["desktop","mobile"].map(m=><button key={m} onClick={()=>setPreview(m)} style={{ padding:"4px 11px", fontSize:11, border:"none", cursor:"pointer", background:preview===m?"#eee":"transparent", color:preview===m?"#111":"#888", fontWeight:preview===m?600:400, fontFamily:"inherit" }}>{m==="desktop"?"Desktop":"Mobile"}</button>)}
          </div>
          <button onClick={() => setTestOpen(true)} style={{ padding:"5px 11px", fontSize:11, borderRadius:6, border:`0.5px solid ${BRAND.green}`, background:"#f0f9f5", color:BRAND.green, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>✉ Send test</button>
          <button onClick={exportHtml} style={{ padding:"5px 11px", fontSize:11, borderRadius:6, border:"0.5px solid #e0e0e0", background:"transparent", cursor:"pointer", fontFamily:"inherit" }}>Export HTML</button>
          {onSaveDraft && <button onClick={()=>onSaveDraft({ subject, blocks, global })} style={{ padding:"5px 12px", fontSize:11, borderRadius:6, border:`0.5px solid ${BRAND.green}`, background:"transparent", color:BRAND.green, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Save draft</button>}
          {onPublish && <button onClick={()=>onPublish({ subject, blocks, global })} style={{ padding:"5px 12px", fontSize:11, borderRadius:6, border:"none", background:BRAND.green, color:"#fff", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Publish →</button>}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:preview==="mobile"?20:0, background:"#EBEBEB", display:"flex", justifyContent:"center" }}>
          <div style={{ width:preview==="mobile"?375:"100%", maxWidth:preview==="mobile"?375:"100%", background:"#fff", border:preview==="mobile"?"0.5px solid #ddd":"none", overflow:"hidden", height:"fit-content" }} onClick={()=>setSelId(null)}>
            <table cellPadding="0" cellSpacing="0" width="100%" style={{ background:"#fff" }}><tbody>
              {blocks.map(block=>(
                <tr key={block.id}>
                  <td style={{ padding:0 }}>
                    <div onClick={e=>{e.stopPropagation();setSelId(block.id);}} style={{ position:"relative", outline:block.id===selId?`2px solid ${BRAND.green}`:"2px solid transparent", cursor:"pointer" }}>
                      {block.id===selId && (
                        <div style={{ position:"absolute", top:5, right:5, display:"flex", gap:3, zIndex:30 }}>
                          {[["↑",()=>moveBlock(block.id,-1)],["↓",()=>moveBlock(block.id,1)],["✕",()=>removeBlock(block.id)]].map(([l,fn])=><button key={l} onClick={e=>{e.stopPropagation();fn();}} style={{ width:22,height:22,borderRadius:4,border:"0.5px solid #ccc",background:"#fff",cursor:"pointer",fontSize:11,color:l==="✕"?"#c0392b":"#555" }}>{l}</button>)}
                        </div>
                      )}
                      <table cellPadding="0" cellSpacing="0" width="100%"><tbody><tr><BlockPreview block={block} global={global} /></tr></tbody></table>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody></table>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);}} style={{ margin:12, minHeight:48, border:`1.5px dashed ${dragOver?BRAND.green:"#ccc"}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:dragOver?BRAND.green:"#bbb", background:dragOver?"#f0f9f5":"transparent", fontFamily:"inherit" }}>+ Drop a block or click from the palette</div>
          </div>
        </div>
      </main>

      <aside style={{ borderLeft:"0.5px solid #e8e8e8", display:"flex", flexDirection:"column" }}>
        <div style={ph}>Properties</div>
        <div style={{ padding:14, flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
          <PropsPanel block={selBlock} onChange={updateProp} onInsertVar={insertVar} global={global} onChangeFont={changeFont} onClearFont={clearFont} />
        </div>
        <div style={{ padding:"12px 14px", borderTop:"0.5px solid #e8e8e8", display:"flex", flexDirection:"column", gap:6 }}>
          {onSaveDraft || onPublish ? (
            <>
              {onSaveDraft && <button onClick={()=>onSaveDraft({ subject, blocks, global })} style={{ width:"100%", padding:"8px 0", borderRadius:6, border:`0.5px solid ${BRAND.green}`, background:"transparent", color:BRAND.green, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Save draft</button>}
              {onPublish && <button onClick={()=>onPublish({ subject, blocks, global })} style={{ width:"100%", padding:"9px 0", borderRadius:6, border:"none", background:BRAND.green, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Publish version →</button>}
            </>
          ) : (
            <>
              <button onClick={exportHtml} style={{ width:"100%", padding:"8px 0", borderRadius:6, border:`0.5px solid ${BRAND.green}`, background:"transparent", color:BRAND.green, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Export HTML</button>
              <button onClick={()=>onContinue?onContinue({subject,blocks,global}):alert("Wire onContinue to navigate to audience + send flow.")} style={{ width:"100%", padding:"9px 0", borderRadius:6, border:"none", background:BRAND.green, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Continue to send →</button>
            </>
          )}
        </div>
      </aside>
      {testOpen && <TestSendModal subject={subject} blocks={blocks} global={global} deliveryReady={deliveryReady} sendProfiles={sendProfiles} onGoToSettings={onGoToSettings} toast={toast} onClose={() => setTestOpen(false)} />}
    </div>
  );
}

const ph   = { padding:"11px 14px", borderBottom:"0.5px solid #e8e8e8", fontSize:10, fontWeight:600, color:"#aaa", letterSpacing:".07em", textTransform:"uppercase" };
const pbtn = { display:"flex", alignItems:"center", gap:8, padding:"8px 11px", borderRadius:6, border:"0.5px solid #e0e0e0", background:"#fff", cursor:"pointer", fontSize:12, color:"#333", textAlign:"left", fontFamily:"inherit" };
