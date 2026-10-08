/**
 * Campaign Studio email blocks: the block model, fonts, merge variables, the HTML exporter and starter themes.
 * Ported from CAMPAIGNStudioFE (TemplateBuilder1Gov.jsx, themes.js) and rebranded for CICOD.
 * The exported HTML keeps Campaign Studio's Thymeleaf form for variables (<span th:text="${userName}">).
 */
import { BRAND, CICOD, absoluteUrl } from "./brand";

export type BlockType = "header" | "hero-title" | "hero-image" | "salutation" | "paragraph" | "subheading" | "bullets" | "cta" | "signoff" | "footer";
export type FontOverride = { family?: string; size?: number; weight?: number };
export type BlockProps = {
  brand?: string; tagline?: string; logo?: string;
  title?: string; src?: string; alt?: string; offset?: number;
  variable?: string; content?: string; text?: string; items?: string[];
  label?: string; url?: string; closing?: string; team?: string; support?: string; email?: string;
  align?: "left" | "center" | "right";
  font?: FontOverride;
};
export type Block = { id: string; type: BlockType; props: BlockProps };
export type GlobalFont = { family: string; size: number; weight: number };

export const VARIABLES = ["${userName}", "${email}", "${planName}", "${businessName}"];
export const VAR_KEYS = ["userName", "email", "planName", "businessName"] as const;
export const SAMPLE_VALUES: Record<(typeof VAR_KEYS)[number], string> = { userName: "Adaeze Okafor", email: "adaeze@adaezestores.ng", planName: "CICOD eCommerce Standard", businessName: "Adaeze Stores" };

export const FONT_FAMILIES = [
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Sora", value: "'Sora', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
];
export const FONT_SIZES = [11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 25, 28, 32];
export const FONT_WEIGHTS: [number, string][] = [[400, "Regular"], [500, "Medium"], [600, "Semibold"], [700, "Bold"]];
/** CICOD's body font is Inter (headings use Sora in the CRM). */
export const DEFAULT_GLOBAL_FONT: GlobalFont = { family: "'Inter', sans-serif", size: 16, weight: 400 };

const FONT_STRUCT: Partial<Record<BlockType, { size: number | null; weight: number | null; body: boolean }>> = {
  "hero-title": { size: 25, weight: 600, body: false },
  salutation: { size: 20, weight: 600, body: false },
  paragraph: { size: null, weight: null, body: true },
  subheading: { size: 16, weight: 700, body: false },
  bullets: { size: null, weight: null, body: true },
  signoff: { size: null, weight: null, body: true },
  cta: { size: 14, weight: 600, body: false },
  footer: { size: 13, weight: 400, body: false },
};

/** The effective font of a block: its own override, else its structural default, else the template font. */
export function resolveFont(block: Block, global: GlobalFont = DEFAULT_GLOBAL_FONT): GlobalFont {
  const st = FONT_STRUCT[block.type];
  const f = block.props.font ?? {};
  return {
    family: f.family ?? global.family,
    size: f.size ?? (st?.body ? global.size : st?.size ?? global.size),
    weight: f.weight ?? (st?.body ? global.weight : st?.weight ?? global.weight),
  };
}
const fontCss = (b: Block, g: GlobalFont, forceWeight?: number) => {
  const e = resolveFont(b, g);
  return `font-family:${e.family};font-size:${e.size}px;font-weight:${forceWeight ?? e.weight}`;
};
const esc = (s?: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Fill ${var} and <span th:text="${var}"></span> with sample values for a test render. */
export function resolveMergeVars(html: string, sample: Record<string, string> = {}) {
  return html
    .replace(/<span\s+th:text="\$\{(\w+)\}"\s*><\/span>/g, (_, k: string) => esc(sample[k] ?? k))
    .replace(/\$\{(\w+)\}/g, (_, k: string) => (sample[k] != null ? esc(sample[k]) : `\${${k}}`));
}

export const BLOCK_DEFAULTS: Record<BlockType, BlockProps> = {
  header: { brand: CICOD.name, tagline: CICOD.tagline, logo: CICOD.logo },
  "hero-title": { title: "Your feature headline here", align: "center" },
  "hero-image": { src: "", alt: "Feature image", offset: 0, align: "center" },
  salutation: { variable: "${userName}", align: "left" },
  paragraph: { content: "Your paragraph text here.", align: "left" },
  subheading: { text: "Section heading", align: "left" },
  bullets: { items: ["First bullet point", "Second bullet point", "Third bullet point"], align: "left" },
  cta: { label: "See how it works", url: CICOD.site, align: "center" },
  signoff: { closing: "Warm regards,", team: CICOD.team, align: "left" },
  footer: { support: CICOD.site, email: CICOD.supportEmail, align: "center" },
};
export const PALETTE: [BlockType, string][] = [
  ["header", "Header"], ["hero-title", "Hero title"], ["hero-image", "Hero image"], ["salutation", "Salutation"], ["paragraph", "Paragraph"],
  ["subheading", "Subheading"], ["bullets", "Bullet list"], ["cta", "Button"], ["signoff", "Sign-off"], ["footer", "Footer"],
];

function blockToHtml(b: Block, g: GlobalFont): string {
  const p = b.props;
  const a = p.align ?? "left";
  const fc = fontCss(b, g);
  switch (b.type) {
    case "header": return `
          <tr>
            <td style="padding:30px;width:60%">
              <div style="font-size:24px;font-weight:600;color:${BRAND.navy};font-family:${g.family}">${esc(p.brand)}</div>
              <div style="font-size:10px;color:${BRAND.navy};font-family:${g.family}">${esc(p.tagline)}</div>
            </td>
            <td style="padding:30px 15px 30px 30px;text-align:right;width:40%">
              <img src="${absoluteUrl(p.logo ?? "")}" alt="${esc(CICOD.name)}" style="width:130px;height:auto">
            </td>
          </tr>`;
    case "hero-title": return `
          <tr><td colspan="2" style="text-align:${a};padding:10px 40px 20px">
            <div style="color:${BRAND.textDark};${fc}">${esc(p.title)}</div>
          </td></tr>`;
    case "hero-image": {
      if (!p.src) return "          <!-- hero image placeholder -->";
      const off = p.offset ?? 0;
      const mm = { left: `${off}px auto 0 0`, center: `${off}px auto 0`, right: `${off}px 0 0 auto` };
      return `
          <tr><td colspan="2" style="padding:0;text-align:${a}">
            <img src="${p.src}" alt="${esc(p.alt)}" style="width:100%;max-width:700px;height:auto;display:block;margin:${mm[a]};position:relative;z-index:1">
          </td></tr>`;
    }
    case "salutation": return `
          <tr><td colspan="2" style="padding:40px 40px 0;text-align:${a};color:${BRAND.textDark};${fc}">Dear <span th:text="${p.variable}"></span>,</td></tr>`;
    case "paragraph": return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a};color:${BRAND.textBody};line-height:26px;${fc}">${esc(p.content).replace(/\n/g, "<br>")}</td></tr>`;
    case "subheading": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};${fc}">${esc(p.text)}</td></tr>`;
    case "bullets": {
      const ls = a === "left" ? "padding:0 0 0 20px" : "list-style-position:inside;padding:0";
      const items = p.items ?? [];
      return `
          <tr><td colspan="2" style="padding:16px 40px 0;text-align:${a}">
            <ul style="margin:0;${ls};color:${BRAND.textBody};line-height:26px;${fc}">
              ${items.map((i, idx) => `<li style="margin-bottom:${idx === items.length - 1 ? 0 : 12}px">${esc(i)}</li>`).join("\n              ")}
            </ul>
          </td></tr>`;
    }
    case "cta": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a}">
            <a href="${p.url || "#"}" style="display:inline-block;background:${BRAND.primary};color:${BRAND.onPrimary};text-decoration:none;padding:14px 40px;border-radius:30px;${fontCss(b, g, 600)}">${esc(p.label)}</a>
          </td></tr>`;
    case "signoff": return `
          <tr><td colspan="2" style="padding:24px 40px 0;text-align:${a};color:${BRAND.textBody};line-height:26px;${fc}">${esc(p.closing)}<br><span style="${fontCss(b, g, 700)}">${esc(p.team)}</span></td></tr>`;
    case "footer": return `
          <tr><td colspan="2" style="padding:40px 40px 30px">
            <div style="border-top:1px solid ${BRAND.rule};padding-top:30px;text-align:${a};color:${BRAND.textDark};line-height:24px;${fc}">
              Questions about ${CICOD.name}? Visit our <a href="${p.support}" style="color:${BRAND.navy};font-weight:600;text-decoration:none">Help Centre</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};line-height:24px;${fc}">
              For further enquiries, contact: <a href="mailto:${p.email}" style="color:${BRAND.navy};font-weight:600;text-decoration:none">${esc(p.email)}</a>
            </div>
            <div style="text-align:${a};color:${BRAND.textDark};line-height:24px;padding-top:40px;${fc}">Powered by ${CICOD.name}.</div>
          </td></tr>`;
  }
}

/** The full email document, as Campaign Studio exports it (700px table layout). */
export function buildHtml(subject: string, blocks: Block[], global: GlobalFont = DEFAULT_GLOBAL_FONT) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${esc(subject)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@400;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 40px 0px; background-color: ${BRAND.pageBg}; font-family: sans-serif;">
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

/* ---------------- Block factory and starter themes ---------------- */

let seq = 0;
export const newBlockId = () => `blk-${Date.now().toString(36)}-${++seq}`;
export const block = (type: BlockType, props: BlockProps = {}): Block => ({ id: newBlockId(), type, props: { ...BLOCK_DEFAULTS[type], ...props } });

const head = () => block("header");
const foot = () => block("footer");
const signoff = (closing = "Warm regards,") => block("signoff", { closing });

export const THEME_CATEGORIES: Record<string, string> = { seasonal: "Seasonal greetings", notification: "Notifications", announcement: "Product announcements" };
export type Theme = { id: string; name: string; category: string | null; description: string; subject: string; blocks: () => Block[] };

/** Starter themes. Hero images are left empty: the originals were 1Gov artwork, so CICOD artwork needs adding. */
export const THEMES: Theme[] = [
  { id: "blank", name: "Blank template", category: null, description: "Start with just the CICOD header and footer.", subject: "",
    blocks: () => [head(), block("hero-title", { title: "Your headline here" }), block("paragraph", { content: "Your message here." }), signoff(), foot()] },
  { id: "eid", name: "Eid Mubarak", category: "seasonal", description: "Warm Eid-el-Fitr greeting for merchants.", subject: "Eid-el-Fitr Mubarak",
    blocks: () => [head(), block("hero-image", { alt: "Eid-el-Fitr Mubarak" }), block("salutation"),
      block("paragraph", { content: "As we mark the end of Ramadan, we extend our warm wishes to you, your family and your team on this occasion of Eid al-Fitr." }),
      block("paragraph", { content: "May this season bring peace, renewed strength and continued growth for ${businessName}. Thank you for running your business with CICOD; we remain committed to supporting you." }),
      block("paragraph", { content: "Eid Mubarak" }), signoff(), foot()] },
  { id: "easter", name: "Easter Celebration", category: "seasonal", description: "Easter greeting on renewal and growth.", subject: "Happy Easter",
    blocks: () => [head(), block("hero-image", { alt: "Happy Easter" }), block("salutation"),
      block("paragraph", { content: "As we celebrate this Easter season, we reflect on its message of hope and renewal." }),
      block("paragraph", { content: "This is a good moment to thank you for the trust you place in CICOD. Every order you process and every customer you serve matters to us." }),
      block("paragraph", { content: "Wishing you and yours a joyous Easter." }), signoff(), foot()] },
  { id: "maintenance", name: "Scheduled Maintenance", category: "notification", description: "Notice of planned downtime. Fill in the date and window.", subject: "Scheduled system maintenance",
    blocks: () => [head(), block("hero-title", { title: "Scheduled system maintenance" }), block("hero-image", { alt: "Scheduled maintenance" }), block("salutation"),
      block("paragraph", { content: "To keep improving CICOD for you, we will carry out scheduled maintenance on [DATE] from [START] to [END] (WAT)." }),
      block("paragraph", { content: "During this window, your store, orders and dashboards may be briefly unavailable. Payments already in progress will not be affected." }),
      block("paragraph", { content: "All services will be fully restored once the work is done. We apologise for any inconvenience and appreciate your patience." }),
      block("paragraph", { content: "Thank you." }), signoff("Best regards,"), foot()] },
  { id: "feature", name: "Feature Update", category: "announcement", description: "Announce a new feature with highlights, steps and a call to action.", subject: "New on CICOD: Workflow Manager approvals",
    blocks: () => [head(), block("hero-title", { title: "Introducing approvals in Workflow Manager 🎉" }), block("hero-image", { alt: "Workflow Manager approvals" }), block("salutation"),
      block("paragraph", { content: "We're excited to bring approvals to Workflow Manager. You can now route purchase requests, refunds and stock adjustments to the right person before they go through, without leaving CICOD." }),
      block("subheading", { text: "How this makes your work easier" }),
      block("bullets", { items: [
        "Set approvers once: choose who signs off on refunds, purchases and stock changes.",
        "Approve from anywhere: approvers get a notification and can approve on web or mobile.",
        "Keep a clear record: every approval is logged with who approved it and when.",
      ] }),
      block("subheading", { text: "To get started:" }),
      block("bullets", { items: [
        "Open Workflow Manager and go to Settings › Approvals.",
        "Choose the actions that need approval and pick the approvers.",
        "Save. New requests will now wait for approval.",
      ] }),
      block("cta", { label: "See how it works" }),
      block("paragraph", { content: "Thank you for choosing CICOD. For questions or feedback, contact our support team." }),
      signoff(), foot()] },
];
export const themeById = (id: string) => THEMES.find((t) => t.id === id);
export function instantiateTheme(id: string) {
  const t = themeById(id) ?? THEMES[0];
  return { subject: t.subject, blocks: t.blocks(), global: { ...DEFAULT_GLOBAL_FONT } };
}
