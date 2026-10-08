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
  "footer":     { support:"http://support.1gov.ng", email:"1govecms@galaxybackbone.com.ng", align:"center" },
};

const PALETTE = [
  ["header","Header"],["hero-title","Hero title"],["hero-image","Hero image"],
  ["salutation","Salutation"],["paragraph","Paragraph"],["subheading","Subheading"],
  ["bullets","Bullet list"],["signoff","Sign-off"],["footer","Footer"],
];

const THYMELEAF_VARS = ["${userName}", "${email}", "${planName}", "${mdaName}"];

const esc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

// ─── HTML export (matches your Thymeleaf template exactly) ───────────────────
function blockToHtml(b) {
  const p = b.props;
  const a = p.align || "left";
  switch (b.type) {
    case "header": return `
          <tr>
            <td style="padding:30px;width:60%">
              <div style="font-size:24px;font-weight:600;color:${BRAND.green};font-family:${POP}">${esc(p.brand)}</div>
              <div style="font-size:10px;color:${BRAND.green};font-family:${POP}">${esc(p.tagline)}</div>
            </td>
            <td style="padding:30px 15px 30px 30px;text-align:right;width:40%">
              <img src="${p.logo}" alt="Galaxy Backbone" style="width:130px;height:auto">
            </td>
          </tr>`;
    case "hero-title": return `
          <tr><td colspan="2" style="text-align:${a};padding:10px 40px 20px">
            <div style="font-size:25px;font-weight:600;color:#01150C;font-family:${INTER}">${esc(p.title)}</div>
          </td></tr>`;
    case "hero-image":
      if (!p.src) return `          <!-- hero image placeholder -->`;
      { const off=p.offset||0; const mm={left:`${off}px auto 0 0`,center:`${off}px auto 0`,right:`${off}px 0 0 auto`};
      return `
          <tr><td colspan="2" style="padding:0;text-align:${a}">
            <img src="${p.src}" alt="${esc(p.alt)}" style="width:100%;max-width:700px;height:auto;display:block;margin:${mm[a]};position:relative;z-index:1">
          </td></tr>`; }
    case "salutation": return `
          <tr><td colspan="2" style="padding:40px 40px 0;text-align:${a};color:${BRAND.textDark};font-size:20px;font-weight:600;font-family:${POP}">Dear <span th:text="${p.variable}"></span>,</td></tr>`;
    case "paragraph": return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a};color:${BRAND.textBody};font-size:16px;line-height:26px;font-family:${POP}">${esc(p.content).replace(/\n/g,"<br>")}</td></tr>`;
    case "subheading": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};font-size:16px;font-weight:700;font-family:${POP}">${esc(p.text)}</td></tr>`;
    case "bullets": { const ls = a==="left" ? "padding:0 0 0 20px" : "list-style-position:inside;padding:0";
      return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a}">
            <ul style="margin:0;${ls};color:${BRAND.textBody};font-size:16px;line-height:26px;font-family:${POP}">
              ${(p.items||[]).map((i,idx)=>`<li style="margin-bottom:${idx===p.items.length-1?0:12}px">${esc(i)}</li>`).join("\n              ")}
            </ul>
          </td></tr>`; }
    case "signoff": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};font-size:16px;line-height:26px;font-family:${POP}">${esc(p.closing)}<br><span style="font-weight:700">${esc(p.team)}</span></td></tr>`;
    case "footer": return `
          <tr><td colspan="2" style="padding:40px 40px 30px">
            <div style="border-top:1px solid #CCCCCC;padding-top:30px;text-align:${a};color:${BRAND.textDark};font-size:13px;line-height:24px;font-family:${POP}">
              Questions about 1Gov? Visit our Knowledge base at <a href="${p.support}" style="color:${BRAND.greenMid};text-decoration:none">1Government Support</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};font-size:13px;line-height:24px;font-family:${POP}">
              For Further enquiries, contact: <a href="mailto:${p.email}" style="color:${BRAND.greenMid};text-decoration:none">${esc(p.email)}</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};font-size:13px;line-height:24px;padding-top:40px;font-family:${POP}">Powered by 1Government Cloud.</div>
          </td></tr>`;
    default: return "";
  }
}

export function buildHtml(subject, blocks) {
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
${blocks.map(blockToHtml).join("\n")}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── React preview (uses tables to match real layout) ────────────────────────
function BlockPreview({ block }) {
  const p = block.props;
  const a = p.align || "left";
  const td = { fontFamily:POP };
  switch (block.type) {
    case "header":
      return (<>
        <td style={{ padding:30, width:"60%" }}>
          <div style={{ fontSize:24, fontWeight:600, color:BRAND.green, fontFamily:POP }}>{p.brand}</div>
          <div style={{ fontSize:10, color:BRAND.green, fontFamily:POP }}>{p.tagline}</div>
        </td>
        <td style={{ padding:"30px 15px 30px 30px", textAlign:"right", width:"40%" }}>
          <img src={p.logo} alt="Galaxy Backbone" style={{ width:130, height:"auto" }} />
        </td>
      </>);
    case "hero-title":
      return <td colSpan={2} style={{ textAlign:a, padding:"10px 40px 20px" }}><div style={{ fontSize:25, fontWeight:600, color:"#01150C", fontFamily:INTER }}>{p.title}</div></td>;
    case "hero-image": {
      const off=p.offset||0; const mm={left:`${off}px auto 0 0`,center:`${off}px auto 0`,right:`${off}px 0 0 auto`};
      return <td colSpan={2} style={{ padding:0, textAlign:a }}>
        {p.src
          ? <img src={p.src} alt={p.alt} style={{ width:"100%", maxWidth:700, height:"auto", display:"block", margin:mm[a], position:"relative", zIndex:1 }} />
          : <div style={{ margin:"0 30px", background:"#f0f9f5", border:`1.5px dashed ${BRAND.greenLight}`, borderRadius:6, padding:36, color:BRAND.greenMid, fontSize:13, fontFamily:POP }}>📷 Paste a Cloudinary image URL</div>}
      </td>; }
    case "salutation":
      return <td colSpan={2} style={{ padding:"40px 40px 0", textAlign:a, color:BRAND.textDark, fontSize:20, fontWeight:600, ...td }}>Dear <span style={{ color:BRAND.green }}>{p.variable}</span>,</td>;
    case "paragraph":
      return <td colSpan={2} style={{ padding:"16px 40px 0", textAlign:a, color:BRAND.textBody, fontSize:16, lineHeight:"26px", ...td }}>{p.content}</td>;
    case "subheading":
      return <td colSpan={2} style={{ padding:"24px 40px 0", textAlign:a, color:BRAND.textBody, fontSize:16, fontWeight:700, ...td }}>{p.text}</td>;
    case "bullets":
      return <td colSpan={2} style={{ padding:"16px 40px 0", textAlign:a }}>
        <ul style={{ margin:0, ...(a==="left"?{padding:"0 0 0 20px"}:{listStylePosition:"inside",padding:0}), color:BRAND.textBody, fontSize:16, lineHeight:"26px", fontFamily:POP }}>
          {(p.items||[]).map((it,i)=><li key={i} style={{ marginBottom:i===p.items.length-1?0:12, paddingLeft:8 }}>{it}</li>)}
        </ul>
      </td>;
    case "signoff":
      return <td colSpan={2} style={{ padding:"24px 40px 0", textAlign:a, color:BRAND.textBody, fontSize:16, lineHeight:"26px", ...td }}>{p.closing}<br/><span style={{ fontWeight:700 }}>{p.team}</span></td>;
    case "footer":
      return <td colSpan={2} style={{ padding:"40px 40px 30px" }}>
        <div style={{ borderTop:"1px solid #CCCCCC", paddingTop:30, textAlign:a, color:BRAND.textDark, fontSize:13, lineHeight:"24px", fontFamily:POP }}>Questions about 1Gov? Visit our Knowledge base at <a href={p.support} style={{ color:BRAND.greenMid, textDecoration:"none" }}>1Government Support</a></div>
        <div style={{ textAlign:a, color:BRAND.textDark, fontSize:13, lineHeight:"24px", fontFamily:POP }}>For Further enquiries, contact: <a href={`mailto:${p.email}`} style={{ color:BRAND.greenMid, textDecoration:"none" }}>{p.email}</a></div>
        <div style={{ textAlign:a, color:BRAND.textDark, fontSize:13, lineHeight:"24px", paddingTop:40, fontFamily:POP }}>Powered by 1Government Cloud.</div>
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

function PropsPanel({ block, onChange, onInsertVar }) {
  if (!block) return <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#aaa", fontSize:13, textAlign:"center", padding:24, gap:8 }}><span style={{ fontSize:24 }}>☞</span><span>Click a block to edit its content</span></div>;
  const p = block.props;
  const inp = (k,l) => <div key={k} style={{ display:"flex", flexDirection:"column", gap:4 }}><label style={lblSt}>{l}</label><input value={p[k]||""} onChange={e=>onChange(k,e.target.value)} style={inpSt} /></div>;
  const ta  = (k,l,v) => <div key={k} style={{ display:"flex", flexDirection:"column", gap:4 }}><label style={lblSt}>{l}</label><textarea data-pta value={v!==undefined?v:(p[k]||"")} onChange={e=>onChange(k,e.target.value)} style={{ ...inpSt, resize:"vertical", minHeight:72, lineHeight:1.6 }} /></div>;
  const vars = <div style={{ display:"flex", flexDirection:"column", gap:4 }}><div style={lblSt}>Insert variable</div><div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>{THYMELEAF_VARS.map(v=><span key={v} onClick={()=>onInsertVar(v)} style={{ padding:"2px 8px", borderRadius:10, background:"#f0f9f5", color:BRAND.green, fontSize:10, fontWeight:600, cursor:"pointer", border:`0.5px solid ${BRAND.greenLight}` }}>{v}</span>)}</div></div>;

  switch (block.type) {
    case "header":     return <>{inp("brand","Brand name")}{inp("tagline","Tagline")}{inp("logo","Logo URL (Cloudinary)")}</>;
    case "hero-title": return <>{ta("title","Headline")}<AlignControl value={p.align||"center"} onChange={onChange} /><p style={{ fontSize:10, color:"#bbb" }}>Uses Inter font, matching your template.</p></>;
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
    case "salutation": return <>{inp("variable","Variable (Thymeleaf)")}<AlignControl value={p.align||"left"} onChange={onChange} /><p style={{ fontSize:10, color:"#bbb" }}>Exports as: Dear &lt;span th:text="{p.variable}"&gt;&lt;/span&gt;,</p></>;
    case "paragraph":  return <>{ta("content","Body text")}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}</>;
    case "subheading": return <>{inp("text","Subheading text")}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}</>;
    case "bullets": {
      const txt = (p.items||[]).join("\n");
      return <>{ta("_items","Bullet points (one per line)",txt)}<AlignControl value={p.align||"left"} onChange={onChange} />{vars}<p style={{ fontSize:10, color:"#bbb" }}>Centered/right bullets sit inline.</p></>;
    }
    case "signoff":    return <>{inp("closing","Closing line")}{inp("team","Team name")}<AlignControl value={p.align||"left"} onChange={onChange} /></>;
    case "footer":     return <>{inp("support","Support URL")}{inp("email","Contact email")}<AlignControl value={p.align||"center"} onChange={onChange} /></>;
    default:           return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
let _id = 20;
const uid = () => "b"+(++_id);

export default function TemplateBuilder1Gov({ onSave, onContinue }) {
  const [blocks,   setBlocks]   = useState(DEFAULT_BLOCKS);
  const [selId,    setSelId]    = useState(null);
  const [subject,  setSubject]  = useState("Workgroups are coming to 1Gov");
  const [preview,  setPreview]  = useState("desktop");
  const [dragOver, setDragOver] = useState(false);

  const selBlock = blocks.find(b=>b.id===selId) || null;

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
    const html = buildHtml(subject, blocks);
    if (onSave) { onSave({ subject, blocks, html }); return; }
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
      </aside>

      <main style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderBottom:"0.5px solid #e8e8e8", flexWrap:"wrap" }}>
          <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Email subject" style={{ ...inpSt, flex:1, minWidth:150 }} />
          <div style={{ display:"flex", border:"0.5px solid #e0e0e0", borderRadius:6, overflow:"hidden" }}>
            {["desktop","mobile"].map(m=><button key={m} onClick={()=>setPreview(m)} style={{ padding:"4px 11px", fontSize:11, border:"none", cursor:"pointer", background:preview===m?"#eee":"transparent", color:preview===m?"#111":"#888", fontWeight:preview===m?600:400, fontFamily:"inherit" }}>{m==="desktop"?"Desktop":"Mobile"}</button>)}
          </div>
          <button onClick={exportHtml} style={{ padding:"5px 11px", fontSize:11, borderRadius:6, border:"0.5px solid #e0e0e0", background:"transparent", cursor:"pointer", fontFamily:"inherit" }}>Export HTML</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:20, background:"#EBEBEB", display:"flex", justifyContent:"center" }}>
          <div style={{ width:preview==="mobile"?375:700, background:"#fff", border:"0.5px solid #ddd", overflow:"hidden", height:"fit-content" }} onClick={()=>setSelId(null)}>
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
                      <table cellPadding="0" cellSpacing="0" width="100%"><tbody><tr><BlockPreview block={block} /></tr></tbody></table>
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
          <PropsPanel block={selBlock} onChange={updateProp} onInsertVar={insertVar} />
        </div>
        <div style={{ padding:"12px 14px", borderTop:"0.5px solid #e8e8e8", display:"flex", flexDirection:"column", gap:6 }}>
          <button onClick={exportHtml} style={{ width:"100%", padding:"8px 0", borderRadius:6, border:`0.5px solid ${BRAND.green}`, background:"transparent", color:BRAND.green, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Export HTML</button>
          <button onClick={()=>onContinue?onContinue({subject,blocks}):alert("Wire onContinue to navigate to audience + send flow.")} style={{ width:"100%", padding:"9px 0", borderRadius:6, border:"none", background:BRAND.green, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Continue to send →</button>
        </div>
      </aside>
    </div>
  );
}

const ph   = { padding:"11px 14px", borderBottom:"0.5px solid #e8e8e8", fontSize:10, fontWeight:600, color:"#aaa", letterSpacing:".07em", textTransform:"uppercase" };
const pbtn = { display:"flex", alignItems:"center", gap:8, padding:"8px 11px", borderRadius:6, border:"0.5px solid #e0e0e0", background:"#fff", cursor:"pointer", fontSize:12, color:"#333", textAlign:"left", fontFamily:"inherit" };
