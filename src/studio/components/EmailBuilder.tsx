"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, ArrowDown, X, Mail, Download, Save, Send, AlignLeft, AlignCenter, AlignRight, MousePointerClick, CheckCircle2, ImageIcon, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { BRAND, CICOD } from "@/lib/studio/brand";
import {
  BLOCK_DEFAULTS, DEFAULT_GLOBAL_FONT, FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS, PALETTE, SAMPLE_VALUES, VARIABLES, VAR_KEYS,
  buildHtml, newBlockId, resolveFont, resolveMergeVars, type Block, type BlockProps, type BlockType, type GlobalFont,
} from "@/lib/studio/blocks";
import { currentVersion, currentVersionNumber, publishDraft, updateDraft, useStudioTemplates } from "@/lib/studio/templates";
import { useStudioPermissions } from "@/lib/studio/access";
import { sendable, useDeliveryProfiles } from "@/lib/studio/delivery";

const famLabel = (v: string) => FONT_FAMILIES.find((f) => f.value === v)?.label ?? v;

export function EmailBuilder({ id }: { id: string }) {
  const router = useRouter();
  const templates = useStudioTemplates();
  const { canManage } = useStudioPermissions("templates");
  const t = templates.find((x) => x.id === id);
  if (!t) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 bg-[var(--background)]">
        <p className="font-heading font-bold m-0">Template not found</p>
        <Link href="/templates"><Button variant="outline">Back to the library</Button></Link>
      </div>
    );
  }
  const src = t.draft ?? currentVersion(t);
  return <Editor key={id} templateId={id} templateName={t.name} nextVersion={(currentVersionNumber(t) ?? 0) + 1} canManage={canManage}
    initial={{ subject: src?.subject ?? "", blocks: src?.blocks ?? [], global: { ...DEFAULT_GLOBAL_FONT, ...(src?.global ?? {}) } }}
    onLeave={() => router.push(`/templates/${id}`)} />;
}

type EditorState = { subject: string; blocks: Block[]; global: GlobalFont };

function Editor({ templateId, templateName, nextVersion, canManage, initial, onLeave }: { templateId: string; templateName: string; nextVersion: number; canManage: boolean; initial: EditorState; onLeave: () => void }) {
  const [subject, setSubject] = React.useState(initial.subject);
  const [blocks, setBlocks] = React.useState<Block[]>(initial.blocks);
  const [global, setGlobal] = React.useState<GlobalFont>(initial.global);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<"desktop" | "mobile">("desktop");
  const [testOpen, setTestOpen] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [saved, setSaved] = React.useState(JSON.stringify(initial));
  const dirty = JSON.stringify({ subject, blocks, global }) !== saved;
  const sel = blocks.find((b) => b.id === selId) ?? null;

  const addBlock = (type: BlockType) => { const b: Block = { id: newBlockId(), type, props: { ...BLOCK_DEFAULTS[type] } }; setBlocks((p) => [...p, b]); setSelId(b.id); };
  const removeBlock = (bid: string) => { setBlocks((p) => p.filter((b) => b.id !== bid)); setSelId((s) => (s === bid ? null : s)); };
  const moveBlock = (bid: string, d: -1 | 1) => setBlocks((p) => { const a = [...p]; const i = a.findIndex((b) => b.id === bid); const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const updateProp = (k: keyof BlockProps | "_items", v: string | number) => setBlocks((p) => p.map((b) => (b.id !== selId ? b : k === "_items" ? { ...b, props: { ...b.props, items: String(v).split("\n") } } : { ...b, props: { ...b.props, [k]: v } })));
  const changeFont = (k: "family" | "size" | "weight", v: string | number | null) => setBlocks((p) => p.map((b) => {
    if (b.id !== selId) return b;
    const font = { ...(b.props.font ?? {}) } as Record<string, string | number>;
    if (v == null) delete font[k]; else font[k] = v;
    const props = { ...b.props, font: Object.keys(font).length ? font : undefined };
    return { ...b, props };
  }));

  const save = () => { updateDraft(templateId, { subject, blocks, global }); setSaved(JSON.stringify({ subject, blocks, global })); toast.success("Draft saved"); };
  const publish = () => { updateDraft(templateId, { subject, blocks, global }); publishDraft(templateId); setSaved(JSON.stringify({ subject, blocks, global })); setPublishing(false); toast.success(`Published as v${nextVersion}`); onLeave(); };
  const exportHtml = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buildHtml(subject, blocks, global)], { type: "text/html" }));
    a.download = "cicod-template.html"; a.click();
    toast.success("HTML exported");
  };

  return (
    <div className="grid grid-cols-[210px_1fr_290px] h-screen bg-[var(--card)] text-[var(--foreground)]">
      {/* Blocks palette + template typography */}
      <aside className="border-r border-[var(--border)] flex flex-col bg-[var(--background)] min-h-0" aria-label="Blocks">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Editing</div>
          <div className="font-heading font-bold text-[0.9rem] truncate" title={templateName}>{templateName}</div>
        </div>
        <div className="px-4 pt-3 text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Blocks</div>
        <div className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1">
          {PALETTE.map(([type, label]) => (
            <button key={type} type="button" disabled={!canManage} onClick={() => addBlock(type)} aria-label={`Add ${label} block`}
              className="text-left px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[0.86rem] hover:border-[var(--primary)] disabled:opacity-50">{label}</button>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--border)] bg-[var(--card)] flex flex-col gap-2.5">
          <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--accent-foreground)]">Template typography</div>
          <label className="flex flex-col gap-1"><span className="text-[0.75rem] font-semibold text-[var(--muted-foreground)]">Default font</span>
            <select aria-label="Default font" className={selCls} value={global.family} onChange={(e) => setGlobal((g) => ({ ...g, family: e.target.value }))}>{FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1"><span className="text-[0.75rem] font-semibold text-[var(--muted-foreground)]">Body size</span>
              <select aria-label="Body size" className={selCls} value={global.size} onChange={(e) => setGlobal((g) => ({ ...g, size: Number(e.target.value) }))}>{FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}</select>
            </label>
            <label className="flex flex-col gap-1"><span className="text-[0.75rem] font-semibold text-[var(--muted-foreground)]">Body weight</span>
              <select aria-label="Body weight" className={selCls} value={global.weight} onChange={(e) => setGlobal((g) => ({ ...g, weight: Number(e.target.value) }))}>{FONT_WEIGHTS.map(([w, l]) => <option key={w} value={w}>{l}</option>)}</select>
            </label>
          </div>
          <p className="m-0 text-[0.72rem] text-[var(--muted-foreground)]">Applies to every block unless a block sets its own.</p>
        </div>
      </aside>

      {/* Toolbar + canvas */}
      <main className="flex flex-col min-h-0 min-w-0">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] flex-wrap">
          <Button size="sm" variant="outline" onClick={() => (dirty ? setLeaving(true) : onLeave())}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <input aria-label="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" disabled={!canManage}
            className="flex-1 min-w-[140px] h-9 px-3 rounded-md border-[1.5px] border-[var(--input)] bg-[var(--background)] text-[0.88rem] focus:outline-none focus:border-[var(--ring)]" />
          <div role="radiogroup" aria-label="Preview size" className="flex bg-[var(--muted)] p-0.5 rounded-md">
            {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([m, Icon, l]) => (
              <button key={m} type="button" role="radio" aria-checked={preview === m} onClick={() => setPreview(m)}
                className={cn("px-2.5 py-1 rounded text-[0.8rem] font-semibold flex items-center gap-1", preview === m ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]")}><Icon className="w-3.5 h-3.5" />{l}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setTestOpen(true)}><Mail className="w-4 h-4 mr-1" /> Send test</Button>
          <Button size="sm" variant="outline" onClick={exportHtml}><Download className="w-4 h-4 mr-1" /> Export HTML</Button>
          {canManage && <Button size="sm" variant="outline" onClick={save} disabled={!dirty}><Save className="w-4 h-4 mr-1" /> Save draft</Button>}
          {canManage && <Button size="sm" onClick={() => setPublishing(true)}><Send className="w-4 h-4 mr-1" /> Publish v{nextVersion}</Button>}
        </div>
        <div className={cn("flex-1 overflow-y-auto bg-[var(--muted)] flex justify-center", preview === "mobile" ? "p-5" : "p-0")} onClick={() => setSelId(null)}>
          <div className={cn("bg-white h-fit text-left", preview === "mobile" ? "w-[375px] border border-[var(--border)] shadow-sm" : "w-full max-w-[760px]")} aria-label="Email canvas">
            {blocks.map((b) => (
              <div key={b.id} onClick={(e) => { e.stopPropagation(); setSelId(b.id); }} role="button" tabIndex={0} aria-label={`${b.type} block`} aria-pressed={b.id === selId}
                onKeyDown={(e) => { if (e.key === "Enter") setSelId(b.id); }}
                className={cn("relative cursor-pointer outline outline-2 -outline-offset-2", b.id === selId ? "outline-[var(--primary)]" : "outline-transparent hover:outline-[var(--primary)]/40")}>
                {b.id === selId && canManage && (
                  <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
                    <ToolBtn label="Move block up" onClick={() => moveBlock(b.id, -1)}><ArrowUp className="w-3.5 h-3.5" /></ToolBtn>
                    <ToolBtn label="Move block down" onClick={() => moveBlock(b.id, 1)}><ArrowDown className="w-3.5 h-3.5" /></ToolBtn>
                    <ToolBtn label="Remove block" danger onClick={() => removeBlock(b.id)}><X className="w-3.5 h-3.5" /></ToolBtn>
                  </div>
                )}
                <table cellPadding={0} cellSpacing={0} width="100%"><tbody><tr><BlockPreview block={b} global={global} /></tr></tbody></table>
              </div>
            ))}
            <div className="m-3 min-h-12 border-[1.5px] border-dashed border-[#D3D9E2] rounded-lg flex items-center justify-center text-[0.82rem] text-[#6B7787]">+ Click a block on the left to add it here</div>
          </div>
        </div>
      </main>

      {/* Properties */}
      <aside className="border-l border-[var(--border)] flex flex-col min-h-0" aria-label="Properties">
        <div className="px-4 py-3 border-b border-[var(--border)] text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Properties</div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3.5">
          {sel ? <PropsPanel key={sel.id} block={sel} global={global} disabled={!canManage} onChange={updateProp} onFont={changeFont} />
            : <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-[var(--muted-foreground)] text-[0.86rem]"><MousePointerClick className="w-6 h-6" />Click a block to edit its content</div>}
        </div>
        {canManage && (
          <div className="p-4 border-t border-[var(--border)] flex flex-col gap-2">
            <Button variant="outline" onClick={save} disabled={!dirty}>Save draft</Button>
            <Button onClick={() => setPublishing(true)}>Publish version {nextVersion}</Button>
          </div>
        )}
      </aside>

      {testOpen && <TestSendModal subject={subject} blocks={blocks} global={global} onClose={() => setTestOpen(false)} />}
      <ConfirmDialog
        isOpen={publishing}
        onClose={() => setPublishing(false)}
        onConfirm={publish}
        icon={<Send className="w-6 h-6" />}
        title={`Publish v${nextVersion} of ${templateName}?`}
        description="This saves your changes as a new version that can't be changed. Earlier versions and past runs are not affected."
        confirmLabel={`Publish v${nextVersion}`}
      />
      <ConfirmDialog
        isOpen={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={() => { setLeaving(false); onLeave(); }}
        tone="danger"
        icon={<ArrowLeft className="w-6 h-6" />}
        title="Leave without saving?"
        description="Your changes since the last save will be lost."
        confirmLabel="Leave"
      />
    </div>
  );
}

const selCls = "w-full h-9 px-2 rounded-md border-[1.5px] border-[var(--input)] bg-[var(--background)] text-[0.82rem] focus:outline-none focus:border-[var(--ring)] disabled:opacity-60";

function ToolBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("w-7 h-7 rounded-md border border-[#D3D9E2] bg-white flex items-center justify-center shadow-sm", danger ? "text-[#EF4444]" : "text-[#3D4A5C]")}>{children}</button>
  );
}

/* ---------------- The email as the recipient sees it (table layout, email colours) ---------------- */

function BlockPreview({ block, global }: { block: Block; global: GlobalFont }) {
  const p = block.props;
  const a = p.align ?? "left";
  const f = resolveFont(block, global);
  const fs: React.CSSProperties = { fontFamily: f.family, fontSize: f.size, fontWeight: f.weight };
  switch (block.type) {
    case "header": return (<>
      <td style={{ padding: 30, width: "60%" }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: BRAND.navy, fontFamily: global.family }}>{p.brand}</div>
        <div style={{ fontSize: 10, color: BRAND.navy, fontFamily: global.family }}>{p.tagline}</div>
      </td>
      <td style={{ padding: "30px 15px 30px 30px", textAlign: "right", width: "40%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.logo && <img src={p.logo} alt={CICOD.name} style={{ width: 130, height: "auto", display: "inline-block" }} />}
      </td>
    </>);
    case "hero-title": return <td colSpan={2} style={{ textAlign: a, padding: "10px 40px 20px" }}><div style={{ color: BRAND.textDark, ...fs }}>{p.title}</div></td>;
    case "hero-image": {
      const off = p.offset ?? 0;
      const mm = { left: `${off}px auto 0 0`, center: `${off}px auto 0`, right: `${off}px 0 0 auto` };
      return <td colSpan={2} style={{ padding: 0, textAlign: a }}>
        {p.src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.src} alt={p.alt} style={{ width: "100%", maxWidth: 700, height: "auto", display: "block", margin: mm[a], position: "relative", zIndex: 1 }} />
          : <div style={{ margin: "0 30px", background: "#FEF6EA", border: `1.5px dashed ${BRAND.primary}`, borderRadius: 8, padding: 36, color: BRAND.accentText, fontSize: 13, fontFamily: global.family, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><ImageIcon size={16} /> Paste an image URL in Properties</div>}
      </td>;
    }
    case "salutation": return <td colSpan={2} style={{ padding: "40px 40px 0", textAlign: a, color: BRAND.textDark, ...fs }}>Dear <span style={{ color: BRAND.accentText }}>{p.variable}</span>,</td>;
    case "paragraph": return <td colSpan={2} style={{ padding: "16px 40px 0", textAlign: a, color: BRAND.textBody, lineHeight: "26px", whiteSpace: "pre-line", ...fs }}>{p.content}</td>;
    case "subheading": return <td colSpan={2} style={{ padding: "24px 40px 0", textAlign: a, color: BRAND.textBody, ...fs }}>{p.text}</td>;
    case "bullets": return <td colSpan={2} style={{ padding: "16px 40px 0", textAlign: a }}>
      <ul style={{ margin: 0, listStyleType: "disc", ...(a === "left" ? { padding: "0 0 0 20px" } : { listStylePosition: "inside", padding: 0 }), color: BRAND.textBody, lineHeight: "26px", ...fs }}>
        {(p.items ?? []).map((it, i, arr) => <li key={i} style={{ marginBottom: i === arr.length - 1 ? 0 : 12, paddingLeft: 8 }}>{it}</li>)}
      </ul>
    </td>;
    case "cta": return <td colSpan={2} style={{ padding: "24px 40px 0", textAlign: a }}>
      <span style={{ display: "inline-block", background: BRAND.primary, color: BRAND.onPrimary, padding: "14px 40px", borderRadius: 30, ...fs, fontWeight: 600 }}>{p.label}</span>
    </td>;
    case "signoff": return <td colSpan={2} style={{ padding: "24px 40px 0", textAlign: a, color: BRAND.textBody, lineHeight: "26px", ...fs }}>{p.closing}<br /><span style={{ fontWeight: 700 }}>{p.team}</span></td>;
    case "footer": return <td colSpan={2} style={{ padding: "40px 40px 30px" }}>
      <div style={{ borderTop: `1px solid ${BRAND.rule}`, paddingTop: 30, textAlign: a, color: BRAND.textDark, lineHeight: "24px", ...fs }}>Questions about {CICOD.name}? Visit our <a href={p.support} style={{ color: BRAND.navy, fontWeight: 600, textDecoration: "none" }}>Help Centre</a></div>
      <div style={{ textAlign: a, color: BRAND.textDark, lineHeight: "24px", ...fs }}>For further enquiries, contact: <a href={`mailto:${p.email}`} style={{ color: BRAND.navy, fontWeight: 600, textDecoration: "none" }}>{p.email}</a></div>
      <div style={{ textAlign: a, color: BRAND.textDark, lineHeight: "24px", paddingTop: 40, ...fs }}>Powered by {CICOD.name}.</div>
    </td>;
  }
}

/* ---------------- Properties panel ---------------- */

function PropsPanel({ block, global, disabled, onChange, onFont }: {
  block: Block; global: GlobalFont; disabled: boolean;
  onChange: (k: keyof BlockProps | "_items", v: string | number) => void; onFont: (k: "family" | "size" | "weight", v: string | number | null) => void;
}) {
  const p = block.props;
  const ta = React.useRef<HTMLTextAreaElement>(null);
  const textKey: keyof BlockProps | "_items" = block.type === "bullets" ? "_items" : block.type === "paragraph" ? "content" : "text";
  const insertVar = (v: string) => {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    onChange(textKey, el.value.slice(0, s) + v + el.value.slice(e));
  };
  const input = (k: keyof BlockProps, label: string) => (
    <label key={k} className="flex flex-col gap-1"><span className={lbl}>{label}</span>
      <input disabled={disabled} className={inp} value={String(p[k] ?? "")} onChange={(e) => onChange(k, e.target.value)} />
    </label>
  );
  const area = (k: keyof BlockProps | "_items", label: string, value?: string) => (
    <label key={k} className="flex flex-col gap-1"><span className={lbl}>{label}</span>
      <textarea ref={ta} disabled={disabled} className={cn(inp, "h-auto min-h-[96px] py-2 leading-relaxed resize-y")} value={value ?? String(p[k as keyof BlockProps] ?? "")} onChange={(e) => onChange(k, e.target.value)} />
    </label>
  );
  const vars = (
    <div className="flex flex-col gap-1.5"><span className={lbl}>Insert variable</span>
      <div className="flex flex-wrap gap-1.5">{VARIABLES.map((v) => <button key={v} type="button" disabled={disabled} onClick={() => insertVar(v)} className="px-2 py-0.5 rounded-full border border-[var(--primary)]/50 bg-[var(--accent)] text-[var(--accent-foreground)] font-mono text-[0.72rem] font-semibold">{v}</button>)}</div>
    </div>
  );
  const align = <AlignControl value={p.align ?? (block.type === "hero-title" || block.type === "hero-image" || block.type === "cta" || block.type === "footer" ? "center" : "left")} disabled={disabled} onChange={(v) => onChange("align", v)} />;
  const font = block.type === "header" ? null : <FontControl block={block} global={global} disabled={disabled} onFont={onFont} />;

  switch (block.type) {
    case "header": return <>{input("brand", "Brand name")}{input("tagline", "Tagline")}{input("logo", "Logo URL")}<p className={hint}>The header uses the template font.</p></>;
    case "hero-title": return <>{area("title", "Headline")}{align}{font}</>;
    case "hero-image": return <>
      {input("src", "Image URL")}{input("alt", "Alt text")}
      <label className="flex flex-col gap-1"><span className={lbl}>Vertical offset (overlap)</span>
        <span className="flex items-center gap-2"><input type="range" disabled={disabled} min={-300} max={40} step={5} value={p.offset ?? 0} onChange={(e) => onChange("offset", Number(e.target.value))} className="flex-1 accent-[var(--primary)]" /><span className="text-[0.78rem] font-semibold w-12 text-right">{p.offset ?? 0}px</span></span>
      </label>
      <p className={hint}>Negative values pull the image up under the title. 0 means no overlap.</p>{align}</>;
    case "salutation": return <>{input("variable", "Variable")}{align}<p className={hint}>Exports as: Dear &lt;span th:text=&quot;{p.variable}&quot;&gt;&lt;/span&gt;,</p>{font}</>;
    case "paragraph": return <>{area("content", "Body text")}{align}{vars}{font}</>;
    case "subheading": return <>{area("text", "Subheading text")}{align}{vars}{font}</>;
    case "bullets": return <>{area("_items", "Bullet points (one per line)", (p.items ?? []).join("\n"))}{align}{vars}<p className={hint}>Centred or right-aligned bullets sit inline.</p>{font}</>;
    case "signoff": return <>{input("closing", "Closing line")}{input("team", "Team name")}{align}{font}</>;
    case "cta": return <>{input("label", "Button text")}{input("url", "Button URL")}{align}{font}</>;
    case "footer": return <>{input("support", "Help Centre URL")}{input("email", "Contact email")}{align}{font}</>;
  }
}
const lbl = "text-[0.75rem] font-semibold text-[var(--muted-foreground)]";
const inp = "w-full h-9 px-2.5 rounded-md border-[1.5px] border-[var(--input)] bg-[var(--background)] text-[0.85rem] focus:outline-none focus:border-[var(--ring)] disabled:opacity-60";
const hint = "m-0 text-[0.72rem] text-[var(--muted-foreground)]";

function AlignControl({ value, onChange, disabled }: { value: string; onChange: (v: "left" | "center" | "right") => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1"><span className={lbl}>Alignment</span>
      <div role="radiogroup" aria-label="Alignment" className="flex bg-[var(--muted)] p-0.5 rounded-md">
        {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([v, Icon]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} aria-label={`Align ${v}`} disabled={disabled} onClick={() => onChange(v)}
            className={cn("flex-1 py-1.5 rounded flex justify-center", value === v ? "bg-[var(--card)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}><Icon className="w-4 h-4" /></button>
        ))}
      </div>
    </div>
  );
}

function FontControl({ block, global, disabled, onFont }: { block: Block; global: GlobalFont; disabled: boolean; onFont: (k: "family" | "size" | "weight", v: string | number | null) => void }) {
  const e = resolveFont(block, global);
  const f = block.props.font ?? {};
  const has = f.family || f.size != null || f.weight != null;
  return (
    <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-wider text-[var(--accent-foreground)]">Typography
        {has && <button type="button" disabled={disabled} onClick={() => { onFont("family", null); onFont("size", null); onFont("weight", null); }} className="normal-case tracking-normal font-semibold text-[0.7rem] px-2 py-0.5 rounded-full bg-[rgba(245,158,11,.15)] text-[var(--warning)]">Reset to default</button>}
      </div>
      <label className="flex flex-col gap-1"><span className={lbl}>Font</span>
        <select aria-label="Block font" disabled={disabled} className={selCls} value={f.family ?? ""} onChange={(ev) => onFont("family", ev.target.value || null)}>
          <option value="">Template default ({famLabel(global.family)})</option>{FONT_FAMILIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1"><span className={lbl}>Size</span>
          <select aria-label="Block size" disabled={disabled} className={selCls} value={f.size ?? ""} onChange={(ev) => onFont("size", ev.target.value === "" ? null : Number(ev.target.value))}>
            <option value="">Default ({e.size}px)</option>{FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className={lbl}>Weight</span>
          <select aria-label="Block weight" disabled={disabled} className={selCls} value={f.weight ?? ""} onChange={(ev) => onFont("weight", ev.target.value === "" ? null : Number(ev.target.value))}>
            <option value="">Default ({FONT_WEIGHTS.find((w) => w[0] === e.weight)?.[1] ?? e.weight})</option>{FONT_WEIGHTS.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
          </select>
        </label>
      </div>
      <p className={hint}>Leave on default to follow the template typography.</p>
    </div>
  );
}

/* ---------------- Send test (mock) ---------------- */

function TestSendModal({ subject, blocks, global, onClose }: { subject: string; blocks: Block[]; global: GlobalFont; onClose: () => void }) {
  const profiles = sendable(useDeliveryProfiles());
  const [email, setEmail] = React.useState("");
  const [profileName, setProfileName] = React.useState(profiles[0]?.name ?? "");
  const [sample, setSample] = React.useState<Record<string, string>>({ ...SAMPLE_VALUES });
  const [sent, setSent] = React.useState(false);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready = profiles.length > 0;
  const html = resolveMergeVars(buildHtml(subject, blocks, global), sample);
  const renderedSubject = resolveMergeVars(subject || "(no subject)", sample);
  const send = () => { setSent(true); toast.success(`Test email sent to ${email.trim()} via ${profileName}`); };

  return (
    <Modal isOpen onClose={onClose} title="Send a test email" maxWidth="max-w-5xl"
      footer={sent ? <Button onClick={onClose}>Done</Button> : <><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={send} disabled={!ok || !ready}><Send className="w-4 h-4 mr-2" /> Send test</Button></>}>
      <div className="grid grid-cols-[320px_1fr] gap-6">
        <div className="flex flex-col gap-4">
          {sent ? (
            <div className="flex flex-col gap-2">
              <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
              <p className="m-0 font-heading font-bold">Test sent to {email}</p>
              <p className="m-0 text-[0.84rem] text-[var(--muted-foreground)]">This used your sample values. It doesn&apos;t save the template or affect any campaign. The preview shows exactly what was sent.</p>
              <Button variant="outline" className="w-fit" onClick={() => setSent(false)}>Send another</Button>
            </div>
          ) : (<>
            <p className="m-0 text-[0.82rem] text-[var(--muted-foreground)]">Before saving. No campaign is affected.</p>
            {!ready && <Alert tone="warning" title="No verified sender yet">Set one up in <Link href="/admin?tab=email" className="font-semibold text-[var(--primary)]" onClick={onClose}>Studio Admin › Email settings</Link>.</Alert>}
            <label className="flex flex-col gap-1.5"><span className="text-[0.82rem] font-bold">Send to</span>
              <input autoFocus type="email" className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`you@${CICOD.domain}`} />
              {email && !ok && <span className="text-[0.75rem] text-[var(--destructive)]">Enter a valid email</span>}
            </label>
            {ready && <div className="flex flex-col gap-1.5"><span className="text-[0.82rem] font-bold">Send via</span><Select ariaLabel="Send via" options={profiles.map((p) => p.name)} value={profileName} onChange={setProfileName} /></div>}
            <div className="text-[0.72rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Sample values</div>
            {VAR_KEYS.map((k) => (
              <label key={k} className="flex flex-col gap-1"><span className="font-mono text-[0.75rem] text-[var(--muted-foreground)]">{"${" + k + "}"}</span>
                <input className={inp} value={sample[k] ?? ""} onChange={(e) => setSample((s) => ({ ...s, [k]: e.target.value }))} />
              </label>
            ))}
            <p className={hint}>These fill in the personalisation variables so the test looks like a real send.</p>
          </>)}
        </div>
        <div className="flex flex-col min-w-0 border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border)] text-[0.84rem]"><span className="text-[var(--muted-foreground)]">Subject:</span> <b>{renderedSubject}</b></div>
          {/* The email is 700px wide; scale it to fit the preview column. */}
          <div className="h-[460px] overflow-hidden bg-[#F3F4F6]">
            <iframe title="Test email preview" srcDoc={html} className="border-0 origin-top-left" style={{ width: 780, height: 460 / 0.8, transform: "scale(0.8)" }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
